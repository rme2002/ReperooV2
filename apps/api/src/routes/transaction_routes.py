from uuid import UUID
import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user_id
from src.core.database import get_session
from src.models.model import (
    TodayTransactionSummary,
    TransactionExpense,
    TransactionIncome,
)
from src.models.transaction_payloads import (
    CreateExpenseTransactionPayload,
    CreateIncomeTransactionPayload,
    UpdateTransactionPayload,
)
from src.repositories.recurring_template_repository import RecurringTemplateRepository
from src.repositories.transaction_repository import TransactionRepository
from src.repositories.profile_repository import ProfileRepository
from src.repositories.xp_event_repository import XPEventRepository
from src.services.errors import (
    CategoryNotFoundError,
    TransactionCreationError,
    TransactionNotFoundError,
    TransactionUpdateError,
    TransactionDeleteError,
    TransactionValidationError,
)
from src.services.recurring_materialization_service import RecurringMaterializationService
from src.services.transaction_service import TransactionService
from src.services.experience_service import ExperienceService

router = APIRouter()


def get_transaction_service(
    session: Session = Depends(get_session),
) -> TransactionService:
    """Dependency factory for TransactionService."""
    transaction_repository = TransactionRepository()
    return TransactionService(transaction_repository)


def get_materialization_service() -> RecurringMaterializationService:
    """Dependency factory for RecurringMaterializationService."""
    template_repository = RecurringTemplateRepository()
    return RecurringMaterializationService(template_repository)


def get_experience_service(
    session: Session = Depends(get_session),
) -> ExperienceService:
    """Dependency factory for ExperienceService."""
    profile_repository = ProfileRepository()
    xp_event_repository = XPEventRepository()
    return ExperienceService(profile_repository, xp_event_repository)


