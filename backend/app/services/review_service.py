"""Ratings and reviews, strictly tied to completed transactions."""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.db.base import utcnow
from app.models.enums import TransactionStatus
from app.models.trade import Transaction
from app.models.trust import Review
from app.models.user import User
from app.services.notifications import notify


def review_payload(db: Session, review: Review) -> dict:
    reviewer = db.get(User, review.reviewer_id)
    return {
        "id": review.id,
        "transaction_id": review.transaction_id,
        "reviewer_id": review.reviewer_id,
        "reviewee_id": review.reviewee_id,
        "product_id": review.product_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at,
        "reviewer_name": reviewer.full_name if reviewer else "Student",
        "reviewer_avatar": reviewer.avatar_url if reviewer else None,
    }


def create_review(db: Session, reviewer: User, transaction_id: str, rating: int, comment: Optional[str]) -> Review:
    transaction = db.get(Transaction, transaction_id)
    if not transaction:
        raise NotFoundError("Transaction not found.")
    if reviewer.id not in (transaction.buyer_id, transaction.seller_id):
        raise ForbiddenError("You can only review your own transactions.")
    if transaction.status != TransactionStatus.completed:
        raise ConflictError("You can review only after the transaction is completed.")

    existing = db.execute(
        select(Review).where(
            Review.transaction_id == transaction.id, Review.reviewer_id == reviewer.id
        )
    ).scalar_one_or_none()
    if existing:
        raise ConflictError("You already reviewed this transaction.")

    if not 1 <= int(rating) <= 5:
        raise ConflictError("Rating must be between 1 and 5.")

    reviewee_id = transaction.seller_id if reviewer.id == transaction.buyer_id else transaction.buyer_id
    review = Review(
        transaction_id=transaction.id,
        reviewer_id=reviewer.id,
        reviewee_id=reviewee_id,
        product_id=transaction.product_id,
        rating=int(rating),
        comment=(comment or "").strip() or None,
        created_at=utcnow(),
    )
    db.add(review)
    notify(db, reviewee_id, "new_review", f"New {int(rating)}-star review",
           f"{reviewer.full_name} reviewed your transaction.", f"/profile")
    db.commit()
    db.refresh(review)
    return review


def user_reviews(db: Session, user_id: str, page: int = 1, page_size: int = 10) -> dict:
    stmt = select(Review).where(Review.reviewee_id == user_id).order_by(Review.created_at.desc())
    total = db.execute(select(func.count(Review.id)).where(Review.reviewee_id == user_id)).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    stats = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.reviewee_id == user_id)
    ).one()
    distribution = {
        str(star): db.execute(
            select(func.count(Review.id)).where(Review.reviewee_id == user_id, Review.rating == star)
        ).scalar_one()
        for star in range(1, 6)
    }
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {
        "items": [review_payload(db, r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
        "average": round(float(stats[0] or 0), 2),
        "distribution": distribution,
    }


def transaction_reviews(db: Session, transaction_id: str) -> list:
    rows = db.execute(select(Review).where(Review.transaction_id == transaction_id)).scalars().all()
    return [review_payload(db, r) for r in rows]
