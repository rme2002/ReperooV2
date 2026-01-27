#!/usr/bin/env python3
"""
Set your streak for testing gamification features.

This script automatically:
1. Clears all existing streak milestone achievements
2. Sets your new current and longest streak
3. Awards milestone achievements based on your new longest streak
4. Updates your XP and level accordingly

Use set_level.py to manually set specific level/XP combinations for edge case testing.

Run from apps/api directory:
    uv run --env-file .env.local python set_streak.py <streak>
    uv run --env-file .env.local python set_streak.py 25
    uv run --env-file .env.local python set_streak.py 100 --longest 150

Arguments:
    streak: Target current streak (0-999)
    --longest: Optional longest streak (default: same as current streak)
    --email: User email (default: romea123@test.com)
"""

import asyncio
import argparse
from src.main import app
from src.core.database import get_session
from src.repositories.profile_repository import ProfileRepository
from src.repositories.xp_event_repository import XPEventRepository
from src.services.experience_service import ExperienceService
from src.db.models.xp_event import XPEvent
from sqlalchemy import delete


async def set_streak(current_streak: int, longest_streak: int | None = None, email: str = "romea123@test.com"):
    """Set user's current and longest streak for testing."""

    if current_streak < 0 or current_streak > 999:
        print("❌ Error: Current streak must be between 0 and 999")
        return

    # If longest_streak not specified, set it to current_streak
    if longest_streak is None:
        longest_streak = current_streak

    if longest_streak < current_streak:
        print("❌ Error: Longest streak cannot be less than current streak")
        return

    print("=" * 80)
    print("SET STREAK FOR TESTING")
    print("=" * 80)

    async with app.router.lifespan_context(app):
        supabase_client = app.state.supabase

        try:
            # Sign in to get user ID
            print(f"\n1. Signing in as: {email}")
            auth_response = await supabase_client.auth.sign_in_with_password(
                {"email": email, "password": "romea123"}
            )

            user_id = auth_response.user.id
            print(f"✅ User ID: {user_id}")

            # Get database session
            session_gen = get_session()
            session = next(session_gen)

            try:
                # Get current profile
                profile_repo = ProfileRepository()
                xp_event_repo = XPEventRepository()
                exp_service = ExperienceService(profile_repo, xp_event_repo)

                profile = profile_repo.get_profile_by_id(session, user_id)

                if not profile:
                    print(f"❌ Error: Profile not found for user {user_id}")
                    return

                # Display current state
                print("\n2. Current Status:")
                print(f"   Current Streak: {profile.current_streak} days")
                print(f"   Longest Streak: {profile.longest_streak} days")
                print(f"   Level: {profile.current_level}")
                print(f"   XP: {profile.current_xp}")

                # Store old values
                old_current_streak = profile.current_streak
                old_longest_streak = profile.longest_streak
                old_xp = profile.current_xp
                old_level = profile.current_level

                # Step 1: Clear all existing streak milestone achievements
                print("\n3. Clearing existing achievements...")
                existing_milestones = (
                    session.query(XPEvent)
                    .filter(
                        XPEvent.user_id == user_id,
                        XPEvent.event_type == "streak_milestone",
                    )
                    .all()
                )

                cleared_xp = 0
                if existing_milestones:
                    for event in existing_milestones:
                        cleared_xp += event.xp_amount
                    print(f"   Found {len(existing_milestones)} existing achievement(s)")
                    print(f"   Removing {cleared_xp} XP from cleared achievements")

                    # Delete all streak milestones
                    stmt = delete(XPEvent).where(
                        XPEvent.user_id == user_id,
                        XPEvent.event_type == "streak_milestone",
                    )
                    session.execute(stmt)

                    # Adjust XP
                    profile.current_xp = max(0, profile.current_xp - cleared_xp)
                    profile.total_xp_earned = max(0, profile.total_xp_earned - cleared_xp)
                else:
                    print("   No existing achievements to clear")

                # Step 2: Update profile streaks
                print("\n4. Setting new streak:")
                print(f"   Target Current Streak: {current_streak} days")
                print(f"   Target Longest Streak: {longest_streak} days")

                profile.current_streak = current_streak
                profile.longest_streak = longest_streak

                # Step 3: Award milestone achievements based on longest_streak
                print("\n5. Awarding milestone achievements...")
                milestones_awarded = []
                total_xp_from_milestones = 0

                for days, xp_reward in sorted(exp_service.STREAK_MILESTONES.items()):
                    # Only award milestones up to the longest streak
                    if days <= longest_streak:
                        # Award this milestone (we cleared all, so no need to check existing)
                        xp_event_repo.create_event(
                            session=session,
                            user_id=user_id,
                            xp_amount=xp_reward,
                            event_type="streak_milestone",
                            description=f"{days}-day streak bonus",
                        )
                        profile.current_xp += xp_reward
                        profile.total_xp_earned += xp_reward
                        total_xp_from_milestones += xp_reward
                        milestones_awarded.append((days, xp_reward))
                        print(f"   ✅ Unlocked {days}-day milestone (+{xp_reward} XP)")

                if not milestones_awarded:
                    print("   No milestones to award (streak is 0 or below minimum)")
                else:
                    print(f"   Total XP from milestones: +{total_xp_from_milestones}")

                # Update level based on new XP
                new_level = exp_service.calculate_level_from_xp(profile.current_xp)
                profile.current_level = new_level

                session.commit()

                # Display new state
                print("\n6. ✅ Streak Updated Successfully!")
                print(f"   Current Streak: {old_current_streak} days → {current_streak} days")
                print(f"   Longest Streak: {old_longest_streak} days → {longest_streak} days")
                print(f"   Level: {old_level} ({old_xp} XP) → {new_level} ({profile.current_xp} XP)")

                if len(milestones_awarded) > 0:
                    print(f"\n   🎉 Achievements Unlocked: {len(milestones_awarded)}")
                    for days, xp in milestones_awarded:
                        print(f"      • {days}-day streak milestone (+{xp} XP)")

                # Show streak milestones
                print("\n7. Streak Milestones Reference:")
                milestones = [
                    ("Getting Started", 1, 6),
                    ("Building Habit", 7, 13),
                    ("On Fire", 14, 29),
                    ("Dedicated", 30, 49),
                    ("Unstoppable", 50, 99),
                    ("Legendary", 100, "∞"),
                ]
                for milestone_name, min_days, max_days in milestones:
                    indicator = "👉 " if min_days <= current_streak <= (max_days if isinstance(max_days, int) else 999) else "   "
                    print(f"   {indicator}{milestone_name}: {min_days}-{max_days} days")

                print("\n" + "=" * 80)
                print("✅ Done! Refresh your app to see the changes.")
                print("=" * 80)

            finally:
                session.close()

        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("\nMake sure:")
            print("  1. You're running from apps/api directory")
            print("  2. The user exists (run test_experience_endpoints.py first)")
            print("  3. You're using the correct email/password")


def main():
    parser = argparse.ArgumentParser(
        description="Set your streak for testing gamification features"
    )
    parser.add_argument(
        "streak",
        type=int,
        help="Target current streak (0-999)"
    )
    parser.add_argument(
        "--longest",
        type=int,
        default=None,
        help="Longest streak (default: same as current streak)"
    )
    parser.add_argument(
        "--email",
        type=str,
        default="romea123@test.com",
        help="User email (default: romea123@test.com)"
    )

    args = parser.parse_args()

    asyncio.run(set_streak(args.streak, args.longest, args.email))


if __name__ == "__main__":
    main()
