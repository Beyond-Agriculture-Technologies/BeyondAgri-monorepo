"""
Map-related schemas for location data endpoints.

Provides schemas for:
- Farm/warehouse location map markers
- Proximity search parameters and results
- Elevation data
"""
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ==================== Location Schemas ====================

class FarmLocationResponse(BaseModel):
    """Farm location data for map markers."""
    account_id: int
    farm_name: Optional[str] = None
    farm_address: Optional[str] = None
    farm_city: Optional[str] = None
    farm_province: Optional[str] = None
    latitude: float
    longitude: float
    farm_elevation: Optional[float] = None
    certifications: Optional[Dict[str, Any]] = None


class WarehouseLocationResponse(BaseModel):
    """Warehouse location data for map markers."""
    id: int
    warehouse_name: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    latitude: float
    longitude: float
    is_active: bool
    temperature_controlled: bool
    storage_capacity: Optional[Decimal] = None
    capacity_unit: Optional[str] = None


class LocationDetailResponse(BaseModel):
    """Unified location detail for a farm or warehouse."""
    location_type: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    place_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ==================== Proximity Search Schemas ====================

class ProximityListingResponse(BaseModel):
    """A marketplace listing enriched with distance from search point."""
    id: int
    title: str
    description: Optional[str] = None
    category: str
    available_quantity: Decimal
    unit: str
    price_per_unit: Decimal
    currency: str
    province: Optional[str] = None
    city: Optional[str] = None
    farm_name: Optional[str] = None
    is_featured: bool
    published_at: Optional[datetime] = None
    latitude: float
    longitude: float
    distance_km: float


class PaginatedProximityListingsResponse(BaseModel):
    """Paginated response for proximity-based listing search."""
    data: List[ProximityListingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    search_latitude: float
    search_longitude: float
    radius_km: float


# ==================== Elevation Schemas ====================

class ElevationRequest(BaseModel):
    """Request for elevation lookup."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ElevationResponse(BaseModel):
    """Response with elevation data."""
    latitude: float
    longitude: float
    elevation: float
    resolution: float
