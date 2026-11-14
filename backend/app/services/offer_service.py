"""Offer / counter-offer negotiation state machine."""

from datetime import timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.catalog import Product
from app.models.enums import MessageType, OfferStatus, ProductStatus
from app.models.trade import Conversation, Message, Offer
from app.models.user import User
from app.services.chat_service import ensure_participant, get_conversation
from app.services.notifications import notify
from app.utils.datetime import as_utc, is_past


def expire_stale_offers(db: Session) -> int:
    stale = db.execute(
        select(Offer).where(Offer.status == OfferStatus.pending, Offer.expires_at.is_not(None))
    ).scalars().all()
    changed = 0
    for offer in stale:
        if is_past(offer.expires_at):
            offer.status = OfferStatus.expired
            changed += 1
    if changed:
        db.commit()
    return changed


def offer_payload(db: Session, offer: Offer, viewer: Optional[User]) -> dict:
    product = db.get(Product, offer.product_id)
    buyer = db.get(User, offer.buyer_id)
    seller = db.get(User, offer.seller_id)
    images = sorted(product.images, key=lambda i: i.position) if product else []
    return {
        "id": offer.id,
        "conversation_id": offer.conversation_id,
        "product_id": offer.product_id,
        "buyer_id": offer.buyer_id,
        "seller_id": offer.seller_id,
        "amount": float(offer.amount),
        "message": offer.message,
        "status": offer.status,
        "offered_by_id": offer.offered_by_id,
        "parent_offer_id": offer.parent_offer_id,
        "responded_at": offer.responded_at,
        "expires_at": offer.expires_at,
        "created_at": offer.created_at,
        "is_expired": offer.status == OfferStatus.expired
        or (offer.status == OfferStatus.pending and is_past(offer.expires_at)),
        "can_respond": bool(
            viewer
            and offer.status == OfferStatus.pending
            and viewer.id in (offer.buyer_id, offer.seller_id)
            and viewer.id != offer.offered_by_id
            and not is_past(offer.expires_at)
        ),
        "product_title": product.title if product else None,
        "product_image": images[0].url if images else None,
        "buyer_name": buyer.full_name if buyer else None,
        "seller_name": seller.full_name if seller else None,
    }


def create_offer(db: Session, user: User, conversation_id: str, amount: float, message: Optional[str] = None) -> Offer:
    expire_stale_offers(db)
    conversation = get_conversation(db, conversation_id)
    ensure_participant(conversation, user)
    product = conversation.product
    if product.status in (ProductStatus.sold, ProductStatus.removed, ProductStatus.rejected, ProductStatus.draft):
        raise ConflictError("This listing is no longer accepting offers.")

    if message and len(message) > 1000:
        raise ValidationError("Offer note is too long.")

    pending = db.execute(
        select(Offer).where(Offer.conversation_id == conversation.id, Offer.status == OfferStatus.pending)
    ).scalars().all()
    for existing in pending:
        if existing.offered_by_id != user.id:
            raise ConflictError("Respond to the current offer before making a new one.")

    offer = Offer(
        conversation_id=conversation.id,
        product_id=product.id,
        buyer_id=conversation.buyer_id,
        seller_id=conversation.seller_id,
        amount=Decimal(str(round(amount, 2))),
        message=(message or "").strip() or None,
        status=OfferStatus.pending,
        offered_by_id=user.id,
        expires_at=utcnow() + timedelta(hours=settings.OFFER_EXPIRY_HOURS),
    )
    db.add(offer)
    db.flush()

    db.add(
        Message(
            conversation_id=conversation.id,
            sender_id=user.id,
            body=message.strip() if message and message.strip() else f"Offered ₹{float(offer.amount):,.0f}",
            message_type=MessageType.offer,
            offer_id=offer.id,
            created_at=utcnow(),
        )
    )
    conversation.last_message_at = utcnow()
    recipient = conversation.seller_id if user.id == conversation.buyer_id else conversation.buyer_id
    notify(
        db,
        recipient,
        "new_offer",
        f"New offer of ₹{float(offer.amount):,.0f}",
        f"{user.full_name} offered ₹{float(offer.amount):,.0f} for '{product.title}'.",
        f"/messages/{conversation.id}",
    )
    db.commit()
    db.refresh(offer)
    return offer


