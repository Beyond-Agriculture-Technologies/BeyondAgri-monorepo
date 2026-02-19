"""
Integration tests for geocoding service and endpoints.

Tests make real API calls to Google Maps — requires valid
GOOGLE_MAPS_API_KEY in .env.

Tests cover:
- Address autocomplete (Places API)
- Free-text geocoding (Geocoding API)
- Place ID geocoding (Place Details API)
- URL signing (HMAC-SHA1)
- Error handling for missing config
- End-to-end address capture flow
- FastAPI endpoint layer
"""
import pytest
from datetime import datetime, timezone
from fastapi import HTTPException

from app.services.geocoding_service import (
    GeocodingService,
    GeocodingConfigError,
    GeocodingAPIError,
)
from app.schemas.geocoding import (
    AutocompletePrediction,
    GeocodeResponse,
)


class TestAutocomplete:
    """Test address autocomplete against live Google Places API."""

    @pytest.fixture
    def service(self):
        return GeocodingService()

    async def test_autocomplete_returns_predictions(self, service):
        """Searching for a known SA address returns predictions."""
        predictions = await service.get_autocomplete_predictions("123 Main Road Cape Town")

        assert len(predictions) > 0
        for pred in predictions:
            assert isinstance(pred, AutocompletePrediction)
            assert pred.place_id
            assert pred.description
            assert pred.main_text

    async def test_autocomplete_south_africa_bias(self, service):
        """Results should be biased toward South Africa."""
        predictions = await service.get_autocomplete_predictions("Sandton")

        assert len(predictions) > 0
        descriptions = [p.description for p in predictions]
        assert any("South Africa" in desc for desc in descriptions), (
            f"Expected South Africa in predictions, got: {descriptions}"
        )

    async def test_autocomplete_with_session_token(self, service):
        """Session token should be accepted without error."""
        predictions = await service.get_autocomplete_predictions(
            "Pretoria", session_token="test-session-token-123"
        )

        assert isinstance(predictions, list)

    async def test_autocomplete_gibberish_returns_empty(self, service):
        """Gibberish input should return empty list, not an error."""
        predictions = await service.get_autocomplete_predictions("zzxxqqww99887766")

        assert isinstance(predictions, list)
        assert len(predictions) == 0


class TestGeocodeAddress:
    """Test free-text address geocoding against live Geocoding API."""

    @pytest.fixture
    def service(self):
        return GeocodingService()

    async def test_geocode_known_address(self, service):
        """Geocoding a well-known address returns valid coordinates."""
        try:
            result = await service.geocode_address("Table Mountain, Cape Town")
        except GeocodingAPIError as e:
            pytest.skip(f"Geocoding API not enabled: {e}")

        assert result is not None
        assert isinstance(result, GeocodeResponse)
        assert result.formatted_address
        assert result.place_id
        # Table Mountain is roughly at -33.96, 18.40
        assert -34.5 < result.latitude < -33.5
        assert 18.0 < result.longitude < 19.0
        assert result.country == "South Africa"

    async def test_geocode_returns_structured_components(self, service):
        """Geocoding should return structured address components."""
        try:
            result = await service.geocode_address("1 Jan Smuts Avenue, Johannesburg")
        except GeocodingAPIError as e:
            pytest.skip(f"Geocoding API not enabled: {e}")

        assert result is not None
        assert result.country == "South Africa"
        assert result.province is not None

    async def test_geocode_always_returns_result_with_country_bias(self, service):
        """With country bias set to 'za', even vague queries resolve to South Africa."""
        try:
            result = await service.geocode_address("Main Street")
        except GeocodingAPIError as e:
            pytest.skip(f"Geocoding API not enabled: {e}")

        assert result is not None
        assert result.country == "South Africa"


