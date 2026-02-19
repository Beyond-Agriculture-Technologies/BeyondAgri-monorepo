from typing import Optional, List
from pydantic import BaseModel, Field


class AddressAutocompleteRequest(BaseModel):
    """Request for address autocomplete predictions."""
    input_text: str = Field(..., min_length=3, description="Address search text")
    session_token: Optional[str] = Field(None, description="Session token for billing optimization")


class AutocompletePrediction(BaseModel):
    """A single autocomplete prediction."""
    place_id: str = Field(..., description="Google Place ID")
    description: str = Field(..., description="Full description of the place")
    main_text: str = Field(..., description="Main text (e.g. street address)")
    secondary_text: str = Field("", description="Secondary text (e.g. city, province)")


class AddressAutocompleteResponse(BaseModel):
    """Response containing autocomplete predictions."""
    predictions: List[AutocompletePrediction] = Field(default_factory=list)


class GeocodeRequest(BaseModel):
    """Request to geocode a free-text address."""
    address: str = Field(..., min_length=1, description="Address to geocode")


class GeocodeByPlaceIdRequest(BaseModel):
    """Request to geocode by Google Place ID."""
    place_id: str = Field(..., description="Google Place ID")
    session_token: Optional[str] = Field(None, description="Session token for billing optimization")


class GeocodeResponse(BaseModel):
    """Response with structured address and coordinates."""
    formatted_address: str = Field(..., description="Full formatted address from Google")
    street: Optional[str] = Field(None, description="Street address")
    city: Optional[str] = Field(None, description="City/locality")
    province: Optional[str] = Field(None, description="Province/state")
    postal_code: Optional[str] = Field(None, description="Postal code")
    country: Optional[str] = Field(None, description="Country")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    place_id: str = Field(..., description="Google Place ID")
