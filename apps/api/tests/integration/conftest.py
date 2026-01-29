"""Pytest configuration for integration tests."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from uuid import uuid4

from src.main import app
from src.core.database import get_session, get_database_url
from src.db.base import Base


@pytest.fixture(scope="session")
def test_engine():
    """Create a test database engine."""
    database_url = get_database_url()
    engine = create_engine(database_url)
    return engine


@pytest.fixture(scope="session")
def test_tables(test_engine):
    """Create all tables for testing."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def test_session(test_engine, test_tables):
    """Create a new database session for each test."""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(test_session):
    """Create a test client with database session override."""
    def override_get_session():
        try:
            yield test_session
        finally:
            pass

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_user_id():
    """Generate a test user ID."""
    return uuid4()


@pytest.fixture
def auth_headers(test_user_id):
    """Create authentication headers for test user."""
    # In production, replace with proper JWT token generation
    return {
        "Authorization": f"Bearer test_token_{test_user_id}",
        "Content-Type": "application/json"
    }
