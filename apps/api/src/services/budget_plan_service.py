from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.models.recurring_template import RecurringTemplate
from src.models.model import BudgetPlan, CreateBudgetPlanPayload, UpdateBudgetPlanPayload
from src.repositories.budget_plan_repository import BudgetPlanRepository
from src.services.errors import (
    BudgetPlanAlreadyExistsError,
    BudgetPlanCreationError,
    BudgetPlanNotFoundError,
    BudgetPlanUpdateError,
    BudgetPlanValidationError,
)


class BudgetPlanService:
    def __init__(self, budget_plan_repository: BudgetPlanRepository):
        self.budget_plan_repository = budget_plan_repository

    def _calculate_expected_income(
        self,
        session: Session,
        user_id: UUID,
    ) -> Decimal:
        """
        Calculate expected monthly income from recurring income templates.

        Args:
            session: SQLAlchemy database session
            user_id: User ID to calculate income for

        Returns:
            Total expected monthly income from active recurring income templates
        """
        result = (
            session.query(func.sum(RecurringTemplate.amount))
            .filter(
                RecurringTemplate.user_id == user_id,
                RecurringTemplate.type == "income",
                RecurringTemplate.is_paused == False,
            )
            .scalar()
        )

        return result if result is not None else Decimal("0")

    def _validate_amounts(
        self,
        savings_goal: float | None = None,
        investment_goal: float | None = None,
    ) -> None:
        """
        Validate that monetary amounts are non-negative.

        Args:
            savings_goal: Savings goal amount (optional)
            investment_goal: Investment goal amount (optional)

        Raises:
            BudgetPlanValidationError: If any amount is negative
        """
        if savings_goal is not None and savings_goal < 0:
            raise BudgetPlanValidationError("Savings goal cannot be negative")

        if investment_goal is not None and investment_goal < 0:
            raise BudgetPlanValidationError("Investment goal cannot be negative")

    async def create_budget_plan(
        self,
        payload: CreateBudgetPlanPayload,
        authenticated_user_id: UUID,
        session: Session,
    ) -> BudgetPlan:
        """
        Create a new budget plan for the user.

        Args:
            payload: Budget plan creation payload
            authenticated_user_id: User ID from validated JWT token
            session: SQLAlchemy database session

        Returns:
            Created budget plan with calculated expected_income

        Raises:
            BudgetPlanAlreadyExistsError: If user already has a budget plan
            BudgetPlanValidationError: If business logic validation fails
            BudgetPlanCreationError: If database operation fails
        """
        # Check if user already has a budget plan
        existing_plan = self.budget_plan_repository.get_budget_plan_by_user_id(
            session, authenticated_user_id
        )
        if existing_plan is not None:
            raise BudgetPlanAlreadyExistsError(
                "User already has a budget plan. Use update endpoint to modify it."
            )

        # Validate amounts
        self._validate_amounts(
            savings_goal=payload.savings_goal,
            investment_goal=payload.investment_goal,
        )

        # Build budget plan data dict with proper type conversions
        plan_data = {
            "user_id": authenticated_user_id,  # Use authenticated user ID (security critical!)
            "savings_goal": (
                Decimal(str(payload.savings_goal)) if payload.savings_goal is not None else None
            ),
            "investment_goal": (
                Decimal(str(payload.investment_goal))
                if payload.investment_goal is not None
                else None
            ),
            "payday_day_of_month": payload.payday_day_of_month,
            "pay_schedule": payload.pay_schedule,
        }

        # Create budget plan in database
        try:
            db_plan = self.budget_plan_repository.create_budget_plan(session, plan_data)
            session.commit()
        except Exception as e:
            session.rollback()
            raise BudgetPlanCreationError("Failed to create budget plan") from e

        # Calculate expected income from recurring templates
        expected_income = self._calculate_expected_income(session, authenticated_user_id)

        # Convert to response model with calculated expected_income
        return BudgetPlan(
            id=str(db_plan.id),
            user_id=str(db_plan.user_id),
            expected_income=float(expected_income),  # Calculated field
            savings_goal=float(db_plan.savings_goal) if db_plan.savings_goal is not None else None,
            investment_goal=(
                float(db_plan.investment_goal) if db_plan.investment_goal is not None else None
            ),
            payday_day_of_month=db_plan.payday_day_of_month,
            pay_schedule=db_plan.pay_schedule,
            created_at=db_plan.created_at,
            updated_at=db_plan.updated_at,
        )

    async def get_budget_plan(
        self,
        authenticated_user_id: UUID,
        session: Session,
    ) -> BudgetPlan:
        """
        Get the budget plan for the authenticated user.

        Args:
            authenticated_user_id: User ID from validated JWT token
            session: SQLAlchemy database session

        Returns:
            Budget plan with calculated expected_income

        Raises:
            BudgetPlanNotFoundError: If no budget plan exists for the user
        """
        db_plan = self.budget_plan_repository.get_budget_plan_by_user_id(
            session, authenticated_user_id
        )

        if db_plan is None:
            raise BudgetPlanNotFoundError(
                "Budget plan not found. Create one using the create endpoint."
            )

        # Calculate expected income from recurring templates
        expected_income = self._calculate_expected_income(session, authenticated_user_id)

        # Convert to response model with calculated expected_income
        return BudgetPlan(
            id=str(db_plan.id),
            user_id=str(db_plan.user_id),
            expected_income=float(expected_income),  # Calculated field
            savings_goal=float(db_plan.savings_goal) if db_plan.savings_goal is not None else None,
            investment_goal=(
                float(db_plan.investment_goal) if db_plan.investment_goal is not None else None
            ),
            payday_day_of_month=db_plan.payday_day_of_month,
            pay_schedule=db_plan.pay_schedule,
            created_at=db_plan.created_at,
            updated_at=db_plan.updated_at,
        )

    async def update_budget_plan(
        self,
        payload: UpdateBudgetPlanPayload,
        authenticated_user_id: UUID,
        session: Session,
    ) -> BudgetPlan:
        """
        Update the budget plan for the authenticated user.

        Args:
            payload: Budget plan update payload (partial update)
            authenticated_user_id: User ID from validated JWT token
            session: SQLAlchemy database session

        Returns:
            Updated budget plan with calculated expected_income

        Raises:
            BudgetPlanNotFoundError: If no budget plan exists for the user
            BudgetPlanValidationError: If business logic validation fails
            BudgetPlanUpdateError: If database operation fails
        """
        # Get existing budget plan
        db_plan = self.budget_plan_repository.get_budget_plan_by_user_id(
            session, authenticated_user_id
        )

        if db_plan is None:
            raise BudgetPlanNotFoundError(
                "Budget plan not found. Create one using the create endpoint."
            )

        # Validate amounts if provided
        self._validate_amounts(
            savings_goal=payload.savings_goal,
            investment_goal=payload.investment_goal,
        )

        # Build update data dict with proper type conversions (only include provided fields)
        update_data = {}
        if payload.savings_goal is not None:
            update_data["savings_goal"] = Decimal(str(payload.savings_goal))
        if payload.investment_goal is not None:
            update_data["investment_goal"] = Decimal(str(payload.investment_goal))
        if payload.payday_day_of_month is not None:
            update_data["payday_day_of_month"] = payload.payday_day_of_month
        if payload.pay_schedule is not None:
            update_data["pay_schedule"] = payload.pay_schedule

        # Update budget plan in database
        try:
            db_plan = self.budget_plan_repository.update_budget_plan(session, db_plan, update_data)
            session.commit()
        except Exception as e:
            session.rollback()
            raise BudgetPlanUpdateError("Failed to update budget plan") from e

        # Calculate expected income from recurring templates
        expected_income = self._calculate_expected_income(session, authenticated_user_id)

        # Convert to response model with calculated expected_income
        return BudgetPlan(
            id=str(db_plan.id),
            user_id=str(db_plan.user_id),
            expected_income=float(expected_income),  # Calculated field
            savings_goal=float(db_plan.savings_goal) if db_plan.savings_goal is not None else None,
            investment_goal=(
                float(db_plan.investment_goal) if db_plan.investment_goal is not None else None
            ),
            payday_day_of_month=db_plan.payday_day_of_month,
            pay_schedule=db_plan.pay_schedule,
            created_at=db_plan.created_at,
            updated_at=db_plan.updated_at,
        )
