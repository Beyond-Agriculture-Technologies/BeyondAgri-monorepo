"""
Maps API endpoints.

Provides endpoints for:
- Farm and warehouse location data for map rendering
- Proximity-based marketplace listing search
- Elevation lookup and auto-population
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from httpx import HTTPStatusError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.deps import get_current_account, get_optional_current_account
from app.db.session import get_db
from app.models.profile import FarmerProfile
from app.schemas.account import AccountProfile
from app.schemas.maps import (
    ElevationRequest,
    ElevationResponse,
    FarmLocationResponse,
    LocationDetailResponse,
    PaginatedProximityListingsResponse,
    ProximityListingResponse,
    WarehouseLocationResponse,
)
from app.services.geocoding_service import (
    GeocodingAPIError,
    GeocodingConfigError,
    GeocodingService,
)
from app.services.maps_service import MapsService

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Farm Location Endpoints ====================

@router.get("/farms", response_model=List[FarmLocationResponse])
async def get_farm_locations(
    province: Optional[str] = Query(None, description="Filter by province"),
    city: Optional[str] = Query(None, description="Filter by city"),
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
    db: Session = Depends(get_db),
):
    """Get all farm locations with valid coordinates for map rendering."""
    try:
        farms = MapsService.get_all_farm_locations(
            db=db, province=province, city=city
        )
        return [
            FarmLocationResponse(
                account_id=fp.account_id,
                farm_name=fp.farm_name,
                farm_address=fp.farm_address,
                farm_city=fp.farm_city,
                farm_province=fp.farm_province,
                latitude=float(fp.farm_latitude),
                longitude=float(fp.farm_longitude),
                farm_elevation=float(fp.farm_elevation) if fp.farm_elevation else None,
                certifications=fp.certifications,
            )
            for fp in farms
        ]
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching farm locations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred",
        )


# ==================== Warehouse Location Endpoints ====================

@router.get("/warehouses", response_model=List[WarehouseLocationResponse])
async def get_my_warehouse_locations(
    active_only: bool = Query(True, description="Only return active warehouses"),
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    """Get all warehouse locations for the current user."""
    try:
        warehouses = MapsService.get_user_warehouse_locations(
            db=db, account_id=current_account.id, active_only=active_only
        )
        return [
            WarehouseLocationResponse(
                id=w.id,
                warehouse_name=w.warehouse_name,
                address=w.address,
                city=w.city,
                province=w.province,
                latitude=float(w.latitude),
                longitude=float(w.longitude),
                is_active=w.is_active,
                temperature_controlled=w.temperature_controlled,
                storage_capacity=w.storage_capacity,
                capacity_unit=w.capacity_unit,
            )
            for w in warehouses
        ]
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching warehouse locations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred",
        )


# ==================== Location Detail Endpoint ====================

@router.get("/locations/{location_type}/{location_id}", response_model=LocationDetailResponse)
async def get_location_detail(
    location_type: str,
    location_id: int,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
    db: Session = Depends(get_db),
):
    """
    Get detailed map data for a specific location.

    - location_type: 'farm' or 'warehouse'
    - location_id: account_id for farms, warehouse_id for warehouses

    Farm locations are public. Warehouse locations require authentication and ownership.
    """
    if location_type == "farm":
        profile = MapsService.get_farm_location_detail(db=db, account_id=location_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm location not found",
            )
        return LocationDetailResponse(
            location_type="farm",
            name=profile.farm_name or "Unknown Farm",
            address=profile.farm_address,
            city=profile.farm_city,
            province=profile.farm_province,
            latitude=float(profile.farm_latitude),
            longitude=float(profile.farm_longitude),
            elevation=float(profile.farm_elevation) if profile.farm_elevation else None,
            place_id=profile.farm_place_id,
            metadata={
                "certifications": profile.certifications,
                "crop_types": profile.crop_types,
                "farming_methods": profile.farming_methods,
            },
        )

    elif location_type == "warehouse":
        if not current_account:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view warehouse locations",
            )
        warehouse = MapsService.get_warehouse_location_detail(
            db=db, warehouse_id=location_id, account_id=current_account.id
        )
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warehouse not found",
            )
        return LocationDetailResponse(
            location_type="warehouse",
            name=warehouse.warehouse_name,
            address=warehouse.address,
            city=warehouse.city,
            province=warehouse.province,
            latitude=float(warehouse.latitude),
            longitude=float(warehouse.longitude),
            elevation=None,
            place_id=None,
            metadata={
                "temperature_controlled": warehouse.temperature_controlled,
                "storage_capacity": float(warehouse.storage_capacity) if warehouse.storage_capacity else None,
                "capacity_unit": warehouse.capacity_unit,
            },
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid location_type. Must be 'farm' or 'warehouse'.",
        )


# ==================== Proximity Search Endpoint ====================

@router.get("/listings/nearby", response_model=PaginatedProximityListingsResponse)
async def search_nearby_listings(
    latitude: float = Query(..., ge=-90, le=90, description="Search center latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Search center longitude"),
    radius_km: float = Query(50.0, ge=1, le=500, description="Search radius in km"),
    category: Optional[str] = Query(None, description="Filter by product category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
    db: Session = Depends(get_db),
):
    """Search marketplace listings by proximity, sorted by distance."""
    try:
        skip = (page - 1) * page_size

        results, total = MapsService.search_listings_by_proximity(
            db=db,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            category=category,
            skip=skip,
            limit=page_size,
        )

        data = [
            ProximityListingResponse(
                id=listing.id,
                title=listing.title,
                description=listing.description,
                category=listing.category.value,
                available_quantity=listing.available_quantity,
                unit=listing.unit,
                price_per_unit=listing.price_per_unit,
                currency=listing.currency,
                province=listing.province,
                city=listing.city,
                farm_name=listing.farm_name,
                is_featured=listing.is_featured,
                published_at=listing.published_at,
                latitude=float(farm_lat),
                longitude=float(farm_lng),
                distance_km=round(float(distance), 2),
            )
            for listing, farm_lat, farm_lng, distance in results
        ]

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return PaginatedProximityListingsResponse(
            data=data,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            search_latitude=latitude,
            search_longitude=longitude,
            radius_km=radius_km,
        )

    except SQLAlchemyError as e:
        logger.error(f"Database error in proximity search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred",
        )


# ==================== Elevation Endpoints ====================

@router.post("/elevation", response_model=ElevationResponse)
async def get_elevation(
    request: ElevationRequest,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
):
    """Get elevation for arbitrary coordinates via Google Maps Elevation API."""
    service = GeocodingService()
    try:
        result = await service.get_elevation(
            latitude=request.latitude,
            longitude=request.longitude,
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No elevation data found for the given coordinates",
            )
        return ElevationResponse(
            latitude=result["latitude"],
            longitude=result["longitude"],
            elevation=result["elevation"],
            resolution=result["resolution"],
        )
    except GeocodingConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Elevation service is not configured",
        )
    except GeocodingAPIError as e:
        logger.error(f"Elevation API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Elevation service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Elevation API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach elevation service",
        )


@router.post("/elevation/farm", response_model=ElevationResponse)
async def fetch_and_store_farm_elevation(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db),
):
    """Fetch elevation for the current farmer's farm and store it on the profile."""
    profile = db.query(FarmerProfile).filter(
        FarmerProfile.account_id == current_account.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found",
        )

    if not profile.farm_latitude or not profile.farm_longitude:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Farm coordinates are not set. Geocode the farm address first.",
        )

    service = GeocodingService()
    try:
        result = await service.get_elevation(
            latitude=float(profile.farm_latitude),
            longitude=float(profile.farm_longitude),
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No elevation data found for farm coordinates",
            )

        MapsService.update_farm_elevation(
            db=db,
            account_id=current_account.id,
            elevation=result["elevation"],
        )

        return ElevationResponse(
            latitude=result["latitude"],
            longitude=result["longitude"],
            elevation=result["elevation"],
            resolution=result["resolution"],
        )
    except GeocodingConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Elevation service is not configured",
        )
    except GeocodingAPIError as e:
        logger.error(f"Elevation API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Elevation service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Elevation API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach elevation service",
        )
