import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

CATEGORICAL_FEATURES = [
    'airline', 'origin', 'destination', 'departureWindow', 'dayType', 'season',
    'weather', 'airTraffic', 'inboundAircraft', 'maintenance', 'crewStatus',
    'security', 'distanceBand', 'groundStop', 'runwayStatus', 'gateStatus',
    'deicing', 'turnaround', 'groundHandling', 'boarding', 'connectionPressure',
    'airspaceRestriction', 'laborAction', 'airportSystems', 'borderProcessing',
    'exceptionalHazard', 'curfewPressure'
]

NUMERICAL_FEATURES = [
    'windSpeedKph', 'visibilityKm', 'precipitationMm', 'temperatureC', 'airportCongestion'
]

AIRLINES = ['Air India', 'Alaska', 'American', 'British Airways', 'Delta', 'Emirates', 'IndiGo', 'JetBlue', 'Lufthansa', 'Southwest', 'SkyWest', 'United']
AIRPORTS = ['ATL', 'BOM', 'BOS', 'DEL', 'DXB', 'FRA', 'JFK', 'LAX', 'LHR', 'ORD', 'SEA', 'SFO']
WINDOWS = ['Early morning', 'Morning', 'Afternoon', 'Evening', 'Late night']
DAY_TYPES = ['Weekday', 'Weekend', 'Public holiday']
SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
WEATHERS = ['Clear', 'Cloudy', 'Rain', 'Snow', 'Thunderstorm', 'Fog']
AIR_TRAFFIC = ['Low', 'Moderate', 'High', 'Severe']
INBOUND = ['On time', 'Slight delay', 'Major delay']
MAINTENANCE = ['Cleared', 'Inspection due', 'Technical issue']
CREW = ['Ready', 'Tight connection', 'Crew shortage']
SECURITY = ['Normal', 'Heightened', 'Active disruption']
DISTANCES = ['Short haul', 'Medium haul', 'Long haul', 'Ultra long haul']
GROUND_STOP = ['None', 'Ground delay program', 'Ground stop']
RUNWAY = ['Normal', 'Reduced capacity', 'Runway closure']
GATE = ['Available', 'Short wait', 'No gate available']
DEICING = ['Not required', 'Scheduled', 'Heavy queue']
TURNAROUND = ['On schedule', 'Tight turnaround', 'Behind schedule']
HANDLING = ['Ready', 'Minor delay', 'Major delay']
BOARDING = ['On schedule', 'Slow boarding', 'Passenger issue']
CONNECTION = ['Low', 'Moderate', 'High']
AIRSPACE = ['None', 'Reroute', 'Closure or NOTAM']
LABOR = ['None', 'Staff shortage', 'Strike action']
SYSTEMS = ['Operational', 'Degraded', 'Major outage']
BORDER = ['Normal', 'Congested', 'Severely congested']
HAZARDS = ['None', 'Wildlife or drone', 'Volcanic ash', 'Emergency response']
CURFEW = ['None', 'Approaching curfew', 'Curfew conflict']

