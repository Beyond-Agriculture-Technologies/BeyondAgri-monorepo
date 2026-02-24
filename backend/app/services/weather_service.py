import logging
from typing import Optional

import httpx

from app.core.config import settings
from app.schemas.weather import (
    CurrentConditionsResponse,
    ForecastDay,
    ForecastResponse,
    Precipitation,
    WeatherCondition,
    WeatherSummaryResponse,
    Wind,
)

logger = logging.getLogger(__name__)

GOOGLE_WEATHER_CURRENT_URL = "https://weather.googleapis.com/v1/currentConditions:lookup"
GOOGLE_WEATHER_FORECAST_URL = "https://weather.googleapis.com/v1/forecast/days:lookup"


class WeatherConfigError(Exception):
    """Raised when Google Maps API key is not configured."""
    pass


class WeatherAPIError(Exception):
    """Raised when Google Weather API returns an error."""
    pass


class WeatherService:
    """Service for proxying Google Weather API calls."""

    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY

    def _ensure_api_key(self):
        if not self.api_key:
            raise WeatherConfigError("GOOGLE_MAPS_API_KEY is not configured")

    async def get_current_conditions(
        self, latitude: float, longitude: float
    ) -> CurrentConditionsResponse:
        """Fetch current weather conditions for given coordinates."""
        self._ensure_api_key()

        params = {
            "key": self.api_key,
            "location.latitude": latitude,
            "location.longitude": longitude,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(GOOGLE_WEATHER_CURRENT_URL, params=params)

            if response.status_code >= 400:
                error_text = response.text
                logger.error(f"Google Weather Current API error ({response.status_code}): {error_text}")
                raise WeatherAPIError(f"Google Weather API error: {error_text}")

            data = response.json()

        return self._parse_current_conditions(data)

    async def get_daily_forecast(
        self, latitude: float, longitude: float, days: int = 5
    ) -> ForecastResponse:
        """Fetch daily forecast for given coordinates."""
        self._ensure_api_key()

        params = {
            "key": self.api_key,
            "location.latitude": latitude,
            "location.longitude": longitude,
            "days": days,
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(GOOGLE_WEATHER_FORECAST_URL, params=params)

            if response.status_code >= 400:
                error_text = response.text
                logger.error(f"Google Weather Forecast API error ({response.status_code}): {error_text}")
                raise WeatherAPIError(f"Google Weather API error: {error_text}")

            data = response.json()

        return self._parse_forecast(data)

    async def get_weather_summary(
        self, latitude: float, longitude: float, forecast_days: int = 5
    ) -> WeatherSummaryResponse:
        """Fetch both current conditions and forecast."""
        current = await self.get_current_conditions(latitude, longitude)
        forecast = await self.get_daily_forecast(latitude, longitude, forecast_days)
        return WeatherSummaryResponse(current=current, forecast=forecast)

    # ==================== Response Parsing ====================

    @staticmethod
    def _parse_weather_condition(data: dict) -> WeatherCondition:
        wc = data.get("weatherCondition", {})
        description_obj = wc.get("description", {})

        if isinstance(description_obj, dict):
            description_text = description_obj.get("text", "Unknown")
        elif description_obj:
            description_text = str(description_obj)
        else:
            description_text = "Unknown"

        return WeatherCondition(
            icon_uri=wc.get("iconBaseUri"),
            description=description_text,
            type=wc.get("type", "UNKNOWN"),
        )

    @staticmethod
    def _parse_wind(data: dict) -> Optional[Wind]:
        wind_data = data.get("wind")
        if not wind_data:
            return None

        direction = wind_data.get("direction")
        dir_val = direction.get("degrees") if isinstance(direction, dict) else direction

        speed = wind_data.get("speed")
        speed_val = speed.get("value") if isinstance(speed, dict) else speed

        gust = wind_data.get("gust")
        gust_val = gust.get("value") if isinstance(gust, dict) else gust

        return Wind(
            direction=dir_val,
            speed_kph=speed_val,
            gust_kph=gust_val,
        )

    @staticmethod
    def _parse_precipitation(data: dict) -> Optional[Precipitation]:
        precip = data.get("precipitation")
        if not precip:
            return None
        probability = precip.get("probability", {})
        qpf = precip.get("qpf")

        # probability can be a dict {"value": X} or a raw number
        prob_val = probability.get("value") if isinstance(probability, dict) else probability

        # qpf can be a dict {"quantity": {"value": X}} or a raw number
        if isinstance(qpf, dict):
            qty = qpf.get("quantity")
            qty_val = qty.get("value") if isinstance(qty, dict) else qty
        elif isinstance(qpf, (int, float)):
            qty_val = qpf
        else:
            qty_val = None

        return Precipitation(
            probability=prob_val,
            quantity_mm=qty_val,
        )

    def _parse_current_conditions(self, data: dict) -> CurrentConditionsResponse:
        temp = data.get("temperature", {})
        feels_like = data.get("feelsLikeTemperature", {})
        visibility = data.get("visibility", {})

        return CurrentConditionsResponse(
            temperature_c=temp.get("degrees", 0),
            feels_like_c=feels_like.get("degrees"),
            relative_humidity=data.get("relativeHumidity"),
            weather_condition=self._parse_weather_condition(data),
            wind=self._parse_wind(data),
            uv_index=data.get("uvIndex"),
            precipitation=self._parse_precipitation(data),
            cloud_cover=data.get("cloudCover"),
            is_daytime=data.get("isDaytime"),
            visibility_km=visibility.get("distance") if isinstance(visibility, dict) else None,
        )

    def _parse_forecast(self, data: dict) -> ForecastResponse:
        days = []
        for day_data in data.get("forecastDays", []):
            daytime = day_data.get("daytimeForecast", day_data)
            max_temp = day_data.get("maxTemperature", {})
            min_temp = day_data.get("minTemperature", {})
            sun_events = day_data.get("sunEvents", {})
            display_date = day_data.get("displayDate", {})

            # displayDate is {year, month, day} object
            if isinstance(display_date, dict):
                y = display_date.get("year", 0)
                m = display_date.get("month", 0)
                d = display_date.get("day", 0)
                date_str = f"{y:04d}-{m:02d}-{d:02d}"
            else:
                date_str = str(display_date)

            days.append(ForecastDay(
                date=date_str,
                max_temperature_c=max_temp.get("degrees"),
                min_temperature_c=min_temp.get("degrees"),
                weather_condition=self._parse_weather_condition(daytime),
                precipitation=self._parse_precipitation(daytime),
                wind=self._parse_wind(daytime),
                sunrise=sun_events.get("sunriseTime"),
                sunset=sun_events.get("sunsetTime"),
            ))

        return ForecastResponse(forecast_days=days)
