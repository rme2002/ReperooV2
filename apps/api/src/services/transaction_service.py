from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from src.models.model import (
    CreateExpenseTransactionPayload,
    CreateIncomeTransactionPayload,
    TransactionExpense,
    TransactionIncome,
    UID,
    UpdateExpenseTransactionPayload,
    UpdateIncomeTransactionPayload,
)
from src.repositories.transaction_repository import TransactionRepository
from src.services.errors import (
    CategoryNotFoundError,
    TransactionCreationError,
    TransactionNotFoundError,
    TransactionUpdateError,
    TransactionDeleteError,
    TransactionValidationError,
)


class TransactionService:
    def __init__(self, transaction_repository: TransactionRepository):
        self.transaction_repository = transaction_repository

    async def create_expense_transaction(
        self,
        payload: CreateExpenseTransactionPayload,
        authenticated_user_id: UUID,
        session: Session,
    ) -> TransactionExpense:
        """
        Create a new expense transaction with validation.

        Args:
            payload: Expense transaction creation payload
            authenticated_user_id: User ID from validated JWT token
            session: SQLAlchemy database session

        Returns:
            Created expense transaction

        Raises:
            CategoryNotFoundError: If referenced category doesn't exist
            TransactionValidationError: If business logic validation fails
            TransactionCreationError: If database operation fails
        """
        # Validate expense category exists
        if not self.transaction_repository.category_exists(
            session,
            payload.expense_category_id,
            "expense",
        ):
            raise CategoryNotFoundError(
                f"Expense category '{payload.expense_category_id}' not found"
            )

        # Validate transaction tag is present
        if not payload.transaction_tag or not payload.transaction_tag.strip():
            raise TransactionValidationError(
                "Transaction tag is required for expense transactions"
            )

        # Validate expense subcategory if provided
        if payload.expense_subcategory_id:
            if not self.transaction_repository.subcategory_exists(
                session,
                payload.expense_subcategory_id,
            ):
                raise CategoryNotFoundError(
                    f"Expense subcategory '{payload.expense_subcategory_id}' not found"
                )

        # Validate recurring fields
        if hasattr(payload, 'is_recurring') and payload.is_recurring:
            if not hasattr(payload, 'recurring_day_of_month') or payload.recurring_day_of_month is None:
                raise TransactionValidationError(
                    "recurring_day_of_month is required when is_recurring is true"
                )
            if payload.recurring_day_of_month < 1 or payload.recurring_day_of_month > 31:
                raise TransactionValidationError(
                    "recurring_day_of_month must be between 1 and 31"
                )

        # Build transaction data dict with proper type conversions
        transaction_id = uuid4()
        transaction_data = {
            "id": transaction_id,
            "user_id": authenticated_user_id,  # Use authenticated user ID (security critical!)
            "occurred_at": payload.occurred_at,
            "amount": Decimal(str(payload.amount.root)),
            "type": payload.type,
            "transaction_tag": payload.transaction_tag,
            "expense_category_id": payload.expense_category_id,
            "expense_subcategory_id": payload.expense_subcategory_id,
            "income_category_id": None,  # Expense transactions don't have income category
            "notes": payload.notes,
            "is_recurring": getattr(payload, 'is_recurring', False),
            "recurring_day_of_month": getattr(payload, 'recurring_day_of_month', None),
            "recurring_template_id": None,  # New transactions don't have a template
        }

        # Create transaction in database
        try:
            db_transaction = self.transaction_repository.create_transaction(
                session,
                transaction_data,
            )
            session.commit()
        except Exception as e:
            session.rollback()
            raise TransactionCreationError("Failed to create expense transaction") from e

        # Convert SQLAlchemy model to Pydantic response model
        return TransactionExpense(
            id=UID(str(db_transaction.id)),
            user_id=UID(str(db_transaction.user_id)),
            occurred_at=db_transaction.occurred_at,
            created_at=db_transaction.created_at,
            amount=float(db_transaction.amount),
            type=db_transaction.type,
            transaction_tag=db_transaction.transaction_tag,
            expense_category_id=db_transaction.expense_category_id,
            expense_subcategory_id=db_transaction.expense_subcategory_id,
            notes=db_transaction.notes,
            is_recurring=db_transaction.is_recurring,
            recurring_day_of_month=db_transaction.recurring_day_of_month,
        )

    async def create_income_transaction(
        self,
        payload: CreateIncomeTransactionPayload,
        authenticated_user_id: UUID,
        session: Session,
    ) -> TransactionIncome:
        """
        Create a new income transaction with validation.

        Args:
            payload: Income transaction creation payload
            authenticated_user_id: User ID from validated JWT token
            session: SQLAlchemy database session

        Returns:
            Created income transaction

        Raises:
            CategoryNotFoundError: If referenced category doesn't exist
            TransactionValidationError: If business logic validation fails
            TransactionCreationError: If database operation fails
        """
        # Validate income category exists
        if not self.transaction_repository.category_exists(
            session,
            payload.income_category_id,
            "income",
        ):
            raise CategoryNotFoundError(
                f"Income category '{payload.income_category_id}' not found"
            )

        # Validate recurring fields
        if hasattr(payload, 'is_recurring') and payload.is_recurring:
            if not hasattr(payload, 'recurring_day_of_month') or payload.recurring_day_of_month is None:
                raise TransactionValidationError(
                    "recurring_day_of_month is required when is_recurring is true"
                )
            if payload.recurring_day_of_month < 1 or payload.recurring_day_of_month > 31:
                raise TransactionValidationError(
                    "recurring_day_of_month must be between 1 and 31"
                )

        # Build transaction data dict with proper type conversions
        transaction_id = uuid4()
        transaction_data = {
            "id": transaction_id,
            "user_id": authenticated_user_id,  # Use authenticated user ID (security critical!)
            "occurred_at": payload.occurred_at,
            "amount": Decimal(str(payload.amount.root)),
            "type": payload.type,
            "transaction_tag": "",  # Income transactions don't have a transaction tag
            "expense_category_id": None,  # Income transactions don't have expense category
            "expense_subcategory_id": None,
            "income_category_id": payload.income_category_id,
            "notes": payload.notes,
            "is_recurring": getattr(payload, 'is_recurring', False),
            "recurring_day_of_month": getattr(payload, 'recurring_day_of_month', None),
            "recurring_template_id": None,  # New transactions don't have a template
        }

        # Create transaction in database
        try:
            db_transaction = self.transaction_repository.create_transaction(
                session,
                transaction_data,
            )
            session.commit()
        except Exception as e:
            session.rollback()
            raise TransactionCreationError("Failed to create income transaction") from e

        # Convert SQLAlchemy model to Pydantic response model
        return TransactionIncome(
            id=UID(str(db_transaction.id)),
            user_id=UID(str(db_transaction.user_id)),
            occurred_at=db_transaction.occurred_at,
            created_at=db_transaction.created_at,
            amount=float(db_transaction.amount),
            type=db_transaction.type,
            income_category_id=db_transaction.income_category_id,
            notes=db_transaction.notes,
            is_recurring=db_transaction.is_recurring,
            recurring_day_of_month=db_transaction.recurring_day_of_month,
        )

    async def update_transaction(
        self,
        transaction_id: UUID,
        payload: UpdateExpenseTransactionPayload | UpdateIncomeTransactionPayload,
        authenticated_user_id: UUID,
        session: Session,
    ) -> TransactionExpense | TransactionIncome:
        """
        Update an existing transaction with partial data.

        Args:
            transaction_id: Transaction ID to update
            payload: Update payload (expense or income)
            authenticated_user_id: User ID from validated JWT token
            session: SQLAlchemy database session

        Returns:
            Updated transaction

        Raises:
            TransactionNotFoundError: If transaction not found or doesn't belong to user
            CategoryNotFoundError: If referenced category doesn't exist
            TransactionValidationError: If business logic validation fails
            TransactionUpdateError: If database operation fails
        """
        # Get existing transaction
        db_transaction = self.transaction_repository.get_transaction_by_id(
            session, transaction_id, authenticated_user_id
        )
        if not db_transaction:
            raise TransactionNotFoundError(
                f"Transaction {transaction_id} not found or access denied"
            )

        # Verify type matches (type is immutable)
        if db_transaction.type != payload.type:
            raise TransactionValidationError(
                f"Cannot change transaction type from {db_transaction.type} to {payload.type}"
            )

        # Build update data dict
        update_data = {}

        # Common fields
        if payload.occurred_at is not None:
            update_data["occurred_at"] = payload.occurred_at
        if payload.amount is not None:
            update_data["amount"] = Decimal(str(payload.amount.root))
        if payload.notes is not None:
            update_data["notes"] = payload.notes

        # Type-specific validation and fields
        if isinstance(payload, UpdateExpenseTransactionPayload):
            # Validate expense category if provided
            if payload.expense_category_id:
                if not self.transaction_repository.category_exists(
                    session, payload.expense_category_id, "expense"
                ):
                    raise CategoryNotFoundError(
                        f"Expense category '{payload.expense_category_id}' not found"
                    )
                update_data["expense_category_id"] = payload.expense_category_id

            # Validate expense subcategory if provided
            if payload.expense_subcategory_id is not None:
                if payload.expense_subcategory_id and not self.transaction_repository.subcategory_exists(
                    session, payload.expense_subcategory_id
                ):
                    raise CategoryNotFoundError(
                        f"Expense subcategory '{payload.expense_subcategory_id}' not found"
                    )
                update_data["expense_subcategory_id"] = payload.expense_subcategory_id

            # Validate and update transaction tag
            if payload.transaction_tag:
                if not payload.transaction_tag.strip():
                    raise TransactionValidationError("Transaction tag cannot be empty")
                update_data["transaction_tag"] = payload.transaction_tag

        elif isinstance(payload, UpdateIncomeTransactionPayload):
            # Validate income category if provided
            if payload.income_category_id:
                if not self.transaction_repository.category_exists(
                    session, payload.income_category_id, "income"
                ):
                    raise CategoryNotFoundError(
                        f"Income category '{payload.income_category_id}' not found"
                    )
                update_data["income_category_id"] = payload.income_category_id

        # Update transaction in database
        try:
            db_transaction = self.transaction_repository.update_transaction(
                session, db_transaction, update_data
            )
            session.commit()
            session.refresh(db_transaction)
        except Exception as e:
            session.rollback()
            raise TransactionUpdateError("Failed to update transaction") from e

        # Convert to appropriate Pydantic model based on type
        if db_transaction.type == "expense":
            return TransactionExpense(
                id=UID(str(db_transaction.id)),
                user_id=UID(str(db_transaction.user_id)),
                occurred_at=db_transaction.occurred_at,
                created_at=db_transaction.created_at,
                amount=float(db_transaction.amount),
                type=db_transaction.type,
                transaction_tag=db_transaction.transaction_tag,
                expense_category_id=db_transaction.expense_category_id,
                expense_subcategory_id=db_transaction.expense_subcategory_id,
                notes=db_transaction.notes,
            )
        else:
            return TransactionIncome(
                id=UID(str(db_transaction.id)),
                user_id=UID(str(db_transaction.user_id)),
                occurred_at=db_transaction.occurred_at,
                created_at=db_transaction.created_at,
                amount=float(db_transaction.amount),
                type=db_transaction.type,
                income_category_id=db_transaction.income_category_id,
                notes=db_transaction.notes,
            )

    async def delete_transaction(
        self,
        transaction_id: UUID,
        authenticated_user_id: UUID,
        session: Session,
    ) -> None:
        """
        Delete an existing transaction.

        Args:
            transaction_id: Transaction ID to delete
            authenticated_user_id: User ID from validated JWT token
            session: SQLAlchemy database session

        Raises:
            TransactionNotFoundError: If transaction not found or doesn't belong to user
            TransactionDeleteError: If database operation fails
        """
        # Get existing transaction
        db_transaction = self.transaction_repository.get_transaction_by_id(
            session, transaction_id, authenticated_user_id
        )
        if not db_transaction:
            raise TransactionNotFoundError(
                f"Transaction {transaction_id} not found or access denied"
            )

        # Delete transaction in database
        try:
            self.transaction_repository.delete_transaction(session, db_transaction)
            session.commit()
        except Exception as e:
            session.rollback()
            raise TransactionDeleteError("Failed to delete transaction") from e
