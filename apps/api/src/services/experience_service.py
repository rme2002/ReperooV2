from __future__ import annotations

from datetime import date
from uuid import UUID
import math

from sqlalchemy.orm import Session

from src.repositories.profile_repository import ProfileRepository
from src.repositories.xp_event_repository import XPEventRepository
from src.models.model import (
    ExperienceResponse,
    CheckInResponse,
    XPEvent as XPEventModel,
    ExperienceHistoryResponse,
    StreakMilestonesResponse,
    StreakMilestone,
)


class ExperienceService:
    # Streak milestone rewards mapping
    STREAK_MILESTONES = {
        7: 50,
        14: 75,
        30: 150,
        60: 250,
        100: 400,
        150: 500,
        200: 600,
        365: 1000,
    }

    # Daily transaction XP cap
    TRANSACTION_DAILY_LIMIT = 5

    def __init__(
        self,
        profile_repository: ProfileRepository,
        xp_event_repository: XPEventRepository,
    ):
        self.profile_repository = profile_repository
        self.xp_event_repository = xp_event_repository

    # ==================== Level Calculations ====================

    def calculate_level_from_xp(self, xp: int) -> int:
        """
        Calculate level from total XP using formula: N * 10 per level.
        Formula: Level = floor((sqrt(1 + 8*XP/10) - 1) / 2) + 1
        """
        if xp <= 0:
            return 1
        n = (-1 + math.sqrt(1 + 0.8 * xp)) / 2
        return max(1, math.floor(n) + 1)

    def calculate_total_xp_for_level(self, level: int) -> int:
        """Return total cumulative XP needed to reach specific level."""
        if level <= 1:
            return 0
        n = level - 1
        return 5 * n * (n + 1)

    def xp_required_for_next_level(self, current_level: int) -> int:
        """Return XP needed to advance from current level to next."""
        return current_level * 10

    def get_evolution_stage(self, level: int) -> str:
        """Return evolution stage based on level."""
        if level >= 51:
            return "Legendary"
        elif level >= 31:
            return "Prime"
        elif level >= 16:
            return "Adult"
        elif level >= 6:
            return "Young"
        else:
            return "Baby"

    # ==================== Status ====================

    async def get_status(self, user_id: UUID, session: Session) -> ExperienceResponse:
        """Get current experience status for user."""
        profile = self.profile_repository.get_profile_by_id(session, user_id)
        if not profile:
            raise ValueError("Profile not found")

        current_level = profile.current_level
        current_xp = profile.current_xp
        total_xp_for_current = self.calculate_total_xp_for_level(current_level)
        xp_for_next = self.xp_required_for_next_level(current_level)
        evolution_stage = self.get_evolution_stage(current_level)

        # Reset transaction count if new day
        today = date.today()
        if profile.last_transaction_date != today:
            profile.transactions_today_count = 0
            profile.last_transaction_date = today
            session.commit()

        return ExperienceResponse(
            user_id=user_id,
            current_level=current_level,
            current_xp=current_xp,
            xp_for_next_level=xp_for_next,
            total_xp_for_current_level=total_xp_for_current,
            evolution_stage=evolution_stage,
            current_streak=profile.current_streak,
            longest_streak=profile.longest_streak,
            last_login_date=profile.last_login_date,
            transactions_today_count=profile.transactions_today_count,
            transactions_daily_limit=self.TRANSACTION_DAILY_LIMIT,
        )

    # ==================== Check-in ====================

    async def check_in(self, user_id: UUID, session: Session) -> CheckInResponse:
        """
        Award +15 XP for daily login, update streak, check for inactivity penalties.
        ALWAYS sets last_login_date to SERVER TIME (not client time).
        """
        profile = self.profile_repository.get_profile_by_id(session, user_id)
        if not profile:
            raise ValueError("Profile not found")

        today = date.today()  # SERVER TIME

        # Check if already checked in today
        if profile.last_login_date == today:
            return CheckInResponse(
                xp_awarded=0,
                new_total_xp=profile.current_xp,
                new_level=profile.current_level,
                level_up=False,
                previous_level=None,
                streak_incremented=False,
                new_streak=profile.current_streak,
                streak_broken=False,
                inactivity_penalties=[],
                milestone_reached=None,
                message="Already checked in today",
            )

        # Check for inactivity
        inactivity_penalties = []
        streak_broken = False
        if profile.last_login_date:
            days_missed = (today - profile.last_login_date).days - 1
            if days_missed > 0:
                # Apply penalties
                inactivity_penalties = await self._apply_inactivity_penalties(
                    profile, days_missed, session
                )
                # Reset streak
                profile.current_streak = 0
                streak_broken = True

        # Award login XP
        previous_level = profile.current_level
        self.xp_event_repository.create_event(
            session=session,
            user_id=user_id,
            xp_amount=15,
            event_type="daily_login",
            description="Daily check-in",
        )
        profile.current_xp += 15
        profile.total_xp_earned += 15

        # Update streak
        if not streak_broken:
            profile.current_streak += 1
            if profile.current_streak > profile.longest_streak:
                profile.longest_streak = profile.current_streak

        # Check for milestone
        milestone_reached = await self._check_and_award_streak_milestone(
            profile, user_id, session
        )

        # Update last login date (SERVER TIME)
        profile.last_login_date = today

        # Update level
        new_level = self.calculate_level_from_xp(profile.current_xp)
        level_up = new_level > previous_level
        profile.current_level = new_level

        session.commit()

        # Convert penalty events to response models
        penalty_models = [
            XPEventModel(
                id=event.id,
                xp_amount=event.xp_amount,
                event_type=event.event_type,
                description=event.description,
                created_at=event.created_at,
            )
            for event in inactivity_penalties
        ]

        return CheckInResponse(
            xp_awarded=15,
            new_total_xp=profile.current_xp,
            new_level=new_level,
            level_up=level_up,
            previous_level=previous_level if level_up else None,
            streak_incremented=not streak_broken,
            new_streak=profile.current_streak,
            streak_broken=streak_broken,
            inactivity_penalties=penalty_models,
            milestone_reached=milestone_reached,
            message="Welcome back! +15 XP",
        )

    async def _apply_inactivity_penalties(
        self, profile, days_missed: int, session: Session
    ) -> list:
        """Apply XP penalties for each day missed."""
        penalties = []
        for day in range(1, days_missed + 1):
            penalty_amount = -(15 * day)
            event = self.xp_event_repository.create_event(
                session=session,
                user_id=profile.id,
                xp_amount=penalty_amount,
                event_type="inactivity_penalty",
                description=f"Missed day {day} of inactivity",
            )
            penalties.append(event)
            profile.current_xp = max(0, profile.current_xp + penalty_amount)

        # Update level after penalties
        new_level = self.calculate_level_from_xp(profile.current_xp)
        profile.current_level = new_level

        return penalties

    async def _check_and_award_streak_milestone(
        self, profile, user_id: UUID, session: Session
    ) -> dict | None:
        """Check if streak milestone reached, award bonus XP."""
        streak = profile.current_streak
        if streak not in self.STREAK_MILESTONES:
            return None

        # Check if already awarded
        existing = self.xp_event_repository.get_milestone_event(
            session, user_id, streak
        )
        if existing:
            return None

        # Award milestone XP
        xp_reward = self.STREAK_MILESTONES[streak]
        self.xp_event_repository.create_event(
            session=session,
            user_id=user_id,
            xp_amount=xp_reward,
            event_type="streak_milestone",
            description=f"{streak}-day streak bonus",
        )

        profile.current_xp += xp_reward
        profile.total_xp_earned += xp_reward

        return {"days": streak, "xp_reward": xp_reward}

    # ==================== Transaction XP ====================

    async def award_transaction_xp(
        self, user_id: UUID, session: Session
    ) -> dict | None:
        """
        Award +3 XP for logging transaction (up to 5 per day).
        Returns None if daily cap reached.
        """
        profile = self.profile_repository.get_profile_by_id(session, user_id)
        if not profile:
            raise ValueError("Profile not found")

        today = date.today()

        # Reset counter if new day
        if profile.last_transaction_date != today:
            profile.transactions_today_count = 0
            profile.last_transaction_date = today

        # Check daily cap
        if profile.transactions_today_count >= self.TRANSACTION_DAILY_LIMIT:
            return None  # Cap reached

        # Award XP
        self.xp_event_repository.create_event(
            session=session,
            user_id=user_id,
            xp_amount=3,
            event_type="transaction",
            description="Logged transaction",
        )
        profile.current_xp += 3
        profile.total_xp_earned += 3
        profile.transactions_today_count += 1

        # Update level
        new_level = self.calculate_level_from_xp(profile.current_xp)
        profile.current_level = new_level

        session.commit()

        return {
            "xp_awarded": 3,
            "new_total_xp": profile.current_xp,
            "transactions_today_count": profile.transactions_today_count,
        }

    # ==================== Financial Goal XP ====================

    async def award_financial_goal_xp(
        self, user_id: UUID, month: int, year: int, session: Session
    ) -> list:
        """
        Check if user met savings/investment goals for the month (must be > 0).
        Award +100 XP per goal met. Called when viewing month insights.
        Returns list of XP events created.
        """
        # Check if already awarded for this month
        existing_events = self.xp_event_repository.get_financial_goal_events_for_month(
            user_id, month, year, session
        )
        if existing_events:
            return []  # Already awarded

        # NOTE: Actual goal checking logic needs to be integrated
        # with budget plan service and insights service
        # For now, this is a placeholder that returns empty list
        return []

    # ==================== History ====================

    async def get_history(
        self, user_id: UUID, limit: int, offset: int, session: Session
    ) -> ExperienceHistoryResponse:
        """Get XP transaction history."""
        events = self.xp_event_repository.get_events_by_user(
            session, user_id, limit, offset
        )
        total_count = self.xp_event_repository.count_events_by_user(session, user_id)

        event_models = [
            XPEventModel(
                id=event.id,
                xp_amount=event.xp_amount,
                event_type=event.event_type,
                description=event.description,
                created_at=event.created_at,
            )
            for event in events
        ]

        return ExperienceHistoryResponse(
            events=event_models,
            total_count=total_count,
            has_more=(offset + limit) < total_count,
        )

    # ==================== Milestones ====================

    async def get_milestones(
        self, user_id: UUID, session: Session
    ) -> StreakMilestonesResponse:
        """Get available streak milestones and progress."""
        profile = self.profile_repository.get_profile_by_id(session, user_id)
        if not profile:
            raise ValueError("Profile not found")

        current_streak = profile.current_streak
        milestones = []

        for days, xp_reward in sorted(self.STREAK_MILESTONES.items()):
            # Check if achieved
            existing = self.xp_event_repository.get_milestone_event(
                session, user_id, days
            )

            if existing:
                milestones.append(
                    StreakMilestone(
                        days=days,
                        xp_reward=xp_reward,
                        achieved=True,
                        achieved_at=existing.created_at,
                        days_remaining=None,
                    )
                )
            else:
                days_remaining = max(0, days - current_streak)
                milestones.append(
                    StreakMilestone(
                        days=days,
                        xp_reward=xp_reward,
                        achieved=False,
                        achieved_at=None,
                        days_remaining=days_remaining,
                    )
                )

        return StreakMilestonesResponse(
            current_streak=current_streak,
            milestones=milestones,
        )
