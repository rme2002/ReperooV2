"""seed expense categories and subcategories

Revision ID: e2b8a1c3d4f5
Revises: 9ffccc7559b4
Create Date: 2026-01-04 18:10:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2b8a1c3d4f5"
down_revision: Union[str, Sequence[str], None] = "9ffccc7559b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed expense categories and subcategories."""
    expense_categories = sa.table(
        "expense_categories",
        sa.column("id", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("color", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )
    expense_subcategories = sa.table(
        "expense_subcategories",
        sa.column("id", sa.Text()),
        sa.column("category_id", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("sub_color", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )
    op.bulk_insert(
        expense_categories,
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
    op.bulk_insert(
        expense_subcategories,
        [
            {
                "id": "groceries",
                "category_id": "essentials",
                "label": "Groceries",
                "sub_color": "#fef3c7",
                "sort_order": 1,
            },
            {
                "id": "housing_bills",
                "category_id": "essentials",
                "label": "Housing & Bills",
                "sub_color": "#fde68a",
                "sort_order": 2,
            },
            {
                "id": "debt_loans",
                "category_id": "essentials",
                "label": "Debt & Loans",
                "sub_color": "#fcd34d",
                "sort_order": 3,
            },
            {
                "id": "transport",
                "category_id": "essentials",
                "label": "Transport",
                "sub_color": "#fbbf24",
                "sort_order": 4,
            },
            {
                "id": "health_insurance",
                "category_id": "essentials",
                "label": "Health & Insurance",
                "sub_color": "#f59e0b",
                "sort_order": 5,
            },
            {
                "id": "essentials_other",
                "category_id": "essentials",
                "label": "Other",
                "sub_color": "#d97706",
                "sort_order": 6,
            },
            {
                "id": "food_drinks_out",
                "category_id": "lifestyle",
                "label": "Food & Drinks Out",
                "sub_color": "#fce7f3",
                "sort_order": 1,
            },
            {
                "id": "entertainment",
                "category_id": "lifestyle",
                "label": "Entertainment",
                "sub_color": "#fbcfe8",
                "sort_order": 2,
            },
            {
                "id": "hobbies",
                "category_id": "lifestyle",
                "label": "Hobbies",
                "sub_color": "#f9a8d4",
                "sort_order": 3,
            },
            {
                "id": "travel",
                "category_id": "lifestyle",
                "label": "Travel",
                "sub_color": "#f472b6",
                "sort_order": 4,
            },
            {
                "id": "fitness",
                "category_id": "lifestyle",
                "label": "Fitness & Sports",
                "sub_color": "#ec4899",
                "sort_order": 5,
            },
            {
                "id": "lifestyle_other",
                "category_id": "lifestyle",
                "label": "Other",
                "sub_color": "#db2777",
                "sort_order": 6,
            },
            {
                "id": "shopping",
                "category_id": "personal",
                "label": "Shopping (Clothing/Tech/Home)",
                "sub_color": "#dbeafe",
                "sort_order": 1,
            },
            {
                "id": "beauty_care",
                "category_id": "personal",
                "label": "Beauty & Care",
                "sub_color": "#bfdbfe",
                "sort_order": 2,
            },
            {
                "id": "home_household",
                "category_id": "personal",
                "label": "Home & Household",
                "sub_color": "#93c5fd",
                "sort_order": 3,
            },
            {
                "id": "gifts_giving",
                "category_id": "personal",
                "label": "Gifts & Giving",
                "sub_color": "#60a5fa",
                "sort_order": 4,
            },
            {
                "id": "electronics_tech",
                "category_id": "personal",
                "label": "Electronics & Tech",
                "sub_color": "#3b82f6",
                "sort_order": 5,
            },
            {
                "id": "personal_other",
                "category_id": "personal",
                "label": "Other",
                "sub_color": "#2563eb",
                "sort_order": 6,
            },
            {
                "id": "emergency_fund",
                "category_id": "savings",
                "label": "Emergency Fund",
                "sub_color": "#fef9c3",
                "sort_order": 1,
            },
            {
                "id": "general_savings",
                "category_id": "savings",
                "label": "General Savings",
                "sub_color": "#fef08a",
                "sort_order": 2,
            },
            {
                "id": "holiday_fund",
                "category_id": "savings",
                "label": "Holiday Fund",
                "sub_color": "#fde047",
                "sort_order": 3,
            },
            {
                "id": "big_purchases",
                "category_id": "savings",
                "label": "Big Purchases",
                "sub_color": "#facc15",
                "sort_order": 4,
            },
            {
                "id": "savings_other",
                "category_id": "savings",
                "label": "Other",
                "sub_color": "#fbbf24",
                "sort_order": 5,
            },
            {
                "id": "market_investing",
                "category_id": "investments",
                "label": "Market Investing (Stocks/ETFs)",
                "sub_color": "#ccfbf1",
                "sort_order": 1,
            },
            {
                "id": "retirement_pension",
                "category_id": "investments",
                "label": "Retirement / Pension",
                "sub_color": "#99f6e4",
                "sort_order": 2,
            },
            {
                "id": "crypto",
                "category_id": "investments",
                "label": "Crypto",
                "sub_color": "#5eead4",
                "sort_order": 3,
            },
            {
                "id": "investments_other",
                "category_id": "investments",
                "label": "Other",
                "sub_color": "#2dd4bf",
                "sort_order": 4,
            },
            {
                "id": "fees_interest",
                "category_id": "other",
                "label": "Fees & Interest",
                "sub_color": "#ede9fe",
                "sort_order": 1,
            },
            {
                "id": "cash_withdrawal",
                "category_id": "other",
                "label": "Cash Withdrawal",
                "sub_color": "#ddd6fe",
                "sort_order": 2,
            },
            {
                "id": "transfers",
                "category_id": "other",
                "label": "Transfers",
                "sub_color": "#c4b5fd",
                "sort_order": 3,
            },
            {
                "id": "other_misc",
                "category_id": "other",
                "label": "Other",
                "sub_color": "#a855f7",
                "sort_order": 4,
            },
        ],
    )


def downgrade() -> None:
    """Remove seeded expense categories and subcategories."""
    op.execute(
        sa.text(
            """
            DELETE FROM expense_subcategories
            WHERE id IN (
                :groceries, :housing_bills, :debt_loans, :transport, :health_insurance, :essentials_other,
                :food_drinks_out, :entertainment, :hobbies, :travel, :fitness, :lifestyle_other,
                :shopping, :beauty_care, :home_household, :gifts_giving, :electronics_tech, :personal_other,
                :emergency_fund, :general_savings, :holiday_fund, :big_purchases, :savings_other,
                :market_investing, :retirement_pension, :crypto, :investments_other,
                :fees_interest, :cash_withdrawal, :transfers, :other_misc
            )
            """
        ),
        {
            "groceries": "groceries",
            "housing_bills": "housing_bills",
            "debt_loans": "debt_loans",
            "transport": "transport",
            "health_insurance": "health_insurance",
            "essentials_other": "essentials_other",
            "food_drinks_out": "food_drinks_out",
            "entertainment": "entertainment",
            "hobbies": "hobbies",
            "travel": "travel",
            "fitness": "fitness",
            "lifestyle_other": "lifestyle_other",
            "shopping": "shopping",
            "beauty_care": "beauty_care",
            "home_household": "home_household",
            "gifts_giving": "gifts_giving",
            "electronics_tech": "electronics_tech",
            "personal_other": "personal_other",
            "emergency_fund": "emergency_fund",
            "general_savings": "general_savings",
            "holiday_fund": "holiday_fund",
            "big_purchases": "big_purchases",
            "savings_other": "savings_other",
            "market_investing": "market_investing",
            "retirement_pension": "retirement_pension",
            "crypto": "crypto",
            "investments_other": "investments_other",
            "fees_interest": "fees_interest",
            "cash_withdrawal": "cash_withdrawal",
            "transfers": "transfers",
            "other_misc": "other_misc",
        },
    )
    op.execute(
        sa.text(
            """
            DELETE FROM expense_categories
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
