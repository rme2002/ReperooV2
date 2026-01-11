class SignUpError(Exception):
    """Raised when Supabase sign-up fails or returns no user."""

    pass


class CategoryNotFoundError(Exception):
    """Raised when a referenced category does not exist."""

    pass


class TransactionValidationError(Exception):
    """Raised when transaction payload fails business logic validation."""

    pass


class TransactionCreationError(Exception):
    """Raised when transaction creation fails."""

    pass


class TransactionNotFoundError(Exception):
    """Raised when a transaction is not found or user doesn't have access."""

    pass


class TransactionUpdateError(Exception):
    """Raised when transaction update fails."""

    pass


class TransactionDeleteError(Exception):
    """Raised when transaction deletion fails."""

    pass


class BudgetPlanNotFoundError(Exception):
    """Raised when a budget plan is not found or user doesn't have access."""

    pass


class BudgetPlanValidationError(Exception):
    """Raised when budget plan payload fails business logic validation."""

    pass


class BudgetPlanCreationError(Exception):
    """Raised when budget plan creation fails."""

    pass


class BudgetPlanUpdateError(Exception):
    """Raised when budget plan update fails."""

    pass


class BudgetPlanAlreadyExistsError(Exception):
    """Raised when trying to create a budget plan when one already exists."""

    pass
