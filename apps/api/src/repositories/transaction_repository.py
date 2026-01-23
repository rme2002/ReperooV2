from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID, uuid4

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from src.db.models.expense_category import ExpenseCategory
from src.db.models.expense_subcategory import ExpenseSubcategory
from src.db.models.income_category import IncomeCategory
from src.db.models.transaction import Transaction


class TransactionRepository:
    def create_transaction(
        self,
        session: Session,
        transaction_data: dict,
    ) -> Transaction:
        """
        Create a new transaction record.

        Args:
            session: SQLAlchemy database session
            transaction_data: Dictionary containing transaction fields

        Returns:
            Created Transaction instance (caller must commit)
        """
        # Generate UUID if not provided
        if "id" not in transaction_data:
            transaction_data["id"] = uuid4()

        transaction = Transaction(**transaction_data)
        session.add(transaction)
        return transaction

    def category_exists(
        self,
        session: Session,
        category_id: str,
        category_type: Literal["expense", "income"],
    ) -> bool:
        """
        Check if a category exists in the database.

        Args:
            session: SQLAlchemy database session
            category_id: Category ID to check
            category_type: Type of category ("expense" or "income")

        Returns:
            True if category exists, False otherwise
        """
        if category_type == "expense":
            return session.get(ExpenseCategory, category_id) is not None
        else:
            return session.get(IncomeCategory, category_id) is not None

    def subcategory_exists(
        self,
        session: Session,
        subcategory_id: str,
    ) -> bool:
        """
        Check if an expense subcategory exists in the database.

        Args:
            session: SQLAlchemy database session
            subcategory_id: Subcategory ID to check

        Returns:
            True if subcategory exists, False otherwise
        """
        return session.get(ExpenseSubcategory, subcategory_id) is not None

    def get_transactions_by_date_range(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> list[Transaction]:
        """
        Get all transactions for a user within a date range.

        Args:
            session: SQLAlchemy database session
            user_id: User ID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of Transaction instances
        """
        stmt = (
            select(Transaction)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.occurred_at >= start_date,
                    Transaction.occurred_at <= end_date,
                )
            )
            .order_by(Transaction.occurred_at.desc())
        )
        return list(session.execute(stmt).scalars().all())

    def get_today_summary(
        self, session: Session, user_id: UUID
    ) -> dict[str, Any]:
        """
        Get aggregated summary of today's transactions.

        Returns dict with:
        - expense_total: Decimal
        - expense_count: int
        - income_total: Decimal
        - income_count: int
        """
        from datetime import timezone

        from sqlalchemy import case, func

        # Get today's date boundaries (UTC)
        now = datetime.now(timezone.utc)
        start_of_day = datetime(
            now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc
        )
        end_of_day = datetime(
            now.year, now.month, now.day, 23, 59, 59, 999999, tzinfo=timezone.utc
        )

        # Aggregate query with conditional sums
        stmt = select(
            func.sum(
                case((Transaction.type == "expense", Transaction.amount), else_=0)
            ).label("expense_total"),
            func.count(
                case((Transaction.type == "expense", 1), else_=None)
            ).label("expense_count"),
            func.sum(
                case((Transaction.type == "income", Transaction.amount), else_=0)
            ).label("income_total"),
            func.count(
                case((Transaction.type == "income", 1), else_=None)
            ).label("income_count"),
        ).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.occurred_at >= start_of_day,
                Transaction.occurred_at <= end_of_day,
            )
        )

        result = session.execute(stmt).one()

        return {
            "expense_total": result.expense_total or Decimal("0"),
            "expense_count": result.expense_count or 0,
            "income_total": result.income_total or Decimal("0"),
            "income_count": result.income_count or 0,
        }

    def get_transaction_by_id(
        self,
        session: Session,
        transaction_id: UUID,
        user_id: UUID,
    ) -> Transaction | None:
        """
        Get a transaction by ID and verify it belongs to the user.

        Args:
            session: SQLAlchemy database session
            transaction_id: Transaction ID
            user_id: User ID (for authorization check)

        Returns:
            Transaction instance or None if not found or doesn't belong to user
        """
        stmt = select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id,
            )
        )
        return session.execute(stmt).scalar_one_or_none()

    def update_transaction(
        self,
        session: Session,
        transaction: Transaction,
        update_data: dict,
    ) -> Transaction:
        """
        Update an existing transaction with partial data.

        Args:
            session: SQLAlchemy database session
            transaction: Transaction instance to update
            update_data: Dictionary with fields to update

        Returns:
            Updated Transaction instance (caller must commit)
        """
        for key, value in update_data.items():
            if value is not None:  # Only update non-None values
                setattr(transaction, key, value)
        return transaction

    def delete_transaction(
        self,
        session: Session,
        transaction: Transaction,
    ) -> None:
        """
        Delete a transaction.

        Args:
            session: SQLAlchemy database session
            transaction: Transaction instance to delete
        """
        session.delete(transaction)
