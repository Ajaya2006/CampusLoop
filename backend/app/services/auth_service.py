"""Authentication and account services."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AuthError, ConflictError, ForbiddenError, ValidationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.base import utcnow
from app.models.enums import UserRole, VerificationState
from app.models.user import User
from app.utils.datetime import as_utc


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.execute(select(User).where(func.lower(User.email) == email.lower())).scalar_one_or_none()


def get_user(db: Session, user_id: str) -> Optional[User]:
    return db.get(User, user_id)


def register_user(db: Session, payload) -> User:
    email = str(payload.email).lower()
    if get_user_by_email(db, email):
        raise ConflictError("An account with this email already exists. Try signing in instead.")

    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        hashed_password=hash_password(payload.password),
        role=UserRole.student,
        college=payload.college.strip(),
        student_id_number=payload.student_id_number.strip(),
        department=(payload.department or "").strip() or None,
        course=(payload.course or "").strip() or None,
        year=payload.year,
        verification_status=VerificationState.unsubmitted,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("An account with this email already exists.")
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise AuthError("Incorrect email or password.")
    if not user.is_active:
        raise ForbiddenError("This account has been suspended. Contact the CampusLoop team.")
    user.last_login_at = utcnow()
    db.commit()
    db.refresh(user)
    return user


def issue_tokens(user: User) -> dict:
    return {
        "access_token": create_access_token(user.id, user.role.value),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user,
    }


def refresh_session(db: Session, refresh_token: str) -> dict:
    try:
        payload = decode_token(refresh_token, "refresh")
    except ValueError:
        raise AuthError("Your session has expired. Please sign in again.")
    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise AuthError("Your session is no longer valid. Please sign in again.")
    return issue_tokens(user)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_password_reset(db: Session, email: str) -> Optional[str]:
    """Create a single-use reset token. Returns None when the email is unknown.

    The API intentionally returns the same response for unknown emails so it
    does not reveal which addresses are registered.
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    token = secrets.token_urlsafe(32)
    user.password_reset_token_hash = _hash_reset_token(token)
    user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.commit()
    return token


def reset_password(db: Session, token: str, new_password: str) -> None:
    hashed = _hash_reset_token(token)
    user = db.execute(
        select(User).where(User.password_reset_token_hash == hashed)
    ).scalar_one_or_none()
    if not user:
        raise ValidationError("This reset link is invalid or has already been used.")
    expires = as_utc(user.password_reset_expires_at)
    if not expires or expires < datetime.now(timezone.utc):
        raise ValidationError("This reset link has expired. Request a new one.")
    user.hashed_password = hash_password(new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise ValidationError("Your current password is incorrect.", [{"field": "current_password", "message": "Incorrect password"}])
    user.hashed_password = hash_password(new_password)
    db.commit()


def update_last_login(db: Session, user: User) -> None:
    user.last_login_at = utcnow()
    db.commit()
