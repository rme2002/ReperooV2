"""API routes for expense categories."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.core.database import get_session
from src.db.models.expense_category import ExpenseCategory
from src.db.models.expense_subcategory import ExpenseSubcategory

router = APIRouter()


@router.get("/list", status_code=status.HTTP_200_OK)
async def list_expense_categories(
    session: Session = Depends(get_session),
) -> list[dict]:
    """List all expense categories with their subcategories."""
    # Fetch all categories
    categories_stmt = select(ExpenseCategory).order_by(ExpenseCategory.sort_order)
    categories = session.execute(categories_stmt).scalars().all()

    # Fetch all subcategories
    subcategories_stmt = select(ExpenseSubcategory).order_by(
        ExpenseSubcategory.category_id, ExpenseSubcategory.sort_order
    )
    subcategories = session.execute(subcategories_stmt).scalars().all()

    # Group subcategories by category
    subcategories_by_category: dict[str, list] = {}
    for subcat in subcategories:
        if subcat.category_id not in subcategories_by_category:
            subcategories_by_category[subcat.category_id] = []
        subcategories_by_category[subcat.category_id].append(
            {
                "id": subcat.id,
                "category_id": subcat.category_id,
                "label": subcat.label,
                "sub_color": subcat.sub_color,
                "sort_order": subcat.sort_order,
            }
        )

    # Build response
    return [
        {
            "id": cat.id,
            "label": cat.label,
            "color": cat.color,
            "sort_order": cat.sort_order,
            "subcategories": subcategories_by_category.get(cat.id, []),
        }
        for cat in categories
    ]
