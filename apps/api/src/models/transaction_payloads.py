from __future__ import annotations

import re
from typing import Optional, Union

from pydantic import RootModel, field_validator

from src.models.model import (
    CreateExpenseTransactionPayload as GeneratedCreateExpenseTransactionPayload,
    CreateIncomeTransactionPayload as GeneratedCreateIncomeTransactionPayload,
    UpdateExpenseTransactionPayload as GeneratedUpdateExpenseTransactionPayload,
    UpdateIncomeTransactionPayload as GeneratedUpdateIncomeTransactionPayload,
)

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_date_string(value):
    if value is None:
        return value
    if isinstance(value, str):
        if "T" in value or not _DATE_RE.match(value):
            raise ValueError("Invalid date format")
        return value
    return value


class CreateExpenseTransactionPayload(GeneratedCreateExpenseTransactionPayload):
    @field_validator("occurred_at", mode="before")
    @classmethod
    def _validate_occurred_at(cls, value):
        return _validate_date_string(value)


class CreateIncomeTransactionPayload(GeneratedCreateIncomeTransactionPayload):
    @field_validator("occurred_at", mode="before")
    @classmethod
    def _validate_occurred_at(cls, value):
        return _validate_date_string(value)


class UpdateExpenseTransactionPayload(GeneratedUpdateExpenseTransactionPayload):
    @field_validator("occurred_at", mode="before")
    @classmethod
    def _validate_occurred_at(cls, value):
        return _validate_date_string(value)


class UpdateIncomeTransactionPayload(GeneratedUpdateIncomeTransactionPayload):
    @field_validator("occurred_at", mode="before")
    @classmethod
    def _validate_occurred_at(cls, value):
        return _validate_date_string(value)


class UpdateTransactionPayload(
    RootModel[Union[UpdateExpenseTransactionPayload, UpdateIncomeTransactionPayload]]
):
    root: Union[UpdateExpenseTransactionPayload, UpdateIncomeTransactionPayload]

