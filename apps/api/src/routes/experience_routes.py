from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user_id
from src.core.database import get_session
from src.models.model import (
    ExperienceResponse,
    CheckInResponse,
    ExperienceHistoryResponse,
    StreakMilestonesResponse,
)
from src.repositories.profile_repository import ProfileRepository
from src.repositories.xp_event_repository import XPEventRepository
from src.services.experience_service import ExperienceService

router = APIRouter()


def get_experience_service(
    session: Session = Depends(get_session),
) -> ExperienceService:
    """Dependency factory for ExperienceService."""
    profile_repository = ProfileRepository()
    xp_event_repository = XPEventRepository()
    return ExperienceService(profile_repository, xp_event_repository)


@router.get("/status", status_code=status.HTTP_200_OK)
async def get_experience_status(
    current_user_id: UUID = Depends(get_current_user_id),
    experience_service: ExperienceService = Depends(get_experience_service),
    session: Session = Depends(get_session),
) -> ExperienceResponse:
    """
    Get current experience status.

    Returns current level, XP, streak, and gamification stats for the authenticated user.

    Args:
        current_user_id: Authenticated user ID from JWT token
        experience_service: Experience service instance
        session: Database session

    Returns:
        Current experience status

    Raises:
        HTTPException: 401 for auth errors, 404 if profile not found, 500 for server errors
    """
    try:
        return await experience_service.get_status(current_user_id, session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get experience status: {str(e)}",
        )


@router.post("/check-in", status_code=status.HTTP_200_OK)
async def check_in(
    current_user_id: UUID = Depends(get_current_user_id),
    experience_service: ExperienceService = Depends(get_experience_service),
    session: Session = Depends(get_session),
) -> CheckInResponse:
    """
    Daily check-in.

    Awards +15 XP for daily login, updates streak, and checks for inactivity penalties.
    Sets last_login_date to server time (prevents client-side manipulation).

    Args:
        current_user_id: Authenticated user ID from JWT token
        experience_service: Experience service instance
        session: Database session

    Returns:
        Check-in result with XP awarded, level changes, and streak updates

    Raises:
        HTTPException: 401 for auth errors, 404 if profile not found, 500 for server errors
    """
    try:
        return await experience_service.check_in(current_user_id, session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check in: {str(e)}",
        )


@router.get("/history", status_code=status.HTTP_200_OK)
async def get_experience_history(
    limit: int = Query(
        default=50, ge=1, le=100, description="Number of events to return"
    ),
    offset: int = Query(default=0, ge=0, description="Number of events to skip"),
    current_user_id: UUID = Depends(get_current_user_id),
    experience_service: ExperienceService = Depends(get_experience_service),
    session: Session = Depends(get_session),
) -> ExperienceHistoryResponse:
    """
    Get XP transaction history.

    Returns paginated history of XP events for the authenticated user.

    Args:
        limit: Number of events to return (1-100, default 50)
        offset: Number of events to skip (default 0)
        current_user_id: Authenticated user ID from JWT token
        experience_service: Experience service instance
        session: Database session

    Returns:
        Paginated XP event history

    Raises:
        HTTPException: 401 for auth errors, 500 for server errors
    """
    try:
        return await experience_service.get_history(
            current_user_id, limit, offset, session
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get experience history: {str(e)}",
        )


@router.get("/streak-milestones", status_code=status.HTTP_200_OK)
async def get_streak_milestones(
    current_user_id: UUID = Depends(get_current_user_id),
    experience_service: ExperienceService = Depends(get_experience_service),
    session: Session = Depends(get_session),
) -> StreakMilestonesResponse:
    """
    Get streak milestones and progress.

    Returns available streak milestones with achievement status and days remaining.

    Args:
        current_user_id: Authenticated user ID from JWT token
        experience_service: Experience service instance
        session: Database session

    Returns:
        Streak milestones with achievement status

    Raises:
        HTTPException: 401 for auth errors, 404 if profile not found, 500 for server errors
    """
    try:
        return await experience_service.get_milestones(current_user_id, session)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get streak milestones: {str(e)}",
        )
