from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, extract, func, select, distinct, cast, Date, Integer
from sqlalchemy.orm import Session

from src.db.models.expense_category import ExpenseCategory
from src.db.models.expense_subcategory import ExpenseSubcategory
from src.db.models.transaction import Transaction


class InsightsRepository:
    """Repository for insights data aggregations and queries."""

    def get_expense_transactions_by_month(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> list[Transaction]:
        """
        Get all expense transactions for user in date range.

        Args:
            session: Database session
            user_id: User ID
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)

        Returns:
            List of Transaction models
        """
        stmt = (
            select(Transaction)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.occurred_at >= start_date,
                    Transaction.occurred_at <= end_date,
                )
            )
            .order_by(Transaction.occurred_at.desc())
        )

        result = session.execute(stmt)
        return list(result.scalars().all())

    def aggregate_by_category(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict]:
        """
        Aggregate expenses by category and subcategory.

        Args:
            session: Database session
            user_id: User ID
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)

        Returns:
            List of dicts with keys: category_id, subcategory_id, total (Decimal), count (int)
        """
        stmt = (
            select(
                Transaction.expense_category_id.label("category_id"),
                Transaction.expense_subcategory_id.label("subcategory_id"),
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.occurred_at >= start_date,
                    Transaction.occurred_at <= end_date,
                )
            )
            .group_by(
                Transaction.expense_category_id,
                Transaction.expense_subcategory_id,
            )
        )

        result = session.execute(stmt)
        return [
            {
                "category_id": row.category_id,
                "subcategory_id": row.subcategory_id,
                "total": row.total or Decimal("0"),
                "count": row.count or 0,
            }
            for row in result
        ]

    def aggregate_by_week(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict]:
        """
        Aggregate expenses by week of month.

        Week calculation: ((day_of_month - 1) // 7) + 1

        Args:
            session: Database session
            user_id: User ID
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)

        Returns:
            List of dicts with keys: week (int), total (Decimal)
        """
        # Calculate week: ((EXTRACT(DAY FROM occurred_at)::integer - 1) / 7) + 1
        week_calc = (
            (cast(extract("day", Transaction.occurred_at), Integer) - 1) / 7
        ) + 1

        stmt = (
            select(
                week_calc.label("week"),
                func.sum(Transaction.amount).label("total"),
            )
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.occurred_at >= start_date,
                    Transaction.occurred_at <= end_date,
                )
            )
            .group_by(week_calc)
            .order_by(week_calc)
        )

        result = session.execute(stmt)
        return [
            {
                "week": int(row.week),
                "total": row.total or Decimal("0"),
            }
            for row in result
        ]

    def count_logged_days(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        """
        Count distinct days with expense transactions.

        Args:
            session: Database session
            user_id: User ID
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)

        Returns:
            Integer count of unique days
        """
        stmt = (
            select(func.count(distinct(cast(Transaction.occurred_at, Date))))
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.occurred_at >= start_date,
                    Transaction.occurred_at <= end_date,
                )
            )
        )

        result = session.execute(stmt)
        return result.scalar() or 0

    def get_recent_transactions(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
        limit: int = 5,
    ) -> list[Transaction]:
        """
        Get most recent expense transactions.

        Args:
            session: Database session
            user_id: User ID
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
            limit: Maximum number of transactions to return

        Returns:
            List of Transaction models
        """
        stmt = (
            select(Transaction)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.occurred_at >= start_date,
                    Transaction.occurred_at <= end_date,
                )
            )
            .order_by(Transaction.occurred_at.desc())
            .limit(limit)
        )

        result = session.execute(stmt)
        return list(result.scalars().all())

    def get_total_by_category(
        self,
        session: Session,
        user_id: UUID,
        category_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> Decimal:
        """
        Get total spending for a specific category (for savings/investments).

        Args:
            session: Database session
            user_id: User ID
            category_id: Category ID to filter by
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)

        Returns:
            Decimal amount (0 if no transactions)
        """
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.expense_category_id == category_id,
                Transaction.occurred_at >= start_date,
                Transaction.occurred_at <= end_date,
            )
        )

        result = session.execute(stmt)
        return Decimal(str(result.scalar() or 0))

    def get_total_income(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> Decimal:
        """
        Get total income from transactions.

        Args:
            session: Database session
            user_id: User ID
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)

        Returns:
            Decimal amount (0 if no transactions)
        """
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == "income",
                Transaction.occurred_at >= start_date,
                Transaction.occurred_at <= end_date,
            )
        )

        result = session.execute(stmt)
        return Decimal(str(result.scalar() or 0))

    def get_available_months(
        self,
        session: Session,
        user_id: UUID,
    ) -> list[dict]:
        """
        Get distinct year-month combinations with transactions.

        Args:
            session: Database session
            user_id: User ID

        Returns:
            List of dicts with keys: year (int), month (int)
        """
        year_col = extract("year", Transaction.occurred_at).label("year")
        month_col = extract("month", Transaction.occurred_at).label("month")

        stmt = (
            select(year_col, month_col)
            .where(Transaction.user_id == user_id)
            .distinct()
            .order_by(year_col.desc(), month_col.desc())
        )

        result = session.execute(stmt)
        return [
            {
                "year": int(row.year),
                "month": int(row.month),
            }
            for row in result
        ]

    def get_category_colors(self, session: Session) -> dict[str, str]:
        """
        Get all expense category colors from database.

        Args:
            session: Database session

        Returns:
            Dict mapping category_id to color
        """
        stmt = select(ExpenseCategory.id, ExpenseCategory.color)

        result = session.execute(stmt)
        return {row.id: row.color for row in result}

    def get_subcategory_colors(self, session: Session) -> dict[str, str]:
        """
        Get all expense subcategory colors from database.

        Args:
            session: Database session

        Returns:
            Dict mapping subcategory_id to sub_color
        """
        stmt = select(ExpenseSubcategory.id, ExpenseSubcategory.sub_color)

        result = session.execute(stmt)
        return {row.id: row.sub_color for row in result}
