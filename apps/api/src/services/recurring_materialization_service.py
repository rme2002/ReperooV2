"""Service for Just-In-Time materialization of recurring transactions."""
from __future__ import annotations

import calendar
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from src.db.models.recurring_template import RecurringTemplate
from src.db.models.transaction import Transaction
from src.repositories.recurring_template_repository import RecurringTemplateRepository


class RecurringMaterializationService:
    """Service for Just-In-Time materialization of recurring transactions."""

    def __init__(self, template_repository: RecurringTemplateRepository):
        self.template_repository = template_repository

    def materialize_for_date_range(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        """
        Generate missing recurring transaction instances for date range.

        Args:
            session: SQLAlchemy database session
            user_id: User ID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Count of newly created transactions
        """
        # Get all active templates for this user in the date range
        templates = self.template_repository.get_active_templates_for_date_range(
            session, user_id, start_date, end_date
        )

        generated_count = 0

        for template in templates:
            # Calculate expected occurrences for this template
            occurrences = self.calculate_occurrences(template, start_date, end_date)

            for occurrence_date in occurrences:
                # Check if transaction already exists for this occurrence
                existing = self._transaction_exists(
                    session, template.id, occurrence_date
                )

                if not existing:
                    # Create new transaction from template
                    self._create_transaction_from_template(
                        session, template, occurrence_date
                    )
                    generated_count += 1

        return generated_count

    def calculate_occurrences(
        self,
        template: RecurringTemplate,
        start_date: datetime,
        end_date: datetime,
    ) -> list[datetime]:
        """
        Calculate all occurrence dates for a template in the given range.

        Args:
            template: RecurringTemplate instance
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of datetime objects representing occurrences
        """
        if template.frequency == "monthly":
            return self._calculate_monthly_occurrences(
                template, start_date, end_date
            )
        elif template.frequency == "weekly":
            return self._calculate_weekly_occurrences(
                template, start_date, end_date, weeks=1
            )
        elif template.frequency == "biweekly":
            return self._calculate_weekly_occurrences(
                template, start_date, end_date, weeks=2
            )
        else:
            return []

    def _calculate_monthly_occurrences(
        self,
        template: RecurringTemplate,
        start_date: datetime,
        end_date: datetime,
    ) -> list[datetime]:
        """Calculate monthly occurrences."""
        occurrences = []
        current = template.start_date.replace(tzinfo=timezone.utc)
        occurrence_count = 0

        # Iterate through months
        while current <= end_date:
            if current >= start_date:
                # Check end conditions
                if template.end_date and current > template.end_date:
                    break
                if (
                    template.total_occurrences
                    and occurrence_count >= template.total_occurrences
                ):
                    break

                # Clamp day to valid range for this month
                days_in_month = calendar.monthrange(current.year, current.month)[1]
                actual_day = min(template.day_of_month, days_in_month)

                # Create occurrence datetime at 9 AM
                occurrence = datetime(
                    current.year,
                    current.month,
                    actual_day,
                    9,
                    0,
                    0,
                    tzinfo=timezone.utc,
                )

                # Only add if it's after template start and in our range
                if occurrence >= template.start_date and occurrence >= start_date:
                    occurrences.append(occurrence)
                    occurrence_count += 1

            # Move to next month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

        return occurrences

    def _calculate_weekly_occurrences(
        self,
        template: RecurringTemplate,
        start_date: datetime,
        end_date: datetime,
        weeks: int = 1,
    ) -> list[datetime]:
        """Calculate weekly or biweekly occurrences."""
        occurrences = []

        # Find the first occurrence on the specified day_of_week after start_date
        current = template.start_date.replace(tzinfo=timezone.utc)

        # Adjust to the correct day of week if needed
        # Python weekday(): Monday=0, Sunday=6
        # Our day_of_week: Monday=0, Sunday=6 (same)
        target_weekday = template.day_of_week
        days_ahead = target_weekday - current.weekday()
        if days_ahead < 0:  # Target day already happened this week
            days_ahead += 7
        current = current + timedelta(days=days_ahead)

        # Set time to 9 AM
        current = current.replace(hour=9, minute=0, second=0, microsecond=0)

        occurrence_count = 0

        while current <= end_date:
            if current >= start_date and current >= template.start_date:
                # Check end conditions
                if template.end_date and current > template.end_date:
                    break
                if (
                    template.total_occurrences
                    and occurrence_count >= template.total_occurrences
                ):
                    break

                occurrences.append(current)
                occurrence_count += 1

            # Move to next week or biweek
            current = current + timedelta(days=7 * weeks)

        return occurrences

    def _transaction_exists(
        self,
        session: Session,
        template_id: UUID,
        occurrence_date: datetime,
    ) -> bool:
        """Check if a transaction already exists for this template and date."""
        # Check for transactions on the same day with the same template
        start_of_day = occurrence_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = occurrence_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        stmt = select(Transaction).where(
            and_(
                Transaction.recurring_template_id == template_id,
                Transaction.occurred_at >= start_of_day,
                Transaction.occurred_at <= end_of_day,
            )
        )
        result = session.execute(stmt).scalar_one_or_none()
        return result is not None

    def _create_transaction_from_template(
        self,
        session: Session,
        template: RecurringTemplate,
        occurrence_date: datetime,
    ) -> Transaction:
        """Create a transaction instance from a template."""
        transaction = Transaction(
            id=uuid4(),
            user_id=template.user_id,
            occurred_at=occurrence_date,
            amount=template.amount,
            type=template.type,
            expense_category_id=template.expense_category_id,
            expense_subcategory_id=template.expense_subcategory_id,
            income_category_id=template.income_category_id,
            notes=template.notes,
            transaction_tag=template.transaction_tag,
            recurring_template_id=template.id,
        )

        session.add(transaction)
        return transaction
