"""User, student verification and admin audit log models."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import (
    UserRole,
    VerificationState,
    enum_type,
)


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        enum_type(UserRole), default=UserRole.student, nullable=False, index=True
    )

    college: Mapped[str] = mapped_column(String(180), nullable=False)
    student_id_number: Mapped[str] = mapped_column(String(80), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(120))
    course: Mapped[Optional[str]] = mapped_column(String(120))
    year: Mapped[Optional[int]] = mapped_column()
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))

    verification_status: Mapped[VerificationState] = mapped_column(
        enum_type(VerificationState), default=VerificationState.unsubmitted, nullable=False, index=True
    )
    verification_note: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    password_reset_token_hash: Mapped[Optional[str]] = mapped_column(String(128))
    password_reset_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    verifications: Mapped[List["StudentVerification"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="StudentVerification.created_at.desc()",
        foreign_keys="StudentVerification.user_id",
    )
    products: Mapped[List["Product"]] = relationship(  # noqa: F821
        back_populates="seller", foreign_keys="Product.seller_id"
    )

    __table_args__ = (Index("ix_users_college", "college"),)

    @property
    def is_verified(self) -> bool:
        return self.verification_status == VerificationState.verified


class StudentVerification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "student_verifications"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    college: Mapped[str] = mapped_column(String(180), nullable=False)
    student_id_number: Mapped[str] = mapped_column(String(80), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(120))
    course: Mapped[Optional[str]] = mapped_column(String(120))
    year: Mapped[Optional[int]] = mapped_column()
    note: Mapped[Optional[str]] = mapped_column(Text)
    # Private, never exposed through a public URL. Served only to the owner/admin.
    document_path: Mapped[Optional[str]] = mapped_column(String(500))
    document_name: Mapped[Optional[str]] = mapped_column(String(255))

    status: Mapped[VerificationState] = mapped_column(
        enum_type(VerificationState), default=VerificationState.pending, nullable=False, index=True
    )
    reviewer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    review_note: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(
        back_populates="verifications", foreign_keys=[user_id]
    )


class AdminAuditLog(Base, UUIDMixin):
    __tablename__ = "admin_audit_logs"

    admin_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36))
    detail: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
