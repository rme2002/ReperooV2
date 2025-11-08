from fastapi import Request
from supabase._async.client import AsyncClient

async def get_supabase(request: Request) -> AsyncClient:
    return request.app.state.supabase
