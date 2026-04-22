from datetime import datetime
from pydantic import BaseModel


class Reading(BaseModel):
    timestamp: datetime
    heartRate: float
    spo2: float
    temperature: float
    motion: float
    status: str | None = "normal"
    healthScore: float | None = 0


class PredictionRequest(BaseModel):
    readings: list[Reading]
