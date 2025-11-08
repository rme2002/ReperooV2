from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}


# # src/routes/example.py
# from fastapi import APIRouter, Depends
# from supabase._async.client import AsyncClient
# from app.deps import get_supabase

# router = APIRouter()

# @router.get("/users")
# async def list_users(client: AsyncClient = Depends(get_supabase)):
#     res = await client.table("users").select("*").execute()
#     return res.data
