# app/api/v1/router.py
from fastapi import APIRouter
from src.routes.health import router as health_router
from src.routes.auth_routes import router as auth_router
from src.routes.transaction_routes import router as transaction_router
from src.routes.recurring_template_routes import router as recurring_template_router
from src.routes.budget_plan_routes import router as budget_plan_router
from src.routes.insights_routes import router as insights_router
from src.routes.expense_category_routes import router as expense_category_router
from src.routes.income_category_routes import router as income_category_router
from src.routes.experience_routes import router as experience_router

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(health_router, tags=["health"])
api_v1.include_router(auth_router, prefix="/auth", tags=["auth"])
api_v1.include_router(transaction_router, prefix="/transactions", tags=["transactions"])
api_v1.include_router(recurring_template_router, prefix="/transactions", tags=["recurring-templates"])
api_v1.include_router(budget_plan_router, prefix="/budget-plans", tags=["budget-plans"])
api_v1.include_router(insights_router, prefix="/insights", tags=["insights"])
api_v1.include_router(expense_category_router, prefix="/expense-categories", tags=["expense-categories"])
api_v1.include_router(income_category_router, prefix="/income-categories", tags=["income-categories"])
api_v1.include_router(experience_router, prefix="/experience", tags=["experience"])
# api_v1.include_router(reservations_router, prefix="/reservations", tags=["reservations"])
