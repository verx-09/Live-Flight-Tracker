import httpx
import re
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
    'DFW': (32.8998, -97.0403, 'Dallas, US'),
    'DEN': (39.8561, -104.6737, 'Denver, US'),
    'MIA': (25.7959, -80.2870, 'Miami, US'),
    'MCO': (28.4312, -81.3081, 'Orlando, US'),
    'EWR': (40.6895, -74.1745, 'Newark, US'),
    'LGA': (40.7769, -73.8740, 'New York, US'),
    'CDG': (49.0097, 2.5479, 'Paris, FR'),
    'AMS': (52.3105, 4.7683, 'Amsterdam, NL'),
    'MAD': (40.4839, -3.5680, 'Madrid, ES'),
    'BCN': (41.2974, 2.0833, 'Barcelona, ES'),
    'FCO': (41.8003, 12.2389, 'Rome, IT'),
    'IST': (41.2753, 28.7519, 'Istanbul, TR'),
    'DOH': (25.2609, 51.5651, 'Doha, QA'),
    'SIN': (1.3644, 103.9915, 'Singapore, SG'),
    'HND': (35.5494, 139.7798, 'Tokyo, JP'),
    'NRT': (35.7720, 140.3929, 'Tokyo, JP'),
    'HKG': (22.3080, 113.9185, 'Hong Kong, HK'),
    'ICN': (37.4602, 126.4407, 'Seoul, KR'),
    'BKK': (13.6900, 100.7501, 'Bangkok, TH'),
    'SYD': (-33.9399, 151.1753, 'Sydney, AU'),
    'MEL': (-37.6690, 144.8410, 'Melbourne, AU'),
    'BLR': (13.1986, 77.7066, 'Bengaluru, IN'),
    'MAA': (12.9941, 80.1709, 'Chennai, IN'),
    'HYD': (17.2403, 78.4294, 'Hyderabad, IN'),
    'CCU': (22.6547, 88.4467, 'Kolkata, IN'),
    'FLS': (-39.9197, 148.0772, 'Flinders Island, AU'),
    'LST': (-41.5453, 147.2142, 'Launceston, AU'),
}

async def get_airport_weather(airport_code: str, location_hint: Optional[str] = None) -> Dict[str, Any]:
    """Fetch live weather for an airport using OpenWeatherMap, with intelligent query fallback."""
    code = airport_code.upper().strip()
    coords = AIRPORT_COORDS.get(code)
    
    if settings.OPENWEATHER_API_KEY:
        urls_to_try = []
        if coords:
            lat, lon, _ = coords
            urls_to_try.append(f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={settings.OPENWEATHER_API_KEY}&units=metric")
            
        if location_hint:
            # Clean airport name to extract city e.g. "Flinders Island Airport" -> "Flinders Island"
            cleaned_city = re.sub(r'(?i)\b(international|airport|intl|regional|airfield|field)\b', '', location_hint).strip()
            if cleaned_city:
                urls_to_try.append(f"https://api.openweathermap.org/data/2.5/weather?q={cleaned_city}&appid={settings.OPENWEATHER_API_KEY}&units=metric")
                
        # Also try raw location hint and code
        if location_hint and location_hint not in urls_to_try:
            urls_to_try.append(f"https://api.openweathermap.org/data/2.5/weather?q={location_hint.strip()}&appid={settings.OPENWEATHER_API_KEY}&units=metric")

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                for target_url in urls_to_try:
                    res = await client.get(target_url)
                    if res.status_code == 200:
                        data = res.json()
                        main = data.get("main", {})
                        wind = data.get("wind", {})
                        weather_list = data.get("weather", [{}])
                        first_w = weather_list[0] if weather_list else {}
                        cond_main = first_w.get("main", "Clear")
                        
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
                        
                        location_display = data.get("name", code)
                        sys_info = data.get("sys", {})
                        if sys_info.get("country"):
                            location_display += f", {sys_info['country']}"
                            
                        return {
                            "airport": code,
                            "location": location_display,
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

    # Fallback weather based on airport or sensible atmospheric standard
    return {
        "airport": code,
        "location": location_hint or f"{code} Airport",
        "temperature_c": 19.5,
        "feels_like_c": 19.5,
        "humidity_pct": 52,
        "wind_speed_kph": 11.0,
        "visibility_km": 15.0,
        "precipitation_mm": 0.0,
        "weather_condition": "Clear",
        "description": "Standard visual meteorological conditions",
        "is_live": False
    }
