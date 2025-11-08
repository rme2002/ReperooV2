class UserRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    async def upsert_user(self, id: str, email: str):
        await (
            self.supabase
            .table("users")
            .upsert({"id": id, "email": email}, on_conflict="id")
            .execute()
        )
