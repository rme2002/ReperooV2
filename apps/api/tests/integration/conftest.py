from __future__ import annotations

import logging
import os
from typing import AsyncIterator
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from src.core.database import get_session, session_scope
from src.db.models import Profile as ProfileDB
from src.db.models.expense_category import ExpenseCategory
from src.db.models.income_category import IncomeCategory
from src.db.models.transaction import Transaction
from src.main import app

logger = logging.getLogger(__name__)

REQUIRED_ENV_VARS = ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_SECRET_API_KEY")


def _missing_env_vars() -> list[str]:
    return [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]


@pytest.fixture(scope="session")
def integration_env() -> dict[str, str]:
    """
    Ensure Supabase/Postgres credentials are available before collecting tests.
    """

    missing = _missing_env_vars()
    if missing:
        pytest.fail(
            "Integration tests require the following environment variables: "
            + ", ".join(missing)
        )

    return {var: os.environ[var] for var in REQUIRED_ENV_VARS}


@pytest_asyncio.fixture(scope="function", autouse=True)
async def app_lifespan(integration_env: dict[str, str]) -> AsyncIterator[None]:
    """
    Recreate app lifespan (including Supabase client) for each test.
    This prevents "Event loop is closed" errors from the async Supabase client.
    """
    async with app.router.lifespan_context(app):
        yield


@pytest_asyncio.fixture
async def async_client(app_lifespan: None) -> AsyncIterator[AsyncClient]:
    """
    httpx test client that pushes requests into the FastAPI ASGI app directly.
    """

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


class IntegrationCleanup:
    """Handles cleanup for Supabase users and mirrored profile rows."""

    def __init__(self, supabase_client):
        self._supabase = supabase_client
        self._profile_ids: set[str] = set()
        self._supabase_user_ids: set[str] = set()
        self._transaction_ids: set[str] = set()

    def track_profile(self, profile_id: str) -> None:
        self._profile_ids.add(profile_id)

    def track_supabase_user(self, user_id: str) -> None:
        self._supabase_user_ids.add(user_id)

    def track_transaction(self, transaction_id: str) -> None:
        self._transaction_ids.add(transaction_id)

    async def run(self) -> None:
        """Execute all cleanup tasks."""
        # Clean up transactions first (foreign key constraints)
        self._cleanup_transactions()

        # Clean up profiles
        self._cleanup_profiles()

        # Clean up Supabase auth users last
        await self._cleanup_supabase_users()

    async def _cleanup_supabase_users(self) -> None:
        if not self._supabase or not self._supabase_user_ids:
            return

        for user_id in self._supabase_user_ids:
            try:
                await self._supabase.auth.admin.delete_user(user_id)
            except Exception as exc:  # pragma: no cover - best-effort cleanup
                logger.warning("Failed to delete Supabase user %s: %s", user_id, exc)

    def _cleanup_profiles(self) -> None:
        if not self._profile_ids:
            return

        try:
            profile_ids = [UUID(value) for value in self._profile_ids]
        except ValueError as exc:  # pragma: no cover - guarded for unexpected input
            logger.warning("Invalid profile IDs queued for cleanup: %s", exc)
            return

        with session_scope() as session:
            session.execute(delete(ProfileDB).where(ProfileDB.id.in_(profile_ids)))
            session.commit()

    def _cleanup_transactions(self) -> None:
        if not self._transaction_ids:
            return

        try:
            transaction_ids = [UUID(value) for value in self._transaction_ids]
        except ValueError as exc:  # pragma: no cover - guarded for unexpected input
            logger.warning("Invalid transaction IDs queued for cleanup: %s", exc)
            return

        with session_scope() as session:
            session.execute(
                delete(Transaction).where(Transaction.id.in_(transaction_ids))
            )
            session.commit()


@pytest_asyncio.fixture
async def cleanup_manager(
    async_client: AsyncClient,
) -> AsyncIterator[IntegrationCleanup]:
    """
    Tracks data created by a test and deletes it afterwards so the dev DB stays tidy.
    """

    supabase_client = getattr(app.state, "supabase", None)
    if supabase_client is None:
        pytest.fail("Supabase client is not initialized; did the app lifespan run?")

    cleanup = IntegrationCleanup(supabase_client)
    try:
        yield cleanup
    finally:
        await cleanup.run()


