from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, marketplace, inventory

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])