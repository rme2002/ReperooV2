# app/api/v1/router.py
from fastapi import APIRouter
from src.routes.health import router as health_router
from src.routes.auth_routes import router as auth_router

api_v1 = APIRouter()
api_v1.include_router(health_router, tags=["health"])
api_v1.include_router(auth_router, prefix="/auth", tags=["auth"])
# api_v1.include_router(reservations_router, prefix="/reservations", tags=["reservations"])
