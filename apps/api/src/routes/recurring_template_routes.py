"""API routes for recurring transaction templates."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user_id
from src.core.database import get_session
from src.db.models.recurring_template import RecurringTemplate
from src.models.recurring_template_models import (
    CreateRecurringTemplateExpensePayload,
    CreateRecurringTemplateIncomePayload,
    RecurringTemplateExpense,
    RecurringTemplateIncome,
    UpdateRecurringTemplatePayload,
)
from src.repositories.recurring_template_repository import RecurringTemplateRepository
from src.repositories.transaction_repository import TransactionRepository
from src.services.errors import CategoryNotFoundError, TransactionValidationError

router = APIRouter()


def get_recurring_template_repository() -> RecurringTemplateRepository:
    """Dependency factory for RecurringTemplateRepository."""
    return RecurringTemplateRepository()


def get_transaction_repository() -> TransactionRepository:
    """Dependency factory for TransactionRepository."""
    return TransactionRepository()


def _validate_expense_template(
    payload: CreateRecurringTemplateExpensePayload,
    transaction_repo: TransactionRepository,
    session: Session,
) -> None:
    """Validate expense template payload."""
    # Validate frequency and day fields
    if payload.frequency == "monthly":
        if payload.day_of_month is None:
            raise TransactionValidationError(
                "day_of_month is required for monthly frequency"
            )
        if payload.day_of_week is not None:
            raise TransactionValidationError(
                "day_of_week should not be set for monthly frequency"
            )
    elif payload.frequency in ["weekly", "biweekly"]:
        if payload.day_of_week is None:
            raise TransactionValidationError(
                f"day_of_week is required for {payload.frequency} frequency"
            )
        if payload.day_of_month is not None:
            raise TransactionValidationError(
                f"day_of_month should not be set for {payload.frequency} frequency"
            )

    # Validate categories
    if not transaction_repo.category_exists(session, payload.expense_category_id, "expense"):
        raise CategoryNotFoundError(f"Expense category '{payload.expense_category_id}' not found")

    if payload.expense_subcategory_id:
        if not transaction_repo.subcategory_exists(session, payload.expense_subcategory_id):
            raise CategoryNotFoundError(
                f"Expense subcategory '{payload.expense_subcategory_id}' not found"
            )


def _validate_income_template(
    payload: CreateRecurringTemplateIncomePayload,
    transaction_repo: TransactionRepository,
    session: Session,
) -> None:
    """Validate income template payload."""
    # Validate frequency and day fields
    if payload.frequency == "monthly":
        if payload.day_of_month is None:
            raise TransactionValidationError(
                "day_of_month is required for monthly frequency"
            )
        if payload.day_of_week is not None:
            raise TransactionValidationError(
                "day_of_week should not be set for monthly frequency"
            )
    elif payload.frequency in ["weekly", "biweekly"]:
        if payload.day_of_week is None:
            raise TransactionValidationError(
                f"day_of_week is required for {payload.frequency} frequency"
            )
        if payload.day_of_month is not None:
            raise TransactionValidationError(
                f"day_of_month should not be set for {payload.frequency} frequency"
            )

    # Validate category
    if not transaction_repo.category_exists(session, payload.income_category_id, "income"):
        raise CategoryNotFoundError(f"Income category '{payload.income_category_id}' not found")


def _template_to_expense_response(template: RecurringTemplate) -> RecurringTemplateExpense:
    """Convert RecurringTemplate DB model to response model."""
    return RecurringTemplateExpense(
        id=template.id,
        user_id=template.user_id,
        amount=float(template.amount),
        type="expense",
        notes=template.notes,
        frequency=template.frequency,
        day_of_week=template.day_of_week,
        day_of_month=template.day_of_month,
        start_date=template.start_date,
        end_date=template.end_date,
        total_occurrences=template.total_occurrences,
        is_paused=template.is_paused,
        transaction_tag=template.transaction_tag,
        expense_category_id=template.expense_category_id,
        expense_subcategory_id=template.expense_subcategory_id,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


def _template_to_income_response(template: RecurringTemplate) -> RecurringTemplateIncome:
    """Convert RecurringTemplate DB model to response model."""
    return RecurringTemplateIncome(
        id=template.id,
        user_id=template.user_id,
        amount=float(template.amount),
        type="income",
        notes=template.notes,
        frequency=template.frequency,
        day_of_week=template.day_of_week,
        day_of_month=template.day_of_month,
        start_date=template.start_date,
        end_date=template.end_date,
        total_occurrences=template.total_occurrences,
        is_paused=template.is_paused,
        income_category_id=template.income_category_id,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.post("/recurring/create", status_code=status.HTTP_201_CREATED)
async def create_recurring_template_expense(
    payload: CreateRecurringTemplateExpensePayload,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    session: Session = Depends(get_session),
) -> RecurringTemplateExpense:
    """Create a new recurring expense template."""
    try:
        _validate_expense_template(payload, transaction_repo, session)

        template_data = {
            "user_id": current_user_id,
            "amount": payload.amount,
            "type": "expense",
            "notes": payload.notes,
            "frequency": payload.frequency,
            "day_of_week": payload.day_of_week,
            "day_of_month": payload.day_of_month,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "total_occurrences": payload.total_occurrences,
            "transaction_tag": payload.transaction_tag,
            "expense_category_id": payload.expense_category_id,
            "expense_subcategory_id": payload.expense_subcategory_id,
        }

        template = template_repo.create_template(session, template_data)
        session.commit()
        session.refresh(template)

        return _template_to_expense_response(template)

    except (CategoryNotFoundError, TransactionValidationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create recurring template",
        )


@router.post("/recurring/create-income", status_code=status.HTTP_201_CREATED)
async def create_recurring_template_income(
    payload: CreateRecurringTemplateIncomePayload,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    transaction_repo: TransactionRepository = Depends(get_transaction_repository),
    session: Session = Depends(get_session),
) -> RecurringTemplateIncome:
    """Create a new recurring income template."""
    try:
        _validate_income_template(payload, transaction_repo, session)

        template_data = {
            "user_id": current_user_id,
            "amount": payload.amount,
            "type": "income",
            "notes": payload.notes,
            "frequency": payload.frequency,
            "day_of_week": payload.day_of_week,
            "day_of_month": payload.day_of_month,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "total_occurrences": payload.total_occurrences,
            "income_category_id": payload.income_category_id,
        }

        template = template_repo.create_template(session, template_data)
        session.commit()
        session.refresh(template)

        return _template_to_income_response(template)

    except (CategoryNotFoundError, TransactionValidationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create recurring template",
        )


@router.get("/recurring/list")
async def list_recurring_templates(
    include_paused: bool = False,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    session: Session = Depends(get_session),
) -> list[RecurringTemplateExpense | RecurringTemplateIncome]:
    """List all recurring templates for the current user."""
    templates = template_repo.get_user_templates(session, current_user_id, include_paused)

    responses = []
    for template in templates:
        if template.type == "expense":
            responses.append(_template_to_expense_response(template))
        else:
            responses.append(_template_to_income_response(template))

    return responses


@router.get("/recurring/{template_id}/get")
async def get_recurring_template(
    template_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    session: Session = Depends(get_session),
) -> RecurringTemplateExpense | RecurringTemplateIncome:
    """Get a single recurring template by ID."""
    template = template_repo.get_template(session, template_id, current_user_id)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring template not found",
        )

    if template.type == "expense":
        return _template_to_expense_response(template)
    else:
        return _template_to_income_response(template)


@router.patch("/recurring/{template_id}/update")
async def update_recurring_template(
    template_id: UUID,
    payload: UpdateRecurringTemplatePayload,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    session: Session = Depends(get_session),
) -> RecurringTemplateExpense | RecurringTemplateIncome:
    """Update a recurring template."""
    try:
        # Get only non-None fields from payload
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}

        template = template_repo.update_template(session, template_id, current_user_id, updates)

        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recurring template not found",
            )

        session.commit()
        session.refresh(template)

        if template.type == "expense":
            return _template_to_expense_response(template)
        else:
            return _template_to_income_response(template)

    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update recurring template",
        )


@router.delete("/recurring/{template_id}/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_template(
    template_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    session: Session = Depends(get_session),
):
    """Delete a recurring template."""
    try:
        deleted = template_repo.delete_template(session, template_id, current_user_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recurring template not found",
            )

        session.commit()

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete recurring template",
        )


@router.patch("/recurring/{template_id}/pause")
async def pause_recurring_template(
    template_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    session: Session = Depends(get_session),
) -> RecurringTemplateExpense | RecurringTemplateIncome:
    """Pause a recurring template."""
    return await update_recurring_template(
        template_id,
        UpdateRecurringTemplatePayload(is_paused=True),
        current_user_id,
        template_repo,
        session,
    )


@router.patch("/recurring/{template_id}/resume")
async def resume_recurring_template(
    template_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    template_repo: RecurringTemplateRepository = Depends(get_recurring_template_repository),
    session: Session = Depends(get_session),
) -> RecurringTemplateExpense | RecurringTemplateIncome:
    """Resume a paused recurring template."""
    return await update_recurring_template(
        template_id,
        UpdateRecurringTemplatePayload(is_paused=False),
        current_user_id,
        template_repo,
        session,
    )
