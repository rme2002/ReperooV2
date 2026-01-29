"""Tests for date utility functions."""

import pytest
from datetime import date, datetime
from zoneinfo import ZoneInfo

from src.utils.date_utils import get_user_today, parse_date_string


class TestGetUserToday:
    """Tests for get_user_today function."""

    def test_get_today_utc(self):
        """Test getting today's date in UTC."""
        result = get_user_today("UTC")
        expected = datetime.now(ZoneInfo("UTC")).date()
        assert result == expected
        assert isinstance(result, date)

    def test_get_today_los_angeles(self):
        """Test getting today's date in Los Angeles timezone."""
        result = get_user_today("America/Los_Angeles")
        expected = datetime.now(ZoneInfo("America/Los_Angeles")).date()
        assert result == expected
        assert isinstance(result, date)

    def test_get_today_new_york(self):
        """Test getting today's date in New York timezone."""
        result = get_user_today("America/New_York")
        expected = datetime.now(ZoneInfo("America/New_York")).date()
        assert result == expected
        assert isinstance(result, date)

    def test_get_today_tokyo(self):
        """Test getting today's date in Tokyo timezone."""
        result = get_user_today("Asia/Tokyo")
        expected = datetime.now(ZoneInfo("Asia/Tokyo")).date()
        assert result == expected
        assert isinstance(result, date)

    def test_invalid_timezone_fallback_to_utc(self):
        """Test that invalid timezone falls back to UTC."""
        result = get_user_today("Invalid/Timezone")
        expected = datetime.now(ZoneInfo("UTC")).date()
        assert result == expected
        assert isinstance(result, date)

    def test_empty_timezone_fallback_to_utc(self):
        """Test that empty timezone falls back to UTC."""
        result = get_user_today("")
        expected = datetime.now(ZoneInfo("UTC")).date()
        assert result == expected
        assert isinstance(result, date)


class TestParseDateString:
    """Tests for parse_date_string function."""

    def test_parse_valid_date(self):
        """Test parsing a valid YYYY-MM-DD date string."""
        result = parse_date_string("2024-06-15")
        assert result == date(2024, 6, 15)
        assert isinstance(result, date)

    def test_parse_start_of_year(self):
        """Test parsing January 1st."""
        result = parse_date_string("2024-01-01")
        assert result == date(2024, 1, 1)

    def test_parse_end_of_year(self):
        """Test parsing December 31st."""
        result = parse_date_string("2024-12-31")
        assert result == date(2024, 12, 31)

    def test_parse_leap_year_date(self):
        """Test parsing February 29th in a leap year."""
        result = parse_date_string("2024-02-29")
        assert result == date(2024, 2, 29)

    def test_parse_single_digit_month(self):
        """Test parsing date with single-digit month."""
        result = parse_date_string("2024-03-15")
        assert result == date(2024, 3, 15)

    def test_parse_single_digit_day(self):
        """Test parsing date with single-digit day."""
        result = parse_date_string("2024-06-05")
        assert result == date(2024, 6, 5)

    def test_invalid_format_raises_error(self):
        """Test that invalid format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid date format"):
            parse_date_string("06-15-2024")  # Wrong format

    def test_parse_iso_datetime_string(self):
        """Test that ISO datetime string is parsed correctly (extracts date part)."""
        result = parse_date_string("2024-06-15T13:45:00Z")
        assert result == date(2024, 6, 15)
        assert isinstance(result, date)

    def test_parse_date_object_returns_same(self):
        """Test that passing a date object returns it unchanged."""
        input_date = date(2024, 6, 15)
        result = parse_date_string(input_date)
        assert result == input_date
        assert result is input_date

    def test_invalid_month_raises_error(self):
        """Test that invalid month raises ValueError."""
        with pytest.raises(ValueError):
            parse_date_string("2024-13-15")  # Month 13

    def test_invalid_day_raises_error(self):
        """Test that invalid day raises ValueError."""
        with pytest.raises(ValueError):
            parse_date_string("2024-06-32")  # Day 32

    def test_empty_string_raises_error(self):
        """Test that empty string raises ValueError."""
        with pytest.raises(ValueError, match="Invalid date format"):
            parse_date_string("")

    def test_none_raises_error(self):
        """Test that None raises ValueError."""
        with pytest.raises(ValueError, match="Invalid date format"):
            parse_date_string(None)

    def test_too_short_string_raises_error(self):
        """Test that too short string raises ValueError."""
        with pytest.raises(ValueError):
            parse_date_string("2024-06")

    def test_too_long_string_raises_error(self):
        """Test that too long string raises ValueError."""
        with pytest.raises(ValueError):
            parse_date_string("2024-06-15-01")


class TestDateUtilsIntegration:
    """Integration tests for date utilities."""

    def test_parse_then_compare_with_today(self):
        """Test parsing a date and comparing with user's today."""
        today_str = get_user_today("America/New_York").isoformat()
        parsed = parse_date_string(today_str)
        assert parsed == get_user_today("America/New_York")

    def test_roundtrip_date_conversion(self):
        """Test converting date to string and back."""
        original = date(2024, 6, 15)
        date_str = original.isoformat()
        parsed = parse_date_string(date_str)
        assert parsed == original

    def test_timezone_consistency(self):
        """Test that get_user_today is consistent for same timezone."""
        result1 = get_user_today("Europe/London")
        result2 = get_user_today("Europe/London")
        # Should be the same unless called exactly at midnight
        assert result1 == result2
