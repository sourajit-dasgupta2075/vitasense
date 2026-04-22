from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
STATIC_DIR = ROOT_DIR / "static"
DB_PATH = DATA_DIR / "vitasense.db"
HOST = "127.0.0.1"
PORT = 8080
SESSION_COOKIE = "vitasense_session"
