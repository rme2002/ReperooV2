"""add recurring fields to transactions

Revision ID: bd66a81ff298
Revises: c637ba4a0636
Create Date: 2026-01-09 20:31:32.712940

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "bd66a81ff298"
down_revision: Union[str, Sequence[str], None] = "c637ba4a0636"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add recurring fields to transactions table
    op.add_column(
        "transactions",
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "transactions", sa.Column("recurring_day_of_month", sa.Integer(), nullable=True)
    )
    op.add_column(
        "transactions", sa.Column("recurring_template_id", sa.UUID(), nullable=True)
    )

    # Add foreign key constraint for recurring_template_id
    op.create_foreign_key(
        "fk_transactions_recurring_template_id",
        "transactions",
        "transactions",
        ["recurring_template_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove foreign key constraint
    op.drop_constraint(
        "fk_transactions_recurring_template_id", "transactions", type_="foreignkey"
    )

    # Remove recurring fields
    op.drop_column("transactions", "recurring_template_id")
    op.drop_column("transactions", "recurring_day_of_month")
    op.drop_column("transactions", "is_recurring")
