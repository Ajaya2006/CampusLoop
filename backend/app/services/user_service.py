"""Profile queries and seller reputation aggregates."""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.models.catalog import Product
from app.models.enums import PUBLIC_LISTING_STATUSES, TransactionStatus, UserRole, VerificationState
from app.models.trade import Transaction
from app.models.trust import Report, Review
from app.models.user import User


def get_user_or_404(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user:
        raise NotFoundError("This student profile could not be found.")
    return user


def seller_profile(db: Session, user_id: str) -> dict:
    user = get_user_or_404(db, user_id)
    if not user.is_active:
        raise NotFoundError("This student profile is no longer available.")

    rating_row = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.reviewee_id == user.id)
    ).one()
    completed = db.execute(
        select(func.count(Transaction.id)).where(
            (Transaction.seller_id == user.id) | (Transaction.buyer_id == user.id),
            Transaction.status == TransactionStatus.completed,
        )
    ).scalar_one()
    active = db.execute(
        select(func.count(Product.id)).where(
            Product.seller_id == user.id, Product.status.in_(PUBLIC_LISTING_STATUSES)
        )
    ).scalar_one()

    return {
        "id": user.id,
        "full_name": user.full_name,
        "college": user.college,
        "department": user.department,
        "course": user.course,
        "year": user.year,
        "avatar_url": user.avatar_url,
        "verification_status": user.verification_status,
        "bio": user.bio,
        "created_at": user.created_at,
        "rating_average": round(float(rating_row[0] or 0), 2),
        "review_count": int(rating_row[1] or 0),
        "completed_transactions": int(completed or 0),
        "active_listings": int(active or 0),
    }


def update_profile(db: Session, user: User, payload) -> User:
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"]:
        user.full_name = data["full_name"].strip()
    for field in ("department", "course", "phone", "avatar_url"):
        if field in data:
            value = (data[field] or "").strip()
            setattr(user, field, value or None)
    if "year" in data:
        user.year = data["year"]
    if "bio" in data and data["bio"] is not None:
        user.bio = data["bio"].strip() or None
    if "college" in data and data["college"]:
        if user.verification_status == VerificationState.verified:
            if data["college"].strip().lower() != user.college.lower():
                raise ForbiddenError("Contact support to change the college on a verified account.")
        else:
            user.college = data["college"].strip()
    db.commit()
    db.refresh(user)
    return user


def self_payload(db: Session, user: User) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "college": user.college,
        "department": user.department,
        "course": user.course,
        "year": user.year,
        "phone": user.phone,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "role": user.role,
        "verification_status": user.verification_status,
        "verification_note": user.verification_note,
        "is_active": user.is_active,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
    }


def admin_user_payload(db: Session, user: User) -> dict:
    listings = db.execute(select(func.count(Product.id)).where(Product.seller_id == user.id)).scalar_one()
    reports = db.execute(
        select(func.count(Report.id)).where(Report.target_type == "user", Report.target_id == user.id)
    ).scalar_one()
    return {
        **self_payload(db, user),
        "student_id_number": user.student_id_number,
        "listings_count": int(listings or 0),
        "reports_against": int(reports or 0),
    }


def set_user_active(db: Session, user: User, is_active: bool, reason: Optional[str] = None) -> User:
    if user.role == UserRole.admin and not is_active:
        raise ConflictError("Administrator accounts cannot be suspended from this panel.")
    user.is_active = is_active
    if not is_active and reason:
        user.verification_note = reason
    db.commit()
    db.refresh(user)
    return user
