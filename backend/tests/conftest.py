"""Pytest fixtures: isolated SQLite database, API client and account factories."""

import os
import pathlib

TEST_DB = pathlib.Path(__file__).resolve().parent / "test_campusloop.db"
TEST_UPLOADS = pathlib.Path(__file__).resolve().parent / "test_uploads"

os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["AUTO_APPROVE_LISTINGS"] = "false"
os.environ["UPLOAD_DIR"] = TEST_UPLOADS.as_posix()

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.seed import bootstrap_categories  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.catalog import Category  # noqa: E402
from app.models.enums import UserRole, VerificationState  # noqa: E402
from app.models.user import User  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    if TEST_DB.exists():
        TEST_DB.unlink()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap_categories(db)
    finally:
        db.close()
    yield
    engine.dispose()
    if TEST_DB.exists():
        TEST_DB.unlink()


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


_counter = {"n": 0}


def _unique(prefix: str) -> str:
    _counter["n"] += 1
    return f"{prefix}{_counter['n']}@student.edu"


def create_user(
    db,
    *,
    verified: bool = True,
    role: UserRole = UserRole.student,
    email: str | None = None,
    college: str = "IIT Delhi",
    password: str = "Password123",
) -> User:
    user = User(
        full_name=f"Student {_counter['n'] + 1}",
        email=email or _unique("student"),
        hashed_password=hash_password(password),
        role=role,
        college=college,
        student_id_number=f"ID{_counter['n']}",
        verification_status=VerificationState.verified if verified else VerificationState.unsubmitted,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


@pytest.fixture()
def student(db):
    return create_user(db)


@pytest.fixture()
def other_student(db):
    return create_user(db)


@pytest.fixture()
def unverified_student(db):
    return create_user(db, verified=False)


@pytest.fixture()
def admin(db):
    return create_user(db, role=UserRole.admin)


@pytest.fixture()
def category(db) -> Category:
    return db.execute(select(Category).where(Category.slug == "laptops")).scalar_one()


def create_product(client, user, category, **overrides):
    payload = {
        "title": "Test laptop for sale",
        "description": "A reliable laptop used for one semester of coursework.",
        "category_id": category.id,
        "price": 25000,
        "original_price": 48000,
        "condition": "good",
        "brand": "Dell",
        "location": "IIT Delhi",
        "age_months": 12,
        "image_urls": [],
    }
    payload.update(overrides)
    return client.post("/api/v1/products", json=payload, headers=auth_headers(user))
