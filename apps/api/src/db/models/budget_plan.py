from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base
from src.db.models.utils.mixins import TimestampMixin

class BudgetPlan(TimestampMixin, Base):
    __tablename__ = "budget_plans"
    __table_args__ = (
        CheckConstraint(
            "savings_goal IS NULL OR savings_goal >= 0",
            name="ck_budget_plans_savings_goal_positive",
        ),
        CheckConstraint(
            "investment_goal IS NULL OR investment_goal >= 0",
            name="ck_budget_plans_investment_goal_positive",
        ),
        UniqueConstraint("user_id", name="uq_budget_plans_user_id"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    savings_goal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    investment_goal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
