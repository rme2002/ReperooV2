import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase._async.client import AsyncClient, create_client

from dotenv import load_dotenv
from pathlib import Path

# ---- load env for local dev only
if Path(".env").exists():
    load_dotenv(".env")
if Path(".env.local").exists():
    load_dotenv(".env.local", override=True)

supabase: AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.supabase = await create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SECRET_API_KEY"],
    )
    yield


app = FastAPI(title="My API", version="0.0.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.routes.router import api_v1  # noqa: E402

app.include_router(api_v1, prefix="/api/v1")
