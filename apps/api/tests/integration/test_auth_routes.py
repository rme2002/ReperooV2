from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from src.core.database import session_scope
from src.db.models import Profile as ProfileDB

pytestmark = pytest.mark.integration


def _unwrap_root(value: object) -> str:
    """Pydantic RootModel fields serialize as {'root': 'value'}; accept plain str too."""

    if isinstance(value, dict) and "root" in value:
        return str(value["root"])
    return str(value)


@pytest.mark.asyncio
async def test_health_endpoint(async_client):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_sign_up_creates_supabase_user_and_profile(async_client, cleanup_manager):
    email = f"ci+{uuid4().hex}@example.com"
    password = "IntegrationTest1!*"

    response = await async_client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()

    user_id = _unwrap_root(body["id"])
    returned_email = _unwrap_root(body["email"])

    cleanup_manager.track_supabase_user(user_id)
    cleanup_manager.track_profile(user_id)

    assert returned_email == email
    assert UUID(user_id)

    with session_scope() as session:
        profile = session.get(ProfileDB, UUID(user_id))

    assert profile is not None
