"""Authentication request/response schemas."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    college: str = Field(min_length=2, max_length=180)
    student_id_number: str = Field(min_length=3, max_length=80)
    department: Optional[str] = Field(default=None, max_length=120)
    course: Optional[str] = Field(default=None, max_length=120)
    year: Optional[int] = Field(default=None, ge=1, le=8)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name", "college", "student_id_number")
    @classmethod
    def _strip(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty")
        return cleaned

    @field_validator("password")
    @classmethod
    def _password_strength(cls, value: str) -> str:
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one letter and one number")
        return value

    @field_validator("confirm_password")
    @classmethod
    def _passwords_match(cls, value: str, info):
        if info.data.get("password") and value != info.data["password"]:
            raise ValueError("Passwords do not match")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # Local/demo deployments have no mail provider, so the token is returned
    # only when explicitly enabled by the server. It is never emailed silently.
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def _password_strength(cls, value: str) -> str:
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one letter and one number")
        return value

    @field_validator("confirm_password")
    @classmethod
    def _match(cls, value: str, info):
        if info.data.get("password") and value != info.data["password"]:
            raise ValueError("Passwords do not match")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserSelf"


from app.schemas.user import UserSelf  # noqa: E402  (avoids a circular import)
