from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional


@dataclass
class Reading:
    timestamp: datetime
    heartRate: float
    spo2: float
    temperature: float
    motion: float
    status: Optional[str] = "normal"
    healthScore: Optional[float] = 0


@dataclass
class PredictionRequest:
    readings: List[Reading]