class TestGeocodePlaceId:
    """Test Place ID geocoding against live Place Details API."""

    @pytest.fixture
    def service(self):
        return GeocodingService()

    async def test_geocode_place_id_from_autocomplete(self, service):
        """Get autocomplete prediction, then geocode its place_id."""
        predictions = await service.get_autocomplete_predictions("Stellenbosch")
        assert len(predictions) > 0

        place_id = predictions[0].place_id
        result = await service.geocode_place_id(place_id)

        assert result is not None
        assert isinstance(result, GeocodeResponse)
        assert result.formatted_address
        assert result.latitude != 0
        assert result.longitude != 0
        # Google may return a different (canonical) place_id
        assert result.place_id

    async def test_geocode_invalid_place_id_returns_none(self, service):
        """An invalid place_id should return None."""
        result = await service.geocode_place_id("INVALID_PLACE_ID_XXXXX")

        assert result is None

    async def test_geocode_place_id_with_session_token(self, service):
        """Session token should be accepted for place details."""
        predictions = await service.get_autocomplete_predictions(
            "Durban", session_token="billing-session-456"
        )
        assert len(predictions) > 0

        result = await service.geocode_place_id(
            predictions[0].place_id, session_token="billing-session-456"
        )

        assert result is not None
        assert result.country == "South Africa"


class TestURLSigning:
    """Test that URL signing produces valid signatures."""

    @pytest.fixture
    def service(self):
        return GeocodingService()

    def test_sign_url_produces_signature(self, service):
        """When a signing secret is configured, _sign_url appends a signature."""
        if not service.signing_secret:
            pytest.skip("GOOGLE_MAPS_URL_SIGNING_SECRET not configured")

        url = "https://maps.googleapis.com/maps/api/geocode/json?address=test&key=FAKEKEY"
        signed = service._sign_url(url)

        assert "&signature=" in signed
        signature = signed.split("&signature=")[1]
        assert len(signature) > 0
        assert "+" not in signature
        assert "/" not in signature

    def test_sign_url_is_deterministic(self, service):
        """Same URL should always produce the same signature."""
        if not service.signing_secret:
            pytest.skip("GOOGLE_MAPS_URL_SIGNING_SECRET not configured")

        url = "https://maps.googleapis.com/maps/api/geocode/json?address=Pretoria&key=TEST"
        signed_1 = service._sign_url(url)
        signed_2 = service._sign_url(url)

        assert signed_1 == signed_2

    def test_sign_url_no_secret_returns_unchanged(self):
        """Without a signing secret, URL should be returned as-is."""
        service = GeocodingService.__new__(GeocodingService)
        service.signing_secret = None

        url = "https://maps.googleapis.com/maps/api/geocode/json?address=test&key=FAKE"
        assert service._sign_url(url) == url

    async def test_signed_autocomplete_accepted_by_google(self, service):
        """A signed autocomplete request should be accepted by the live Google API."""
        if not service.signing_secret:
            pytest.skip("GOOGLE_MAPS_URL_SIGNING_SECRET not configured")

        predictions = await service.get_autocomplete_predictions("Cape Town")

        assert isinstance(predictions, list)
        assert len(predictions) > 0


class TestEndToEndFlow:
    """Test the full frontend integration flow: autocomplete -> place details -> structured address."""

    @pytest.fixture
    def service(self):
        return GeocodingService()

    async def test_full_address_capture_flow(self, service):
        """
        Simulates the frontend flow:
        1. User types partial address -> autocomplete
        2. User selects suggestion -> geocode place_id
        3. Result has all structured fields needed for profile update
        """
        # Step 1: User types in the address field
        predictions = await service.get_autocomplete_predictions("Paarl Main Road")
        assert len(predictions) > 0, "Expected autocomplete predictions for 'Paarl Main Road'"

        selected = predictions[0]
        assert selected.place_id
        assert selected.description

        # Step 2: User selects the first suggestion
        result = await service.geocode_place_id(selected.place_id)
        assert result is not None, f"Expected geocode result for place_id {selected.place_id}"

        # Step 3: Verify structured data is ready for profile storage
        assert result.formatted_address, "Missing formatted_address"
        assert result.latitude, "Missing latitude"
        assert result.longitude, "Missing longitude"
        assert result.place_id, "Missing place_id"
        assert result.country, "Missing country"

        profile_update = {
            "farm_address": result.formatted_address,
            "farm_street": result.street,
            "farm_city": result.city,
            "farm_province": result.province,
            "farm_postal_code": result.postal_code,
            "farm_country": result.country,
            "farm_latitude": result.latitude,
            "farm_longitude": result.longitude,
            "farm_place_id": result.place_id,
        }

        assert profile_update["farm_address"]
        assert profile_update["farm_latitude"]
        assert profile_update["farm_longitude"]
        assert profile_update["farm_place_id"]


