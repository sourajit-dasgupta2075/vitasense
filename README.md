# VitaSense - Production-Ready Rebuild

VitaSense is a web-based AI health monitoring platform with a modular full-stack architecture:

- `client/` - React + Vite + Tailwind + Recharts dashboard
- `server/` - Node.js + Express + Firebase Firestore API layer
- `ml-service/` - FastAPI + scikit-learn prediction service
- `firmware/` - ESP32 sample firmware to stream sensor readings

## Core capabilities

- Real-time vital monitoring (heart rate, SpO2, temperature, motion)
- Dashboard with 1 min / 10 min / 1 hour trend switching
- AI anomaly probability and future heart-rate prediction graph
- Health Score (0-100) with status (`normal`, `warning`, `critical`)
- Activity correlation (motion vs heart rate)
- Alerts pipeline (UI alerts + optional email alerts)
- Camera-based health estimation placeholder card (future scope)

## Folder structure

```text
vitasense/
  client/
    src/
      App.jsx
      lib/api.js
    .env.example
    package.json

  server/
    src/
      app.js
      index.js
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      seed.js
    .env.example
    package.json

  ml-service/
    app/
      main.py
      schemas.py
    .env.example
    requirements.txt

  firmware/
    src/main.cpp
    platformio.ini
```

## REST API

### `POST /api/data`
Ingest sensor payload from ESP32.

```json
{
  "heartRate": 91,
  "spo2": 97,
  "temperature": 36.7,
  "motion": 0.08,
  "deviceId": "esp32-vitasense"
}
```

### `GET /api/data`
Returns latest reading.

### `GET /api/history?range=1m|10m|1h|24h`
Returns historical readings from Firestore.

### `GET /api/predictions`
Gets ML-backed forecast and anomaly probability.

### `GET /api/alerts`
Returns latest alerts.

## Setup instructions (step-by-step)

## 1) Configure Firebase Firestore

Create a Firebase project, enable Firestore, and configure service account credentials.

## 2) Backend (`server`)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Default URL: `http://localhost:4000`

## 3) ML service (`ml-service`)

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Default URL: `http://127.0.0.1:8000`

## 4) Frontend (`client`)

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Default URL: `http://localhost:5173`

## 5) ESP32 firmware (`firmware`)

Update constants in `firmware/src/main.cpp`:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `API_URL` (example: `http://<your-lan-ip>:4000/api/data`)

Then build/upload using PlatformIO.

## Environment examples

### `client/.env.example`

```env
VITE_API_URL=http://localhost:4000/api
```

### `server/.env.example`

```env
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
ML_SERVICE_URL=http://127.0.0.1:8000
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
ALERT_EMAIL_ENABLED=false
ALERT_EMAIL_FROM=vitasense@example.com
ALERT_EMAIL_TO=doctor@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
```

### `ml-service/.env.example`

```env
MODEL_STORE=./model_store
```

## Firestore collections

The backend stores records in:

- `healthReadings`
- `alerts`
