"""User, profile and student-verification schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole, VerificationState


class UserBrief(BaseModel):
    """Public seller card data. Never contains private identifiers."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    college: str
    department: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    avatar_url: Optional[str] = None
    verification_status: VerificationState
    bio: Optional[str] = None
    created_at: datetime


class SellerProfile(UserBrief):
    rating_average: float = 0.0
    review_count: int = 0
    completed_transactions: int = 0
    active_listings: int = 0


class UserSelf(UserBrief):
    email: EmailStr
    role: UserRole
    phone: Optional[str] = None
    verification_note: Optional[str] = None
    is_active: bool = True
    last_login_at: Optional[datetime] = None


class UserAdmin(UserSelf):
    student_id_number: str
    listings_count: int = 0
    reports_against: int = 0


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    college: Optional[str] = Field(default=None, min_length=2, max_length=180)
    department: Optional[str] = Field(default=None, max_length=120)
    course: Optional[str] = Field(default=None, max_length=120)
    year: Optional[int] = Field(default=None, ge=1, le=8)
    phone: Optional[str] = Field(default=None, max_length=30)
    bio: Optional[str] = Field(default=None, max_length=1000)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class VerificationSubmit(BaseModel):
    college: Optional[str] = Field(default=None, max_length=180)
    student_id_number: Optional[str] = Field(default=None, max_length=80)
    department: Optional[str] = Field(default=None, max_length=120)
    course: Optional[str] = Field(default=None, max_length=120)
    year: Optional[int] = Field(default=None, ge=1, le=8)
    note: Optional[str] = Field(default=None, max_length=1000)


class VerificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    college: str
    student_id_number: str
    department: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = None
    note: Optional[str] = None
    document_name: Optional[str] = None
    has_document: bool = False
    status: VerificationState
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    student: Optional[UserBrief] = None


class VerificationDecision(BaseModel):
    status: VerificationState
    review_note: Optional[str] = Field(default=None, max_length=1000)


class UserStatusUpdate(BaseModel):
    is_active: bool
    reason: Optional[str] = Field(default=None, max_length=500)


class VerificationStatusOut(BaseModel):
    status: VerificationState
    note: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
