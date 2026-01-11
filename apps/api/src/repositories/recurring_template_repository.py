from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from src.db.models.recurring_template import RecurringTemplate


class RecurringTemplateRepository:
    """Repository for managing recurring transaction templates."""

    def create_template(
        self,
        session: Session,
        template_data: dict,
    ) -> RecurringTemplate:
        """
        Create a new recurring template.

        Args:
            session: SQLAlchemy database session
            template_data: Dictionary containing template fields

        Returns:
            Created RecurringTemplate instance (caller must commit)
        """
        # Generate UUID if not provided
        if "id" not in template_data:
            template_data["id"] = uuid4()

        template = RecurringTemplate(**template_data)
        session.add(template)
        return template

    def get_template(
        self,
        session: Session,
        template_id: UUID,
        user_id: UUID,
    ) -> RecurringTemplate | None:
        """
        Get a single recurring template by ID for a specific user.

        Args:
            session: SQLAlchemy database session
            template_id: Template ID to retrieve
            user_id: User ID (for security)

        Returns:
            RecurringTemplate or None if not found
        """
        stmt = select(RecurringTemplate).where(
            and_(
                RecurringTemplate.id == template_id,
                RecurringTemplate.user_id == user_id,
            )
        )
        return session.execute(stmt).scalar_one_or_none()

    def get_user_templates(
        self,
        session: Session,
        user_id: UUID,
        include_paused: bool = False,
    ) -> list[RecurringTemplate]:
        """
        Get all recurring templates for a user.

        Args:
            session: SQLAlchemy database session
            user_id: User ID
            include_paused: Whether to include paused templates

        Returns:
            List of RecurringTemplate instances
        """
        stmt = select(RecurringTemplate).where(RecurringTemplate.user_id == user_id)

        if not include_paused:
            stmt = stmt.where(RecurringTemplate.is_paused == False)  # noqa: E712

        stmt = stmt.order_by(RecurringTemplate.created_at.desc())
        return list(session.execute(stmt).scalars().all())

    def get_active_templates_for_date_range(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> list[RecurringTemplate]:
        """
        Get active recurring templates that should generate transactions in the date range.

        Args:
            session: SQLAlchemy database session
            user_id: User ID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of active RecurringTemplate instances
        """
        stmt = select(RecurringTemplate).where(
            and_(
                RecurringTemplate.user_id == user_id,
                RecurringTemplate.is_paused == False,  # noqa: E712
                RecurringTemplate.start_date <= end_date,
                # Template hasn't ended, or ends after our start date
                (
                    (RecurringTemplate.end_date.is_(None))
                    | (RecurringTemplate.end_date >= start_date)
                ),
            )
        )
        return list(session.execute(stmt).scalars().all())

    def update_template(
        self,
        session: Session,
        template_id: UUID,
        user_id: UUID,
        updates: dict,
    ) -> RecurringTemplate | None:
        """
        Update a recurring template.

        Args:
            session: SQLAlchemy database session
            template_id: Template ID to update
            user_id: User ID (for security)
            updates: Dictionary of fields to update

        Returns:
            Updated RecurringTemplate or None if not found
        """
        template = self.get_template(session, template_id, user_id)
        if not template:
            return None

        # Update fields
        for key, value in updates.items():
            if hasattr(template, key):
                setattr(template, key, value)

        # Update timestamp
        template.updated_at = datetime.now()

        return template

    def delete_template(
        self,
        session: Session,
        template_id: UUID,
        user_id: UUID,
    ) -> bool:
        """
        Delete a recurring template.

        Args:
            session: SQLAlchemy database session
            template_id: Template ID to delete
            user_id: User ID (for security)

        Returns:
            True if deleted, False if not found
        """
        template = self.get_template(session, template_id, user_id)
        if not template:
            return False

        session.delete(template)
        return True
