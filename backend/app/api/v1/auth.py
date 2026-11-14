"""Registration, login, token refresh and password recovery."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.errors import ValidationError
from app.core.rate_limit import forgot_limiter, login_limiter, register_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.common import MessageOut
from app.schemas.user import UserSelf
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(register_limiter)])
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, payload)
    tokens = auth_service.issue_tokens(user)
    tokens["user"] = UserSelf.model_validate(user)
    return tokens


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(login_limiter)])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, str(payload.email), payload.password)
    tokens = auth_service.issue_tokens(user)
    tokens["user"] = UserSelf.model_validate(user)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    tokens = auth_service.refresh_session(db, payload.refresh_token)
    tokens["user"] = UserSelf.model_validate(tokens["user"])
    return tokens


@router.post("/logout", response_model=MessageOut)
def logout(_: User = Depends(get_current_user)):
    # JWTs are stateless; the client discards both tokens. Documented in the API guide.
    return {"message": "Signed out."}


@router.post("/forgot-password", response_model=ForgotPasswordResponse,
             dependencies=[Depends(forgot_limiter)])
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    token = auth_service.create_password_reset(db, str(payload.email))
    return {
        "message": "If an account exists for that email, a reset link has been created.",
        "reset_token": token if settings.ENVIRONMENT != "production" else None,
    }


@router.post("/reset-password", response_model=MessageOut)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise ValidationError("Passwords do not match.")
    auth_service.reset_password(db, payload.token, payload.password)
    return {"message": "Password updated. You can sign in with your new password."}


@router.post("/change-password", response_model=MessageOut)
def change_password(payload: ChangePasswordRequest, current: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    auth_service.change_password(db, current, payload.current_password, payload.new_password)
    return {"message": "Password changed."}
