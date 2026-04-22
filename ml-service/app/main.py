from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression

from .schemas import PredictionRequest

MODEL_STORE = Path(os.getenv("MODEL_STORE", Path(__file__).resolve().parent.parent / "model_store"))
MODEL_STORE.mkdir(parents=True, exist_ok=True)
FORECAST_PATH = MODEL_STORE / "forecast.joblib"
ANOMALY_PATH = MODEL_STORE / "anomaly.joblib"

app = FastAPI(title="VitaSense ML Service")


def feature_matrix(readings):
    return np.array([[r.heartRate, r.spo2, r.temperature, r.motion] for r in readings], dtype=float)


def train_models(data: np.ndarray):
    x = np.arange(len(data)).reshape(-1, 1)
    y = data[:, 0]

    forecast_model = LinearRegression()
    forecast_model.fit(x, y)

    anomaly_model = IsolationForest(contamination=0.1, random_state=42)
    anomaly_model.fit(data)

    joblib.dump(forecast_model, FORECAST_PATH)
    joblib.dump(anomaly_model, ANOMALY_PATH)
    return forecast_model, anomaly_model


def load_or_train_models(data: np.ndarray):
    if FORECAST_PATH.exists() and ANOMALY_PATH.exists():
        return joblib.load(FORECAST_PATH), joblib.load(ANOMALY_PATH)
    return train_models(data)


@app.get("/health")
def health():
    return {"ok": True, "service": "vitasense-ml"}


@app.post("/train")
def train(payload: PredictionRequest):
    if len(payload.readings) < 10:
        return {"ok": False, "message": "Need at least 10 readings to train."}

    data = feature_matrix(payload.readings)
    train_models(data)
    return {"ok": True, "samples": len(payload.readings)}


@app.post("/predict")
def predict(payload: PredictionRequest):
    readings = payload.readings
    if not readings:
        return {"forecast": [], "anomalyProbability": 0.0, "insights": ["No historical readings were provided."]}

    data = feature_matrix(readings)
    forecast_model, anomaly_model = load_or_train_models(data)

    base_index = len(readings)
    future_x = np.array([[base_index], [base_index + 1], [base_index + 2]], dtype=float)
    future_y = forecast_model.predict(future_x)

    anomaly_scores = anomaly_model.decision_function(data)
    predicted_flags = anomaly_model.predict(data)
    anomaly_probability = float(np.mean(predicted_flags == -1))

    forecast = [
        {
            "step": f"T+{(idx + 1) * 5}m",
            "heartRate": round(float(value), 2),
            "riskLevel": "critical" if value > 115 else "moderate" if value > 100 else "low",
        }
        for idx, value in enumerate(future_y)
    ]

    latest = readings[-1]
    insights = [
        f"Latest health score is {round(float(latest.healthScore or 0), 1)}.",
        f"Anomaly pressure is {round(anomaly_probability * 100, 1)}% over the observed window.",
        f"Average anomaly margin: {round(float(np.mean(anomaly_scores)), 3)}.",
    ]

    return {"forecast": forecast, "anomalyProbability": anomaly_probability, "insights": insights}
