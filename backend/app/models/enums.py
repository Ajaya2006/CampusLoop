"""Shared enumerations used by models, schemas and services."""

import enum

from sqlalchemy import Enum as SAEnum


class UserRole(str, enum.Enum):
    student = "student"
    admin = "admin"


class VerificationState(str, enum.Enum):
    unsubmitted = "unsubmitted"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class ProductCondition(str, enum.Enum):
    new = "new"
    like_new = "like_new"
    good = "good"
    fair = "fair"
    used = "used"


class ProductStatus(str, enum.Enum):
    draft = "draft"
    pending_verification = "pending_verification"
    approved = "approved"
    rejected = "rejected"
    available = "available"
    reserved = "reserved"
    sold = "sold"
    removed = "removed"


PUBLIC_LISTING_STATUSES = (
    ProductStatus.approved,
    ProductStatus.available,
)


class OfferStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    countered = "countered"
    cancelled = "cancelled"
    expired = "expired"


class MeetingStatus(str, enum.Enum):
    proposed = "proposed"
    confirmed = "confirmed"
    rescheduled = "rescheduled"
    cancelled = "cancelled"
    completed = "completed"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    meeting_scheduled = "meeting_scheduled"
    completion_requested = "completion_requested"
    completed = "completed"
    cancelled = "cancelled"


class ReportStatus(str, enum.Enum):
    pending = "pending"
    under_review = "under_review"
    resolved = "resolved"
    rejected = "rejected"


class ReportTargetType(str, enum.Enum):
    product = "product"
    user = "user"


class MessageType(str, enum.Enum):
    text = "text"
    offer = "offer"
    system = "system"


def enum_type(enum_cls) -> SAEnum:
    """Portable string-backed enum column (no native PG enum types)."""
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=32,
        values_callable=lambda members: [m.value for m in members],
        validate_strings=True,
    )
