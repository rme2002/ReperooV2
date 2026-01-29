"""change_recurring_template_dates_to_date

Revision ID: 719fb9e122c7
Revises: 046b6667cc31
Create Date: 2026-01-29 20:23:10.046217

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "719fb9e122c7"
down_revision: Union[str, Sequence[str], None] = "046b6667cc31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        ALTER TABLE recurring_templates
        ALTER COLUMN start_date TYPE date USING start_date::date,
        ALTER COLUMN end_date TYPE date USING end_date::date;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        ALTER TABLE recurring_templates
        ALTER COLUMN start_date TYPE timestamp with time zone
            USING start_date::timestamp with time zone,
        ALTER COLUMN end_date TYPE timestamp with time zone
            USING end_date::timestamp with time zone;
    """)
