"""change_occurred_at_to_date

Revision ID: 046b6667cc31
Revises: 56c68f1f4c63
Create Date: 2026-01-29 20:22:04.894788

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '046b6667cc31'
down_revision: Union[str, Sequence[str], None] = '56c68f1f4c63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        ALTER TABLE transactions
        ALTER COLUMN occurred_at TYPE date USING occurred_at::date;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        ALTER TABLE transactions
        ALTER COLUMN occurred_at TYPE timestamp with time zone
        USING occurred_at::timestamp with time zone;
    """)
