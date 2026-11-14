"""Transaction lifecycle endpoints."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_verified
from app.db.session import get_db
from app.models.user import User
from app.schemas.trade import TransactionAction, TransactionCreate, TransactionOut
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionOut])
def list_transactions(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return transaction_service.list_my_transactions(db, current)


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, current: User = Depends(require_verified),
                       db: Session = Depends(get_db)):
    transaction = transaction_service.create_transaction(
        db, current,
        offer_id=payload.offer_id,
        conversation_id=payload.conversation_id,
        agreed_price=payload.agreed_price,
        meeting_id=payload.meeting_id,
    )
    return transaction_service.transaction_payload(db, transaction, current)


@router.get("/{transaction_id}", response_model=TransactionOut)
def read_transaction(transaction_id: str, current: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    transaction = transaction_service.get_transaction(db, transaction_id)
    transaction_service.ensure_party(transaction, current)
    return transaction_service.transaction_payload(db, transaction, current)


@router.post("/{transaction_id}/confirm", response_model=TransactionOut)
def confirm(transaction_id: str, current: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    transaction = transaction_service.confirm_completion(db, current, transaction_id)
    return transaction_service.transaction_payload(db, transaction, current)


@router.post("/{transaction_id}/cancel", response_model=TransactionOut)
def cancel(transaction_id: str, payload: TransactionAction,
           current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transaction = transaction_service.cancel_transaction(db, current, transaction_id, payload.reason)
    return transaction_service.transaction_payload(db, transaction, current)
