from __future__ import annotations

import importlib
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

import src.core.database as database_module


def reload_database(monkeypatch: pytest.MonkeyPatch, db_path: Path):
    """Reload the database helper module with a temp DATABASE_URL."""

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    module = importlib.reload(database_module)
    module.reset_state()
    return module


def recreate_schema(module, metadata):
    engine = module.get_engine()
    metadata.drop_all(engine)
    metadata.create_all(engine)


class _TestBase(DeclarativeBase):
    pass


class Notebook(_TestBase):
    __tablename__ = "notebooks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str]


class Task(_TestBase):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str]


def test_session_scope_persists_models(tmp_path, monkeypatch):
    module = reload_database(monkeypatch, tmp_path / "scope.db")
    recreate_schema(module, _TestBase.metadata)

    with module.session_scope() as session:
        session.add(Notebook(title="first"))
        session.commit()

    with module.session_scope() as session:
        titles = session.scalars(select(Notebook.title)).all()

    assert titles == ["first"]


def test_get_session_dependency_closes_sessions(tmp_path, monkeypatch):
    module = reload_database(monkeypatch, tmp_path / "dependency.db")
    recreate_schema(module, _TestBase.metadata)

    session_gen = module.get_session()
    session: Session = next(session_gen)
    try:
        session.add(Task(name="A"))
        session.commit()
    finally:
        session_gen.close()

    with module.session_scope() as session:
        tasks = session.scalars(select(Task.name)).all()

    assert tasks == ["A"]


def test_profile_model_uses_separate_db_schema(tmp_path, monkeypatch):
    module = reload_database(monkeypatch, tmp_path / "profile.db")

    from src.db.models import Base as ModelBase
    from src.db.models import Profile as ProfileDB

    recreate_schema(module, ModelBase.metadata)
    profile_id = uuid4()

    with module.session_scope() as session:
        profile = ProfileDB(id=profile_id)
        session.add(profile)
        session.commit()
        session.refresh(profile)

    assert profile.id == profile_id
    assert profile.created_at is not None
    assert profile.updated_at is not None
