"""
Optional serial ingest utility.

Expected line format from ESP32 over serial:
{"heartRate":91,"spo2":97,"temperature":36.6,"stress":49,"hydration":100,"perfusionIndex":7.14,"respiratoryRate":13,"movement":0.0,"shockIndex":0.72,"fallRisk":2,"signalQuality":94,"deviceUptime":41}

Install dependency if needed:
    pip install pyserial
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


OUTPUT = Path(__file__).resolve().parent / "telemetry.json"


def update_payload(raw_line: str):
    payload = json.loads(raw_line)
    document = {
        "device": {
            "connected": True,
            "board": "ESP32 Dev Module",
            "sensors": ["MAX30102", "DS18B20", "MPU6050"],
            "updatedAt": datetime.now().isoformat(timespec="seconds"),
        },
        "metrics": {
            "heartRate": {"value": payload.get("heartRate", "--"), "status": "Tracked", "state": "normal"},
            "spo2": {"value": payload.get("spo2", "--"), "status": "Normal", "state": "normal"},
            "temperature": {"value": payload.get("temperature", "--"), "status": "Tracked", "state": "normal"},
            "stress": {"value": payload.get("stress", "--"), "status": "Moderate", "state": "normal"},
            "hydration": {"value": payload.get("hydration", "--"), "status": "Adequate", "state": "normal"},
            "perfusionIndex": {"value": payload.get("perfusionIndex", "--"), "status": "Tracked", "state": "normal"},
            "respiratoryRate": {"value": payload.get("respiratoryRate", "--"), "status": "Tracked", "state": "normal"},
            "movement": {"value": payload.get("movement", "--"), "status": "Minimal", "state": "normal"},
            "shockIndex": {"value": payload.get("shockIndex", "--"), "status": "Stable", "state": "normal"},
            "fallRisk": {"value": payload.get("fallRisk", "--"), "status": "Low", "state": "normal"},
            "signalQuality": {"value": payload.get("signalQuality", "--"), "status": "Strong", "state": "normal"},
            "deviceUptime": {"value": payload.get("deviceUptime", "--"), "status": "Streaming", "state": "normal"},
        },
    }
    OUTPUT.write_text(json.dumps(document, indent=2), encoding="utf-8")


if __name__ == "__main__":
    print("Import and call update_payload(...) from your serial loop wrapper.")
