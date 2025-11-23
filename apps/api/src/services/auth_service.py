from supabase._async.client import AsyncClient

from src.models.model import SignUpEmailPasswordResponse
from src.repositories.profile_repository import ProfileRepository
from src.services.errors import SignUpError


class AuthService:
    def __init__(
        self, supabase: AsyncClient, profile_repository: ProfileRepository
    ):
        self.supabase = supabase
        self.profile_repository = profile_repository

    async def sign_up(self, email: str, password: str) -> SignUpEmailPasswordResponse:
        try:
            auth_response = await self.supabase.auth.sign_up(
                {"email": email, "password": password}
            )
        except Exception as e:
            raise SignUpError("Sign-up failed.") from e

        user = getattr(auth_response, "user", None)
        if not user:
            raise SignUpError("No user returned")

        try:
            await self.profile_repository.upsert_profile(id=str(user.id))
        except Exception as e:
            await self.supabase.auth.admin.delete_user(user.id)
            raise SignUpError("Failed to persist user profile.") from e

        return SignUpEmailPasswordResponse(id=str(user.id), email=str(user.email))
