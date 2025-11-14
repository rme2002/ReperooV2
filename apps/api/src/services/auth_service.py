from supabase._async.client import AsyncClient

from src.models.model import SignUpEmailPasswordResponse
from src.repositories.user_repository import UserRepository
from src.services.errors import SignUpError

class AuthService:
    def __init__(self, supabase: AsyncClient, user_repository: UserRepository):
        self.supabase = supabase
        self.user_repository = user_repository

    async def sign_up(self, email: str, password: str) -> SignUpEmailPasswordResponse:
        try:
            auth_response = await self.supabase.auth.sign_up({"email": email, "password": password})
        except Exception as e:
            raise SignUpError("Sign-up failed.") from e

        user = getattr(auth_response, "user", None)
        if not user:
            raise SignUpError("No user returned")

        try:
            await self.user_repository.upsert_user(id=str(user.id), email=str(user.email))
        except Exception as e:
            await self.supabase.auth.admin.delete_user(user.id)
            raise SignUpError("Failed to persist user profile.") from e

        return SignUpEmailPasswordResponse(id=str(user.id), email=str(user.email))
