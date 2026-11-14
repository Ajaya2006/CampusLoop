"""Ratings and reviews."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.trade import ReviewCreate, ReviewOut
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut, status_code=201)
def create_review(payload: ReviewCreate,
                  current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    review = review_service.create_review(db, current, payload.transaction_id, payload.rating, payload.comment)
    return review_service.review_payload(db, review)


@router.get("/user/{user_id}")
def reviews_for_user(user_id: str, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50),
                     db: Session = Depends(get_db)):
    return review_service.user_reviews(db, user_id, page, page_size)


@router.get("/transaction/{transaction_id}", response_model=List[ReviewOut])
def reviews_for_transaction(transaction_id: str, current: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    from app.services.transaction_service import ensure_party, get_transaction

    ensure_party(get_transaction(db, transaction_id), current)
    return review_service.transaction_reviews(db, transaction_id)
