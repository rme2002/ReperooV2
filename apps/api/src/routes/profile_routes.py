from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user_id
from src.core.database import get_session
from src.repositories.profile_repository import ProfileRepository

router = APIRouter()


@router.patch("/timezone")
async def update_timezone(
    timezone: str = Body(
        ..., description="IANA timezone (e.g., 'America/Los_Angeles')"
    ),
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    """Update user's timezone preference."""
    # Validate timezone
    try:
        ZoneInfo(timezone)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {timezone}",
        )

    profile_repo = ProfileRepository()
    profile = profile_repo.update_timezone(session, current_user_id, timezone)
    session.commit()

    return {"timezone": profile.timezone}