def respond_offer(db: Session, user: User, offer_id: str, action: str, amount: Optional[float] = None, message: Optional[str] = None) -> Offer:
    expire_stale_offers(db)
    offer = db.execute(
        select(Offer).where(Offer.id == offer_id).options(selectinload(Offer.conversation).selectinload(Conversation.product))
    ).scalar_one_or_none()
    if not offer:
        raise NotFoundError("Offer not found.")
    conversation = offer.conversation
    ensure_participant(conversation, user)

    if offer.status != OfferStatus.pending:
        if offer.status == OfferStatus.expired or is_past(offer.expires_at):
            offer.status = OfferStatus.expired
            db.commit()
            raise ConflictError("This offer has expired.")
        raise ConflictError(f"This offer was already {offer.status.value}.")
    if is_past(offer.expires_at):
        offer.status = OfferStatus.expired
        db.commit()
        raise ConflictError("This offer has expired.")
    if user.id == offer.offered_by_id:
        raise ForbiddenError("You cannot respond to your own offer.")

    product = conversation.product
    if product.status == ProductStatus.sold:
        raise ConflictError("This item has already been sold.")

    recipient = offer.offered_by_id
    result = offer

    if action == "accept":
        offer.status = OfferStatus.accepted
        offer.responded_at = utcnow()
        notify_body = f"Your offer of ₹{float(offer.amount):,.0f} for '{product.title}' was accepted."
        notify(db, recipient, "offer_accepted", "Offer accepted", notify_body, f"/messages/{conversation.id}")
    elif action == "reject":
        offer.status = OfferStatus.rejected
        offer.responded_at = utcnow()
        notify(db, recipient, "offer_rejected", "Offer declined",
               f"Your offer of ₹{float(offer.amount):,.0f} for '{product.title}' was declined.",
               f"/messages/{conversation.id}")
    elif action == "counter":
        if not amount or amount <= 0:
            raise ValidationError("Enter a counteroffer amount.")
        offer.status = OfferStatus.countered
        offer.responded_at = utcnow()
        counter = Offer(
            conversation_id=conversation.id,
            product_id=product.id,
            buyer_id=offer.buyer_id,
            seller_id=offer.seller_id,
            amount=Decimal(str(round(amount, 2))),
            message=(message or "").strip() or None,
            status=OfferStatus.pending,
            offered_by_id=user.id,
            parent_offer_id=offer.id,
            expires_at=utcnow() + timedelta(hours=settings.OFFER_EXPIRY_HOURS),
        )
        db.add(counter)
        db.flush()
        db.add(
            Message(
                conversation_id=conversation.id,
                sender_id=user.id,
                body=(message or "").strip() or f"Counteroffer: ₹{float(counter.amount):,.0f}",
                message_type=MessageType.offer,
                offer_id=counter.id,
                created_at=utcnow(),
            )
        )
        conversation.last_message_at = utcnow()
        notify(db, recipient, "counteroffer", "Counteroffer received",
               f"{user.full_name} countered with ₹{float(counter.amount):,.0f} for '{product.title}'.",
               f"/messages/{conversation.id}")
        result = counter
    elif action == "cancel":
        if user.id not in (offer.offered_by_id, offer.buyer_id):
            raise ForbiddenError("Only the sender can withdraw this offer.")
        offer.status = OfferStatus.cancelled
        offer.responded_at = utcnow()
    else:  # pragma: no cover - validated by the schema
        raise ValidationError("Unknown offer action.")

    db.commit()
    db.refresh(result)
    return result


def list_my_offers(db: Session, user: User, direction: str = "all") -> list:
    expire_stale_offers(db)
    stmt = select(Offer).order_by(Offer.created_at.desc())
    if direction == "sent":
        stmt = stmt.where(Offer.offered_by_id == user.id)
    elif direction == "received":
        stmt = stmt.where((Offer.seller_id == user.id) | (Offer.buyer_id == user.id))
        stmt = stmt.where(Offer.offered_by_id != user.id)
    else:
        stmt = stmt.where((Offer.buyer_id == user.id) | (Offer.seller_id == user.id))
    offers = db.execute(stmt.limit(100)).scalars().all()
    return [offer_payload(db, o, user) for o in offers]


def get_offer(db: Session, offer_id: str) -> Offer:
    offer = db.get(Offer, offer_id)
    if not offer:
        raise NotFoundError("Offer not found.")
    return offer
