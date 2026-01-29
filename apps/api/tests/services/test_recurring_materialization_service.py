"""Tests for recurring transaction materialization service."""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from src.db.models.recurring_template import RecurringTemplate
from src.services.recurring_materialization_service import RecurringMaterializationService


class TestCalculateMonthlyOccurrences:
    """Tests for monthly recurring transaction calculation."""

    def test_monthly_on_day_15(self):
        """Test monthly recurrence on day 15."""
        service = RecurringMaterializationService(None)

        # Create a mock template
        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="monthly",
            day_of_month=15,
            day_of_week=None,
            start_date=date(2024, 1, 15),
            end_date=None,
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2024, 1, 1)
        end_date = date(2024, 3, 31)

        occurrences = service._calculate_monthly_occurrences(template, start_date, end_date)

        assert len(occurrences) == 3
        assert occurrences[0] == date(2024, 1, 15)
        assert occurrences[1] == date(2024, 2, 15)
        assert occurrences[2] == date(2024, 3, 15)

    def test_monthly_on_day_31_february_clamps_to_29(self):
        """Test that day 31 clamps to 29 in February 2024 (leap year)."""
        service = RecurringMaterializationService(None)

        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="monthly",
            day_of_month=31,
            day_of_week=None,
            start_date=date(2024, 1, 31),
            end_date=None,
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2024, 1, 1)
        end_date = date(2024, 4, 30)

        occurrences = service._calculate_monthly_occurrences(template, start_date, end_date)

        assert len(occurrences) == 4
        assert occurrences[0] == date(2024, 1, 31)
        assert occurrences[1] == date(2024, 2, 29)  # Clamped to 29 (leap year)
        assert occurrences[2] == date(2024, 3, 31)
        assert occurrences[3] == date(2024, 4, 30)  # Clamped to 30

    def test_monthly_on_day_31_february_non_leap_year(self):
        """Test that day 31 clamps to 28 in February 2023 (non-leap year)."""
        service = RecurringMaterializationService(None)

        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="monthly",
            day_of_month=31,
            day_of_week=None,
            start_date=date(2023, 1, 31),
            end_date=None,
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2023, 1, 1)
        end_date = date(2023, 3, 31)

        occurrences = service._calculate_monthly_occurrences(template, start_date, end_date)

        assert len(occurrences) == 3
        assert occurrences[0] == date(2023, 1, 31)
        assert occurrences[1] == date(2023, 2, 28)  # Clamped to 28 (non-leap year)
        assert occurrences[2] == date(2023, 3, 31)

    def test_monthly_with_end_date(self):
        """Test monthly recurrence with end date."""
        service = RecurringMaterializationService(None)

        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="monthly",
            day_of_month=1,
            day_of_week=None,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 3, 1),  # Ends on third occurrence
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2024, 1, 1)
        end_date = date(2024, 12, 31)

        occurrences = service._calculate_monthly_occurrences(template, start_date, end_date)

        assert len(occurrences) == 3
        assert occurrences[0] == date(2024, 1, 1)
        assert occurrences[1] == date(2024, 2, 1)
        assert occurrences[2] == date(2024, 3, 1)

    def test_monthly_with_total_occurrences(self):
        """Test monthly recurrence with total occurrences limit."""
        service = RecurringMaterializationService(None)

        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="monthly",
            day_of_month=1,
            day_of_week=None,
            start_date=date(2024, 1, 1),
            end_date=None,
            total_occurrences=3,  # Only 3 occurrences
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2024, 1, 1)
        end_date = date(2024, 12, 31)

        occurrences = service._calculate_monthly_occurrences(template, start_date, end_date)

        assert len(occurrences) == 3
        assert occurrences[0] == date(2024, 1, 1)
        assert occurrences[1] == date(2024, 2, 1)
        assert occurrences[2] == date(2024, 3, 1)


