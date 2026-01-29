"""seed income categories

Revision ID: f1c2d3e4f5a6
Revises: 274afe1fa989
Create Date: 2026-01-04 18:20:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "274afe1fa989"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed income categories."""
    income_categories = sa.table(
        "income_categories",
        sa.column("id", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("color", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )
    op.bulk_insert(
        income_categories,
        [
            {"id": "salary", "label": "Salary", "color": "#2563EB", "sort_order": 1},
            {
                "id": "freelance_business",
                "label": "Freelance / Business",
                "color": "#F97316",
                "sort_order": 2,
            },
            {
                "id": "government_benefits",
                "label": "Government / Benefits",
                "color": "#7C3AED",
                "sort_order": 3,
            },
            {
                "id": "investment_income",
                "label": "Investment Income",
                "color": "#16A34A",
                "sort_order": 4,
            },
            {
                "id": "refunds_reimbursements",
                "label": "Refunds / Reimbursements",
                "color": "#0EA5E9",
                "sort_order": 5,
            },
            {
                "id": "income_other",
                "label": "Other",
                "color": "#64748B",
                "sort_order": 6,
            },
        ],
    )


def downgrade() -> None:
    """Remove seeded income categories."""
    op.execute(
        sa.text(
            """
            DELETE FROM income_categories
            WHERE id IN (
                :salary, :freelance_business, :government_benefits,
                :investment_income, :refunds_reimbursements, :income_other
            )
            """
        ),
        {
            "salary": "salary",
            "freelance_business": "freelance_business",
            "government_benefits": "government_benefits",
            "investment_income": "investment_income",
            "refunds_reimbursements": "refunds_reimbursements",
            "income_other": "income_other",
        },
    )
