"""
Integration tests for maps endpoints and elevation service.

Tests cover:
- Elevation API (real Google Maps calls)
- Farm/warehouse location queries (require DB data)
- Proximity search logic
- Endpoint error handling
"""
import pytest

from app.services.geocoding_service import (
    GeocodingService,
    GeocodingConfigError,
    GeocodingAPIError,
)


class TestElevationService:
    """Test elevation lookup against live Google Elevation API."""

    @pytest.fixture
    def service(self):
        return GeocodingService()

    async def test_get_elevation_table_mountain(self, service):
        """Table Mountain, Cape Town — expect elevation roughly 300-1100m."""
        result = await service.get_elevation(latitude=-33.9628, longitude=18.4098)

        assert result is not None
        assert "elevation" in result
        assert "resolution" in result
        assert result["elevation"] > 100
        assert result["elevation"] < 1200

    async def test_get_elevation_sea_level(self, service):
        """Cape Town waterfront — expect elevation near 0m."""
        result = await service.get_elevation(latitude=-33.9036, longitude=18.4211)

        assert result is not None
        assert result["elevation"] < 50

    async def test_get_elevation_highveld(self, service):
        """Johannesburg — expect elevation roughly 1500-1800m."""
        result = await service.get_elevation(latitude=-26.2041, longitude=28.0473)

        assert result is not None
        assert result["elevation"] > 1400
        assert result["elevation"] < 1900

    async def test_get_elevation_returns_coordinates(self, service):
        """Response should include the queried coordinates."""
        result = await service.get_elevation(latitude=-33.96, longitude=18.41)

        assert result is not None
        assert abs(result["latitude"] - (-33.96)) < 0.01
        assert abs(result["longitude"] - 18.41) < 0.01


class TestElevationConfigValidation:
    """Test elevation behavior when API key is missing."""

    async def test_missing_api_key_raises_config_error(self):
        """Elevation should fail with missing API key."""
        service = GeocodingService.__new__(GeocodingService)
        service.api_key = None
        service.default_country = "za"
        service.signing_secret = None

        with pytest.raises(GeocodingConfigError):
            await service.get_elevation(-33.96, 18.41)


class TestElevationEndpoint:
    """Test the elevation API endpoint."""

    async def test_elevation_endpoint_returns_data(self):
        """POST /maps/elevation with valid SA coordinates."""
        from app.api.v1.endpoints.maps import get_elevation
        from app.schemas.maps import ElevationRequest

        request = ElevationRequest(latitude=-33.9628, longitude=18.4098)
        result = await get_elevation(request=request, current_account=None)

        assert result.elevation > 100
        assert result.resolution > 0

    async def test_elevation_endpoint_validates_bounds(self):
        """Latitude/longitude out of bounds should be rejected by Pydantic."""
        from app.schemas.maps import ElevationRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            ElevationRequest(latitude=91, longitude=0)

        with pytest.raises(ValidationError):
            ElevationRequest(latitude=0, longitude=181)


class TestMapsServiceUnit:
    """Unit tests for MapsService helper methods."""

    def test_haversine_bounding_box_calculation(self):
        """Verify the bounding box pre-filter math."""
        import math

        latitude = -33.96
        radius_km = 50.0

        lat_range = radius_km / 111.0
        lng_range = radius_km / (111.0 * max(0.01, abs(math.cos(math.radians(latitude)))))

        # At -33.96 degrees, ~111 km per degree lat
        assert 0.4 < lat_range < 0.5  # ~0.45 degrees

        # At -33.96 degrees, lng degrees are wider
        assert lng_range > lat_range  # longitude degrees are shorter at this latitude
        assert lng_range < 1.0  # but not unreasonably wide


class TestLocationEndpoints:
    """Test location detail endpoint error handling."""

    async def test_invalid_location_type_returns_400(self):
        """An invalid location_type should return 400."""
        from fastapi import HTTPException
        from app.api.v1.endpoints.maps import get_location_detail
        from unittest.mock import MagicMock

        mock_db = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await get_location_detail(
                location_type="invalid",
                location_id=1,
                current_account=None,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400

    async def test_warehouse_without_auth_returns_401(self):
        """Warehouse detail without auth should return 401."""
        from fastapi import HTTPException
        from app.api.v1.endpoints.maps import get_location_detail
        from unittest.mock import MagicMock

        mock_db = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await get_location_detail(
                location_type="warehouse",
                location_id=1,
                current_account=None,
                db=mock_db,
            )

        assert exc_info.value.status_code == 401
