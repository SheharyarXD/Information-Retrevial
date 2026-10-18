import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database import initialize_database
from app.main import create_app


@pytest.fixture(scope="session")
def seeded_database(tmp_path_factory):
    path = tmp_path_factory.mktemp("seed") / "test.sqlite3"
    initialize_database(path)
    return path


@pytest.fixture
def database_path(tmp_path: Path, seeded_database: Path):
    path = tmp_path / "test.sqlite3"
    shutil.copyfile(seeded_database, path)
    return path


@pytest.fixture
def client(database_path):
    with TestClient(create_app(database_path)) as test_client:
        yield test_client


def sign_in(client, email="doctor@cliniq.demo"):
    response = client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": "DemoClinic!2026",
        },
    )
    assert response.status_code == 200
    return response


@pytest.fixture
def doctor(client):
    sign_in(client)
    return client
