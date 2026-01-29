"""Pydantic models for recurring transaction templates."""
from __future__ import annotations

from datetime import date
from typing import Literal, Optional
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, Field, conint


class RecurringFrequency(BaseModel):
    """Frequency of recurring transaction."""
    frequency: Literal["weekly", "biweekly", "monthly"]


class RecurringTemplateBase(BaseModel):
    """Base model for recurring templates."""
    amount: float = Field(..., description="Positive decimal amount", examples=[42.5])
    notes: Optional[str] = Field(None, examples=["Netflix subscription"])

    # Recurrence pattern
    frequency: Literal["weekly", "biweekly", "monthly"]
    day_of_week: Optional[conint(ge=0, le=6)] = Field(
        None,
        description="Day of week for weekly/biweekly (0=Monday, 6=Sunday)",
        examples=[0],
    )
    day_of_month: Optional[conint(ge=1, le=31)] = Field(
        None,
        description="Day of month for monthly recurrence (1-31)",
        examples=[15],
    )

    # Start and end conditions
    start_date: date = Field(..., examples=["2024-06-01"])
    end_date: Optional[date] = Field(None, examples=["2025-06-01"])
    total_occurrences: Optional[int] = Field(
        None,
        description="Total number of occurrences (alternative to end_date)",
        examples=[12],
    )


class CreateRecurringTemplateExpensePayload(RecurringTemplateBase):
    """Payload for creating a recurring expense template."""
    type: Literal["expense"] = Field(..., examples=["expense"])
    transaction_tag: str = Field(..., examples=["want"])
    expense_category_id: str = Field(..., examples=["personal"])
    expense_subcategory_id: Optional[str] = Field(None, examples=["beauty_care"])


class CreateRecurringTemplateIncomePayload(RecurringTemplateBase):
    """Payload for creating a recurring income template."""
    type: Literal["income"] = Field(..., examples=["income"])
    income_category_id: str = Field(..., examples=["salary"])


class UpdateRecurringTemplatePayload(BaseModel):
    """Payload for updating a recurring template."""
    amount: Optional[float] = Field(None, description="Update amount")
    notes: Optional[str] = Field(None, description="Update notes")
    end_date: Optional[date] = Field(None, description="Update end date")
    total_occurrences: Optional[int] = Field(None, description="Update total occurrences")
    is_paused: Optional[bool] = Field(None, description="Pause/unpause template")

    # Category updates
    expense_category_id: Optional[str] = None
    expense_subcategory_id: Optional[str] = None
    income_category_id: Optional[str] = None
    transaction_tag: Optional[str] = None


class RecurringTemplateMeta(BaseModel):
    """Metadata for recurring template."""
    id: UUID
    user_id: UUID
    created_at: AwareDatetime = Field(..., examples=["2024-06-01T13:45:00Z"])
    updated_at: AwareDatetime = Field(..., examples=["2024-06-01T13:45:00Z"])
    is_paused: bool = Field(False, description="Whether template is paused")


class RecurringTemplateExpense(RecurringTemplateBase, RecurringTemplateMeta):
    """Recurring expense template response."""
    type: Literal["expense"] = Field(..., examples=["expense"])
    transaction_tag: str = Field(..., examples=["want"])
    expense_category_id: str = Field(..., examples=["personal"])
    expense_subcategory_id: Optional[str] = Field(None, examples=["beauty_care"])


class RecurringTemplateIncome(RecurringTemplateBase, RecurringTemplateMeta):
    """Recurring income template response."""
    type: Literal["income"] = Field(..., examples=["income"])
    income_category_id: str = Field(..., examples=["salary"])
