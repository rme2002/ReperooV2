"""Pytest configuration for integration tests."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable
from uuid import UUID, uuid4

import jwt
import pytest
import pytest_asyncio
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from supabase._async.client import AsyncClient as SupabaseAsyncClient, create_client

from src.core.database import session_scope
from src.db.models import (
    BudgetPlan,
    ExpenseCategory,
    IncomeCategory,
    Profile as ProfileDB,
    RecurringTemplate,
    Transaction,
    XPEvent,
)
from src.main import app
from src.repositories.profile_repository import ProfileRepository

BASE_URL = "http://testserver"


def _issue_test_token(user_id: str, email: str) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "aud": "authenticated",
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, os.environ["SUPABASE_JWT_SECRET"], algorithm="HS256")


def _load_env() -> None:
    api_root = Path(__file__).resolve().parents[2]
    for filename in (".env", ".env.local"):
        env_path = api_root / filename
        if env_path.exists():
            load_dotenv(env_path, override=True)


def _require_env(keys: Iterable[str]) -> None:
    missing = [key for key in keys if not os.getenv(key)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")


@pytest.fixture(scope="session", autouse=True)
def _env_loaded() -> None:
    _load_env()
    _require_env(
        [
            "DATABASE_URL",
            "SUPABASE_URL",
            "SUPABASE_SECRET_API_KEY",
            "SUPABASE_JWT_SECRET",
        ]
    )


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def supabase_client() -> SupabaseAsyncClient:
    return await create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_API_KEY"],
    )


@dataclass
class CleanupManager:
    supabase: SupabaseAsyncClient
    supabase_user_ids: set[str] = field(default_factory=set)
    profile_ids: set[UUID] = field(default_factory=set)
    expense_category_ids: set[str] = field(default_factory=set)
    income_category_ids: set[str] = field(default_factory=set)

    def track_supabase_user(self, user_id: str) -> None:
        self.supabase_user_ids.add(str(user_id))

    def track_profile(self, user_id: str | UUID) -> None:
        self.profile_ids.add(UUID(str(user_id)))

    def track_expense_category(self, category_id: str) -> None:
        self.expense_category_ids.add(category_id)

    def track_income_category(self, category_id: str) -> None:
        self.income_category_ids.add(category_id)

    def _cleanup_db(self) -> None:
        with session_scope() as session:
            for user_id in self.profile_ids:
                session.execute(
                    delete(Transaction).where(Transaction.user_id == user_id)
                )
                session.execute(
                    delete(RecurringTemplate).where(
                        RecurringTemplate.user_id == user_id
                    )
                )
                session.execute(delete(XPEvent).where(XPEvent.user_id == user_id))
                session.execute(delete(BudgetPlan).where(BudgetPlan.user_id == user_id))
                session.execute(delete(ProfileDB).where(ProfileDB.id == user_id))
            for category_id in self.expense_category_ids:
                session.execute(
                    delete(ExpenseCategory).where(ExpenseCategory.id == category_id)
                )
            for category_id in self.income_category_ids:
                session.execute(
                    delete(IncomeCategory).where(IncomeCategory.id == category_id)
                )
            session.commit()

    async def cleanup(self) -> None:
        self._cleanup_db()
        for user_id in self.supabase_user_ids:
            try:
                await self.supabase.auth.admin.delete_user(user_id)
            except Exception:
                pass


@pytest_asyncio.fixture(scope="session")
async def cleanup_manager(supabase_client: SupabaseAsyncClient) -> CleanupManager:
    manager = CleanupManager(supabase=supabase_client)
    yield manager
    await manager.cleanup()


@pytest_asyncio.fixture(scope="session")
async def authenticated_user(
    supabase_client: SupabaseAsyncClient, cleanup_manager: CleanupManager
) -> dict[str, str]:
    email = f"ci+{uuid4().hex}@example.com"
    password = "IntegrationTest1!*"

    user = None
    try:
        admin_response = await supabase_client.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
            }
        )
        user = getattr(admin_response, "user", None)
    except Exception:
        user = None

    if not user or not getattr(user, "id", None):
        auth_response = await supabase_client.auth.sign_up(
            {"email": email, "password": password}
        )
        user = getattr(auth_response, "user", None)

    if not user or not getattr(user, "id", None):
        raise RuntimeError("Supabase user creation failed.")

    user_id = str(user.id)
    cleanup_manager.track_supabase_user(user_id)
    cleanup_manager.track_profile(user_id)

    with session_scope() as session:
        ProfileRepository().upsert_profile(session, id=user_id)
        session.commit()

    return {
        "user_id": user_id,
        "token": _issue_test_token(user_id, email),
        "email": email,
        "password": password,
    }


@pytest.fixture
def auth_headers(authenticated_user: dict[str, str]) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {authenticated_user['token']}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def client(supabase_client: SupabaseAsyncClient) -> TestClient:
    app.state.supabase = supabase_client
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def async_client(supabase_client: SupabaseAsyncClient) -> AsyncClient:
    app.state.supabase = supabase_client
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as test_client:
        yield test_client


@pytest.fixture
def valid_expense_category(cleanup_manager: CleanupManager) -> str:
    category_id = f"test_expense_{uuid4().hex}"
    with session_scope() as session:
        session.add(
            ExpenseCategory(
                id=category_id,
                label="Test Expense",
                color="#ff8800",
                sort_order=9999,
            )
        )
        session.commit()
    cleanup_manager.track_expense_category(category_id)
    return category_id


@pytest.fixture
def valid_income_category(cleanup_manager: CleanupManager) -> str:
    category_id = f"test_income_{uuid4().hex}"
    with session_scope() as session:
        session.add(
            IncomeCategory(
                id=category_id,
                label="Test Income",
                color="#00cc66",
                sort_order=9999,
            )
        )
        session.commit()
    cleanup_manager.track_income_category(category_id)
    return category_id
