from fastapi import APIRouter, Query
from typing import Optional
from services.weather import get_airport_weather

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/{airport_code}")
async def airport_weather(
    airport_code: str,
    location_hint: Optional[str] = Query(None)
):
    """Retrieve live weather metrics for an airport."""
    return await get_airport_weather(airport_code, location_hint=location_hint)
