import base64
import hashlib
import hmac
import json
import logging
import urllib.parse
from typing import Dict, List, Optional

import httpx

from app.core.config import settings
from app.schemas.geocoding import (
    AutocompletePrediction,
    GeocodeResponse,
)

logger = logging.getLogger(__name__)

GOOGLE_PLACES_AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
GOOGLE_PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
GOOGLE_ELEVATION_URL = "https://maps.googleapis.com/maps/api/elevation/json"


class GeocodingConfigError(Exception):
    """Raised when Google Maps API key is not configured."""
    pass


class GeocodingAPIError(Exception):
    """Raised when Google Maps API returns an error."""
    pass


class GeocodingService:
    """Service for proxying Google Maps Geocoding and Places API calls."""

    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.default_country = settings.GOOGLE_MAPS_DEFAULT_COUNTRY
        self.signing_secret = settings.GOOGLE_MAPS_URL_SIGNING_SECRET

    def _ensure_api_key(self):
        if not self.api_key:
            raise GeocodingConfigError("GOOGLE_MAPS_API_KEY is not configured")

    def _sign_url(self, url: str) -> str:
        """Sign a Google Maps API URL with HMAC-SHA1.

        If no signing secret is configured, returns the URL unchanged.
        """
        if not self.signing_secret:
            return url

        parsed = urllib.parse.urlparse(url)
        url_to_sign = parsed.path + "?" + parsed.query

        decoded_key = base64.urlsafe_b64decode(self.signing_secret)
        signature = hmac.new(decoded_key, url_to_sign.encode("utf-8"), hashlib.sha1)
        encoded_signature = base64.urlsafe_b64encode(signature.digest()).decode("utf-8")

        return url + "&signature=" + encoded_signature

    async def _signed_get(self, base_url: str, params: dict) -> dict:
        """Build a signed URL with params, send GET request, return JSON response."""
        query_string = urllib.parse.urlencode(params)
        full_url = f"{base_url}?{query_string}"
        signed_url = self._sign_url(full_url)

        async with httpx.AsyncClient() as client:
            response = await client.get(signed_url)
            if response.status_code >= 500:
                response.raise_for_status()
            try:
                return response.json()
            except json.JSONDecodeError:
                # Google returns plain text errors for signature issues
                raise GeocodingAPIError(
                    f"Google API error ({response.status_code}): {response.text}"
                )

    async def get_autocomplete_predictions(
        self, input_text: str, session_token: Optional[str] = None
    ) -> List[AutocompletePrediction]:
        """Get address autocomplete predictions from Google Places API."""
        self._ensure_api_key()

        params = {
            "input": input_text,
            "types": "address",
            "components": f"country:{self.default_country}",
            "key": self.api_key,
        }
        if session_token:
            params["sessiontoken"] = session_token

        data = await self._signed_get(GOOGLE_PLACES_AUTOCOMPLETE_URL, params)

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            error_msg = data.get("error_message", data.get("status"))
            logger.error(f"Google Places Autocomplete API error: {error_msg}")
            raise GeocodingAPIError(f"Google API error: {error_msg}")

        predictions = []
        for pred in data.get("predictions", []):
            structured = pred.get("structured_formatting", {})
            predictions.append(
                AutocompletePrediction(
                    place_id=pred["place_id"],
                    description=pred["description"],
                    main_text=structured.get("main_text", pred["description"]),
                    secondary_text=structured.get("secondary_text", ""),
                )
            )
        return predictions

    async def geocode_address(self, address: str) -> Optional[GeocodeResponse]:
        """Geocode a free-text address using Google Geocoding API."""
        self._ensure_api_key()

        params = {
            "address": address,
            "components": f"country:{self.default_country}",
            "key": self.api_key,
        }

        data = await self._signed_get(GOOGLE_GEOCODING_URL, params)

        if data.get("status") == "ZERO_RESULTS":
            return None

        if data.get("status") != "OK":
            error_msg = data.get("error_message", data.get("status"))
            logger.error(f"Google Geocoding API error: {error_msg}")
            raise GeocodingAPIError(f"Google API error: {error_msg}")

        result = data["results"][0]
        components = self._extract_address_components(result.get("address_components", []))
        location = result["geometry"]["location"]

        return GeocodeResponse(
            formatted_address=result["formatted_address"],
            street=components.get("street"),
            city=components.get("city"),
            province=components.get("province"),
            postal_code=components.get("postal_code"),
            country=components.get("country"),
            latitude=location["lat"],
            longitude=location["lng"],
            place_id=result["place_id"],
        )

    async def geocode_place_id(
        self, place_id: str, session_token: Optional[str] = None
    ) -> Optional[GeocodeResponse]:
        """Get place details by Google Place ID."""
        self._ensure_api_key()

        params = {
            "place_id": place_id,
            "fields": "formatted_address,geometry,address_components,place_id",
            "key": self.api_key,
        }
        if session_token:
            params["sessiontoken"] = session_token

        data = await self._signed_get(GOOGLE_PLACE_DETAILS_URL, params)

        if data.get("status") in ("NOT_FOUND", "INVALID_REQUEST"):
            return None

        if data.get("status") != "OK":
            error_msg = data.get("error_message", data.get("status"))
            logger.error(f"Google Place Details API error: {error_msg}")
            raise GeocodingAPIError(f"Google API error: {error_msg}")

        result = data["result"]
        components = self._extract_address_components(result.get("address_components", []))
        location = result["geometry"]["location"]

        return GeocodeResponse(
            formatted_address=result["formatted_address"],
            street=components.get("street"),
            city=components.get("city"),
            province=components.get("province"),
            postal_code=components.get("postal_code"),
            country=components.get("country"),
            latitude=location["lat"],
            longitude=location["lng"],
            place_id=result["place_id"],
        )

    async def get_elevation(self, latitude: float, longitude: float) -> Optional[dict]:
        """Fetch elevation for given coordinates from Google Maps Elevation API.

        Returns dict with 'elevation' (meters), 'resolution' (meters),
        'latitude', and 'longitude', or None if no results.
        """
        self._ensure_api_key()

        params = {
            "locations": f"{latitude},{longitude}",
            "key": self.api_key,
        }

        data = await self._signed_get(GOOGLE_ELEVATION_URL, params)

        if data.get("status") == "ZERO_RESULTS":
            return None

        if data.get("status") != "OK":
            error_msg = data.get("error_message", data.get("status"))
            logger.error(f"Google Elevation API error: {error_msg}")
            raise GeocodingAPIError(f"Google API error: {error_msg}")

        result = data["results"][0]
        return {
            "elevation": result["elevation"],
            "resolution": result["resolution"],
            "latitude": result["location"]["lat"],
            "longitude": result["location"]["lng"],
        }

    @staticmethod
    def _extract_address_components(components: List[Dict]) -> Dict[str, Optional[str]]:
        """Parse Google's address_components into structured fields."""
        result = {
            "street_number": None,
            "route": None,
            "city": None,
            "province": None,
            "postal_code": None,
            "country": None,
        }

        for component in components:
            types = component.get("types", [])
            if "street_number" in types:
                result["street_number"] = component["long_name"]
            elif "route" in types:
                result["route"] = component["long_name"]
            elif "locality" in types:
                result["city"] = component["long_name"]
            elif "sublocality_level_1" in types and not result["city"]:
                result["city"] = component["long_name"]
            elif "administrative_area_level_1" in types:
                result["province"] = component["long_name"]
            elif "postal_code" in types:
                result["postal_code"] = component["long_name"]
            elif "country" in types:
                result["country"] = component["long_name"]

        # Build street from number + route
        street_parts = [p for p in [result["street_number"], result["route"]] if p]
        result["street"] = " ".join(street_parts) if street_parts else None

        return result
