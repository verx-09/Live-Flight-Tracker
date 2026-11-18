# FlightStat — Real-Time Flight Statistics & ML Delay Prediction

FlightStat is a full-stack flight intelligence platform combining real-time flight radar tracking, live airport weather telemetry, and a Scikit-Learn Machine Learning delay prediction model.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Next.js 16 (React 19)                   │
│             Interactive Dashboard & Radar UI             │
│                 http://localhost:3000                    │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                 Python FastAPI ML Backend                │
│                 http://localhost:8000                    │
│                                                          │
│  ┌───────────────────────┐    ┌───────────────────────┐  │
│  │     AviationStack     │    │     OpenWeatherMap    │  │
│  │ (Live Flights Radar)  │    │  (Live Airport Metar) │  │
│  └───────────────────────┘    └───────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │   Scikit-Learn Machine Learning Inference Engine   │  │
│  │       (GradientBoostingRegressor Pipeline)         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Running Locally

Both the Python backend and Next.js frontend are configured to run simultaneously:

### 1. Start the Python FastAPI ML Backend (Port 8000)
```powershell
# In project root
python backend/run.py
```
* **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check**: [http://localhost:8000/](http://localhost:8000/)

### 2. Start the Next.js Frontend (Port 3000)
```powershell
# In project root
npx next dev -p 3000
```
* **Web Application**: [http://localhost:3000](http://localhost:3000)

---

## ⚡ Features

1. **Live Flight Radar**:
   - Fetches live commercial flights via AviationStack.
   - Click "📡 Load Live Flights" or search any flight number (e.g., `DL105`, `AA100`, `AI101`).
   - Automatically populates airline, origin, destination, and current delay status.

2. **Live Weather Telemetry**:
   - Queries OpenWeatherMap using international IATA airport coordinates.
   - Ingests real-time temperature, wind speed, visibility, and weather conditions into prediction features.

3. **Scikit-Learn Machine Learning Engine**:
   - Trained Gradient Boosting Regressor model (`GradientBoostingRegressor`).
   - Evaluates airline performance, airspace congestion, weather, turnaround times, and crew status.
   - Calculates delay probability percentage, expected delay minutes, risk tiers (Low/Moderate/High/Severe), and ranked impact drivers.

---

## ☁️ Deploying to Render

This project includes a ready-to-use `render.yaml` configuration.

### Option A: Automatic Deployment via Blueprint (Recommended)
1. Push this project to GitHub.
2. Go to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New** → **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and provision:
   - `flightstat-backend` (Python web service)
   - `flightstat-frontend` (Next.js web service)
6. Click **Apply**. Both services will build and deploy!

### Option B: Manual Service Creation
1. **Backend Web Service**:
   - **Environment**: Python
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt && python ml/train_model.py`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `AVIATIONSTACK_API_KEY`: `49e98eab0ff0ab6fdc64300d832b4530`
     - `OPENWEATHER_API_KEY`: `f6474cb1608278cca987718bfbced9f1`

2. **Frontend Web Service**:
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Environment Variables**:
     - `PYTHON_BACKEND_URL`: URL of your deployed backend (e.g. `https://flightstat-backend.onrender.com`)
