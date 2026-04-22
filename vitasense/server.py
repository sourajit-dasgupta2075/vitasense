from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .analytics import compute_dashboard_bundle
from .auth import verify_password
from .config import HOST, PORT, SESSION_COOKIE, STATIC_DIR
from .database import Repository


REPO = Repository()


def parse_json(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length).decode("utf-8") if length else "{}"
    return json.loads(raw or "{}")


class VitaSenseHandler(BaseHTTPRequestHandler):
    server_version = "VitaSense/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed.path)
            return
        self.serve_static(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")
            return
        self.handle_api_post(parsed.path)

    def log_message(self, format, *args):
        return

    def serve_static(self, path: str):
        target = "index.html" if path in {"/", ""} else path.lstrip("/")
        file_path = (STATIC_DIR / target).resolve()
        if STATIC_DIR.resolve() not in file_path.parents and file_path != STATIC_DIR.resolve():
            self.send_error(HTTPStatus.FORBIDDEN, "Invalid path")
            return
        if not file_path.exists() or file_path.is_dir():
            file_path = STATIC_DIR / "index.html"
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        with open(file_path, "rb") as f:
            content = f.read()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def current_user(self):
        cookie_header = self.headers.get("Cookie", "")
        cookies = SimpleCookie()
        cookies.load(cookie_header)
        morsel = cookies.get(SESSION_COOKIE)
        if not morsel:
            return None, None
        token = morsel.value
        return REPO.get_session_user(token), token

    def send_json(self, payload: dict, status: int = HTTPStatus.OK, cookie: str | None = None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def require_auth(self):
        user, token = self.current_user()
        if not user:
            self.send_json({"error": "Authentication required."}, HTTPStatus.UNAUTHORIZED)
            return None, None
        return user, token

    def build_session_cookie(self, token: str | None):
        if token:
            return f"{SESSION_COOKIE}={token}; HttpOnly; Path=/; SameSite=Lax"
        return f"{SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"

    def handle_api_get(self, path: str):
        user, _ = self.current_user()
        if path == "/api/health":
            self.send_json({"ok": True, "service": "VitaSense"})
            return
        if path == "/api/auth/me":
            if not user:
                self.send_json({"authenticated": False})
                return
            self.send_json({"authenticated": True, "user": REPO.get_profile(user["id"])})
            return
        user, _ = self.require_auth()
        if not user:
            return

        if path == "/api/dashboard":
            self.send_json(compute_dashboard_bundle(REPO, user["id"]))
            return
        if path == "/api/profile":
            self.send_json(REPO.get_profile(user["id"]))
            return
        if path == "/api/metrics":
            self.send_json({"items": REPO.list_metrics(user["id"])})
            return
        if path == "/api/symptoms":
            self.send_json({"items": REPO.list_symptoms(user["id"])})
            return
        if path == "/api/medications":
            self.send_json({"items": REPO.list_medications(user["id"])})
            return
        if path == "/api/appointments":
            self.send_json({"items": REPO.list_appointments(user["id"])})
            return
        if path == "/api/goals":
            self.send_json({"items": REPO.list_goals(user["id"])})
            return
        if path == "/api/reminders":
            self.send_json({"items": REPO.list_reminders(user["id"])})
            return
        if path == "/api/journal":
            self.send_json({"items": REPO.list_journal_entries(user["id"])})
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")

    def handle_api_post(self, path: str):
        if path == "/api/auth/register":
            payload = parse_json(self)
            required = ["name", "email", "password"]
            if any(not payload.get(field) for field in required):
                self.send_json({"error": "Name, email, and password are required."}, HTTPStatus.BAD_REQUEST)
                return
            if REPO.get_user_by_email(payload["email"]):
                self.send_json({"error": "Email is already registered."}, HTTPStatus.CONFLICT)
                return
            user = REPO.create_user(payload["name"], payload["email"], payload["password"])
            token = REPO.create_session(user["id"])
            self.send_json(
                {"message": "Account created.", "user": REPO.get_profile(user["id"])},
                HTTPStatus.CREATED,
                self.build_session_cookie(token),
            )
            return

        if path == "/api/auth/login":
            payload = parse_json(self)
            user = REPO.get_user_by_email(payload.get("email", ""))
            if not user or not verify_password(payload.get("password", ""), user["password_hash"], user["password_salt"]):
                self.send_json({"error": "Invalid email or password."}, HTTPStatus.UNAUTHORIZED)
                return
            token = REPO.create_session(user["id"])
            self.send_json(
                {"message": "Logged in.", "user": REPO.get_profile(user["id"])},
                cookie=self.build_session_cookie(token),
            )
            return

        if path == "/api/auth/logout":
            _, token = self.current_user()
            if token:
                REPO.delete_session(token)
            self.send_json({"message": "Logged out."}, cookie=self.build_session_cookie(None))
            return

        user, _ = self.require_auth()
        if not user:
            return
        payload = parse_json(self)

        if path == "/api/profile":
            self.send_json(REPO.update_profile(user["id"], payload))
            return
        if path == "/api/metrics":
            self.send_json(REPO.add_metric(user["id"], payload), HTTPStatus.CREATED)
            return
        if path == "/api/symptoms":
            self.send_json(REPO.add_symptom(user["id"], payload), HTTPStatus.CREATED)
            return
        if path == "/api/medications":
            self.send_json(REPO.add_medication(user["id"], payload), HTTPStatus.CREATED)
            return
        if path == "/api/appointments":
            self.send_json(REPO.add_appointment(user["id"], payload), HTTPStatus.CREATED)
            return
        if path == "/api/goals":
            self.send_json(REPO.add_goal(user["id"], payload), HTTPStatus.CREATED)
            return
        if path == "/api/reminders":
            self.send_json(REPO.add_reminder(user["id"], payload), HTTPStatus.CREATED)
            return
        if path == "/api/journal":
            self.send_json(REPO.add_journal_entry(user["id"], payload), HTTPStatus.CREATED)
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")


def run(host: str = HOST, port: int = PORT):
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((host, port), VitaSenseHandler)
    print(f"VitaSense running at http://{host}:{port}")
    server.serve_forever()
