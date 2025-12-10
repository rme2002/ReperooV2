from __future__ import annotations

import importlib
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

import src.core.database as database_module
from src.db.models import Base as ModelBase
from src.db.models import Profile as ProfileDB
from src.repositories.profile_repository import ProfileRepository


def reload_database(monkeypatch, db_path: Path):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    module = importlib.reload(database_module)
    module.reset_state()
    return module


def recreate_schema(module):
    engine = module.get_engine()
    ModelBase.metadata.drop_all(engine)
    ModelBase.metadata.create_all(engine)


def test_profile_repository_upsert_creates_profile(tmp_path, monkeypatch):
    database = reload_database(monkeypatch, tmp_path / "profile-repo.db")
    recreate_schema(database)

    profile_uuid = uuid4()
    repo = ProfileRepository()

    with database.session_scope() as session:
        repo.upsert_profile(session, str(profile_uuid))
        session.commit()

    with database.session_scope() as session:
        stored = session.get(ProfileDB, profile_uuid)

    assert stored is not None
    assert stored.id == profile_uuid


def test_profile_repository_upsert_is_idempotent(tmp_path, monkeypatch):
    database = reload_database(monkeypatch, tmp_path / "profile-repo-idempotent.db")
    recreate_schema(database)

    profile_uuid = uuid4()
    repo = ProfileRepository()

    with database.session_scope() as session:
        repo.upsert_profile(session, str(profile_uuid))
        session.commit()
        repo.upsert_profile(session, str(profile_uuid))
        session.commit()

    with database.session_scope() as session:
        ids = session.scalars(select(ProfileDB.id)).all()

    assert ids == [profile_uuid]
