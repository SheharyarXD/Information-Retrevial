"""Tenant-scoped flat browsing, FTS5 keyword retrieval, and relationship traversal."""

import re
import sqlite3
import unicodedata

from fastapi import HTTPException

RECORD_SELECT = """
SELECT r.id, r.title, r.category_id, c.name AS category_name,
       r.patient_id, p.name AS patient_name, r.encounter_id,
       r.created_at, substr(r.content, 1, 190) AS excerpt
FROM records r
JOIN patients p ON p.id = r.patient_id AND p.clinic_id = r.clinic_id
JOIN categories c ON c.id = r.category_id
"""


def require_patient(db: sqlite3.Connection, clinic_id: str, patient_id: str) -> dict:
    row = db.execute(
        "SELECT * FROM patients WHERE id = ? AND clinic_id = ?", (patient_id, clinic_id)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Patient unavailable.")
    return dict(row)


def require_encounter(db: sqlite3.Connection, clinic_id: str, encounter_id: str) -> dict:
    row = db.execute(
        "SELECT e.*, p.name AS patient_name FROM encounters e "
        "JOIN patients p ON p.id=e.patient_id AND p.clinic_id=e.clinic_id "
        "WHERE e.id = ? AND e.clinic_id = ?",
        (encounter_id, clinic_id),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Encounter unavailable.")
    return dict(row)


def get_record(db: sqlite3.Connection, clinic_id: str, record_id: int) -> dict:
    row = db.execute(
        RECORD_SELECT + " WHERE r.id = ? AND r.clinic_id = ?", (record_id, clinic_id)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Record unavailable.")
    record = dict(row)
    record["content"] = db.execute(
        "SELECT content FROM records WHERE id = ? AND clinic_id = ?", (record_id, clinic_id)
    ).fetchone()[0]
    record["encounter"] = require_encounter(db, clinic_id, record["encounter_id"])
    return record


def normalize_query(query: str) -> tuple[str, str]:
    normalized = " ".join(unicodedata.normalize("NFKC", query).casefold().split())
    words = re.findall(r"[^\W_]+(?:-[^\W_]+)*", normalized, flags=re.UNICODE)
    if len(words) > 12:
        raise HTTPException(422, "Use up to 12 search words.")
    # Only quoted word-prefix terms reach MATCH. Operators and punctuation are never executed.
    # Keep hyphenated identifiers as phrases: E-1001 must not match a P-1001
    # record from a different encounter just because both contain token 1001.
    expression = " AND ".join(
        f'"{word}"' if re.fullmatch(r"[ep]-\d+", word) else f'"{word}"*' for word in words
    )
    return normalized, expression


def list_records(
    db: sqlite3.Connection,
    clinic_id: str,
    query: str = "",
    category: str | None = None,
    patient_id: str | None = None,
    encounter_id: str | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 8,
) -> dict:
    normalized, expression = normalize_query(query)
    if patient_id:
        require_patient(db, clinic_id, patient_id)
    if encounter_id:
        encounter = require_encounter(db, clinic_id, encounter_id)
        if patient_id and encounter["patient_id"] != patient_id:
            raise HTTPException(404, "Encounter unavailable for this patient.")
    if category and not db.execute("SELECT 1 FROM categories WHERE id = ?", (category,)).fetchone():
        raise HTTPException(404, "Category unavailable.")
    joins = " JOIN records_fts ON records_fts.rowid = r.id" if expression else ""
    clauses, params = ["r.clinic_id = ?"], [clinic_id]
    if expression:
        clauses.append("records_fts MATCH ?")
        params.append(expression)
    elif normalized:
        # A punctuation-only query has no searchable words; never return the whole collection.
        clauses.append("0 = 1")
    for field, value in [
        ("category_id", category),
        ("patient_id", patient_id),
        ("encounter_id", encounter_id),
    ]:
        if value:
            clauses.append(f"r.{field} = ?")
            params.append(value)
    where = " WHERE " + " AND ".join(clauses)
    count = db.execute("SELECT COUNT(*) FROM records r" + joins + where, params).fetchone()[0]
    orders = {
        "newest": "r.created_at DESC, r.id DESC",
        "oldest": "r.created_at ASC, r.id ASC",
        "title": "r.title COLLATE NOCASE, r.id",
        "relevance": "bm25(records_fts, 5.0, 1.0, 2.0), r.created_at DESC, r.id",
    }
    order = orders[sort if sort != "relevance" or expression else "newest"]
    rows = db.execute(
        RECORD_SELECT + joins + where + " ORDER BY " + order + " LIMIT ? OFFSET ?",
        [*params, page_size, (page - 1) * page_size],
    ).fetchall()
    return {
        "items": [dict(row) for row in rows],
        "total": count,
        "page": page,
        "page_size": page_size,
        "query": normalized,
    }


def related_records(db: sqlite3.Connection, clinic_id: str, record_id: int) -> list[dict]:
    current = get_record(db, clinic_id, record_id)
    rows = db.execute(
        RECORD_SELECT + " WHERE r.clinic_id = ? AND r.patient_id = ? AND r.id != ? "
        "ORDER BY (r.encounter_id = ?) DESC, r.created_at DESC, r.id DESC LIMIT 6",
        (clinic_id, current["patient_id"], record_id, current["encounter_id"]),
    ).fetchall()
    return [
        {
            **dict(row),
            "relationship": (
                "Same encounter"
                if row["encounter_id"] == current["encounter_id"]
                else "Same patient · another encounter"
            ),
        }
        for row in rows
    ]


def category_counts(
    db: sqlite3.Connection,
    clinic_id: str,
    encounter_id: str | None = None,
) -> list[dict]:
    clause = " AND r.encounter_id = ?" if encounter_id else ""
    params = (clinic_id, encounter_id) if encounter_id else (clinic_id,)
    rows = db.execute(
        "SELECT c.id, c.name, c.description, COUNT(r.id) AS count FROM categories c "
        "LEFT JOIN records r ON r.category_id = c.id AND r.clinic_id = ?"
        + clause
        + " GROUP BY c.id ORDER BY c.position",
        params,
    ).fetchall()
    return [dict(row) for row in rows]
