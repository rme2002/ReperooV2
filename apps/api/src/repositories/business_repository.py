from __future__ import annotations

from typing import Any, Optional

from supabase._async.client import AsyncClient


class BusinessRepository:
    def __init__(self, supabase: AsyncClient):
        self.supabase = supabase

    async def fetch_business_for_user(self, user_id: str) -> Optional[dict[str, Any]]:
        membership = await (
            self.supabase.table("business_admins")
            .select("business_id, role")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        rows = membership.data or []
        if not rows:
            return None

        business_id = rows[0]["business_id"]
        return await self.fetch_business_by_id(business_id)

    async def fetch_business_by_id(
        self, business_id: str
    ) -> Optional[dict[str, Any]]:
        response = await (
            self.supabase.table("businesses")
            .select("*")
            .eq("id", business_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return None
        return rows[0]

    async def insert_business(self, data: dict[str, Any]) -> dict[str, Any]:
        response = await (
            self.supabase.table("businesses")
            .insert(data)
            .select("*")
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            raise RuntimeError("Business insert returned no rows")
        return rows[0]

    async def update_business(
        self, business_id: str, data: dict[str, Any]
    ) -> Optional[dict[str, Any]]:
        response = await (
            self.supabase.table("businesses")
            .update(data)
            .eq("id", business_id)
            .select("*")
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return None
        return rows[0]

    async def add_admin(self, business_id: str, user_id: str, role: str = "owner"):
        await self.supabase.table("business_admins").insert(
            {
                "business_id": business_id,
                "user_id": user_id,
                "role": role,
            }
        ).execute()

    async def fetch_membership(
        self, business_id: str, user_id: str
    ) -> Optional[dict[str, Any]]:
        response = await (
            self.supabase.table("business_admins")
            .select("*")
            .eq("business_id", business_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return None
        return rows[0]
