from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import desc

from src.db.models.xp_event import XPEvent


class XPEventRepository:
    def create_event(
        self,
        session: Session,
        user_id: UUID,
        xp_amount: int,
        event_type: str,
        description: str,
        event_metadata: dict | None = None,
    ) -> XPEvent:
        """Create a new XP event."""
        event = XPEvent(
            user_id=user_id,
            xp_amount=xp_amount,
            event_type=event_type,
            description=description,
            event_metadata=event_metadata,
        )
        session.add(event)
        return event

    def get_events_by_user(
        self,
        session: Session,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[XPEvent]:
        """Get XP events for a user with pagination."""
        return (
            session.query(XPEvent)
            .filter(XPEvent.user_id == user_id)
            .order_by(desc(XPEvent.created_at))
            .limit(limit)
            .offset(offset)
            .all()
        )

    def count_events_by_user(self, session: Session, user_id: UUID) -> int:
        """Count total XP events for a user."""
        return session.query(XPEvent).filter(XPEvent.user_id == user_id).count()

    def get_milestone_event(
        self, session: Session, user_id: UUID, days: int
    ) -> XPEvent | None:
        """Check if user has already received a specific streak milestone."""
        return (
            session.query(XPEvent)
            .filter(
                XPEvent.user_id == user_id,
                XPEvent.event_type == "streak_milestone",
                XPEvent.description.contains(f"{days}-day"),
            )
            .first()
        )

    def get_financial_goal_events_for_month(
        self, session: Session, user_id: UUID, month: int, year: int
    ) -> list[XPEvent]:
        """Get financial goal XP events for a specific month."""
        month_str = f"{month}/{year}"
        return (
            session.query(XPEvent)
            .filter(
                XPEvent.user_id == user_id,
                XPEvent.event_type == "financial_goal",
                XPEvent.description.contains(month_str),
            )
            .all()
        )
