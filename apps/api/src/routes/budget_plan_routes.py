from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user_id
from src.core.database import get_session
from src.models.model import BudgetPlan, CreateBudgetPlanPayload, UpdateBudgetPlanPayload
from src.repositories.budget_plan_repository import BudgetPlanRepository
from src.services.budget_plan_service import BudgetPlanService
from src.services.errors import (
    BudgetPlanAlreadyExistsError,
    BudgetPlanCreationError,
    BudgetPlanNotFoundError,
    BudgetPlanUpdateError,
    BudgetPlanValidationError,
)

router = APIRouter()


def get_budget_plan_service(
    session: Session = Depends(get_session),
) -> BudgetPlanService:
    """Dependency factory for BudgetPlanService."""
    budget_plan_repository = BudgetPlanRepository()
    return BudgetPlanService(budget_plan_repository)


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_budget_plan(
    payload: CreateBudgetPlanPayload,
    current_user_id: UUID = Depends(get_current_user_id),
    budget_plan_service: BudgetPlanService = Depends(get_budget_plan_service),
    session: Session = Depends(get_session),
) -> BudgetPlan:
    """
    Create a new budget plan for the authenticated user.

    Each user can only have one budget plan. If a plan already exists,
    returns 400 Bad Request.

    The expected_income field is automatically calculated from active
    recurring income templates.

    Args:
        payload: Budget plan creation payload
        current_user_id: Authenticated user ID from JWT token
        budget_plan_service: Budget plan service instance
        session: Database session

    Returns:
        Created budget plan with calculated expected_income

    Raises:
        HTTPException: 400 for validation errors or duplicate, 401 for auth errors, 500 for server errors
    """
    try:
        return await budget_plan_service.create_budget_plan(
            payload=payload,
            authenticated_user_id=current_user_id,
            session=session,
        )
    except BudgetPlanAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except BudgetPlanValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except BudgetPlanCreationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create budget plan",
        )


@router.get("/get", status_code=status.HTTP_200_OK)
async def get_budget_plan(
    current_user_id: UUID = Depends(get_current_user_id),
    budget_plan_service: BudgetPlanService = Depends(get_budget_plan_service),
    session: Session = Depends(get_session),
) -> BudgetPlan:
    """
    Get the budget plan for the authenticated user.

    The expected_income field is automatically calculated from active
    recurring income templates.

    Args:
        current_user_id: Authenticated user ID from JWT token
        budget_plan_service: Budget plan service instance
        session: Database session

    Returns:
        Budget plan with calculated expected_income

    Raises:
        HTTPException: 404 if no plan exists, 401 for auth errors, 500 for server errors
    """
    try:
        return await budget_plan_service.get_budget_plan(
            authenticated_user_id=current_user_id,
            session=session,
        )
    except BudgetPlanNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.patch("/update", status_code=status.HTTP_200_OK)
async def update_budget_plan(
    payload: UpdateBudgetPlanPayload,
    current_user_id: UUID = Depends(get_current_user_id),
    budget_plan_service: BudgetPlanService = Depends(get_budget_plan_service),
    session: Session = Depends(get_session),
) -> BudgetPlan:
    """
    Update the budget plan for the authenticated user (partial update).

    Only provided fields will be updated. The expected_income field is
    automatically calculated from active recurring income templates.

    Args:
        payload: Budget plan update payload (partial)
        current_user_id: Authenticated user ID from JWT token
        budget_plan_service: Budget plan service instance
        session: Database session

    Returns:
        Updated budget plan with calculated expected_income

    Raises:
        HTTPException: 400 for validation errors, 404 if no plan exists, 401 for auth errors, 500 for server errors
    """
    try:
        return await budget_plan_service.update_budget_plan(
            payload=payload,
            authenticated_user_id=current_user_id,
            session=session,
        )
    except BudgetPlanNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except BudgetPlanValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except BudgetPlanUpdateError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update budget plan",
        )
