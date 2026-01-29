from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from src.db.models import Profile as ProfileDB


class ProfileRepository:
    def upsert_profile(self, session: Session, id: str) -> ProfileDB:
        """Insert or update the profile row, leaving transaction control to caller."""

        profile = ProfileDB(id=UUID(id))
        return session.merge(profile)

    def get_profile_by_id(self, session: Session, user_id: UUID) -> ProfileDB | None:
        """Get profile by user ID."""
        return session.query(ProfileDB).filter(ProfileDB.id == user_id).first()

    def get_user_timezone(self, session: Session, user_id: UUID) -> str:
        """Get user's timezone setting, defaulting to UTC if not set."""
        profile = self.get_profile_by_id(session, user_id)
        return profile.timezone if profile and profile.timezone else 'UTC'

    def update_timezone(self, session: Session, user_id: UUID, timezone: str) -> ProfileDB:
        """Update user's timezone preference."""
        profile = self.get_profile_by_id(session, user_id)
        if profile:
            profile.timezone = timezone
            session.add(profile)
        return profile
