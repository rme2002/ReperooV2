from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user_id
from src.core.database import get_session
from src.models.model import AvailableMonth, MonthSnapshot
from src.repositories.budget_plan_repository import BudgetPlanRepository
from src.repositories.insights_repository import InsightsRepository
from src.services.errors import (
    BudgetPlanNotFoundError,
    InsightsNotFoundError,
    InsightsValidationError,
)
from src.services.insights_service import InsightsService

router = APIRouter()


def get_insights_service(
    session: Session = Depends(get_session),
) -> InsightsService:
    """Dependency factory for InsightsService."""
    insights_repository = InsightsRepository()
    budget_plan_repository = BudgetPlanRepository()
    return InsightsService(insights_repository, budget_plan_repository)


@router.get("/month-snapshot", status_code=status.HTTP_200_OK)
async def get_month_snapshot(
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    current_user_id: UUID = Depends(get_current_user_id),
    insights_service: InsightsService = Depends(get_insights_service),
    session: Session = Depends(get_session),
) -> MonthSnapshot:
    """
    Get detailed spending insights for a specific month.

    Includes:
    - Total spending and budget comparison
    - Category/subcategory breakdown with percentages
    - Weekly spending trends
    - Savings and investment totals
    - Month-over-month delta
    - Recent transactions

    Args:
        year: Year (2000-2100)
        month: Month (1-12)
        current_user_id: Authenticated user ID from JWT token
        insights_service: Insights service instance
        session: Database session

    Returns:
        MonthSnapshot with all insights data

    Raises:
        HTTPException: 400 for validation errors, 401 for auth errors,
                      404 for missing budget plan, 500 for server errors
    """
    try:
        return await insights_service.get_month_snapshot(
            user_id=current_user_id,
            year=year,
            month=month,
            session=session,
        )
    except InsightsValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except BudgetPlanNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget plan not found. Create one to view insights.",
        )
    except InsightsNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        import traceback
        print(f"Error in get_month_snapshot: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve month snapshot: {str(e)}",
        )


@router.get("/available-months", status_code=status.HTTP_200_OK)
async def list_available_months(
    current_user_id: UUID = Depends(get_current_user_id),
    insights_service: InsightsService = Depends(get_insights_service),
    session: Session = Depends(get_session),
) -> list[AvailableMonth]:
    """
    Get list of months with transaction data.

    Returns months in descending order (most recent first).

    Args:
        current_user_id: Authenticated user ID from JWT token
        insights_service: Insights service instance
        session: Database session

    Returns:
        List of AvailableMonth objects

    Raises:
        HTTPException: 401 for auth errors, 500 for server errors
    """
    try:
        return await insights_service.list_available_months(
            user_id=current_user_id,
            session=session,
        )
    except Exception as e:
        import traceback
        print(f"Error in list_available_months: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve available months: {str(e)}",
        )
