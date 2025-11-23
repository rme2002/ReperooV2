from fastapi import APIRouter, Depends, HTTPException, status
from supabase._async.client import AsyncClient

from src.core.supabase import get_supabase
from src.services.auth_service import AuthService
from src.repositories.profile_repository import ProfileRepository
from src.services.errors import SignUpError
from src.models.model import SignUpEmailPasswordPayload, SignUpEmailPasswordResponse

router = APIRouter()


def get_auth_service(supabase: AsyncClient = Depends(get_supabase)) -> AuthService:
    profile_repository = ProfileRepository(supabase)
    return AuthService(supabase, profile_repository)


@router.post("/sign-up", status_code=status.HTTP_201_CREATED)
async def sign_up(
    payload: SignUpEmailPasswordPayload,
    auth_service: AuthService = Depends(get_auth_service),
) -> SignUpEmailPasswordResponse:
    try:
        return await auth_service.sign_up(
            email=str(payload.email.root),
            password=payload.password.root.get_secret_value(),
        )
    except SignUpError as e:
        raise HTTPException(status_code=400, detail=str(e))
