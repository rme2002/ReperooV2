import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from supabase._async.client import AsyncClient, create_client
import logging

from dotenv import load_dotenv
from pathlib import Path

logger = logging.getLogger(__name__)

# ---- load env for local dev only - test
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler to log detailed validation errors"""
    logger.error(f"[VALIDATION ERROR] Path: {request.url.path}")
    logger.error(f"[VALIDATION ERROR] Method: {request.method}")
    logger.error(f"[VALIDATION ERROR] Headers: {dict(request.headers)}")

    # Try to get the request body
    try:
        body = await request.body()
        logger.error(f"[VALIDATION ERROR] Request Body: {body.decode('utf-8')}")
    except Exception as e:
        logger.error(f"[VALIDATION ERROR] Could not read request body: {e}")

    logger.error(f"[VALIDATION ERROR] Errors: {exc.errors()}")

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.errors(), "body": exc.body},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.routes.router import api_v1  # noqa: E402

app.include_router(api_v1)
