"""CLI script to generate recurring transactions for the current month.

This script should be run via cron job at the beginning of each month.
Example cron: 0 0 1 * * cd /path/to/api && uv run python -m src.cli.generate_recurring_transactions
"""

import sys
from datetime import datetime, timezone

from src.core.database import SessionLocal
from src.services.recurring_transaction_service import RecurringTransactionService


def main():
    """Generate recurring transactions for the current month."""
    print(f"Starting recurring transaction generation at {datetime.now(timezone.utc)}")

    # Get current month
    now = datetime.now(timezone.utc)

    # Create service
    service = RecurringTransactionService()

    # Generate transactions
    with SessionLocal() as session:
        try:
            count = service.generate_monthly_transactions(session, now)
            print(
                f"Successfully generated {count} recurring transactions for {now.strftime('%B %Y')}"
            )
            return 0
        except Exception as e:
            print(f"Error generating recurring transactions: {e}", file=sys.stderr)
            return 1


if __name__ == "__main__":
    sys.exit(main())
