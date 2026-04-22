from __future__ import annotations

import sqlite3
from datetime import date, datetime, timedelta

from .auth import hash_password, new_token
from .config import DATA_DIR, DB_PATH


class Repository:
    def __init__(self, db_path=DB_PATH):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self._initialize()

    def connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _initialize(self):
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    age INTEGER DEFAULT 29,
                    blood_type TEXT DEFAULT 'O+',
                    emergency_contact TEXT DEFAULT '',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    log_date TEXT NOT NULL,
                    weight_kg REAL NOT NULL,
                    sleep_hours REAL NOT NULL,
                    hydration_liters REAL NOT NULL,
                    heart_rate INTEGER NOT NULL,
                    systolic INTEGER NOT NULL,
                    diastolic INTEGER NOT NULL,
                    steps INTEGER NOT NULL,
                    mood_score INTEGER NOT NULL,
                    energy_score INTEGER NOT NULL,
                    notes TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS symptoms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    logged_at TEXT NOT NULL,
                    category TEXT NOT NULL,
                    severity INTEGER NOT NULL,
                    trigger_hint TEXT DEFAULT '',
                    notes TEXT DEFAULT '',
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS medications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    dosage TEXT NOT NULL,
                    frequency TEXT NOT NULL,
                    purpose TEXT DEFAULT '',
                    active INTEGER NOT NULL DEFAULT 1,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    scheduled_for TEXT NOT NULL,
                    location TEXT DEFAULT '',
                    notes TEXT DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'scheduled',
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    target_value TEXT NOT NULL,
                    progress_value TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    due_date TEXT DEFAULT '',
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    reminder_time TEXT NOT NULL,
                    channel TEXT NOT NULL DEFAULT 'in-app',
                    status TEXT NOT NULL DEFAULT 'scheduled',
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS journal_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    entry_date TEXT NOT NULL,
                    mood_label TEXT NOT NULL,
                    gratitude TEXT DEFAULT '',
                    reflection TEXT DEFAULT '',
                    FOREIGN KEY(user_id) REFERENCES users(id)
                );
                """
            )
            user_exists = conn.execute("SELECT 1 FROM users WHERE email = ?", ("demo@vitasense.app",)).fetchone()
            if not user_exists:
                self._seed_demo(conn)

    def _seed_demo(self, conn):
        password_hash, password_salt = hash_password("demo1234")
        now = datetime.utcnow().isoformat()
        cur = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, password_salt, age, blood_type, emergency_contact, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("Ava Morgan", "demo@vitasense.app", password_hash, password_salt, 31, "A+", "Jordan Morgan - +1 555 0102", now),
        )
        user_id = cur.lastrowid
        conn.execute(
            "INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)",
            (user_id, new_token(), now),
        )

        today = date.today()
        for offset, values in enumerate(
            [
                (68.5, 7.6, 2.4, 69, 118, 77, 8400, 7, 8, "Felt balanced overall."),
                (68.3, 6.9, 2.1, 71, 120, 79, 7300, 6, 7, "Sleep dipped after a late meeting."),
                (68.2, 7.2, 2.6, 70, 117, 76, 9100, 8, 8, "Great walking day."),
                (68.0, 6.4, 1.8, 73, 121, 80, 6400, 5, 6, "Hydration was low."),
                (67.9, 7.8, 2.5, 68, 116, 75, 10100, 8, 9, "Strong energy throughout the day."),
                (67.8, 7.1, 2.3, 69, 119, 78, 8800, 7, 8, "Stayed on plan."),
                (67.7, 6.7, 1.9, 72, 122, 81, 5900, 6, 6, "Busy day, missed an afternoon walk."),
            ]
        ):
            log_date = (today - timedelta(days=6 - offset)).isoformat()
            conn.execute(
                """
                INSERT INTO metrics
                (user_id, log_date, weight_kg, sleep_hours, hydration_liters, heart_rate, systolic, diastolic, steps, mood_score, energy_score, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, log_date, *values, now),
            )

        for category, severity, trigger, notes in [
            ("Headache", 4, "Screen time", "Mild tension around noon."),
            ("Fatigue", 5, "Low sleep", "Energy dipped before dinner."),
            ("Bloating", 3, "Heavy lunch", "Resolved by evening."),
        ]:
            conn.execute(
                "INSERT INTO symptoms (user_id, logged_at, category, severity, trigger_hint, notes) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, now, category, severity, trigger, notes),
            )

        for name, dosage, frequency, purpose in [
            ("Vitamin D3", "2000 IU", "Daily", "Immune support"),
            ("Magnesium", "250 mg", "Nightly", "Sleep and recovery"),
            ("Omega-3", "1 capsule", "Daily", "Heart health"),
        ]:
            conn.execute(
                "INSERT INTO medications (user_id, name, dosage, frequency, purpose) VALUES (?, ?, ?, ?, ?)",
                (user_id, name, dosage, frequency, purpose),
            )

        for title, provider, when, location, notes, status in [
            ("Quarterly Wellness Check", "Dr. Lina Patel", f"{today + timedelta(days=3)}T10:00", "Riverside Clinic", "Bring blood pressure history.", "scheduled"),
            ("Nutrition Review", "Mason Lee, RD", f"{today + timedelta(days=8)}T14:30", "Virtual", "Review hydration and fiber goals.", "scheduled"),
        ]:
            conn.execute(
                """
                INSERT INTO appointments (user_id, title, provider, scheduled_for, location, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, title, provider, when, location, notes, status),
            )

        for title, target_value, progress_value, status, due_date in [
            ("Sleep 7.5h average", "7.5 hours", "7.1 hours", "active", (today + timedelta(days=20)).isoformat()),
            ("Hydration consistency", "2.5 liters", "2.2 liters", "active", (today + timedelta(days=12)).isoformat()),
            ("10k steps milestone", "10000 steps", "10100 steps", "completed", (today - timedelta(days=1)).isoformat()),
        ]:
            conn.execute(
                """
                INSERT INTO goals (user_id, title, target_value, progress_value, status, due_date)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, title, target_value, progress_value, status, due_date),
            )

        for title, reminder_time, channel, status in [
            ("Morning supplements", "08:00", "push", "taken"),
            ("Hydration check", "12:30", "in-app", "scheduled"),
            ("Evening wind-down", "21:30", "email", "taken"),
        ]:
            conn.execute(
                "INSERT INTO reminders (user_id, title, reminder_time, channel, status) VALUES (?, ?, ?, ?, ?)",
                (user_id, title, reminder_time, channel, status),
            )

        for mood_label, gratitude, reflection, offset in [
            ("Calm", "A quiet morning walk", "Felt more focused after moving early.", 0),
            ("Motivated", "Finishing deep work", "Small wins made the day feel lighter.", 1),
            ("Tired", "A supportive call", "Need to protect sleep before busy days.", 2),
        ]:
            conn.execute(
                "INSERT INTO journal_entries (user_id, entry_date, mood_label, gratitude, reflection) VALUES (?, ?, ?, ?, ?)",
                (user_id, (today - timedelta(days=offset)).isoformat(), mood_label, gratitude, reflection),
            )

    def create_user(self, name: str, email: str, password: str):
        password_hash, password_salt = hash_password(password)
        now = datetime.utcnow().isoformat()
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO users (name, email, password_hash, password_salt, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, email.lower(), password_hash, password_salt, now),
            )
            return self.get_user_by_id(cur.lastrowid)

    def get_user_by_email(self, email: str):
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: int):
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None

    def get_profile(self, user_id: int):
        user = self.get_user_by_id(user_id)
        return {
            "name": user["name"],
            "email": user["email"],
            "age": user["age"],
            "blood_type": user["blood_type"],
            "emergency_contact": user["emergency_contact"],
        }

    def update_profile(self, user_id: int, payload: dict):
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE users
                SET name = ?, age = ?, blood_type = ?, emergency_contact = ?
                WHERE id = ?
                """,
                (
                    payload["name"],
                    payload["age"],
                    payload["blood_type"],
                    payload["emergency_contact"],
                    user_id,
                ),
            )
        return self.get_profile(user_id)

    def create_session(self, user_id: int):
        token = new_token()
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)",
                (user_id, token, datetime.utcnow().isoformat()),
            )
        return token

    def get_session_user(self, token: str):
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT users.* FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = ?
                """,
                (token,),
            ).fetchone()
            return dict(row) if row else None

    def delete_session(self, token: str):
        with self.connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))

    def list_metrics(self, user_id: int):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM metrics WHERE user_id = ? ORDER BY log_date DESC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_metric(self, user_id: int, payload: dict):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO metrics
                (user_id, log_date, weight_kg, sleep_hours, hydration_liters, heart_rate, systolic, diastolic, steps, mood_score, energy_score, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload["log_date"],
                    payload["weight_kg"],
                    payload["sleep_hours"],
                    payload["hydration_liters"],
                    payload["heart_rate"],
                    payload["systolic"],
                    payload["diastolic"],
                    payload["steps"],
                    payload["mood_score"],
                    payload["energy_score"],
                    payload.get("notes", ""),
                    datetime.utcnow().isoformat(),
                ),
            )
            row = conn.execute("SELECT * FROM metrics WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)

    def list_symptoms(self, user_id: int):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM symptoms WHERE user_id = ? ORDER BY logged_at DESC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_symptom(self, user_id: int, payload: dict):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO symptoms (user_id, logged_at, category, severity, trigger_hint, notes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    datetime.utcnow().isoformat(),
                    payload["category"],
                    payload["severity"],
                    payload.get("trigger_hint", ""),
                    payload.get("notes", ""),
                ),
            )
            row = conn.execute("SELECT * FROM symptoms WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)

    def list_medications(self, user_id: int):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM medications WHERE user_id = ? ORDER BY id DESC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_medication(self, user_id: int, payload: dict):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO medications (user_id, name, dosage, frequency, purpose, active)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload["name"],
                    payload["dosage"],
                    payload["frequency"],
                    payload.get("purpose", ""),
                    1 if payload.get("active", True) else 0,
                ),
            )
            row = conn.execute("SELECT * FROM medications WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)

    def list_appointments(self, user_id: int):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM appointments WHERE user_id = ? ORDER BY scheduled_for ASC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_appointment(self, user_id: int, payload: dict):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO appointments (user_id, title, provider, scheduled_for, location, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload["title"],
                    payload["provider"],
                    payload["scheduled_for"],
                    payload.get("location", ""),
                    payload.get("notes", ""),
                    payload.get("status", "scheduled"),
                ),
            )
            row = conn.execute("SELECT * FROM appointments WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)

    def list_goals(self, user_id: int):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM goals WHERE user_id = ? ORDER BY id DESC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_goal(self, user_id: int, payload: dict):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO goals (user_id, title, target_value, progress_value, status, due_date)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload["title"],
                    payload["target_value"],
                    payload["progress_value"],
                    payload.get("status", "active"),
                    payload.get("due_date", ""),
                ),
            )
            row = conn.execute("SELECT * FROM goals WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)

    def list_reminders(self, user_id: int):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM reminders WHERE user_id = ? ORDER BY reminder_time ASC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_reminder(self, user_id: int, payload: dict):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO reminders (user_id, title, reminder_time, channel, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload["title"],
                    payload["reminder_time"],
                    payload.get("channel", "in-app"),
                    payload.get("status", "scheduled"),
                ),
            )
            row = conn.execute("SELECT * FROM reminders WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)

    def list_journal_entries(self, user_id: int):
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC",
                (user_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_journal_entry(self, user_id: int, payload: dict):
        with self.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO journal_entries (user_id, entry_date, mood_label, gratitude, reflection)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload["entry_date"],
                    payload["mood_label"],
                    payload.get("gratitude", ""),
                    payload.get("reflection", ""),
                ),
            )
            row = conn.execute("SELECT * FROM journal_entries WHERE id = ?", (cur.lastrowid,)).fetchone()
            return dict(row)
