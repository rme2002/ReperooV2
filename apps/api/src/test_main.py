from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from .main import app


@pytest.fixture()
def client(monkeypatch):
    # FastAPI lifespan tries to create a Supabase client; stub it out.
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "fake-test-key")

    async def fake_create_client(url: str, key: str):
        return {"url": url, "key": key}

    monkeypatch.setattr("src.main.create_client", fake_create_client)
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
