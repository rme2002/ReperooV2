from __future__ import annotations

import logging
import os
from typing import AsyncIterator
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from src.core.database import session_scope
from src.db.models import Profile as ProfileDB
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


@pytest_asyncio.fixture(scope="session", autouse=True)
async def app_lifespan(integration_env: dict[str, str]) -> AsyncIterator[None]:
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

    def track_profile(self, profile_id: str) -> None:
        self._profile_ids.add(profile_id)

    def track_supabase_user(self, user_id: str) -> None:
        self._supabase_user_ids.add(user_id)

    async def run(self) -> None:
        # Cleanup temporarily disabled; re-enable once we want Supabase/auth cleanup again.
        return

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
