"""
Test suite for lead management endpoints.
"""
from __future__ import annotations

import io

import pytest


# ---- Helpers ----

def _make_lead_form(
    first_name="Jane",
    last_name="Doe",
    email="jane@example.com",
    filename="resume.pdf",
    content=b"%PDF-1.4 test",
    content_type="application/pdf",
):
    return {
        "data": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
        },
        "files": {
            "resume": (filename, io.BytesIO(content), content_type),
        },
    }


def _post_lead(client, **kwargs):
    form = _make_lead_form(**kwargs)
    return client.post(
        "/api/leads",
        data=form["data"],
        files=form["files"],
    )


# ---- Create lead (public) ----

def test_create_lead_happy_path(client, fake_email):
    resp = _post_lead(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["state"] == "PENDING"
    assert body["first_name"] == "Jane"
    assert body["last_name"] == "Doe"
    assert body["email"] == "jane@example.com"
    assert body["resume_filename"] == "resume.pdf"
    assert "resume_storage_key" not in body
    # Two emails must have been queued
    assert len(fake_email.sent) == 2
    recipients = {m.to for m in fake_email.sent}
    assert "jane@example.com" in recipients
    # Attorney email (test attorney)
    assert any("attorney" in m.to for m in fake_email.sent)


def test_create_lead_file_stored(client, tmp_upload_dir):
    import os
    resp = _post_lead(client)
    assert resp.status_code == 201
    # At least one file should exist in upload dir
    files = os.listdir(tmp_upload_dir)
    assert len(files) >= 1


def test_create_lead_missing_field(client):
    # Missing last_name
    resp = client.post(
        "/api/leads",
        data={"first_name": "Jane", "email": "jane@example.com"},
        files={"resume": ("r.pdf", io.BytesIO(b"%PDF"), "application/pdf")},
    )
    assert resp.status_code == 422


def test_create_lead_bad_file_type(client):
    resp = _post_lead(client, filename="resume.exe", content_type="application/octet-stream")
    assert resp.status_code == 400
    assert "not allowed" in resp.json()["detail"].lower()


def test_create_lead_oversize_file(client):
    big = b"x" * (6 * 1024 * 1024)  # 6 MB > 5 MB limit
    resp = _post_lead(client, content=big)
    assert resp.status_code == 400
    assert "large" in resp.json()["detail"].lower()


# ---- Auth ----

def test_login_ok(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "attorney@test.com", "password": "testpass"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "attorney@test.com"


def test_login_bad_creds(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "attorney@test.com", "password": "wrongpass"},
    )
    assert resp.status_code == 401


def test_me_unauthorized(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code in (401, 403)  # FastAPI HTTPBearer returns 401 or 403


def test_me_with_auth(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "attorney@test.com"


# ---- List leads ----

def test_list_leads_requires_auth(client):
    resp = client.get("/api/leads")
    assert resp.status_code in (401, 403)


def test_list_leads_with_auth(client, auth_headers):
    # Create two leads first
    _post_lead(client, email="a@test.com")
    _post_lead(client, email="b@test.com")

    resp = client.get("/api/leads", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] >= 2
    assert len(body["items"]) >= 2


def test_list_leads_state_filter(client, auth_headers):
    _post_lead(client, email="c@test.com")
    resp = client.get("/api/leads?state=PENDING", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    for item in body["items"]:
        assert item["state"] == "PENDING"


def test_list_leads_search(client, auth_headers):
    _post_lead(client, first_name="Uniquefirstname", email="unique@test.com")
    resp = client.get("/api/leads?search=uniquefirstname", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    names = [i["first_name"] for i in body["items"]]
    assert any("Uniquefirstname" in n for n in names)


# ---- Patch state ----

def _create_lead_and_get_id(client):
    resp = _post_lead(client)
    assert resp.status_code == 201
    return resp.json()["id"]


def test_patch_pending_to_reached_out(client, auth_headers):
    lead_id = _create_lead_and_get_id(client)
    resp = client.patch(
        f"/api/leads/{lead_id}",
        json={"state": "REACHED_OUT"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["state"] == "REACHED_OUT"
    assert body["reached_out_at"] is not None


def test_patch_already_reached_out_returns_409(client, auth_headers):
    lead_id = _create_lead_and_get_id(client)
    # First patch
    resp = client.patch(
        f"/api/leads/{lead_id}",
        json={"state": "REACHED_OUT"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    # Second patch → 409
    resp2 = client.patch(
        f"/api/leads/{lead_id}",
        json={"state": "REACHED_OUT"},
        headers=auth_headers,
    )
    assert resp2.status_code == 409


def test_patch_unknown_id_returns_404(client, auth_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = client.patch(
        f"/api/leads/{fake_id}",
        json={"state": "REACHED_OUT"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---- Health ----

def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
