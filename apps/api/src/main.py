import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase._async.client import AsyncClient, create_client

# ---- load env first (support both .env and .env.local)
if Path(".env").exists():
    load_dotenv(".env")
if Path(".env.local").exists():
    load_dotenv(".env.local", override=True)

# ---- global supabase reference (filled at startup)
supabase: AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI-preferred startup/shutdown hook."""
    app.state.supabase = await create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_KEY"],
    )
    yield
    # If the client exposes a close method later:
    # await app.state.supabase.aclose()


app = FastAPI(title="My API", version="0.0.1", lifespan=lifespan)

# ---- middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- include routes AFTER app is created
from src.routes.router import api_v1  # noqa: E402

app.include_router(api_v1, prefix="/api/v1")
