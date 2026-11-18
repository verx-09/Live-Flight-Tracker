import httpx
from typing import Dict, Any, Optional
from config import settings

AIRPORT_COORDS: Dict[str, tuple[float, float, str]] = {
    'ATL': (33.6407, -84.4277, 'Atlanta, US'),
    'BOM': (19.0896, 72.8656, 'Mumbai, IN'),
    'BOS': (42.3656, -71.0096, 'Boston, US'),
    'DEL': (28.5562, 77.1000, 'Delhi, IN'),
    'DXB': (25.2532, 55.3657, 'Dubai, AE'),
    'FRA': (50.0379, 8.5622, 'Frankfurt, DE'),
    'JFK': (40.6413, -73.7781, 'New York, US'),
    'LAX': (33.9425, -118.4081, 'Los Angeles, US'),
    'LHR': (51.4700, -0.4543, 'London, GB'),
    'ORD': (41.9742, -87.9073, 'Chicago, US'),
    'SEA': (47.4502, -122.3088, 'Seattle, US'),
    'SFO': (37.6213, -122.3790, 'San Francisco, US'),
}

async def get_airport_weather(airport_code: str) -> Dict[str, Any]:
    """Fetch live weather for an airport using OpenWeatherMap, with fallback."""
    code = airport_code.upper().strip()
    coords = AIRPORT_COORDS.get(code)
    
    if coords and settings.OPENWEATHER_API_KEY:
        lat, lon, location_name = coords
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={settings.OPENWEATHER_API_KEY}&units=metric"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    main = data.get("main", {})
                    wind = data.get("wind", {})
                    weather_list = data.get("weather", [{}])
                    first_w = weather_list[0] if weather_list else {}
                    cond_main = first_w.get("main", "Clear")
                    
                    # Normalize condition to match our categories
                    cond_map = {
                        "Clear": "Clear",
                        "Clouds": "Cloudy",
                        "Rain": "Rain",
                        "Drizzle": "Rain",
                        "Snow": "Snow",
                        "Thunderstorm": "Thunderstorm",
                        "Mist": "Fog",
                        "Fog": "Fog",
                        "Haze": "Fog"
                    }
                    normalized_cond = cond_map.get(cond_main, "Cloudy")
                    
                    return {
                        "airport": code,
                        "location": location_name,
                        "temperature_c": round(main.get("temp", 20.0), 1),
                        "feels_like_c": round(main.get("feels_like", 20.0), 1),
                        "humidity_pct": main.get("humidity", 50),
                        "wind_speed_kph": round(wind.get("speed", 3.0) * 3.6, 1),
                        "visibility_km": round(data.get("visibility", 10000) / 1000, 1),
                        "precipitation_mm": round(data.get("rain", {}).get("1h", 0.0), 1),
                        "weather_condition": normalized_cond,
                        "description": first_w.get("description", "Normal conditions").capitalize(),
                        "is_live": True
                    }
        except Exception as e:
            print(f"OpenWeather API fetch error: {e}")

    # Fallback realistic weather estimate based on airport geography
    fallbacks = {
        'DEL': {"temp": 28.0, "cond": "Fog", "wind": 8.0, "vis": 4.5, "desc": "Hazy mist with calm winds"},
        'BOM': {"temp": 31.0, "cond": "Clear", "wind": 14.0, "vis": 8.0, "desc": "Warm coastal conditions"},
        'JFK': {"temp": 18.0, "cond": "Clear", "wind": 18.0, "vis": 16.0, "desc": "Clear skies with moderate offshore breeze"},
        'LHR': {"temp": 14.0, "cond": "Cloudy", "wind": 16.0, "vis": 12.0, "desc": "Overcast with light westerly breeze"},
        'DXB': {"temp": 33.0, "cond": "Clear", "wind": 12.0, "vis": 10.0, "desc": "Sunny and warm"},
        'ORD': {"temp": 12.0, "cond": "Cloudy", "wind": 22.0, "vis": 14.0, "desc": "Breezy Great Lakes cloud cover"},
        'LAX': {"temp": 22.0, "cond": "Clear", "wind": 10.0, "vis": 16.0, "desc": "Clear sunny coastal skies"},
        'SFO': {"temp": 16.0, "cond": "Fog", "wind": 15.0, "vis": 6.0, "desc": "Bay area marine layer and low fog"},
    }
    fb = fallbacks.get(code, {"temp": 21.0, "cond": "Clear", "wind": 12.0, "vis": 15.0, "desc": "Fair standard operating weather"})
    return {
        "airport": code,
        "location": AIRPORT_COORDS.get(code, (0, 0, f"{code} Airport"))[2],
        "temperature_c": fb["temp"],
        "feels_like_c": fb["temp"],
        "humidity_pct": 55,
        "wind_speed_kph": fb["wind"],
        "visibility_km": fb["vis"],
        "precipitation_mm": 0.0,
        "weather_condition": fb["cond"],
        "description": fb["desc"] + " (Station estimate)",
        "is_live": False
    }
