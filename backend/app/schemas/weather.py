from typing import List, Optional
from pydantic import BaseModel, Field


# ==================== Request Schemas ====================

class WeatherRequest(BaseModel):
    """Request for weather data by coordinates."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")


class ForecastRequest(BaseModel):
    """Request for daily forecast by coordinates."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    days: int = Field(5, ge=1, le=10, description="Number of forecast days")


# ==================== Response Schemas ====================

class WeatherCondition(BaseModel):
    """Weather condition description."""
    icon_uri: Optional[str] = Field(None, description="URI for weather condition icon")
    description: str = Field(..., description="Human-readable weather description")
    type: str = Field(..., description="Weather condition type code")


class Wind(BaseModel):
    """Wind data."""
    direction: Optional[float] = Field(None, description="Wind direction in degrees")
    speed_kph: Optional[float] = Field(None, description="Wind speed in km/h")
    gust_kph: Optional[float] = Field(None, description="Wind gust speed in km/h")


class Precipitation(BaseModel):
    """Precipitation data."""
    probability: Optional[float] = Field(None, description="Precipitation probability (0-100)")
    quantity_mm: Optional[float] = Field(None, description="Precipitation amount in mm")


class CurrentConditionsResponse(BaseModel):
    """Current weather conditions response."""
    temperature_c: float = Field(..., description="Temperature in Celsius")
    feels_like_c: Optional[float] = Field(None, description="Feels-like temperature in Celsius")
    relative_humidity: Optional[float] = Field(None, description="Relative humidity percentage")
    weather_condition: WeatherCondition
    wind: Optional[Wind] = None
    uv_index: Optional[int] = Field(None, description="UV index")
    precipitation: Optional[Precipitation] = None
    cloud_cover: Optional[float] = Field(None, description="Cloud cover percentage")
    is_daytime: Optional[bool] = Field(None, description="Whether it is currently daytime")
    visibility_km: Optional[float] = Field(None, description="Visibility in km")


class ForecastDay(BaseModel):
    """Single day forecast."""
    date: str = Field(..., description="Forecast date (YYYY-MM-DD)")
    max_temperature_c: Optional[float] = Field(None, description="Max temperature in Celsius")
    min_temperature_c: Optional[float] = Field(None, description="Min temperature in Celsius")
    weather_condition: WeatherCondition
    precipitation: Optional[Precipitation] = None
    wind: Optional[Wind] = None
    sunrise: Optional[str] = Field(None, description="Sunrise time ISO string")
    sunset: Optional[str] = Field(None, description="Sunset time ISO string")


class ForecastResponse(BaseModel):
    """Daily forecast response."""
    forecast_days: List[ForecastDay] = Field(default_factory=list)


class WeatherSummaryResponse(BaseModel):
    """Combined current + forecast response for a single API call."""
    current: CurrentConditionsResponse
    forecast: ForecastResponse
