import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .security import hash_password

BACKEND_DIR = Path(__file__).resolve().parent.parent


@contextmanager
def connection(path: Path):
    # FastAPI may resume one synchronous request on multiple worker threads.
    # Each request owns its connection; connections are never shared across requests.
    db = sqlite3.connect(path, timeout=10, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize_database(path: Path) -> None:
    """Create and seed once. Restarting never overwrites the database."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with connection(path) as db:
        db.executescript((BACKEND_DIR / "app" / "schema.sql").read_text(encoding="utf-8"))
        if db.execute("SELECT COUNT(*) FROM clinics").fetchone()[0]:
            return
        seed = json.loads((BACKEND_DIR / "data" / "demo.json").read_text(encoding="utf-8"))
        for clinic in seed["clinics"]:
            db.execute("INSERT INTO clinics VALUES (:id, :name)", clinic)
        for user in seed["users"]:
            db.execute(
                "INSERT INTO users VALUES (:id, :clinic_id, :email, :name, :role, :password_hash)",
                {**user, "password_hash": hash_password(seed["demo_password"])},
            )
        for patient in seed["patients"]:
            db.execute(
                "INSERT INTO patients VALUES (:id, :clinic_id, :name, :birth_year, :sex)", patient
            )
        for encounter in seed["encounters"]:
            db.execute(
                "INSERT INTO encounters VALUES (:id, :patient_id, :clinic_id, :occurred_at, "
                ":reason, :clinician, :status)",
                encounter,
            )
        for category in seed["categories"]:
            db.execute(
                "INSERT INTO categories VALUES (:id, :name, :description, :position)", category
            )
        for record in seed["records"]:
            patient = next(p for p in seed["patients"] if p["id"] == record["patient_id"])
            category = next(c for c in seed["categories"] if c["id"] == record["category_id"])
            metadata = " ".join(
                [
                    patient["name"],
                    patient["id"],
                    record["encounter_id"],
                    category["name"],
                    category["id"],
                ]
            )
            db.execute(
                "INSERT INTO records VALUES (:id, :patient_id, :encounter_id, :clinic_id, "
                ":category_id, :title, :created_at, :content, :search_metadata)",
                {**record, "search_metadata": metadata},
            )
