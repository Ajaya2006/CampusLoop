"""Authentication, profile and verification tests."""

from tests.conftest import auth_headers, create_user


def register_payload(**overrides):
    payload = {
        "full_name": "New Student",
        "email": "new.student@college.edu",
        "college": "IIT Delhi",
        "student_id_number": "2021CS7788",
        "department": "Computer Science",
        "course": "B.Tech CSE",
        "year": 3,
        "password": "Secret1234",
        "confirm_password": "Secret1234",
    }
    payload.update(overrides)
    return payload


def test_register_login_and_refresh(client):
    response = client.post("/api/v1/auth/register", json=register_payload())
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["access_token"] and body["refresh_token"]
    assert body["user"]["email"] == "new.student@college.edu"
    assert body["user"]["verification_status"] == "unsubmitted"
    assert "password" not in str(body).lower() or "hashed_password" not in body["user"]

    login = client.post("/api/v1/auth/login", json={"email": "new.student@college.edu", "password": "Secret1234"})
    assert login.status_code == 200

    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]


def test_duplicate_registration_rejected(client):
    payload = register_payload(email="duplicate.check@college.edu")
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    duplicate = client.post("/api/v1/auth/register", json=payload)
    assert duplicate.status_code == 409


def test_weak_password_and_mismatch_rejected(client):
    weak = client.post("/api/v1/auth/register", json=register_payload(email="weak@college.edu", password="abcdefgh", confirm_password="abcdefgh"))
    assert weak.status_code == 422
    mismatch = client.post("/api/v1/auth/register", json=register_payload(email="mismatch@college.edu", confirm_password="Different123"))
    assert mismatch.status_code == 422


def test_wrong_password_and_protected_route(client):
    client.post("/api/v1/auth/register", json=register_payload(email="authme@college.edu"))
    bad = client.post("/api/v1/auth/login", json={"email": "authme@college.edu", "password": "Wrong123"})
    assert bad.status_code == 401
    anonymous = client.get("/api/v1/users/me")
    assert anonymous.status_code == 401


def test_profile_update_and_seller_profile(client, db):
    user = create_user(db)
    headers = auth_headers(user)
    updated = client.patch("/api/v1/users/me", json={"bio": "Selling my old books.", "year": 4}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["bio"] == "Selling my old books."

    public = client.get(f"/api/v1/users/{user.id}")
    assert public.status_code == 200
    body = public.json()
    assert body["rating_average"] == 0
    assert "email" not in body
    assert "student_id_number" not in body


def test_verification_flow_approves_account(client, db, admin):
    student = create_user(db, verified=False)
    headers = auth_headers(student)

    blocked = client.post(
        "/api/v1/products",
        json={"title": "Blocked listing", "description": "Should not be allowed until verified.",
              "category_id": "missing", "price": 100},
        headers=headers,
    )
    assert blocked.status_code == 403

    submitted = client.post(
        "/api/v1/verifications/me",
        data={"college": "NIT Trichy", "student_id_number": "2020ME1122", "note": "ID card attached"},
        headers=headers,
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "pending"

    pending = client.get("/api/v1/admin/verifications?status=pending", headers=auth_headers(admin)).json()
    verification = next(item for item in pending["items"] if item["user_id"] == student.id)

    decision = client.post(
        f"/api/v1/admin/verifications/{verification['id']}/decision",
        json={"status": "verified", "review_note": "Student ID checked"},
        headers=auth_headers(admin),
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "verified"

    me = client.get("/api/v1/users/me", headers=headers).json()
    assert me["verification_status"] == "verified"


def test_student_cannot_reach_admin_endpoints(client, db):
    student = create_user(db)
    response = client.get("/api/v1/admin/stats", headers=auth_headers(student))
    assert response.status_code == 403


def test_forgot_and_reset_password(client, db):
    user = create_user(db, email="reset@college.edu")
    forgot = client.post("/api/v1/auth/forgot-password", json={"email": "reset@college.edu"})
    assert forgot.status_code == 200
    token = forgot.json()["reset_token"]
    assert token

    reset = client.post("/api/v1/auth/reset-password",
                        json={"token": token, "password": "NewSecret123", "confirm_password": "NewSecret123"})
    assert reset.status_code == 200
    login = client.post("/api/v1/auth/login", json={"email": "reset@college.edu", "password": "NewSecret123"})
    assert login.status_code == 200
    reuse = client.post("/api/v1/auth/reset-password",
                        json={"token": token, "password": "Another123", "confirm_password": "Another123"})
    assert reuse.status_code == 422
