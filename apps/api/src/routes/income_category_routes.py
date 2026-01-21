"""API routes for income categories."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.core.database import get_session
from src.db.models.income_category import IncomeCategory

router = APIRouter()


@router.get("/list", status_code=status.HTTP_200_OK)
async def list_income_categories(
    session: Session = Depends(get_session),
) -> list[dict]:
    """List all income categories."""
    stmt = select(IncomeCategory).order_by(IncomeCategory.sort_order)
    categories = session.execute(stmt).scalars().all()

    return [
        {
            "id": cat.id,
            "label": cat.label,
            "color": cat.color,
            "sort_order": cat.sort_order,
        }
        for cat in categories
    ]
