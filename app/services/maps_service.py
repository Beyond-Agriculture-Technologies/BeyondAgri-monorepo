"""
Maps service for location data queries.

Handles business logic for:
- Querying farm, warehouse, and business locations
- Proximity-based marketplace listing search using Haversine formula
- Elevation storage on farm profiles
"""
import logging
import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import and_, literal_column, or_
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.inventory import Warehouse
from app.models.marketplace import ListingStatusEnum, ProductListing
from app.models.profile import FarmerProfile

logger = logging.getLogger(__name__)

# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0


class MapsService:
    """Service for map-related data queries."""

    # ==================== Farm Locations ====================

    @staticmethod
    def get_all_farm_locations(
        db: Session,
        province: Optional[str] = None,
        city: Optional[str] = None,
    ) -> List[FarmerProfile]:
        """Get all farm locations with valid coordinates."""
        query = db.query(FarmerProfile).filter(
            and_(
                FarmerProfile.farm_latitude.isnot(None),
                FarmerProfile.farm_longitude.isnot(None),
            )
        )

        if province:
            query = query.filter(FarmerProfile.farm_province.ilike(f"%{province}%"))
        if city:
            query = query.filter(FarmerProfile.farm_city.ilike(f"%{city}%"))

        return query.all()

    # ==================== Warehouse Locations ====================

    @staticmethod
    def get_user_warehouse_locations(
        db: Session,
        account_id: int,
        active_only: bool = True,
    ) -> List[Warehouse]:
        """Get all warehouse locations for a specific user with valid coordinates."""
        query = db.query(Warehouse).filter(
            and_(
                Warehouse.account_id == account_id,
                Warehouse.latitude.isnot(None),
                Warehouse.longitude.isnot(None),
            )
        )

        if active_only:
            query = query.filter(Warehouse.is_active == True)

        return query.all()

    # ==================== Location Detail ====================

    @staticmethod
    def get_farm_location_detail(
        db: Session,
        account_id: int,
    ) -> Optional[FarmerProfile]:
        """Get a single farm's location detail by account ID."""
        return db.query(FarmerProfile).filter(
            and_(
                FarmerProfile.account_id == account_id,
                FarmerProfile.farm_latitude.isnot(None),
                FarmerProfile.farm_longitude.isnot(None),
            )
        ).first()

    @staticmethod
    def get_warehouse_location_detail(
        db: Session,
        warehouse_id: int,
        account_id: Optional[int] = None,
    ) -> Optional[Warehouse]:
        """Get a single warehouse's location detail."""
        query = db.query(Warehouse).filter(
            and_(
                Warehouse.id == warehouse_id,
                Warehouse.latitude.isnot(None),
                Warehouse.longitude.isnot(None),
            )
        )
        if account_id:
            query = query.filter(Warehouse.account_id == account_id)
        return query.first()

    # ==================== Proximity Search ====================

    @staticmethod
    def search_listings_by_proximity(
        db: Session,
        latitude: float,
        longitude: float,
        radius_km: float = 50.0,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[list, int]:
        """
        Search active marketplace listings within a given radius of a point.

        Uses the Haversine formula in SQL for great-circle distance.
        Returns (list_of_tuples, total_count) where each tuple is
        (ProductListing, farm_latitude, farm_longitude, distance_km).
        """
        now = datetime.now(timezone.utc)

        # Haversine distance as a literal_column (supports .label())
        # Values are inlined as floats — safe since they come from validated query params
        haversine = literal_column(
            f"{EARTH_RADIUS_KM} * 2 * ASIN(SQRT("
            f"POWER(SIN(RADIANS(farmer_profiles.farm_latitude - {float(latitude)}) / 2), 2) + "
            f"COS(RADIANS({float(latitude)})) * COS(RADIANS(farmer_profiles.farm_latitude)) * "
            f"POWER(SIN(RADIANS(farmer_profiles.farm_longitude - {float(longitude)}) / 2), 2)"
            f"))"
        )

        # Base query: join listings to farmer profiles for coordinates
        query = (
            db.query(
                ProductListing,
                FarmerProfile.farm_latitude,
                FarmerProfile.farm_longitude,
                haversine.label("distance_km"),
            )
            .join(Account, ProductListing.farmer_account_id == Account.id)
            .join(FarmerProfile, FarmerProfile.account_id == Account.id)
            .filter(
                and_(
                    ProductListing.status == ListingStatusEnum.ACTIVE,
                    or_(
                        ProductListing.expires_at.is_(None),
                        ProductListing.expires_at > now,
                    ),
                    FarmerProfile.farm_latitude.isnot(None),
                    FarmerProfile.farm_longitude.isnot(None),
                )
            )
        )

        if category:
            query = query.filter(ProductListing.category == category)

        # Add bounding box pre-filter to narrow candidate rows before Haversine
        lat_range = radius_km / 111.0  # ~111 km per degree latitude
        lng_range = radius_km / (111.0 * max(0.01, abs(math.cos(math.radians(latitude)))))

        query = query.filter(
            and_(
                FarmerProfile.farm_latitude.between(latitude - lat_range, latitude + lat_range),
                FarmerProfile.farm_longitude.between(longitude - lng_range, longitude + lng_range),
            )
        )

        # Execute and filter by exact Haversine distance in Python
        all_results = query.all()
        filtered = [
            (listing, farm_lat, farm_lng, dist)
            for listing, farm_lat, farm_lng, dist in all_results
            if float(dist) <= radius_km
        ]

        # Sort by distance
        filtered.sort(key=lambda x: float(x[3]))

        total = len(filtered)
        paginated = filtered[skip:skip + limit]

        return paginated, total

    # ==================== Elevation Storage ====================

    @staticmethod
    def update_farm_elevation(
        db: Session,
        account_id: int,
        elevation: float,
    ) -> Optional[FarmerProfile]:
        """Store elevation on a farmer profile."""
        profile = db.query(FarmerProfile).filter(
            FarmerProfile.account_id == account_id
        ).first()

        if not profile:
            return None

        profile.farm_elevation = Decimal(str(round(elevation, 2)))
        db.commit()
        db.refresh(profile)
        return profile
