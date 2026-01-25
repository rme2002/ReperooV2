#!/usr/bin/env python3
"""
Set your level for testing gamification features.

Run from apps/api directory:
    uv run --env-file .env.local python set_level.py <level>
    uv run --env-file .env.local python set_level.py 25
    uv run --env-file .env.local python set_level.py 50 --xp 500

Arguments:
    level: Target level (1-100)
    --xp: Optional additional XP within the level (default: 0)
    --email: User email (default: romea123@test.com)
"""

import asyncio
import argparse
from src.main import app
from src.core.database import get_session
from src.repositories.profile_repository import ProfileRepository
from src.services.experience_service import ExperienceService
from src.repositories.xp_event_repository import XPEventRepository


async def set_level(target_level: int, additional_xp: int = 0, email: str = "romea123@test.com"):
    """Set user to specific level with optional additional XP."""

    if target_level < 1 or target_level > 100:
        print("❌ Error: Level must be between 1 and 100")
        return

    if additional_xp < 0:
        print("❌ Error: Additional XP cannot be negative")
        return

    print("=" * 80)
    print("SET LEVEL FOR TESTING")
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
                profile = profile_repo.get_profile_by_id(session, user_id)

                if not profile:
                    print(f"❌ Error: Profile not found for user {user_id}")
                    return

                # Create experience service
                xp_event_repo = XPEventRepository()
                exp_service = ExperienceService(profile_repo, xp_event_repo)

                # Display current state
                print("\n2. Current Status:")
                print(f"   Level: {profile.current_level}")
                print(f"   XP: {profile.current_xp}")
                print(f"   Evolution Stage: {exp_service.get_evolution_stage(profile.current_level)}")

                # Calculate XP needed for target level
                total_xp_for_level = exp_service.calculate_total_xp_for_level(target_level)
                new_xp = total_xp_for_level + additional_xp

                # Update profile
                print("\n3. Setting new level:")
                print(f"   Target Level: {target_level}")
                print(f"   Base XP for level {target_level}: {total_xp_for_level}")
                print(f"   Additional XP: {additional_xp}")
                print(f"   Total XP: {new_xp}")

                old_xp = profile.current_xp
                old_level = profile.current_level

                profile.current_xp = new_xp
                profile.current_level = target_level
                profile.total_xp_earned = new_xp  # Also update total earned

                session.commit()

                # Display new state
                new_stage = exp_service.get_evolution_stage(target_level)
                xp_for_next = exp_service.xp_required_for_next_level(target_level)
                total_xp_for_current = exp_service.calculate_total_xp_for_level(target_level)
                xp_within_level = new_xp - total_xp_for_current

                print("\n4. ✅ Level Updated Successfully!")
                print(f"   Old: Level {old_level} ({old_xp} XP)")
                print(f"   New: Level {target_level} ({new_xp} XP)")
                print(f"   Evolution Stage: {new_stage}")
                print(f"   XP Progress: {xp_within_level}/{xp_for_next}")
                print(f"   Streak: {profile.current_streak} days")

                # Show evolution stages
                print("\n5. Evolution Stages Reference:")
                stages = [
                    ("Baby", 1, 5),
                    ("Young", 6, 15),
                    ("Adult", 16, 30),
                    ("Prime", 31, 50),
                    ("Legendary", 51, "∞"),
                ]
                for stage_name, min_level, max_level in stages:
                    indicator = "👉 " if min_level <= target_level <= (max_level if isinstance(max_level, int) else 999) else "   "
                    print(f"   {indicator}{stage_name}: Level {min_level}-{max_level}")

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
        description="Set your level for testing gamification features"
    )
    parser.add_argument(
        "level",
        type=int,
        help="Target level (1-100)"
    )
    parser.add_argument(
        "--xp",
        type=int,
        default=0,
        help="Additional XP within the level (default: 0)"
    )
    parser.add_argument(
        "--email",
        type=str,
        default="romea123@test.com",
        help="User email (default: romea123@test.com)"
    )

    args = parser.parse_args()

    asyncio.run(set_level(args.level, args.xp, args.email))


if __name__ == "__main__":
    main()
