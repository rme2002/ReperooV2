from __future__ import annotations

from uuid import UUID
from datetime import date

from sqlalchemy import Column, ForeignKey, Table, Integer, Date, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from src.db.base import Base
from src.db.models.utils.mixins import TimestampMixin


# def _utcnow() -> datetime:
#     return datetime.now(timezone.utc)


# class TimestampMixin:
#     created_at: Mapped[datetime] = mapped_column(
#         DateTime(timezone=True),
#         default=_utcnow,
#         nullable=False,
#         server_default=func.now(),
#     )
#     updated_at: Mapped[datetime] = mapped_column(
#         DateTime(timezone=True),
#         default=_utcnow,
#         nullable=False,
#         server_default=func.now(),
#         onupdate=_utcnow,
#         server_onupdate=func.now(),
#     )


# Minimal definition so SQLAlchemy can resolve the Supabase auth.users FK.
AUTH_USERS_TABLE = Table(
    "users",
    Base.metadata,
    Column("id", PGUUID(as_uuid=True), primary_key=True),
    schema="auth",
    info={"skip_autogenerate": True},
)


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Gamification fields
    current_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_login_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    transactions_today_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_transaction_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    timezone: Mapped[str] = mapped_column(Text, default='UTC', nullable=False)
