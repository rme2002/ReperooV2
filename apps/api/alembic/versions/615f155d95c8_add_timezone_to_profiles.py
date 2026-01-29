"""add_timezone_to_profiles

Revision ID: 615f155d95c8
Revises: 719fb9e122c7
Create Date: 2026-01-29 20:23:42.190518

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "615f155d95c8"
down_revision: Union[str, Sequence[str], None] = "719fb9e122c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "profiles",
        sa.Column("timezone", sa.Text(), nullable=False, server_default="UTC"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("profiles", "timezone")
