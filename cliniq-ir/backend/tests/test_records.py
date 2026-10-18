import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest

from app.database import connection, initialize_database
from app.security import COOKIE_NAME
from tests.conftest import sign_in

PROTECTED = [
    "/api/catalog",
    "/api/patients",
    "/api/patients/P-1001",
    "/api/encounters/E-1001",
    "/api/records",
    "/api/records?q=headache",
    "/api/records/1",
    "/api/records/1/related",
]


@pytest.mark.parametrize("path", PROTECTED)
def test_every_record_operation_requires_authentication(client, path):
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("path", PROTECTED)
def test_receptionist_cannot_read_clinical_data(client, path):
    sign_in(client, "staff@cliniq.demo")
    assert client.get(path).status_code == 403


def test_real_counts_and_empty_categories(doctor):
    catalog = doctor.get("/api/catalog").json()
    assert catalog["counts"] == {"patients": 7, "encounters": 8, "records": 23}
    assert len(catalog["categories"]) == 6
    assert next(c for c in catalog["categories"] if c["id"] == "other")["count"] == 0
    assert sum(c["count"] for c in catalog["categories"]) == 23


def test_hierarchy_and_category_filters(doctor):
    patient = doctor.get("/api/patients/P-1001").json()
    assert [e["id"] for e in patient["encounters"]] == ["E-1001", "E-1002"]
    encounter = doctor.get("/api/encounters/E-1001").json()
    assert sum(c["count"] for c in encounter["categories"]) == 5
    records = doctor.get(
        "/api/records",
        params={
            "patient_id": "P-1001",
            "encounter_id": "E-1001",
            "category": "consultation",
        },
    ).json()
    assert records["total"] == 1
    assert records["items"][0]["id"] == 3
    assert doctor.get("/api/records?category=other").json()["total"] == 0
    assert doctor.get("/api/patients/P-1007").json()["encounters"] == []
    assert doctor.get("/api/records?encounter_id=E-1008").json()["total"] == 0


@pytest.mark.parametrize("query", ["headache", "  HeAdAcHe  ", "ＨＥＡＤＡＣＨＥ", "headach"])
def test_case_whitespace_unicode_and_prefix_normalization(doctor, query):
    result = doctor.get("/api/records", params={"q": query, "sort": "relevance"}).json()
    assert result["total"] == 4
    assert all(r["encounter_id"] == "E-1001" for r in result["items"])


@pytest.mark.parametrize(
    "query,expected",
    [
        ("E-1001", 5),
        ("Amina Rahman", 7),
        ("intake", 7),
        ("headache consultation", 2),
        ("platelets", 2),
        ("zznonexistentzz", 0),
        ("'; DROP TABLE records; --", 0),
        ('"* : ()', 0),
    ],
)
def test_keyword_metadata_and_safe_query_handling(doctor, query, expected):
    response = doctor.get("/api/records", params={"q": query})
    assert response.status_code == 200
    assert response.json()["total"] == expected


def test_search_category_filter_and_title_weighting(doctor):
    matches = doctor.get("/api/records?q=headache&sort=relevance").json()["items"]
    # History mentions headache in its body; other records have it in their titles.
    assert matches[0]["id"] != 1
    result = doctor.get("/api/records?q=headache&category=consultation").json()
    assert [r["id"] for r in result["items"]] == [3]


def test_pagination_sorting_and_no_overlap(doctor):
    first = doctor.get("/api/records?page=1&page_size=4&sort=oldest").json()
    second = doctor.get("/api/records?page=2&page_size=4&sort=oldest").json()
    assert first["total"] == second["total"] == 23
    assert not {r["id"] for r in first["items"]} & {r["id"] for r in second["items"]}
    dates = [r["created_at"] for r in first["items"] + second["items"]]
    assert dates == sorted(dates)
    titles = doctor.get("/api/records?sort=title&page_size=50").json()["items"]
    assert [r["title"].lower() for r in titles] == sorted(r["title"].lower() for r in titles)


def test_preview_and_related_relationships(doctor):
    record = doctor.get("/api/records/1").json()
    assert "Medical background" in record["content"]
    assert record["encounter"]["patient_id"] == record["patient_id"]
    related = doctor.get("/api/records/1/related").json()["items"]
    ids = [r["id"] for r in related]
    assert len(ids) == len(set(ids)) and 1 not in ids
    assert all(r["patient_id"] == "P-1001" for r in related)
    assert all(r["encounter_id"] == "E-1001" for r in related[:4])
    assert all(r["encounter_id"] == "E-1002" for r in related[4:])
    for item in related:
        assert doctor.get(f"/api/records/{item['id']}").json()["title"] == item["title"]