class TestCalculateWeeklyOccurrences:
    """Tests for weekly recurring transaction calculation."""

    def test_weekly_on_monday(self):
        """Test weekly recurrence on Monday."""
        service = RecurringMaterializationService(None)

        # Monday = 0 in Python's weekday()
        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="weekly",
            day_of_month=None,
            day_of_week=0,  # Monday
            start_date=date(2024, 1, 1),  # Monday, Jan 1, 2024
            end_date=None,
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)

        occurrences = service._calculate_weekly_occurrences(template, start_date, end_date)

        # January 2024 has 5 Mondays (1, 8, 15, 22, 29)
        assert len(occurrences) == 5
        assert all(occ.weekday() == 0 for occ in occurrences)  # All Mondays

    def test_biweekly_on_friday(self):
        """Test biweekly recurrence on Friday."""
        service = RecurringMaterializationService(None)

        # Friday = 4 in Python's weekday()
        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="biweekly",
            day_of_month=None,
            day_of_week=4,  # Friday
            start_date=date(2024, 1, 5),  # Friday, Jan 5, 2024
            end_date=None,
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2024, 1, 1)
        end_date = date(2024, 2, 29)

        occurrences = service._calculate_weekly_occurrences(template, start_date, end_date)

        # Every other Friday: Jan 5, 19, Feb 2, 16
        assert len(occurrences) == 4
        assert all(occ.weekday() == 4 for occ in occurrences)  # All Fridays

        # Verify they're 14 days apart
        for i in range(len(occurrences) - 1):
            assert (occurrences[i + 1] - occurrences[i]).days == 14

    def test_weekly_with_total_occurrences(self):
        """Test weekly recurrence with total occurrences limit."""
        service = RecurringMaterializationService(None)

        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="weekly",
            day_of_month=None,
            day_of_week=2,  # Wednesday
            start_date=date(2024, 1, 3),  # Wednesday
            end_date=None,
            total_occurrences=3,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        start_date = date(2024, 1, 1)
        end_date = date(2024, 12, 31)

        occurrences = service._calculate_weekly_occurrences(template, start_date, end_date)

        assert len(occurrences) == 3
        assert occurrences[0] == date(2024, 1, 3)
        assert occurrences[1] == date(2024, 1, 10)
        assert occurrences[2] == date(2024, 1, 17)


class TestDateRangeBoundaries:
    """Tests for date range boundary handling."""

    def test_occurrences_respect_start_date(self):
        """Test that occurrences don't go before start_date."""
        service = RecurringMaterializationService(None)

        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="monthly",
            day_of_month=15,
            day_of_week=None,
            start_date=date(2024, 2, 15),
            end_date=None,
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        # Request range includes before start_date
        start_date = date(2024, 1, 1)
        end_date = date(2024, 3, 31)

        occurrences = service._calculate_monthly_occurrences(template, start_date, end_date)

        # Should only get Feb 15 and Mar 15, not Jan 15
        assert len(occurrences) == 2
        assert occurrences[0] == date(2024, 2, 15)
        assert occurrences[1] == date(2024, 3, 15)

    def test_occurrences_respect_end_date(self):
        """Test that occurrences don't go after end_date."""
        service = RecurringMaterializationService(None)

        template = RecurringTemplate(
            id=uuid4(),
            user_id=uuid4(),
            amount=Decimal("100.00"),
            type="expense",
            frequency="monthly",
            day_of_month=15,
            day_of_week=None,
            start_date=date(2024, 1, 15),
            end_date=None,
            total_occurrences=None,
            expense_category_id="essentials",
            expense_subcategory_id=None,
            income_category_id=None,
            notes="Test",
            transaction_tag="need",
            is_paused=False,
        )

        # Request range is limited
        start_date = date(2024, 1, 1)
        end_date = date(2024, 2, 20)

        occurrences = service._calculate_monthly_occurrences(template, start_date, end_date)

        # Should only get Jan 15 and Feb 15, not Mar 15
        assert len(occurrences) == 2
        assert occurrences[0] == date(2024, 1, 15)
        assert occurrences[1] == date(2024, 2, 15)
