from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from src.db.models.budget_plan import BudgetPlan


class BudgetPlanRepository:
    def create_budget_plan(
        self,
        session: Session,
        plan_data: dict,
    ) -> BudgetPlan:
        """
        Create a new budget plan record.

        Args:
            session: SQLAlchemy database session
            plan_data: Dictionary containing budget plan fields

        Returns:
            Created BudgetPlan instance (caller must commit)
        """
        # Generate UUID if not provided
        if "id" not in plan_data:
            plan_data["id"] = uuid4()

        budget_plan = BudgetPlan(**plan_data)
        session.add(budget_plan)
        return budget_plan

    def get_budget_plan_by_user_id(
        self,
        session: Session,
        user_id: UUID,
    ) -> BudgetPlan | None:
        """
        Get budget plan for a specific user.

        Args:
            session: SQLAlchemy database session
            user_id: User ID to query

        Returns:
            BudgetPlan instance if found, None otherwise
        """
        return session.query(BudgetPlan).filter(BudgetPlan.user_id == user_id).first()

    def update_budget_plan(
        self,
        session: Session,
        plan: BudgetPlan,
        update_data: dict,
    ) -> BudgetPlan:
        """
        Update existing budget plan with partial data.

        Args:
            session: SQLAlchemy database session
            plan: BudgetPlan instance to update
            update_data: Dictionary containing fields to update

        Returns:
            Updated BudgetPlan instance (caller must commit)
        """
        for key, value in update_data.items():
            if hasattr(plan, key):
                setattr(plan, key, value)

        return plan

    def delete_budget_plan(
        self,
        session: Session,
        plan: BudgetPlan,
    ) -> None:
        """
        Delete a budget plan.

        Args:
            session: SQLAlchemy database session
            plan: BudgetPlan instance to delete

        Returns:
            None (caller must commit)
        """
        session.delete(plan)
