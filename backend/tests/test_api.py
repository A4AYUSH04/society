import pytest
from fastapi.testclient import TestClient
from app.models.models import Role, ComplaintCategory, User, Resident

def test_read_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]


def test_auth_registration_and_login(client: TestClient, db_session):
    # Ensure Roles are seeded in test db
    db_session.add(Role(name="Resident"))
    db_session.add(Role(name="Admin"))
    db_session.commit()

    # Register Resident
    register_payload = {
        "email": "resident@example.com",
        "password": "password123",
        "full_name": "John Doe",
        "flat_number": "101",
        "building_wing": "A Wing",
        "contact_number": "9876543210"
    }
    response = client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201
    assert response.json()["email"] == "resident@example.com"

    # Login Resident
    login_payload = {
        "email": "resident@example.com",
        "password": "password123"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["user"]["email"] == "resident@example.com"


def test_complaint_creation_requires_verified_profile(client: TestClient, db_session):
    # Seed roles and category
    res_role = Role(name="Resident")
    db_session.add(res_role)
    db_session.add(Role(name="Admin"))
    cat = ComplaintCategory(name="Plumbing", description="Plumbing issues", is_active=True)
    db_session.add(cat)
    db_session.commit()

    # Register
    register_payload = {
        "email": "resident2@example.com",
        "password": "password123",
        "full_name": "Jane Resident",
        "flat_number": "202",
        "building_wing": "B Wing",
        "contact_number": "9876543211"
    }
    client.post("/api/v1/auth/register", json=register_payload)

    # Login
    login_response = client.post("/api/v1/auth/login", json={
        "email": "resident2@example.com",
        "password": "password123"
    })
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Try raising complaint (should fail since resident is not verified yet)
    complaint_payload = {
        "title": "Water Pipe Leaking",
        "description": "The pipe under the bathroom sink is leaking.",
        "category_id": cat.id,
        "location": "Bathroom",
        "priority": "Medium"
    }
    response = client.post("/api/v1/complaints", json=complaint_payload, headers=headers)
    assert response.status_code == 400
    assert "verified" in response.json()["detail"]

    # Verify Resident in Database to test success path
    user = db_session.query(User).filter(User.email == "resident2@example.com").first()
    resident = db_session.query(Resident).filter(Resident.user_id == user.id).first()
    resident.is_verified = True
    db_session.commit()

    # Retry raising complaint (should succeed now)
    response = client.post("/api/v1/complaints", json=complaint_payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["title"] == "Water Pipe Leaking"
    assert response.json()["status"] == "Open"
