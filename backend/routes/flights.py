from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from services.aviation import get_live_flights, get_flight_details

router = APIRouter(prefix="/api/flights", tags=["flights"])

@router.get("/live")
async def live_flights(
    limit: int = Query(15, ge=1, le=50),
    airline: Optional[str] = Query(None),
    flight_number: Optional[str] = Query(None),
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
):
    """Retrieve live flight radar data from AviationStack."""
    flights = await get_live_flights(
        limit=limit,
        airline_name=airline,
        flight_iata=flight_number,
        dep_iata=origin,
        arr_iata=destination
    )
    return {
        "count": len(flights),
        "flights": flights
    }

@router.get("/search/{flight_number}")
async def search_flight(flight_number: str):
    """Search for a specific flight by number (e.g., DL105, AA100, AI101)."""
    flight = await get_flight_details(flight_number)
    if not flight:
        raise HTTPException(status_code=404, detail=f"Flight {flight_number.upper()} not found or currently inactive.")
    return flight
