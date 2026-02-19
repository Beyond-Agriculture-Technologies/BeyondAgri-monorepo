import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from httpx import HTTPStatusError

from app.core.deps import get_optional_current_account
from app.schemas.account import AccountProfile
from app.schemas.geocoding import (
    AddressAutocompleteRequest,
    AddressAutocompleteResponse,
    GeocodeByPlaceIdRequest,
    GeocodeRequest,
    GeocodeResponse,
)
from app.services.geocoding_service import (
    GeocodingAPIError,
    GeocodingConfigError,
    GeocodingService,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/autocomplete", response_model=AddressAutocompleteResponse)
async def address_autocomplete(
    request: AddressAutocompleteRequest,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
):
    """Get address autocomplete suggestions. Authentication optional."""
    service = GeocodingService()
    try:
        predictions = await service.get_autocomplete_predictions(
            input_text=request.input_text,
            session_token=request.session_token,
        )
        return AddressAutocompleteResponse(predictions=predictions)
    except GeocodingConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is not configured",
        )
    except GeocodingAPIError as e:
        logger.error(f"Geocoding API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Google API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach geocoding service",
        )


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_address(
    request: GeocodeRequest,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
):
    """Geocode a free-text address. Authentication optional."""
    service = GeocodingService()
    try:
        result = await service.geocode_address(address=request.address)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No results found for the given address",
            )
        return result
    except GeocodingConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is not configured",
        )
    except GeocodingAPIError as e:
        logger.error(f"Geocoding API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Google API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach geocoding service",
        )


@router.post("/geocode/place", response_model=GeocodeResponse)
async def geocode_by_place_id(
    request: GeocodeByPlaceIdRequest,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
):
    """Geocode by Google Place ID. Authentication optional."""
    service = GeocodingService()
    try:
        result = await service.geocode_place_id(
            place_id=request.place_id,
            session_token=request.session_token,
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No results found for the given Place ID",
            )
        return result
    except GeocodingConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is not configured",
        )
    except GeocodingAPIError as e:
        logger.error(f"Geocoding API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Geocoding service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Google API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach geocoding service",
        )
