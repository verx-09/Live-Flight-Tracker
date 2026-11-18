from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routes.flights import router as flights_router
from routes.weather import router as weather_router
from routes.predictions import router as predictions_router
from ml.predictor import get_model

app = FastAPI(
    title="FlightStat ML & Live Flight API",
    description="Real-time flight delay prediction powered by Scikit-Learn and AviationStack",
    version="1.0.0"
)

# Enable CORS for Next.js frontend (local and Render deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flights_router)
app.include_router(weather_router)
app.include_router(predictions_router)

@app.on_event("startup")
async def startup_event():
    print("Initializing Flight Delay Machine Learning Model...")
    get_model()
    print("Model initialized and ready for inference!")

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "FlightStat ML API",
        "version": "1.0.0",
        "endpoints": [
            "/api/flights/live",
            "/api/flights/search/{flight_number}",
            "/api/weather/{airport_code}",
            "/api/predict",
            "/docs"
        ]
    }