_shared_user_cache: dict[str, str] | None = None


@pytest_asyncio.fixture(scope="session")
async def shared_authenticated_user() -> dict[str, str]:
    """
    Create a shared user for all tests to avoid rate limiting.
    This user persists for the entire test session.
    """
    import secrets
    from httpx import ASGITransport, AsyncClient

    global _shared_user_cache
    if _shared_user_cache is not None:
        return _shared_user_cache

    # Generate unique email for this test session
    email = f"test_shared_{secrets.token_hex(8)}@example.com"
    password = "TestPassword123!"

    # Create client for sign-up (using session-scoped lifespan won't work, so we do it manually)
    # We need to create the user outside the normal test fixtures
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Sign up the user
            response = await client.post(
                "/api/v1/auth/sign-up",
                json={"email": email, "password": password},
            )

            if response.status_code != 201:
                logger.error(f"Shared user sign-up failed: {response.status_code}")
                logger.error(f"Response body: {response.text}")

            assert response.status_code == 201, f"Sign-up failed: {response.text}"
            user_data = response.json()
            user_id = user_data["id"]

        # Sign in to get JWT token
        supabase_client = getattr(app.state, "supabase", None)
        auth_response = await supabase_client.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
        token = auth_response.session.access_token

    _shared_user_cache = {"user_id": user_id, "token": token, "email": email}
    return _shared_user_cache


@pytest_asyncio.fixture
async def authenticated_user(shared_authenticated_user: dict[str, str]) -> dict[str, str]:
    """
    Return the shared authenticated user to avoid rate limiting.
    All tests use the same user, which is acceptable for integration tests.
    """
    return shared_authenticated_user


@pytest_asyncio.fixture(scope="session", autouse=True)
async def cleanup_shared_user(shared_authenticated_user: dict[str, str]) -> AsyncIterator[None]:
    """
    Cleanup the shared authenticated user at the end of the test session.
    """
    yield

    # Cleanup after all tests complete
    user_id = shared_authenticated_user["user_id"]
    logger.info(f"Cleaning up shared test user: {user_id}")

    # Create a temporary lifespan context for cleanup
    async with app.router.lifespan_context(app):
        supabase_client = getattr(app.state, "supabase", None)

        # Delete transactions for this user
        with session_scope() as session:
            try:
                session.execute(
                    delete(Transaction).where(Transaction.user_id == UUID(user_id))
                )
                session.commit()
                logger.info(f"Deleted transactions for user {user_id}")
            except Exception as e:
                logger.warning(f"Failed to delete transactions for user {user_id}: {e}")
                session.rollback()

        # Delete profile
        with session_scope() as session:
            try:
                session.execute(delete(ProfileDB).where(ProfileDB.id == UUID(user_id)))
                session.commit()
                logger.info(f"Deleted profile for user {user_id}")
            except Exception as e:
                logger.warning(f"Failed to delete profile for user {user_id}: {e}")
                session.rollback()

        # Delete Supabase auth user
        try:
            await supabase_client.auth.admin.delete_user(user_id)
            logger.info(f"Deleted Supabase auth user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to delete Supabase user {user_id}: {e}")


@pytest.fixture
def valid_expense_category() -> str:
    """
    Return a valid expense category ID from the database.
    Assumes seed data exists.
    """
    session = next(get_session())
    try:
        category = session.query(ExpenseCategory).first()
        if not category:
            pytest.fail("No expense categories found in database. Please seed data.")
        return category.id
    finally:
        session.close()


@pytest.fixture
def valid_income_category() -> str:
    """
    Return a valid income category ID from the database.
    Assumes seed data exists.
    """
    session = next(get_session())
    try:
        category = session.query(IncomeCategory).first()
        if not category:
            pytest.fail("No income categories found in database. Please seed data.")
        return category.id
    finally:
        session.close()
