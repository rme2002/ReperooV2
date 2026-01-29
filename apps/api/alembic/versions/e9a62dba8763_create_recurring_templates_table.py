"""create_recurring_templates_table

Revision ID: e9a62dba8763
Revises: bd66a81ff298
Create Date: 2026-01-09 22:13:47.372453

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e9a62dba8763"
down_revision: Union[str, Sequence[str], None] = "bd66a81ff298"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create recurring_templates table
    op.create_table(
        "recurring_templates",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("expense_category_id", sa.Text(), nullable=True),
        sa.Column("expense_subcategory_id", sa.Text(), nullable=True),
        sa.Column("income_category_id", sa.Text(), nullable=True),
        sa.Column("transaction_tag", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("frequency", sa.Text(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("day_of_month", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_occurrences", sa.Integer(), nullable=True),
        sa.Column("is_paused", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(type = 'expense' AND expense_category_id IS NOT NULL AND income_category_id IS NULL AND transaction_tag IS NOT NULL) OR (type = 'income' AND income_category_id IS NOT NULL AND expense_category_id IS NULL)",
            name="recurring_templates_category_check",
        ),
        sa.CheckConstraint(
            "(frequency = 'monthly' AND day_of_month IS NOT NULL AND day_of_week IS NULL) OR (frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL AND day_of_month IS NULL)",
            name="recurring_templates_frequency_check",
        ),
        sa.CheckConstraint(
            "frequency IN ('weekly', 'biweekly', 'monthly')",
            name="recurring_templates_frequency_values_check",
        ),
        sa.CheckConstraint(
            "type IN ('expense', 'income')", name="recurring_templates_type_check"
        ),
        sa.ForeignKeyConstraint(["expense_category_id"], ["expense_categories.id"]),
        sa.ForeignKeyConstraint(
            ["expense_subcategory_id"], ["expense_subcategories.id"]
        ),
        sa.ForeignKeyConstraint(["income_category_id"], ["income_categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for recurring_templates
    op.create_index(
        "idx_recurring_templates_user_id", "recurring_templates", ["user_id"]
    )
    op.create_index(
        "idx_recurring_templates_start_date", "recurring_templates", ["start_date"]
    )
    op.create_index(
        "idx_recurring_templates_is_paused", "recurring_templates", ["is_paused"]
    )

    # Update transactions table: change recurring_template_id FK to point to recurring_templates
    # First drop the old FK constraint
    op.drop_constraint(
        "fk_transactions_recurring_template_id", "transactions", type_="foreignkey"
    )

    # Create new FK constraint pointing to recurring_templates table
    op.create_foreign_key(
        "fk_transactions_recurring_template_id",
        "transactions",
        "recurring_templates",
        ["recurring_template_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Remove old recurring fields from transactions (no longer needed)
    op.drop_column("transactions", "is_recurring")
    op.drop_column("transactions", "recurring_day_of_month")

    # Create index for transactions.recurring_template_id
    op.create_index(
        "idx_transactions_recurring_template_id",
        "transactions",
        ["recurring_template_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index
    op.drop_index("idx_transactions_recurring_template_id", "transactions")

    # Restore old recurring fields to transactions
    op.add_column(
        "transactions", sa.Column("recurring_day_of_month", sa.Integer(), nullable=True)
    )
    op.add_column(
        "transactions",
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"),
    )

    # Drop FK constraint pointing to recurring_templates
    op.drop_constraint(
        "fk_transactions_recurring_template_id", "transactions", type_="foreignkey"
    )

    # Restore old FK constraint (self-referencing)
    op.create_foreign_key(
        "fk_transactions_recurring_template_id",
        "transactions",
        "transactions",
        ["recurring_template_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Drop indexes for recurring_templates
    op.drop_index("idx_recurring_templates_is_paused", "recurring_templates")
    op.drop_index("idx_recurring_templates_start_date", "recurring_templates")
    op.drop_index("idx_recurring_templates_user_id", "recurring_templates")

    # Drop recurring_templates table
    op.drop_table("recurring_templates")
