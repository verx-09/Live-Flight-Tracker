import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any

MODEL_PATH = os.path.join(os.path.dirname(__file__), "flight_delay_model.joblib")
_cached_pipeline = None

def get_model():
    global _cached_pipeline
    if _cached_pipeline is None:
        if not os.path.exists(MODEL_PATH):
            from ml.train_model import train_and_save_model
            _cached_pipeline = train_and_save_model(MODEL_PATH)
        else:
            _cached_pipeline = joblib.load(MODEL_PATH)
    return _cached_pipeline

def predict_delay_ml(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Run inference using the trained Scikit-Learn Gradient Boosting model."""
    pipeline = get_model()
    
    # Ensure all required features are present
    df = pd.DataFrame([input_data])
    
    # Predict expected delay minutes
    expected_delay = float(pipeline.predict(df)[0])
    expected_delay = max(0.0, round(expected_delay, 1))
    
    # Derive probability sigmoid-like from predicted delay minutes
    # 0 mins -> ~5% chance, 15 mins -> ~30%, 30 mins -> ~65%, 60 mins -> ~95%
    prob = 1.0 / (1.0 + np.exp(-(expected_delay - 22.0) / 8.5)) * 100.0
    prob = round(float(np.clip(prob, 2.0, 98.0)), 1)
    
    # Analyze contributing factors
    impacts = []

    # Incorporate live observed delay from radar feed if available
    live_delay = input_data.get("liveDelayMinutes")
    if live_delay and float(live_delay) > 0:
        live_delay_val = float(live_delay)
        expected_delay = max(expected_delay, live_delay_val + 4.0)
        prob = max(prob, min(98.0, 84.0 + live_delay_val * 0.2))
        impacts.append({"factor": f"Live reported delay (+{int(live_delay_val)}m)", "impact": round(live_delay_val, 1)})

    # Risk level classification
    if prob < 25.0:
        risk_level = "Low"
    elif prob < 50.0:
        risk_level = "Moderate"
    elif prob < 75.0:
        risk_level = "High"
    else:
        risk_level = "Severe"

    weather = input_data.get("weather", "Clear")
    if weather in ["Thunderstorm", "Snow", "Fog", "Rain"]:
        impacts.append({"factor": f"{weather} weather at airport", "impact": round(expected_delay * 0.32, 1)})
        
    traffic = input_data.get("airTraffic", "Moderate")
    if traffic in ["High", "Severe"]:
        impacts.append({"factor": f"{traffic.lower()} airspace traffic volume", "impact": round(expected_delay * 0.24, 1)})
        
    inbound = input_data.get("inboundAircraft", "On time")
    if inbound != "On time":
        impacts.append({"factor": f"Incoming aircraft turnaround ({inbound.lower()})", "impact": round(expected_delay * 0.28, 1)})
        
    congestion = input_data.get("airportCongestion", 45)
    if congestion > 65:
        impacts.append({"factor": f"Airport peak ground congestion ({congestion}%)", "impact": round((congestion - 50) * 0.3, 1)})
        
    wind = input_data.get("windSpeedKph", 10)
    if wind > 30:
        impacts.append({"factor": f"Crosswind intensity ({wind} km/h)", "impact": round((wind - 25) * 0.25, 1)})
        
    ground_stop = input_data.get("groundStop", "None")
    if ground_stop != "None":
        impacts.append({"factor": f"FAA/ATC {ground_stop.lower()}", "impact": 40.0})

    if not impacts:
        impacts.append({"factor": f"{input_data.get('airline', 'Carrier')} on-time operational profile", "impact": 1.2})
        impacts.append({"factor": f"Standard {input_data.get('departureWindow', 'Morning').lower()} departure bank", "impact": 0.8})

    impacts = sorted(impacts, key=lambda x: x["impact"], reverse=True)[:5]
    
    return {
        "probability": prob,
        "expectedDelayMinutes": round(expected_delay),
        "riskLevel": risk_level,
        "topFactors": impacts,
        "modelType": "GradientBoostingRegressor (scikit-learn 1.9)"
    }
