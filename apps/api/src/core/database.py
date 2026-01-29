from __future__ import annotations

import os
from contextlib import contextmanager
from functools import lru_cache
from typing import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker


def _database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set before accessing the database.")
    return database_url


@lru_cache(maxsize=None)
def _build_engine(database_url: str) -> Engine:
    """
    Lazily build (and cache) an engine for the provided URL.

    Using a separate builder keeps the cache tied to the active URL so tests
    can swap DATABASE_URL without restarting the process.
    """

    execution_options = None
    connect_args = {}
    url = make_url(database_url)
    if url.get_backend_name() == "sqlite":
        # SQLite does not support schemas. Translate "auth" schema references to
        # the default schema so metadata.create_all() works in tests.
        execution_options = {"schema_translate_map": {"auth": None}}
    elif url.get_backend_name() == "postgresql" and url.get_driver_name() == "psycopg":
        # Supabase pooler is incompatible with prepared statements.
        connect_args["prepare_threshold"] = None

    return create_engine(
        database_url,
        pool_pre_ping=True,
        execution_options=execution_options,
        connect_args=connect_args,
    )


@lru_cache(maxsize=None)
def _build_sessionmaker(database_url: str) -> sessionmaker[Session]:
    return sessionmaker(
        bind=_build_engine(database_url),
        autoflush=False,
        autocommit=False,
    )


def reset_state() -> None:
    """Clear cached engines/sessionmakers so the next request rebuilds them."""

    _build_sessionmaker.cache_clear()
    _build_engine.cache_clear()


def get_engine() -> Engine:
    return _build_engine(_database_url())


def _sessionmaker() -> sessionmaker[Session]:
    return _build_sessionmaker(_database_url())


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a transactional scope for scripts and tests."""

    session = _sessionmaker()()
    try:
        yield session
    finally:
        session.close()


def get_session() -> Iterator[Session]:
    """
    FastAPI dependency that yields a Session.

    Wrapped around `session_scope` so dependency overrides remain easy to test.
    """

    with session_scope() as session:
        yield session
