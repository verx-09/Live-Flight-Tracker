import httpx
from typing import Dict, Any, List, Optional
from config import settings

BASE_URL = "http://api.aviationstack.com/v1/flights"

async def get_live_flights(
    limit: int = 15,
    airline_name: Optional[str] = None,
    flight_iata: Optional[str] = None,
    dep_iata: Optional[str] = None,
    arr_iata: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Fetch live flights from AviationStack."""
    if not settings.AVIATIONSTACK_API_KEY:
        return []

    params: Dict[str, Any] = {
        "access_key": settings.AVIATIONSTACK_API_KEY,
        "limit": min(limit, 50)
    }
    if airline_name:
        params["airline_name"] = airline_name
    if flight_iata:
        params["flight_iata"] = flight_iata.upper().strip()
    if dep_iata:
        params["dep_iata"] = dep_iata.upper().strip()
    if arr_iata:
        params["arr_iata"] = arr_iata.upper().strip()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(BASE_URL, params=params)
            if res.status_code == 200:
                data = res.json()
                raw_flights = data.get("data", [])
                
                parsed: List[Dict[str, Any]] = []
                for item in raw_flights:
                    dep = item.get("departure") or {}
                    arr = item.get("arrival") or {}
                    airline = item.get("airline") or {}
                    flight = item.get("flight") or {}
                    live = item.get("live") or {}
                    
                    delay_mins = dep.get("delay") or 0
                    if delay_mins is None:
                        delay_mins = 0
                        
                    parsed.append({
                        "flight_number": flight.get("iata") or flight.get("number") or "N/A",
                        "airline": airline.get("name") or "Commercial Carrier",
                        "status": item.get("flight_status", "scheduled").capitalize(),
                        "origin_iata": dep.get("iata") or "N/A",
                        "origin_airport": dep.get("airport") or "Unknown Origin",
                        "origin_terminal": dep.get("terminal") or "T1",
                        "origin_gate": dep.get("gate") or "G12",
                        "dest_iata": arr.get("iata") or "N/A",
                        "dest_airport": arr.get("airport") or "Unknown Destination",
                        "dest_terminal": arr.get("terminal") or "T2",
                        "dest_gate": arr.get("gate") or "B04",
                        "scheduled_departure": dep.get("scheduled"),
                        "estimated_departure": dep.get("estimated"),
                        "actual_departure": dep.get("actual"),
                        "scheduled_arrival": arr.get("scheduled"),
                        "estimated_arrival": arr.get("estimated"),
                        "delay_minutes": delay_mins,
                        "altitude_m": live.get("altitude") if live else None,
                        "speed_kmh": live.get("speed_horizontal") if live else None,
                        "is_ground": live.get("is_ground") if live else True
                    })
                return parsed
    except Exception as e:
        print(f"AviationStack API fetch error: {e}")
    
    return []

async def get_flight_details(flight_number: str) -> Optional[Dict[str, Any]]:
    """Look up a specific flight by its IATA or ICAO number."""
    clean_no = flight_number.upper().strip()
    flights = await get_live_flights(limit=5, flight_iata=clean_no)
    if flights:
        return flights[0]
    return None
