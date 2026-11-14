"""Shared FastAPI dependencies: authentication, authorization, pagination."""

from typing import Optional, Tuple

from fastapi import Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import AuthError, ForbiddenError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import UserRole, VerificationState
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def _user_from_credentials(db: Session, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials, "access")
    except ValueError:
        return None
    user = db.get(User, payload["sub"])
    if not user:
        return None
    return user


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = _user_from_credentials(db, credentials)
    if not user:
        raise AuthError("Please sign in to continue.")
    if not user.is_active:
        raise ForbiddenError("This account has been suspended.")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    user = _user_from_credentials(db, credentials)
    if user and user.is_active:
        return user
    return None


def require_verified(current: User = Depends(get_current_user)) -> User:
    if current.role == UserRole.admin:
        return current
    if current.verification_status != VerificationState.verified:
        raise ForbiddenError("Only verified students can do this. Submit your student verification first.")
    return current


def require_admin(current: User = Depends(get_current_user)) -> User:
    if current.role != UserRole.admin:
        raise ForbiddenError("Administrator access is required.")
    return current


def pagination(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=60),
) -> Tuple[int, int]:
    return page, page_size


def client_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
