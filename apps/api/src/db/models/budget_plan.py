from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base
from src.db.models.utils.mixins import TimestampMixin

class BudgetPlan(TimestampMixin, Base):
    __tablename__ = "budget_plans"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    savings_goal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    investment_goal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