def test_second_clinic_and_empty_related_state(client):
    sign_in(client, "doctor@river.demo")
    assert client.get("/api/catalog").json()["counts"] == {
        "patients": 2,
        "encounters": 2,
        "records": 3,
    }
    assert client.get("/api/records?q=riverstone").json()["total"] == 2
    assert client.get("/api/records/26/related").json() == {"items": []}
    assert client.get("/api/records/1").status_code == 404


@pytest.mark.parametrize(
    "path",
    [
        "/api/patients/P-2001",
        "/api/encounters/E-2001",
        "/api/records/24",
        "/api/records/24/related",
        "/api/records?patient_id=P-2001",
        "/api/records?encounter_id=E-2001",
        "/api/records/99999",
        "/api/records?patient_id=P-1001&encounter_id=E-1003",
        "/api/records?category=invalid",
    ],
)
def test_inaccessible_ids_and_inconsistent_hierarchy_return_404(doctor, path):
    assert doctor.get(path).status_code == 404


def test_search_browse_and_relations_never_include_other_clinic(doctor):
    assert doctor.get("/api/records?q=riverstone").json()["total"] == 0
    assert doctor.get("/api/records?q=Daniyal").json()["total"] == 0
    assert doctor.get("/api/records?q=E-2001").json()["total"] == 0
    assert all(r["id"] < 24 for r in doctor.get("/api/records?page_size=50").json()["items"])
    assert all(p["clinic_id"] == "north" for p in doctor.get("/api/patients").json()["items"])
    for record_id in range(1, 24):
        related = doctor.get(f"/api/records/{record_id}/related").json()["items"]
        assert all(r["id"] < 24 for r in related)


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page_size=0",
        "page_size=51",
        "sort=invalid",
        "q=" + "a" * 201,
        "q=" + "+".join(["word"] * 13),
    ],
)
def test_invalid_queries_are_rejected(doctor, query):
    assert doctor.get("/api/records?" + query).status_code == 422


def test_login_logout_cookie_properties_and_no_cache(client):
    bad = client.post("/api/auth/login", json={"email": "missing@demo.test", "password": "bad"})
    assert bad.status_code == 401
    response = sign_in(client)
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie and "path=/api" in cookie
    assert client.get("/api/catalog").headers["cache-control"] == "no-store"
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/records").status_code == 401


def test_session_expiry_and_revocation(doctor, database_path):
    token = doctor.cookies.get(COOKIE_NAME)
    with connection(database_path) as db:
        assert db.execute("SELECT token_hash FROM sessions").fetchone()[0] != token
        db.execute("UPDATE sessions SET expires_at=0")
    assert doctor.get("/api/records").status_code == 401


def test_cross_origin_mutation_is_rejected(client):
    response = client.post(
        "/api/auth/login",
        headers={"Origin": "https://untrusted.example"},
        json={"email": "doctor@cliniq.demo", "password": "DemoClinic!2026"},
    )
    assert response.status_code == 403


def test_concurrent_clinical_reads_use_independent_request_connections(doctor):
    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(
            pool.map(
                doctor.get,
                ["/api/catalog", "/api/records", "/api/records/1", "/api/records/1/related"] * 3,
            )
        )
    assert all(response.status_code == 200 for response in responses)


def test_relational_constraints_seed_idempotence_and_fts_triggers(database_path):
    initialize_database(database_path)
    with connection(database_path) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
        assert db.execute("SELECT COUNT(*) FROM records").fetchone()[0] == 26
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("UPDATE records SET clinic_id='river' WHERE id=1")
        db.execute("UPDATE records SET title='Uniqueupdatedterm' WHERE id=1")
        assert (
            db.execute(
                "SELECT rowid FROM records_fts WHERE records_fts MATCH 'Uniqueupdatedterm'"
            ).fetchone()[0]
            == 1
        )
        db.execute("DELETE FROM records WHERE id=1")
        assert (
            db.execute(
                "SELECT rowid FROM records_fts WHERE records_fts MATCH 'Uniqueupdatedterm'"
            ).fetchone()
            is None
        )