@router.post("/create-expense", status_code=status.HTTP_201_CREATED)
async def create_expense_transaction(
    payload: CreateExpenseTransactionPayload,
    current_user_id: UUID = Depends(get_current_user_id),
    transaction_service: TransactionService = Depends(get_transaction_service),
    experience_service: ExperienceService = Depends(get_experience_service),
    session: Session = Depends(get_session),
) -> TransactionExpense:
    """
    Create a new expense transaction.

    Creates a new expense transaction in the transactions table.
    User ID is extracted from the JWT token for security.
    Also awards +3 XP for logging a transaction (up to 5 per day).

    Args:
        payload: Expense transaction creation payload
        current_user_id: Authenticated user ID from JWT token
        transaction_service: Transaction service instance
        experience_service: Experience service instance
        session: Database session

    Returns:
        Created expense transaction

    Raises:
        HTTPException: 400 for validation errors, 401 for auth errors, 500 for server errors
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[DEBUG] Received expense payload: {payload}")
    logger.info(f"[DEBUG] Payload dict: {payload.model_dump()}")
    logger.info(f"[DEBUG] Amount type: {type(payload.amount)}, Amount value: {payload.amount}")

    try:
        # Create transaction
        transaction = await transaction_service.create_expense_transaction(
            payload=payload,
            authenticated_user_id=current_user_id,
            session=session,
        )

        # Award XP (respects daily cap)
        try:
            await experience_service.award_transaction_xp(current_user_id, session)
        except Exception as xp_error:
            # Log error but don't fail transaction creation
            logger.error(f"Failed to award transaction XP: {xp_error}")

        return transaction
    except CategoryNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TransactionValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TransactionCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create expense transaction",
        )


@router.post("/create-income", status_code=status.HTTP_201_CREATED)
async def create_income_transaction(
    payload: CreateIncomeTransactionPayload,
    current_user_id: UUID = Depends(get_current_user_id),
    transaction_service: TransactionService = Depends(get_transaction_service),
    experience_service: ExperienceService = Depends(get_experience_service),
    session: Session = Depends(get_session),
) -> TransactionIncome:
    """
    Create a new income transaction.

    Creates a new income transaction in the transactions table.
    User ID is extracted from the JWT token for security.
    Also awards +3 XP for logging a transaction (up to 5 per day).

    Args:
        payload: Income transaction creation payload
        current_user_id: Authenticated user ID from JWT token
        transaction_service: Transaction service instance
        experience_service: Experience service instance
        session: Database session

    Returns:
        Created income transaction

    Raises:
        HTTPException: 400 for validation errors, 401 for auth errors, 500 for server errors
    """
    try:
        # Create transaction
        transaction = await transaction_service.create_income_transaction(
            payload=payload,
            authenticated_user_id=current_user_id,
            session=session,
        )

        # Award XP (respects daily cap)
        try:
            await experience_service.award_transaction_xp(current_user_id, session)
        except Exception as xp_error:
            # Log error but don't fail transaction creation
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to award transaction XP: {xp_error}")

        return transaction
    except CategoryNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TransactionValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TransactionCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create income transaction",
        )


@router.get("/list")
async def list_transactions(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user_id: UUID = Depends(get_current_user_id),
    transaction_repo: TransactionRepository = Depends(lambda: TransactionRepository()),
    materialization_service: RecurringMaterializationService = Depends(get_materialization_service),
    session: Session = Depends(get_session),
) -> list[TransactionExpense | TransactionIncome]:
    """
    List all transactions for the current user within a date range.

    This endpoint automatically materializes recurring transactions (JIT) before
    returning the list, so all expected recurring transactions will be included.

    Args:
        start_date: Start of date range (YYYY-MM-DD)
        end_date: End of date range (YYYY-MM-DD)
        current_user_id: Authenticated user ID from JWT token
        transaction_repo: Transaction repository instance
        materialization_service: Recurring materialization service
        session: Database session

    Returns:
        List of transactions (both expense and income)
    """
    try:
        from src.utils.date_utils import parse_date_string

        # Parse date strings
        start_date_obj = parse_date_string(start_date, allow_datetime=False)
        end_date_obj = parse_date_string(end_date, allow_datetime=False)

        # Step 1: Materialize recurring transactions for the date range (JIT)
        generated_count = materialization_service.materialize_for_date_range(
            session, current_user_id, start_date_obj, end_date_obj
        )

        if generated_count > 0:
            session.commit()

        # Step 2: Fetch all transactions in the date range
        transactions = transaction_repo.get_transactions_by_date_range(
            session, current_user_id, start_date_obj, end_date_obj
        )

        # Step 3: Convert to response models
        responses = []
        for txn in transactions:
            if txn.type == "expense":
                responses.append(
                    TransactionExpense(
                        id=str(txn.id),
                        user_id=str(txn.user_id),
                        occurred_at=txn.occurred_at.isoformat(),  # date -> "YYYY-MM-DD"
                        amount=float(txn.amount),
                        notes=txn.notes,
                        recurring_template_id=str(txn.recurring_template_id) if txn.recurring_template_id else None,
                        type="expense",
                        transaction_tag=txn.transaction_tag,
                        expense_category_id=txn.expense_category_id,
                        expense_subcategory_id=txn.expense_subcategory_id,
                        created_at=txn.created_at,
                    )
                )
            else:  # income
                responses.append(
                    TransactionIncome(
                        id=str(txn.id),
                        user_id=str(txn.user_id),
                        occurred_at=txn.occurred_at.isoformat(),  # date -> "YYYY-MM-DD"
                        amount=float(txn.amount),
                        notes=txn.notes,
                        recurring_template_id=str(txn.recurring_template_id) if txn.recurring_template_id else None,
                        type="income",
                        income_category_id=txn.income_category_id,
                        created_at=txn.created_at,
                    )
                )

        return responses

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to retrieve transactions: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve transactions: {str(e)}",
        )


@router.get("/today-summary", status_code=status.HTTP_200_OK)
async def get_today_summary(
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
    transaction_service: TransactionService = Depends(get_transaction_service),
) -> TodayTransactionSummary:
    """
    Get summary of today's transactions.

    Returns aggregated totals and counts for today's expenses and income.
    Includes materialized recurring transactions.

    Returns:
        TodayTransactionSummary with expense_total, income_total, counts, and has_logged_today flag
    """
    try:
        summary = transaction_service.get_today_summary(session, current_user_id)
        return TodayTransactionSummary(**summary)
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting today summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve today's transaction summary",
        )


@router.patch("/update/{id}", status_code=status.HTTP_200_OK)
async def update_transaction(
    id: UUID,
    payload: UpdateTransactionPayload,
    current_user_id: UUID = Depends(get_current_user_id),
    transaction_service: TransactionService = Depends(get_transaction_service),
    session: Session = Depends(get_session),
) -> TransactionExpense | TransactionIncome:
    """
    Update an existing transaction (partial update).

    Updates an existing transaction with partial data. Transaction type cannot be changed.
    User ID is extracted from the JWT token for security.

    Args:
        id: Transaction ID to update
        payload: Update payload (expense or income)
        current_user_id: Authenticated user ID from JWT token
        transaction_service: Transaction service instance
        session: Database session

    Returns:
        Updated transaction

    Raises:
        HTTPException: 400 for validation errors, 401 for auth errors, 404 for not found, 500 for server errors
    """
    try:
        return await transaction_service.update_transaction(
            transaction_id=id,
            payload=payload.root,
            authenticated_user_id=current_user_id,
            session=session,
        )
    except TransactionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except CategoryNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TransactionValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TransactionUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update transaction",
        )


@router.delete("/delete/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    transaction_service: TransactionService = Depends(get_transaction_service),
    session: Session = Depends(get_session),
) -> None:
    """
    Delete an existing transaction.

    Deletes an existing transaction. User ID is extracted from the JWT token for security.

    Args:
        id: Transaction ID to delete
        current_user_id: Authenticated user ID from JWT token
        transaction_service: Transaction service instance
        session: Database session

    Returns:
        None (204 No Content)

    Raises:
        HTTPException: 401 for auth errors, 404 for not found, 500 for server errors
    """
    try:
        await transaction_service.delete_transaction(
            transaction_id=id,
            authenticated_user_id=current_user_id,
            session=session,
        )
    except TransactionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except TransactionDeleteError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete transaction",
        )
