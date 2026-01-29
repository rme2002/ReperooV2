"""seed spending categories

Revision ID: b2f1c0b9a7d2
Revises: 8f4f2038ed89
Create Date: 2026-01-04 15:12:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2f1c0b9a7d2"
down_revision: Union[str, Sequence[str], None] = "8f4f2038ed89"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed spending categories."""
    spending_categories = sa.table(
        "spending_categories",
        sa.column("id", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("color", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )
    op.bulk_insert(
        spending_categories,
        [
            {
                "id": "essentials",
                "label": "Essentials",
                "color": "#f59e0b",
                "sort_order": 1,
            },
            {
                "id": "lifestyle",
                "label": "Lifestyle",
                "color": "#f472b6",
                "sort_order": 2,
            },
            {
                "id": "personal",
                "label": "Personal",
                "color": "#3b82f6",
                "sort_order": 3,
            },
            {"id": "savings", "label": "Savings", "color": "#fbbf24", "sort_order": 4},
            {
                "id": "investments",
                "label": "Investments",
                "color": "#14b8a6",
                "sort_order": 5,
            },
            {"id": "other", "label": "Other", "color": "#a855f7", "sort_order": 6},
        ],
    )


def downgrade() -> None:
    """Remove seeded spending categories."""
    op.execute(
        sa.text(
            """
            DELETE FROM spending_categories
            WHERE id IN (:essentials, :lifestyle, :personal, :savings, :investments, :other)
            """
        ),
        {
            "essentials": "essentials",
            "lifestyle": "lifestyle",
            "personal": "personal",
            "savings": "savings",
            "investments": "investments",
            "other": "other",
        },
    )
