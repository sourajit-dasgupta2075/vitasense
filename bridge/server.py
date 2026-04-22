from __future__ import annotations

import json
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "telemetry.json"
HOST = "127.0.0.1"
PORT = 8787


def default_payload() -> dict:
    return {
        "device": {
            "connected": True,
            "board": "ESP32 Dev Module",
            "sensors": ["MAX30102", "DS18B20", "MPU6050"],
            "updatedAt": datetime.now().isoformat(timespec="seconds"),
        },
        "metrics": {
            "heartRate": {"value": 91, "status": "Tracked", "state": "normal"},
            "spo2": {"value": 97, "status": "Normal", "state": "normal"},
            "temperature": {"value": "--", "status": "No Data", "state": "warning"},
            "stress": {"value": 49, "status": "Moderate", "state": "normal"},
            "hydration": {"value": 100, "status": "Adequate", "state": "normal"},
            "perfusionIndex": {"value": 7.14, "status": "Tracked", "state": "normal"},
            "respiratoryRate": {"value": 13, "status": "Tracked", "state": "normal"},
            "movement": {"value": "0.00", "status": "Minimal", "state": "normal"},
            "shockIndex": {"value": 0.72, "status": "Stable", "state": "normal"},
            "fallRisk": {"value": 2, "status": "Low", "state": "normal"},
            "signalQuality": {"value": 94, "status": "Strong", "state": "normal"},
            "deviceUptime": {"value": 41, "status": "Streaming", "state": "normal"},
        },
    }


def load_payload() -> dict:
    if not DATA_FILE.exists():
        DATA_FILE.write_text(json.dumps(default_payload(), indent=2), encoding="utf-8")
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        if self.path == "/api/telemetry/current":
            self.respond(load_payload())
            return
        if self.path == "/api/health":
            self.respond({"ok": True, "service": "vitasense-bridge"})
            return
        self.respond({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def respond(self, payload: dict, status: int = HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run():
    server = ThreadingHTTPServer((HOST, PORT), BridgeHandler)
    print(f"Bridge listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
