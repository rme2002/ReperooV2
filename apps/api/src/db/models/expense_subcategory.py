from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class ExpenseSubcategory(Base):
    __tablename__ = "expense_subcategories"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    category_id: Mapped[str] = mapped_column(
        Text,
        ForeignKey("expense_categories.id"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    sub_color: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
