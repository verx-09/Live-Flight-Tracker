from fastapi import APIRouter
from services.weather import get_airport_weather

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/{airport_code}")
async def airport_weather(airport_code: str):
    """Retrieve live weather metrics for an airport."""
    return await get_airport_weather(airport_code)
