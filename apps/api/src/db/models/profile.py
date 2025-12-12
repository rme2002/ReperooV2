from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        default=_utcnow,
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=_utcnow,
        nullable=False,
        server_default=func.now(),
        onupdate=_utcnow,
        server_onupdate=func.now(),
    )


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