class TestConfigValidation:
    """Test service behavior when API key is missing."""

    async def test_missing_api_key_raises_config_error(self):
        """Service should raise GeocodingConfigError when API key is None."""
        service = GeocodingService.__new__(GeocodingService)
        service.api_key = None
        service.default_country = "za"
        service.signing_secret = None

        with pytest.raises(GeocodingConfigError, match="GOOGLE_MAPS_API_KEY is not configured"):
            await service.get_autocomplete_predictions("test")

    async def test_missing_api_key_on_geocode(self):
        """Geocode should also fail with missing API key."""
        service = GeocodingService.__new__(GeocodingService)
        service.api_key = None
        service.default_country = "za"
        service.signing_secret = None

        with pytest.raises(GeocodingConfigError):
            await service.geocode_address("Cape Town")

    async def test_missing_api_key_on_place_id(self):
        """Place ID geocode should also fail with missing API key."""
        service = GeocodingService.__new__(GeocodingService)
        service.api_key = None
        service.default_country = "za"
        service.signing_secret = None

        with pytest.raises(GeocodingConfigError):
            await service.geocode_place_id("some_place_id")


class TestGeocodingEndpoints:
    """Test the FastAPI endpoint layer with real API calls."""

    @pytest.fixture
    def mock_account(self):
        from app.schemas.account import AccountProfile
        from app.models.account import AccountTypeEnum, AccountStatusEnum
        now = datetime.now(timezone.utc)
        return AccountProfile(
            id=1,
            external_auth_id="test-user-123",
            email="test@beyondagri.com",
            account_type=AccountTypeEnum.FARMER.value,
            status=AccountStatusEnum.ACTIVE.value,
            is_verified=True,
            is_active=True,
            login_count=0,
            created_at=now,
            updated_at=now,
        )

    async def test_autocomplete_endpoint(self, mock_account):
        """Test the autocomplete endpoint with a real request."""
        from app.api.v1.endpoints.geocoding import address_autocomplete
        from app.schemas.geocoding import AddressAutocompleteRequest

        request = AddressAutocompleteRequest(input_text="Sandton City")
        result = await address_autocomplete(request=request, current_account=mock_account)

        assert len(result.predictions) > 0
        assert result.predictions[0].place_id

    async def test_geocode_endpoint(self, mock_account):
        """Test the geocode endpoint with a real address."""
        from app.api.v1.endpoints.geocoding import geocode_address
        from app.schemas.geocoding import GeocodeRequest

        request = GeocodeRequest(address="Nelson Mandela Square, Sandton")
        try:
            result = await geocode_address(request=request, current_account=mock_account)
        except HTTPException as e:
            if e.status_code == 502:
                pytest.skip("Geocoding API not enabled — enable it in Google Cloud Console")
            raise

        assert result.formatted_address
        assert result.latitude
        assert result.longitude
        assert result.country == "South Africa"

    async def test_geocode_place_endpoint(self, mock_account):
        """Test geocode-by-place-id endpoint using a place_id from autocomplete."""
        from app.api.v1.endpoints.geocoding import address_autocomplete, geocode_by_place_id
        from app.schemas.geocoding import AddressAutocompleteRequest, GeocodeByPlaceIdRequest

        auto_request = AddressAutocompleteRequest(input_text="Camps Bay Cape Town")
        auto_result = await address_autocomplete(request=auto_request, current_account=mock_account)
        assert len(auto_result.predictions) > 0

        place_request = GeocodeByPlaceIdRequest(place_id=auto_result.predictions[0].place_id)
        result = await geocode_by_place_id(request=place_request, current_account=mock_account)

        assert result.formatted_address
        assert result.latitude
        assert result.longitude

    async def test_geocode_place_endpoint_invalid_returns_404(self, mock_account):
        """An invalid place_id should raise 404 from the endpoint."""
        from app.api.v1.endpoints.geocoding import geocode_by_place_id
        from app.schemas.geocoding import GeocodeByPlaceIdRequest

        request = GeocodeByPlaceIdRequest(place_id="INVALID_PLACE_ID_XXXXX")

        with pytest.raises(HTTPException) as exc_info:
            await geocode_by_place_id(request=request, current_account=mock_account)

        assert exc_info.value.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
