"""remove payday fields from budget plans

Revision ID: e6058eb8d90b
Revises: 8b003cd27c50
Create Date: 2026-01-12 00:16:58.590485

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e6058eb8d90b"
down_revision: Union[str, Sequence[str], None] = "8b003cd27c50"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop check constraints before dropping columns
    op.drop_constraint("ck_budget_plans_pay_schedule", "budget_plans", type_="check")
    op.drop_constraint("ck_budget_plans_payday_range", "budget_plans", type_="check")

    # Drop the payday columns
    op.drop_column("budget_plans", "pay_schedule")
    op.drop_column("budget_plans", "payday_day_of_month")


def downgrade() -> None:
    """Downgrade schema."""
    # Add back the payday columns
    op.add_column(
        "budget_plans",
        sa.Column(
            "payday_day_of_month", sa.INTEGER(), autoincrement=False, nullable=True
        ),
    )
    op.add_column(
        "budget_plans",
        sa.Column(
            "pay_schedule", sa.VARCHAR(length=20), autoincrement=False, nullable=True
        ),
    )

    # Recreate the check constraints
    op.create_check_constraint(
        "ck_budget_plans_payday_range",
        "budget_plans",
        "payday_day_of_month IS NULL OR (payday_day_of_month >= 1 AND payday_day_of_month <= 31)",
    )
    op.create_check_constraint(
        "ck_budget_plans_pay_schedule",
        "budget_plans",
        "pay_schedule IS NULL OR pay_schedule IN ('monthly', 'irregular')",
    )
