"""add_budget_plan_fields

Revision ID: 8b003cd27c50
Revises: e9a62dba8763
Create Date: 2026-01-11 13:53:48.378653

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8b003cd27c50"
down_revision: Union[str, Sequence[str], None] = "e9a62dba8763"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns
    op.add_column(
        "budget_plans", sa.Column("payday_day_of_month", sa.Integer(), nullable=True)
    )
    op.add_column(
        "budget_plans", sa.Column("pay_schedule", sa.String(20), nullable=True)
    )

    # Make existing columns nullable
    op.alter_column("budget_plans", "savings_goal", nullable=True)
    op.alter_column("budget_plans", "investment_goal", nullable=True)

    # Add constraints
    op.create_check_constraint(
        "ck_budget_plans_savings_goal_positive",
        "budget_plans",
        "savings_goal IS NULL OR savings_goal >= 0",
    )
    op.create_check_constraint(
        "ck_budget_plans_investment_goal_positive",
        "budget_plans",
        "investment_goal IS NULL OR investment_goal >= 0",
    )
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

    # Add unique constraint on user_id
    op.create_unique_constraint("uq_budget_plans_user_id", "budget_plans", ["user_id"])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove constraints
    op.drop_constraint("uq_budget_plans_user_id", "budget_plans", type_="unique")
    op.drop_constraint("ck_budget_plans_pay_schedule", "budget_plans", type_="check")
    op.drop_constraint("ck_budget_plans_payday_range", "budget_plans", type_="check")
    op.drop_constraint(
        "ck_budget_plans_investment_goal_positive", "budget_plans", type_="check"
    )
    op.drop_constraint(
        "ck_budget_plans_savings_goal_positive", "budget_plans", type_="check"
    )

    # Revert column changes
    op.alter_column("budget_plans", "investment_goal", nullable=False)
    op.alter_column("budget_plans", "savings_goal", nullable=False)

    # Remove new columns
    op.drop_column("budget_plans", "pay_schedule")
    op.drop_column("budget_plans", "payday_day_of_month")
