from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from ml.predictor import predict_delay_ml
from services.weather import get_airport_weather

router = APIRouter(prefix="/api/predict", tags=["predictions"])

class PredictionPayload(BaseModel):
    flightNumber: str = Field(default="DL105")
    departureDate: str = Field(default="2026-11-19")
    airline: str = Field(default="Delta")
    origin: str = Field(default="JFK")
    destination: str = Field(default="LAX")
    departureWindow: str = Field(default="Morning")
    dayType: str = Field(default="Weekday")
    season: str = Field(default="Autumn")
    weather: str = Field(default="Clear")
    windSpeedKph: float = Field(default=12.0)
    visibilityKm: float = Field(default=16.0)
    precipitationMm: float = Field(default=0.0)
    temperatureC: float = Field(default=22.0)
    airportCongestion: float = Field(default=45.0)
    airTraffic: str = Field(default="Moderate")
    inboundAircraft: str = Field(default="On time")
    maintenance: str = Field(default="Cleared")
    crewStatus: str = Field(default="Ready")
    security: str = Field(default="Normal")
    distanceBand: str = Field(default="Long haul")
    groundStop: str = Field(default="None")
    runwayStatus: str = Field(default="Normal")
    gateStatus: str = Field(default="Available")
    deicing: str = Field(default="Not required")
    turnaround: str = Field(default="On schedule")
    groundHandling: str = Field(default="Ready")
    boarding: str = Field(default="On schedule")
    connectionPressure: str = Field(default="Low")
    airspaceRestriction: str = Field(default="None")
    laborAction: str = Field(default="None")
    airportSystems: str = Field(default="Operational")
    borderProcessing: str = Field(default="Normal")
    exceptionalHazard: str = Field(default="None")
    curfewPressure: str = Field(default="None")
    liveDelayMinutes: Optional[float] = Field(default=None)
    originAirportName: Optional[str] = Field(default=None)
    enrichWithLiveWeather: Optional[bool] = Field(default=False)

@router.post("")
async def predict_delay_endpoint(payload: PredictionPayload):
    """Run ML-based flight delay prediction."""
    data = payload.model_dump()
    
    # Optionally enrich with live weather from origin airport
    live_weather_info = None
    if payload.enrichWithLiveWeather and payload.origin:
        try:
            live_weather_info = await get_airport_weather(payload.origin, location_hint=payload.originAirportName)
            if live_weather_info:
                data["weather"] = live_weather_info.get("weather_condition", data["weather"])
                data["temperatureC"] = live_weather_info.get("temperature_c", data["temperatureC"])
                data["windSpeedKph"] = live_weather_info.get("wind_speed_kph", data["windSpeedKph"])
                data["visibilityKm"] = live_weather_info.get("visibility_km", data["visibilityKm"])
                data["precipitationMm"] = live_weather_info.get("precipitation_mm", data["precipitationMm"])
        except Exception as e:
            print(f"Weather enrichment error: {e}")
            
    result = predict_delay_ml(data)
    
    return {
        "success": True,
        "result": result,
        "inputUsed": data,
        "liveWeather": live_weather_info
    }
