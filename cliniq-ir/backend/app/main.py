import os
import secrets
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .database import BACKEND_DIR, connection, initialize_database
from .retrieval import (
    category_counts,
    get_record,
    list_records,
    related_records,
    require_encounter,
    require_patient,
)
from .security import COOKIE_NAME, SESSION_SECONDS, hash_password, token_hash, verify_password


class LoginInput(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=1, max_length=200)


def create_app(db_path: Path | None = None) -> FastAPI:
    path = db_path or Path(
        os.environ.get(
            "CLINIQ_DB_PATH",
            BACKEND_DIR / "data" / "cliniq.sqlite3",
        )
    )
    allowed_origins = set(
        os.environ.get(
            "CLINIQ_ALLOWED_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000",
        ).split(",")
    )
    secure_cookie = os.environ.get("CLINIQ_SECURE_COOKIE", "0") == "1"
    # Equal-cost verification prevents the missing-user path skipping password work.
    dummy_password = hash_password(secrets.token_urlsafe(24))

    @asynccontextmanager
    async def lifespan(_app):
        initialize_database(path)
        yield

    app = FastAPI(title="ClinIQ Records Explorer", version="1.0.0", lifespan=lifespan)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            origin = request.headers.get("origin")
            if origin and origin not in allowed_origins:
                return JSONResponse({"detail": "Request origin not allowed."}, status_code=403)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    def get_db():
        with connection(path) as db:
            yield db

    def current_user(request: Request, db=Depends(get_db)) -> dict:
        token = request.cookies.get(COOKIE_NAME)
        row = db.execute(
            "SELECT u.id, u.email, u.name, u.role, u.clinic_id, c.name AS clinic_name "
            "FROM sessions s JOIN users u ON u.id=s.user_id "
            "JOIN clinics c ON c.id=u.clinic_id WHERE s.token_hash=? AND s.expires_at>?",
            (token_hash(token or ""), int(time.time())),
        ).fetchone()
        if not row:
            raise HTTPException(401, "Please sign in to continue.")
        return dict(row)

    def clinician(user=Depends(current_user)) -> dict:
        if user["role"] != "doctor":
            raise HTTPException(403, "Clinical records are available to doctors only.")
        return user

    @app.get("/api/health")
    def health():
        return {"status": "ok", "dataset": "fictional-development-only"}

    @app.post("/api/auth/login")
    def login(payload: LoginInput, response: Response, db=Depends(get_db)):
        user = db.execute(
            "SELECT * FROM users WHERE email = ?", (payload.email.strip().casefold(),)
        ).fetchone()
        valid = verify_password(payload.password, user["password_hash"] if user else dummy_password)
        if not user or not valid:
            raise HTTPException(401, "Email or password is incorrect.")
        token = secrets.token_urlsafe(32)
        now = int(time.time())
        db.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
        db.execute(
            "INSERT INTO sessions VALUES (?, ?, ?)",
            (
                token_hash(token),
                user["id"],
                now + SESSION_SECONDS,
            ),
        )
        response.set_cookie(
            COOKIE_NAME,
            token,
            httponly=True,
            secure=secure_cookie,
            samesite="strict",
            max_age=SESSION_SECONDS,
            path="/api",
        )
        return {"message": "Signed in."}

    @app.get("/api/auth/me")
    def me(user=Depends(current_user)):
        return user

    @app.post("/api/auth/logout", status_code=204)
    def logout(request: Request, response: Response, db=Depends(get_db)):
        db.execute(
            "DELETE FROM sessions WHERE token_hash=?",
            (token_hash(request.cookies.get(COOKIE_NAME, "")),),
        )
        response.delete_cookie(COOKIE_NAME, path="/api", samesite="strict")

    @app.get("/api/catalog")
    def catalog(user=Depends(clinician), db=Depends(get_db)):
        clinic_id = user["clinic_id"]
        counts = {}
        for table in ("patients", "encounters", "records"):
            counts[table] = db.execute(
                f"SELECT COUNT(*) FROM {table} WHERE clinic_id=?", (clinic_id,)
            ).fetchone()[0]
        return {"counts": counts, "categories": category_counts(db, clinic_id)}

    @app.get("/api/patients")
    def patients(
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=50)] = 12,
        user=Depends(clinician),
        db=Depends(get_db),
    ):
        total = db.execute(
            "SELECT COUNT(*) FROM patients WHERE clinic_id=?", (user["clinic_id"],)
        ).fetchone()[0]
        rows = db.execute(
            "SELECT p.*, (SELECT COUNT(*) FROM encounters e WHERE e.patient_id=p.id "
            "AND e.clinic_id=p.clinic_id) AS encounter_count, "
            "(SELECT MAX(occurred_at) FROM encounters e WHERE e.patient_id=p.id "
            "AND e.clinic_id=p.clinic_id) AS last_encounter "
            "FROM patients p WHERE p.clinic_id=? ORDER BY p.name LIMIT ? OFFSET ?",
            (user["clinic_id"], page_size, (page - 1) * page_size),
        ).fetchall()
        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    @app.get("/api/patients/{patient_id}")
    def patient(patient_id: str, user=Depends(clinician), db=Depends(get_db)):
        result = require_patient(db, user["clinic_id"], patient_id)
        rows = db.execute(
            "SELECT e.*, (SELECT COUNT(*) FROM records r WHERE r.encounter_id=e.id "
            "AND r.clinic_id=e.clinic_id) AS record_count FROM encounters e "
            "WHERE e.patient_id=? AND e.clinic_id=? ORDER BY occurred_at DESC, e.id",
            (patient_id, user["clinic_id"]),
        ).fetchall()
        result["encounters"] = [dict(row) for row in rows]
        return result

    @app.get("/api/encounters/{encounter_id}")
    def encounter(encounter_id: str, user=Depends(clinician), db=Depends(get_db)):
        result = require_encounter(db, user["clinic_id"], encounter_id)
        result["categories"] = category_counts(db, user["clinic_id"], encounter_id)
        return result

    @app.get("/api/records")
    def records(
        q: Annotated[str, Query(max_length=200)] = "",
        category: str | None = None,
        patient_id: str | None = None,
        encounter_id: str | None = None,
        sort: Literal["newest", "oldest", "title", "relevance"] = "newest",
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=50)] = 8,
        user=Depends(clinician),
        db=Depends(get_db),
    ):
        return list_records(
            db, user["clinic_id"], q, category, patient_id, encounter_id, sort, page, page_size
        )

    @app.get("/api/records/{record_id}/related")
    def related(record_id: int, user=Depends(clinician), db=Depends(get_db)):
        return {"items": related_records(db, user["clinic_id"], record_id)}

    @app.get("/api/records/{record_id}")
    def record(record_id: int, user=Depends(clinician), db=Depends(get_db)):
        return get_record(db, user["clinic_id"], record_id)

    return app


app = create_app()
