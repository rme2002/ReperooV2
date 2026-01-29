from datetime import date, datetime
from zoneinfo import ZoneInfo


def get_user_today(user_timezone: str) -> date:
    """
    Get today's date in user's timezone.

    Args:
        user_timezone: IANA timezone (e.g., 'America/Los_Angeles')

    Returns:
        Today's date in user's timezone

    Example:
        >>> get_user_today('America/Los_Angeles')
        date(2024, 1, 15)
    """
    try:
        local_tz = ZoneInfo(user_timezone)
        return datetime.now(local_tz).date()
    except Exception:
        # Fallback to UTC if timezone is invalid
        return datetime.now(ZoneInfo('UTC')).date()


def parse_date_string(date_str: str | date | None, *, allow_datetime: bool = True) -> date:
    """
    Parse date string to Python date object.

    Supports both YYYY-MM-DD and ISO 8601 datetime formats.
    If a date object is passed, it is returned as-is.

    Args:
        date_str: Date string in YYYY-MM-DD format, ISO 8601 datetime format, or date object

    Returns:
        Python date object

    Raises:
        ValueError: If date string is invalid

    Example:
        >>> parse_date_string('2024-01-15')
        date(2024, 1, 15)
        >>> parse_date_string('2024-01-15T23:00:00.000Z')
        date(2024, 1, 15)
        >>> parse_date_string(date(2024, 1, 15))
        date(2024, 1, 15)
    """
    # If already a date object, return it
    if isinstance(date_str, date):
        return date_str
    if not isinstance(date_str, str):
        raise ValueError(
            f"Invalid date format: {date_str}. Expected YYYY-MM-DD or ISO 8601 datetime"
        )

    try:
        # Handle ISO datetime format (contains 'T')
        if 'T' in date_str:
            if not allow_datetime:
                raise ValueError(
                    f"Invalid date format: {date_str}. Expected YYYY-MM-DD"
                )
            # Parse as ISO datetime and extract date
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.date()

        # Handle simple date format YYYY-MM-DD
        year, month, day = date_str.split('-')
        return date(int(year), int(month), int(day))
    except (ValueError, AttributeError) as e:
        raise ValueError(f"Invalid date format: {date_str}. Expected YYYY-MM-DD or ISO 8601 datetime") from e
