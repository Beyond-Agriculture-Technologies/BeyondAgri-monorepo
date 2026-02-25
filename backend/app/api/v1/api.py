from fastapi import APIRouter

from app.api.v1.endpoints import auth, accounts, marketplace, inventory, geocoding, maps, weather

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(geocoding.router, prefix="/geocoding", tags=["geocoding"])
api_router.include_router(maps.router, prefix="/maps", tags=["maps"])
api_router.include_router(weather.router, prefix="/weather", tags=["weather"])