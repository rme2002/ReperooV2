"""Service for Just-In-Time materialization of recurring transactions."""

from __future__ import annotations

import calendar
from datetime import date, timedelta
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
        start_date: date,
        end_date: date,
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
        start_date: date,
        end_date: date,
    ) -> list[date]:
        """
        Calculate all occurrence dates for a template in the given range.

        Args:
            template: RecurringTemplate instance
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of date objects representing occurrences
        """
        if template.frequency == "monthly":
            return self._calculate_monthly_occurrences(template, start_date, end_date)
        elif template.frequency in ("weekly", "biweekly"):
            return self._calculate_weekly_occurrences(template, start_date, end_date)
        else:
            return []

    def _calculate_monthly_occurrences(
        self,
        template: RecurringTemplate,
        start_date: date,
        end_date: date,
    ) -> list[date]:
        """Calculate monthly occurrences - much simpler with dates!"""
        occurrences = []

        # Start from template start date
        current_year = template.start_date.year
        current_month = template.start_date.month
        occurrence_count = 0

        while True:
            # Check end conditions
            current_date = date(current_year, current_month, 1)
            if current_date > end_date:
                break
            if template.end_date and current_date > template.end_date:
                break
            if (
                template.total_occurrences
                and occurrence_count >= template.total_occurrences
            ):
                break

            # Clamp day to valid range for this month
            days_in_month = calendar.monthrange(current_year, current_month)[1]
            actual_day = min(template.day_of_month, days_in_month)

            occurrence_date = date(current_year, current_month, actual_day)

            # Only add if it's in our range and after template start
            if (
                occurrence_date >= template.start_date
                and occurrence_date >= start_date
                and occurrence_date <= end_date
            ):
                occurrences.append(occurrence_date)
                occurrence_count += 1

            # Move to next month
            if current_month == 12:
                current_year += 1
                current_month = 1
            else:
                current_month += 1

        return occurrences

    def _calculate_weekly_occurrences(
        self,
        template: RecurringTemplate,
        start_date: date,
        end_date: date,
    ) -> list[date]:
        """Calculate weekly/biweekly occurrences."""
        occurrences = []
        interval_days = 7 if template.frequency == "weekly" else 14

        # Start from template start date
        current = template.start_date
        occurrence_count = 0

        while current <= end_date:
            # Check end conditions
            if template.end_date and current > template.end_date:
                break
            if (
                template.total_occurrences
                and occurrence_count >= template.total_occurrences
            ):
                break

            # Check if this date matches the target day of week
            if current.weekday() == template.day_of_week and current >= start_date:
                occurrences.append(current)
                occurrence_count += 1

            # Move forward by interval
            current += timedelta(days=interval_days)

        return occurrences

    def _transaction_exists(
        self,
        session: Session,
        template_id: UUID,
        occurrence_date: date,
    ) -> bool:
        """Check if a transaction already exists for this template and date."""
        stmt = select(Transaction).where(
            and_(
                Transaction.recurring_template_id == template_id,
                Transaction.occurred_at == occurrence_date,  # Date comparison
            )
        )
        result = session.execute(stmt).first()
        return result is not None

    def _create_transaction_from_template(
        self,
        session: Session,
        template: RecurringTemplate,
        occurrence_date: date,
    ) -> Transaction:
        """Create a transaction instance from a template."""
        transaction = Transaction(
            id=uuid4(),
            user_id=template.user_id,
            occurred_at=occurrence_date,  # Store date directly
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
