# Google Maps API Integration for Farm Address Geolocation

## Overview
Add Google Maps Geocoding and Places Autocomplete API integration to the BeyondAgri FastAPI backend, enabling structured address capture with lat/long coordinates for farm locations during signup and profile updates.

## What Gets Built
- A `GeocodingService` that proxies Google Maps API calls (keeping the API key server-side)
- Three new endpoints: address autocomplete, geocode by address, geocode by Place ID
- Structured address + coordinate columns on `FarmerProfile` and `BusinessProfile`
- Updated profile schemas and account service to handle the new fields

---

## Implementation Steps

### Step 1: Add Google Maps config to Settings
**File:** `app/core/config.py`
- Add `GOOGLE_MAPS_API_KEY: Optional[str] = None`
- Add `GOOGLE_MAPS_DEFAULT_COUNTRY: str = "za"` (South Africa bias)
- Add production validation requiring the API key

### Step 2: Add structured address columns to models
**File:** `app/models/profile.py`

Add to `FarmerProfile` (mirroring the existing `Warehouse` model pattern in `app/models/inventory.py:91-99`):
- `farm_address` (String 500) - full formatted address from Google
- `farm_street` (String 255)
- `farm_city` (String 100)
- `farm_province` (String 100)
- `farm_postal_code` (String 20)
- `farm_country` (String 100, default "South Africa")
- `farm_latitude` (Numeric 10,7) - same type as Warehouse
- `farm_longitude` (Numeric 10,7) - same type as Warehouse
- `farm_place_id` (String 255) - Google Place ID for reference

Add equivalent fields to `BusinessProfile` with `business_` prefix.

Keep existing `farm_location` and `farm_coordinates` for backward compatibility; sync them from the new fields.

### Step 3: Create Alembic migration
**New file:** `alembic/versions/XXX_add_structured_address_fields.py`
- Add all new columns to `farmer_profiles` and `business_profiles` tables
- Data migration: parse existing `farm_coordinates` "lat,long" strings into the new `farm_latitude`/`farm_longitude` columns

### Step 4: Create geocoding schemas
**New file:** `app/schemas/geocoding.py`
- `AddressAutocompleteRequest` - input text + optional session_token
- `AddressAutocompleteResponse` - list of predictions (place_id, description, main_text, secondary_text)
- `GeocodeRequest` - address string
- `GeocodeByPlaceIdRequest` - place_id + optional session_token
- `GeocodeResponse` - structured address components + coordinates + place_id

### Step 5: Update account schemas
**File:** `app/schemas/account.py`
- Add new structured address fields to `FarmerProfileData` (lines 15-23)
- Add new structured address fields to `BusinessProfileData` (lines 26-35)
- Add new fields to `AccountProfileUpdate` (lines 135-160)
- Update `AccountProfile.from_account()` (lines 81-132) to map the new model fields

### Step 6: Create geocoding service
**New file:** `app/services/geocoding_service.py`
- Uses `httpx` (already in pyproject.toml line 24) for async HTTP calls
- `get_autocomplete_predictions()` - calls Google Places Autocomplete API, biased to South Africa
- `geocode_address()` - calls Google Geocoding API for free-text addresses
- `geocode_place_id()` - calls Google Place Details API for selected autocomplete results
- `_extract_address_components()` - parses Google's address_components into structured fields
- Custom exceptions: `GeocodingConfigError`, `GeocodingAPIError`

### Step 7: Create geocoding endpoints
**New file:** `app/api/v1/endpoints/geocoding.py`
- `POST /api/v1/geocoding/autocomplete` - address suggestions (requires auth)
- `POST /api/v1/geocoding/geocode` - geocode free-text address (requires auth)
- `POST /api/v1/geocoding/geocode/place` - geocode by Place ID (requires auth)
- Error handling: 503 if API key missing, 502 if Google API fails, 404 if no results

### Step 8: Register the geocoding router
**File:** `app/api/v1/api.py`
- Add `from app.api.v1.endpoints import geocoding`
- Add `api_router.include_router(geocoding.router, prefix="/geocoding", tags=["geocoding"])`

### Step 9: Update account service
**File:** `app/services/account_service.py`
- `create_account_from_auth_provider()` (line 74-84): pass new structured address fields when creating `FarmerProfile` and `BusinessProfile`
- `update_profile()` (line 184-192): extend the farmer field list with the new address fields, and sync legacy `farm_location`/`farm_coordinates` when structured data is provided

---

## Expected Frontend Integration Flow
```
1. User types in "Farm Address" field
2. After 3+ chars → POST /api/v1/geocoding/autocomplete
3. User selects suggestion from dropdown
4. Frontend calls → POST /api/v1/geocoding/geocode/place (with place_id)
5. Frontend receives structured address + lat/long
6. Frontend sends structured data to → PUT /api/v1/accounts/profile
```

## Design Decisions
- **No GeoAlchemy2 yet**: The current need is storage, not spatial queries. Using simple `Numeric(10,7)` columns like the existing Warehouse model. GeoAlchemy2 can be added later for proximity searches.
- **Geocoding is never a hard dependency**: If Google Maps API is down, users can still register with plain text addresses. Coordinates can be backfilled.
- **Auth required on all geocoding endpoints**: Prevents anonymous abuse; relies on Google's per-key rate limits initially.
- **Session tokens for billing optimization**: Google Places charges per-session when tokens are used, not per-keystroke.

## Files to Create
1. `app/schemas/geocoding.py`
2. `app/services/geocoding_service.py`
3. `app/api/v1/endpoints/geocoding.py`
4. `alembic/versions/XXX_add_structured_address_fields.py`

## Files to Modify
1. `app/core/config.py` - Google Maps settings
2. `app/models/profile.py` - Structured address columns
3. `app/schemas/account.py` - New fields in profile schemas
4. `app/services/account_service.py` - Handle new fields in create/update
5. `app/api/v1/api.py` - Register geocoding router

## Verification
1. Run `alembic upgrade head` to apply the migration
2. Start the server and verify new endpoints appear in Swagger docs at `/docs`
3. Test `POST /api/v1/geocoding/autocomplete` with a South African address
4. Test `POST /api/v1/geocoding/geocode/place` with a returned place_id
5. Test `PUT /api/v1/accounts/profile` with structured address fields and verify they persist
6. Verify legacy `farm_coordinates` field stays in sync
