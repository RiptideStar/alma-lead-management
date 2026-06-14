"""
Test configuration.

Uses an in-memory SQLite database with StaticPool so all connections share
the same database. Tables are created once per session.
Each test gets a fresh session. No rollback magic — tests are responsible for
uniqueness or they can run in isolation.

Provides a capturing FakeEmailBackend to assert emails produced on lead creation.
"""
from __future__ import annotations

import os
from typing import List
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models.base import Base
from app.models.lead import Lead  # noqa: F401 — must be imported before create_all
from app.models.user import User
from app.services.email.base import EmailBackend, EmailMessage
from app.services.email.factory import get_email_backend
from app.services.storage.factory import get_storage
from app.services.storage.local import LocalStorageBackend


# ---- Fake email backend ----

class FakeEmailBackend(EmailBackend):
    def __init__(self):
        self.sent: List[EmailMessage] = []

    def send(self, message: EmailMessage) -> None:
        self.sent.append(message)


# ---- Single shared in-memory SQLite engine ----

SQLITE_URL = "sqlite://"

_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(bind=_engine)

_SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture()
def db() -> Session:
    """Give each test a fresh session. Commit is allowed; tests see each other's
    data only if they share the same session scope, but since we use StaticPool
    all connections share the same DB. Data accumulates across tests within a
    session — this is fine since our tests don't depend on a clean slate and use
    unique identifiers where needed."""
    session = _SessionFactory()
    yield session
    session.close()


@pytest.fixture()
def fake_email() -> FakeEmailBackend:
    return FakeEmailBackend()


@pytest.fixture()
def tmp_upload_dir(tmp_path):
    d = tmp_path / "uploads"
    d.mkdir()
    return str(d)


@pytest.fixture()
def test_settings(tmp_upload_dir) -> Settings:
    return Settings(
        DATABASE_URL=SQLITE_URL,
        JWT_SECRET="test-secret",
        JWT_EXPIRE_MINUTES=60,
        ATTORNEY_EMAIL="attorney@test.com",
        ATTORNEY_PASSWORD="testpass",
        ATTORNEY_NAME="Test Attorney",
        EMAIL_BACKEND="console",
        STORAGE_BACKEND="local",
        UPLOAD_DIR=tmp_upload_dir,
        MAX_UPLOAD_SIZE_MB=5,
        ALLOWED_ORIGINS="http://localhost:3000",
        INTERNAL_APP_URL="http://localhost:3000/admin/leads",
    )


@pytest.fixture()
def client(db, fake_email, tmp_upload_dir, test_settings):
    """
    TestClient with:
    - In-memory SQLite via get_db override (same StaticPool engine → same DB).
    - FakeEmailBackend replacing get_email_backend in the leads route module.
    - LocalStorageBackend in tmp dir replacing get_storage in the leads route.
    - get_settings patched so that the lifespan also sees test config.
    """
    from app.main import app
    from app.core import database as db_module
    import app.api.routes.leads as leads_routes
    from app import seed as seed_module

    storage = LocalStorageBackend(tmp_upload_dir)

    # Override get_db FastAPI dependency
    def override_db():
        s = _SessionFactory()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_db

    # Monkey-patch route-level factory calls (not FastAPI deps, called directly)
    _orig_get_email = leads_routes.get_email_backend
    _orig_get_storage = leads_routes.get_storage
    leads_routes.get_email_backend = lambda: fake_email
    leads_routes.get_storage = lambda: storage

    # Clear lru_cache
    get_settings.cache_clear()
    get_email_backend.cache_clear()
    get_storage.cache_clear()

    # Seed test attorney (idempotent)
    existing = db.query(User).filter(User.email == test_settings.ATTORNEY_EMAIL).first()
    if not existing:
        user = User(
            email=test_settings.ATTORNEY_EMAIL,
            name=test_settings.ATTORNEY_NAME,
            hashed_password=hash_password(test_settings.ATTORNEY_PASSWORD),
            is_active=True,
        )
        db.add(user)
        db.commit()

    # Patch get_settings and db init so lifespan doesn't try postgres
    def patched_init_engine(url=None):
        return _engine

    def patched_seed(sess, settings=None):
        pass  # Already seeded above

    with (
        patch("app.core.config.get_settings", return_value=test_settings),
        patch("app.main.get_settings", return_value=test_settings),
        patch.object(db_module, "init_engine", patched_init_engine),
        patch.object(seed_module, "seed", patched_seed),
    ):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c

    # Restore
    leads_routes.get_email_backend = _orig_get_email
    leads_routes.get_storage = _orig_get_storage
    app.dependency_overrides.clear()
    get_settings.cache_clear()
    get_email_backend.cache_clear()
    get_storage.cache_clear()


@pytest.fixture()
def auth_headers(client):
    """Authorization Bearer headers for the test attorney."""
    resp = client.post(
        "/api/auth/login",
        json={"email": "attorney@test.com", "password": "testpass"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def sample_pdf():
    content = b"%PDF-1.4 minimal test file"
    return "resume.pdf", content, "application/pdf"
