"""Review, report and notification models."""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin
from app.models.enums import ReportStatus, ReportTargetType, enum_type


class Review(Base, UUIDMixin):
    __tablename__ = "reviews"

    transaction_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewee_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="SET NULL")
    )
    rating: Mapped[int] = mapped_column(nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    reviewer: Mapped["User"] = relationship(foreign_keys=[reviewer_id])  # noqa: F821
    reviewee: Mapped["User"] = relationship(foreign_keys=[reviewee_id])  # noqa: F821
    transaction: Mapped["Transaction"] = relationship()  # noqa: F821

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        UniqueConstraint("transaction_id", "reviewer_id", name="uq_review_transaction_reviewer"),
    )


class Report(Base, UUIDMixin):
    __tablename__ = "reports"

    reporter_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_type: Mapped[ReportTargetType] = mapped_column(
        enum_type(ReportTargetType), nullable=False, index=True
    )
    target_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String(80), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(
        enum_type(ReportStatus), default=ReportStatus.pending, nullable=False, index=True
    )
    resolution_note: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    reporter: Mapped["User"] = relationship(foreign_keys=[reporter_id])  # noqa: F821

    __table_args__ = (Index("ix_reports_status_created", "status", "created_at"),)


class Notification(Base, UUIDMixin):
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    link: Mapped[Optional[str]] = mapped_column(String(300))
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_notifications_user_read", "user_id", "is_read"),)
