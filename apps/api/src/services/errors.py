class SignUpError(Exception):
    """Raised when Supabase sign-up fails or returns no user."""

    pass


class BusinessError(Exception):
    """Base class for business-related errors."""

    pass


class BusinessConflictError(BusinessError):
    """Raised when trying to create multiple businesses for the same admin."""

    pass


class BusinessForbiddenError(BusinessError):
    """Raised when the user tries to act on a business they do not own."""

    pass


class BusinessNotFoundError(BusinessError):
    """Raised when a requested business cannot be found."""

    pass
