class ProfileRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    async def upsert_profile(self, id: str):
        await (
            self.supabase.table("profiles")
            .upsert({"id": id}, on_conflict="id")
            .execute()
        )
