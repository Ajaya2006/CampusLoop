"""Offer and counter-offer endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_verified
from app.db.session import get_db
from app.models.user import User
from app.schemas.trade import OfferCreate, OfferOut, OfferRespond
from app.services import offer_service
from app.websocket.manager import manager

router = APIRouter(prefix="/offers", tags=["offers"])


@router.get("", response_model=List[OfferOut])
def list_offers(direction: str = Query(default="all", pattern="^(all|sent|received)$"),
                current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return offer_service.list_my_offers(db, current, direction)


@router.post("", response_model=OfferOut, status_code=201)
async def create_offer(payload: OfferCreate, current: User = Depends(require_verified),
                       db: Session = Depends(get_db)):
    offer = offer_service.create_offer(db, current, payload.conversation_id, payload.amount, payload.message)
    await manager.broadcast(payload.conversation_id, {"type": "offer", "offer_id": offer.id})
    return offer_service.offer_payload(db, offer, current)


@router.patch("/{offer_id}", response_model=OfferOut)
async def respond_offer(offer_id: str, payload: OfferRespond,
                        current: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    offer = offer_service.respond_offer(db, current, offer_id, payload.action, payload.amount, payload.message)
    await manager.broadcast(offer.conversation_id, {"type": "offer", "offer_id": offer.id})
    return offer_service.offer_payload(db, offer, current)
