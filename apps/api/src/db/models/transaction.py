from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "(type = 'expense' AND expense_category_id IS NOT NULL AND income_category_id IS NULL AND transaction_tag IS NOT NULL)"
            " OR "
            "(type = 'income' AND income_category_id IS NOT NULL AND expense_category_id IS NULL)",
            name="transactions_category_check",
        ),
        Index("idx_transactions_recurring_template_id", "recurring_template_id"),
    )

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        nullable=False,
        server_default=func.now(),
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
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
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    transaction_tag: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurring_template_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("recurring_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
