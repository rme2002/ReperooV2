"""Service for managing recurring transaction templates and auto-generation."""
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from src.db.models.transaction import Transaction


class RecurringTransactionService:
    """Service for processing recurring transactions."""

    def generate_monthly_transactions(self, session: Session, target_month: datetime) -> int:
        """
        Generate transactions for the target month from recurring templates.

        Args:
            session: SQLAlchemy database session
            target_month: The month to generate transactions for (datetime object)

        Returns:
            Number of transactions generated
        """
        # Get first day of target month
        first_day = datetime(
            target_month.year,
            target_month.month,
            1,
            0,
            0,
            0,
            tzinfo=timezone.utc
        )

        # Get first day of next month for range check
        if target_month.month == 12:
            next_month = datetime(
                target_month.year + 1,
                1,
                1,
                0,
                0,
                0,
                tzinfo=timezone.utc
            )
        else:
            next_month = datetime(
                target_month.year,
                target_month.month + 1,
                1,
                0,
                0,
                0,
                tzinfo=timezone.utc
            )

        # Find all recurring templates
        stmt = select(Transaction).where(
            and_(
                Transaction.is_recurring == True,  # noqa: E712
                Transaction.recurring_template_id.is_(None)  # Templates have NULL template_id
            )
        )
        recurring_templates = session.execute(stmt).scalars().all()

        generated_count = 0

        for template in recurring_templates:
            # Check if transaction already exists for this template in target month
            existing_stmt = select(Transaction).where(
                and_(
                    Transaction.recurring_template_id == template.id,
                    Transaction.occurred_at >= first_day,
                    Transaction.occurred_at < next_month
                )
            )
            existing = session.execute(existing_stmt).scalar_one_or_none()

            if existing:
                # Transaction already generated for this month
                continue

            # Calculate occurred_at date
            # Use recurring_day_of_month, clamped to valid day in the target month
            day_of_month = template.recurring_day_of_month or 1

            # Get last day of target month
            if target_month.month == 12:
                last_day_of_month = datetime(
                    target_month.year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc
                ).replace(day=1).replace(hour=0, minute=0, second=0, microsecond=0)
                last_day_of_month = (last_day_of_month - timezone.utcoffset(last_day_of_month) if last_day_of_month.tzinfo else last_day_of_month)
                last_day_num = (last_day_of_month.replace(day=1) - timezone.timedelta(days=1)).day
            else:
                last_day_of_month = datetime(
                    target_month.year,
                    target_month.month + 1,
                    1,
                    0,
                    0,
                    0,
                    tzinfo=timezone.utc
                )
                import calendar
                last_day_num = calendar.monthrange(target_month.year, target_month.month)[1]

            # Clamp day to valid range
            actual_day = min(day_of_month, last_day_num)

            occurred_at = datetime(
                target_month.year,
                target_month.month,
                actual_day,
                0,
                0,
                0,
                tzinfo=timezone.utc
            )

            # Create new transaction from template
            new_transaction = Transaction(
                id=uuid4(),
                user_id=template.user_id,
                occurred_at=occurred_at,
                amount=template.amount,
                type=template.type,
                expense_category_id=template.expense_category_id,
                expense_subcategory_id=template.expense_subcategory_id,
                income_category_id=template.income_category_id,
                notes=template.notes,
                transaction_tag=template.transaction_tag,
                is_recurring=False,  # Generated transactions are not templates
                recurring_day_of_month=None,
                recurring_template_id=template.id,  # Link back to template
            )

            session.add(new_transaction)
            generated_count += 1

        # Commit all new transactions
        session.commit()

        return generated_count

    def update_recurring_template(
        self,
        session: Session,
        template_id: str,
        updates: dict
    ) -> None:
        """
        Update a recurring template and optionally future generated transactions.

        Args:
            session: SQLAlchemy database session
            template_id: ID of the template to update
            updates: Dictionary of fields to update

        Raises:
            ValueError: If template not found
        """
        # Find the template
        stmt = select(Transaction).where(Transaction.id == template_id)
        template = session.execute(stmt).scalar_one_or_none()

        if not template or not template.is_recurring:
            raise ValueError(f"Recurring template {template_id} not found")

        # Update template
        for key, value in updates.items():
            if hasattr(template, key):
                setattr(template, key, value)

        # Update future generated transactions (those with occurred_at > now)
        now = datetime.now(timezone.utc)
        future_stmt = select(Transaction).where(
            and_(
                Transaction.recurring_template_id == template_id,
                Transaction.occurred_at > now
            )
        )
        future_transactions = session.execute(future_stmt).scalars().all()

        for txn in future_transactions:
            for key, value in updates.items():
                # Don't update metadata fields
                if key not in ['id', 'user_id', 'created_at', 'is_recurring',
                             'recurring_day_of_month', 'recurring_template_id']:
                    if hasattr(txn, key):
                        setattr(txn, key, value)

        session.commit()

    def delete_recurring_template(
        self,
        session: Session,
        template_id: str,
        delete_future: bool = True
    ) -> None:
        """
        Delete a recurring template and optionally future generated transactions.

        Args:
            session: SQLAlchemy database session
            template_id: ID of the template to delete
            delete_future: If True, delete future generated transactions

        Raises:
            ValueError: If template not found
        """
        # Find the template
        stmt = select(Transaction).where(Transaction.id == template_id)
        template = session.execute(stmt).scalar_one_or_none()

        if not template or not template.is_recurring:
            raise ValueError(f"Recurring template {template_id} not found")

        if delete_future:
            # Delete future generated transactions
            now = datetime.now(timezone.utc)
            future_stmt = select(Transaction).where(
                and_(
                    Transaction.recurring_template_id == template_id,
                    Transaction.occurred_at > now
                )
            )
            future_transactions = session.execute(future_stmt).scalars().all()

            for txn in future_transactions:
                session.delete(txn)

        # Delete the template
        session.delete(template)
        session.commit()
