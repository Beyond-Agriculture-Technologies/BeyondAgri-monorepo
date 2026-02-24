import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from httpx import HTTPStatusError

from app.core.deps import get_optional_current_account
from app.schemas.account import AccountProfile
from app.schemas.weather import (
    CurrentConditionsResponse,
    ForecastRequest,
    ForecastResponse,
    WeatherRequest,
    WeatherSummaryResponse,
)
from app.services.weather_service import (
    WeatherAPIError,
    WeatherConfigError,
    WeatherService,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/current", response_model=CurrentConditionsResponse)
async def get_current_weather(
    request: WeatherRequest,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
):
    """Get current weather conditions for given coordinates."""
    service = WeatherService()
    try:
        return await service.get_current_conditions(
            latitude=request.latitude,
            longitude=request.longitude,
        )
    except WeatherConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is not configured",
        )
    except WeatherAPIError as e:
        logger.error(f"Weather API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Google Weather API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach weather service",
        )


@router.post("/forecast", response_model=ForecastResponse)
async def get_weather_forecast(
    request: ForecastRequest,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
):
    """Get daily weather forecast for given coordinates."""
    service = WeatherService()
    try:
        return await service.get_daily_forecast(
            latitude=request.latitude,
            longitude=request.longitude,
            days=request.days,
        )
    except WeatherConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is not configured",
        )
    except WeatherAPIError as e:
        logger.error(f"Weather API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Google Weather API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach weather service",
        )


@router.post("/summary", response_model=WeatherSummaryResponse)
async def get_weather_summary(
    request: WeatherRequest,
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account),
):
    """Get current conditions + forecast in a single call."""
    service = WeatherService()
    try:
        return await service.get_weather_summary(
            latitude=request.latitude,
            longitude=request.longitude,
        )
    except WeatherConfigError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is not configured",
        )
    except WeatherAPIError as e:
        logger.error(f"Weather API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service returned an error",
        )
    except HTTPStatusError as e:
        logger.error(f"HTTP error calling Google Weather API: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach weather service",
        )
