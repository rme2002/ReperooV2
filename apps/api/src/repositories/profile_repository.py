from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from src.db.models import Profile as ProfileDB


class ProfileRepository:
    def upsert_profile(self, session: Session, id: str) -> ProfileDB:
        """Insert or update the profile row, leaving transaction control to caller."""

        profile = ProfileDB(id=UUID(id))
        return session.merge(profile)
