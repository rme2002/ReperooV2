"""add spending subcategories

Revision ID: c7a4d31c2b6f
Revises: b2f1c0b9a7d2
Create Date: 2026-01-04 15:20:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c7a4d31c2b6f"
down_revision: Union[str, Sequence[str], None] = "b2f1c0b9a7d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "spending_subcategories",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("category_id", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("sub_color", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["category_id"], ["spending_categories.id"]),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("spending_subcategories")
