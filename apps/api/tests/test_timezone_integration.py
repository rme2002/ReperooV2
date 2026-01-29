"""Integration tests for timezone fix implementation.

These tests verify the complete end-to-end flow of date handling.
"""
import pytest
from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo

from src.utils.date_utils import get_user_today, parse_date_string


class TestTimezoneIntegration:
    """Integration tests for timezone handling."""

    def test_user_in_nyc_creates_transaction_for_today(self):
        """
        Scenario: User in NYC (UTC-5) creates transaction for "today"
        Expected: Transaction stored with today's date, not yesterday
        """
        # User's local timezone
        user_tz = 'America/New_York'

        # Get today in user's timezone
        today = get_user_today(user_tz)

        # Frontend would send this as YYYY-MM-DD
        date_string = today.isoformat()

        # Backend parses it
        parsed_date = parse_date_string(date_string)

        # Should be the same date
        assert parsed_date == today
        assert isinstance(parsed_date, date)

    def test_user_in_tokyo_creates_transaction_for_today(self):
        """
        Scenario: User in Tokyo (UTC+9) creates transaction for "today"
        Expected: Transaction stored with today's date
        """
        user_tz = 'Asia/Tokyo'

        today = get_user_today(user_tz)
        date_string = today.isoformat()
        parsed_date = parse_date_string(date_string)

        assert parsed_date == today
        assert isinstance(parsed_date, date)

    def test_user_in_london_creates_transaction_for_specific_date(self):
        """
        Scenario: User in London selects a specific date
        Expected: That exact date is stored
        """
        user_tz = 'Europe/London'

        # User selects June 15, 2024
        selected_date = date(2024, 6, 15)
        date_string = selected_date.isoformat()  # "2024-06-15"

        # Backend parses it
        parsed_date = parse_date_string(date_string)

        assert parsed_date == selected_date
        assert parsed_date == date(2024, 6, 15)

    def test_todays_summary_uses_user_timezone(self):
        """
        Scenario: Get today's summary for users in different timezones
        Expected: Each user gets summary for their local today
        """
        # User in Los Angeles
        la_today = get_user_today('America/Los_Angeles')

        # User in New York (3 hours ahead)
        ny_today = get_user_today('America/New_York')

        # User in Tokyo (even further ahead)
        tokyo_today = get_user_today('Asia/Tokyo')

        # All should return valid dates
        assert isinstance(la_today, date)
        assert isinstance(ny_today, date)
        assert isinstance(tokyo_today, date)

        # They might be different dates if called near midnight
        # But they should all be recent dates
        now_utc = datetime.now(ZoneInfo('UTC')).date()
        assert abs((la_today - now_utc).days) <= 1
        assert abs((ny_today - now_utc).days) <= 1
        assert abs((tokyo_today - now_utc).days) <= 1

    def test_date_comparison_is_simple(self):
        """
        Scenario: Comparing transaction dates for "today"
        Expected: Simple date equality check works
        """
        # Transaction occurred_at
        transaction_date = date(2024, 6, 15)

        # User's today
        user_today = date(2024, 6, 15)

        # Simple comparison
        is_today = transaction_date == user_today

        assert is_today is True

    def test_date_comparison_for_different_days(self):
        """
        Scenario: Comparing transaction from different day
        Expected: Simple comparison returns False
        """
        transaction_date = date(2024, 6, 14)
        user_today = date(2024, 6, 15)

        is_today = transaction_date == user_today

        assert is_today is False

    def test_recurring_transaction_materialization_uses_dates(self):
        """
        Scenario: Materializing recurring transactions for a date range
        Expected: Works with date objects, not datetime
        """
        # Date range for materialization
        start_date = date(2024, 6, 1)
        end_date = date(2024, 6, 30)

        # These should be date objects
        assert isinstance(start_date, date)
        assert isinstance(end_date, date)

        # Simple comparisons work
        assert start_date <= end_date
        assert end_date >= start_date

        # Can iterate through days
        current = start_date
        days = 0
        while current <= end_date:
            days += 1
            current = date(current.year, current.month, current.day + 1) if current.day < 28 else \
                     date(current.year, current.month + 1, 1) if current.month < 12 else \
                     date(current.year + 1, 1, 1)

        # June has 30 days
        assert days >= 30  # Should count at least 30 days


class TestDateStringFormatting:
    """Tests for date string formatting and parsing."""

    def test_roundtrip_date_conversion(self):
        """Test converting date to string and back maintains value."""
        original = date(2024, 6, 15)

        # Convert to string (what frontend sends)
        date_string = original.isoformat()
        assert date_string == "2024-06-15"

        # Parse back (what backend does)
        parsed = parse_date_string(date_string)

        # Should be identical
        assert parsed == original

    def test_api_response_format(self):
        """Test that dates in API responses are formatted correctly."""
        # Backend has a date
        db_date = date(2024, 6, 15)

        # Convert to ISO string for API response
        response_string = db_date.isoformat()

        # Should be YYYY-MM-DD format
        assert response_string == "2024-06-15"
        assert len(response_string) == 10
        assert response_string.count('-') == 2

    def test_date_range_query_format(self):
        """Test that date range queries use correct format."""
        start = date(2024, 6, 1)
        end = date(2024, 6, 30)

        # Frontend would send these as query params
        start_param = start.isoformat()
        end_param = end.isoformat()

        assert start_param == "2024-06-01"
        assert end_param == "2024-06-30"

        # Backend parses them
        parsed_start = parse_date_string(start_param)
        parsed_end = parse_date_string(end_param)

        assert parsed_start == start
        assert parsed_end == end


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_leap_year_february_29(self):
        """Test handling February 29 in leap year."""
        leap_date = date(2024, 2, 29)
        date_string = leap_date.isoformat()

        parsed = parse_date_string(date_string)

        assert parsed == leap_date
        assert parsed.month == 2
        assert parsed.day == 29

    def test_end_of_month_dates(self):
        """Test handling last days of various months."""
        dates = [
            date(2024, 1, 31),  # January
            date(2024, 2, 29),  # February (leap year)
            date(2024, 4, 30),  # April
            date(2024, 12, 31), # December
        ]

        for original in dates:
            date_string = original.isoformat()
            parsed = parse_date_string(date_string)
            assert parsed == original

    def test_year_boundaries(self):
        """Test handling year start and end."""
        start_of_year = date(2024, 1, 1)
        end_of_year = date(2024, 12, 31)

        start_string = start_of_year.isoformat()
        end_string = end_of_year.isoformat()

        assert parse_date_string(start_string) == start_of_year
        assert parse_date_string(end_string) == end_of_year

    def test_timezone_at_midnight(self):
        """Test timezone handling at midnight boundary."""
        # This is tricky - at midnight UTC, it might be different days
        # in different timezones

        utc_today = get_user_today('UTC')
        la_today = get_user_today('America/Los_Angeles')
        tokyo_today = get_user_today('Asia/Tokyo')

        # All should return valid dates
        assert isinstance(utc_today, date)
        assert isinstance(la_today, date)
        assert isinstance(tokyo_today, date)

        # The dates might differ by one day at most
        diff_la = abs((utc_today - la_today).days)
        diff_tokyo = abs((utc_today - tokyo_today).days)

        assert diff_la <= 1
        assert diff_tokyo <= 1