def generate_synthetic_flight_data(num_samples: int = 12000):
    """Generate realistic training data mirroring real flight delay dynamics."""
    np.random.seed(42)
    
    data = []
    delays = []
    
    for _ in range(num_samples):
        orig, dest = np.random.choice(AIRPORTS, size=2, replace=False)
        airline = np.random.choice(AIRLINES)
        window = np.random.choice(WINDOWS, p=[0.15, 0.30, 0.25, 0.22, 0.08])
        day = np.random.choice(DAY_TYPES, p=[0.70, 0.25, 0.05])
        season = np.random.choice(SEASONS)
        weather = np.random.choice(WEATHERS, p=[0.45, 0.25, 0.15, 0.05, 0.05, 0.05])
        traffic = np.random.choice(AIR_TRAFFIC, p=[0.30, 0.45, 0.20, 0.05])
        inbound = np.random.choice(INBOUND, p=[0.70, 0.22, 0.08])
        maint = np.random.choice(MAINTENANCE, p=[0.85, 0.12, 0.03])
        crew = np.random.choice(CREW, p=[0.82, 0.14, 0.04])
        sec = np.random.choice(SECURITY, p=[0.92, 0.07, 0.01])
        dist = np.random.choice(DISTANCES)
        g_stop = np.random.choice(GROUND_STOP, p=[0.93, 0.05, 0.02])
        runway = np.random.choice(RUNWAY, p=[0.88, 0.10, 0.02])
        gate = np.random.choice(GATE, p=[0.80, 0.15, 0.05])
        deicing = np.random.choice(DEICING, p=[0.85, 0.10, 0.05])
        turn = np.random.choice(TURNAROUND, p=[0.75, 0.18, 0.07])
        handling = np.random.choice(HANDLING, p=[0.85, 0.12, 0.03])
        boarding = np.random.choice(BOARDING, p=[0.80, 0.15, 0.05])
        conn = np.random.choice(CONNECTION, p=[0.70, 0.22, 0.08])
        airspace = np.random.choice(AIRSPACE, p=[0.90, 0.08, 0.02])
        labor = np.random.choice(LABOR, p=[0.96, 0.03, 0.01])
        sys = np.random.choice(SYSTEMS, p=[0.92, 0.06, 0.02])
        border = np.random.choice(BORDER, p=[0.85, 0.12, 0.03])
        hazard = np.random.choice(HAZARDS, p=[0.98, 0.01, 0.005, 0.005])
        curfew = np.random.choice(CURFEW, p=[0.92, 0.06, 0.02])
        
        wind = float(np.random.gamma(shape=2.5, scale=6.0))
        vis = float(np.clip(np.random.normal(16.0, 4.0), 0.5, 30.0))
        precip = float(0.0 if weather == 'Clear' else np.random.exponential(scale=3.0))
        temp = float(np.random.normal(20.0, 8.0))
        congestion = float(np.clip(np.random.normal(50.0, 18.0), 5.0, 95.0))
        
        # Calculate realistic base delay in minutes
        delay = 4.0
        
        # Weather penalties
        w_map = {'Clear': -2, 'Cloudy': 2, 'Rain': 18, 'Snow': 38, 'Thunderstorm': 52, 'Fog': 30}
        delay += w_map[weather]
        
        # Inbound propagation
        inb_map = {'On time': -3, 'Slight delay': 16, 'Major delay': 45}
        delay += inb_map[inbound]
        
        # Crew & Maintenance
        m_map = {'Cleared': 0, 'Inspection due': 18, 'Technical issue': 55}
        delay += m_map[maint]
        c_map = {'Ready': 0, 'Tight connection': 14, 'Crew shortage': 42}
        delay += c_map[crew]
        
        # Time of day
        win_map = {'Early morning': -6, 'Morning': 2, 'Afternoon': 8, 'Evening': 16, 'Late night': 9}
        delay += win_map[window]
        
        # Congestion & Traffic
        delay += (congestion - 40) * 0.35
        t_map = {'Low': -4, 'Moderate': 3, 'High': 16, 'Severe': 36}
        delay += t_map[traffic]
        
        # Airport ground delays & stops
        if g_stop == 'Ground delay program': delay += 35
        elif g_stop == 'Ground stop': delay += 75
        
        if runway == 'Reduced capacity': delay += 20
        elif runway == 'Runway closure': delay += 60
        
        if labor == 'Strike action': delay += 65
        if sys == 'Major outage': delay += 50
        
        # Non-linear noise
        delay += np.random.normal(0, 6.0)
        final_delay = max(0.0, delay)
        
        row = {
            'airline': airline, 'origin': orig, 'destination': dest,
            'departureWindow': window, 'dayType': day, 'season': season,
            'weather': weather, 'airTraffic': traffic, 'inboundAircraft': inbound,
            'maintenance': maint, 'crewStatus': crew, 'security': sec,
            'distanceBand': dist, 'groundStop': g_stop, 'runwayStatus': runway,
            'gateStatus': gate, 'deicing': deicing, 'turnaround': turn,
            'groundHandling': handling, 'boarding': boarding,
            'connectionPressure': conn, 'airspaceRestriction': airspace,
            'laborAction': labor, 'airportSystems': sys,
            'borderProcessing': border, 'exceptionalHazard': hazard,
            'curfewPressure': curfew, 'windSpeedKph': wind,
            'visibilityKm': vis, 'precipitationMm': precip,
            'temperatureC': temp, 'airportCongestion': congestion
        }
        data.append(row)
        delays.append(final_delay)
        
    df = pd.DataFrame(data)
    y = np.array(delays)
    return df, y

def train_and_save_model(model_path: str = None):
    """Train Gradient Boosting model and save pipeline artifact."""
    if model_path is None:
        model_path = os.path.join(os.path.dirname(__file__), "flight_delay_model.joblib")
        
    print("Generating synthetic flight operational dataset (12,000 samples)...")
    X, y = generate_synthetic_flight_data(12000)
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), CATEGORICAL_FEATURES),
            ('num', 'passthrough', NUMERICAL_FEATURES)
        ]
    )
    
    model = GradientBoostingRegressor(
        n_estimators=120,
        learning_rate=0.08,
        max_depth=4,
        random_state=42
    )
    
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', model)
    ])
    
    print("Training scikit-learn GradientBoostingRegressor...")
    pipeline.fit(X, y)
    
    joblib.dump(pipeline, model_path)
    print(f"Model saved successfully to {model_path}!")
    return pipeline

if __name__ == "__main__":
    train_and_save_model()
