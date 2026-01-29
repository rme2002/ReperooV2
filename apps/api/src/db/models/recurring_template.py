from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class RecurringTemplate(Base):
    __tablename__ = "recurring_templates"
    __table_args__ = (
        CheckConstraint(
            "(type = 'expense' AND expense_category_id IS NOT NULL AND income_category_id IS NULL AND transaction_tag IS NOT NULL)"
            " OR "
            "(type = 'income' AND income_category_id IS NOT NULL AND expense_category_id IS NULL)",
            name="recurring_templates_category_check",
        ),
        CheckConstraint(
            "(frequency = 'monthly' AND day_of_month IS NOT NULL AND day_of_week IS NULL)"
            " OR "
            "(frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL AND day_of_month IS NULL)",
            name="recurring_templates_frequency_check",
        ),
        CheckConstraint(
            "frequency IN ('weekly', 'biweekly', 'monthly')",
            name="recurring_templates_frequency_values_check",
        ),
        CheckConstraint(
            "type IN ('expense', 'income')",
            name="recurring_templates_type_check",
        ),
        Index("idx_recurring_templates_user_id", "user_id"),
        Index("idx_recurring_templates_start_date", "start_date"),
        Index("idx_recurring_templates_is_paused", "is_paused"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)

    # Category fields
    expense_category_id: Mapped[str | None] = mapped_column(
        Text,
        ForeignKey("expense_categories.id"),
        nullable=True,
    )
    expense_subcategory_id: Mapped[str | None] = mapped_column(
        Text,
        ForeignKey("expense_subcategories.id"),
        nullable=True,
    )
    income_category_id: Mapped[str | None] = mapped_column(
        Text,
        ForeignKey("income_categories.id"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    transaction_tag: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Recurrence pattern
    frequency: Mapped[str] = mapped_column(Text, nullable=False)  # 'weekly' | 'biweekly' | 'monthly'
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-6 (0=Monday)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-31

    # Start and end conditions
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_occurrences: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Control flags
    is_paused: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
        server_default=func.now(),
    )
