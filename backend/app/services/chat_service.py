"""Conversations and messages, with strict participant authorization."""

from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.catalog import Product
from app.models.enums import MessageType, OfferStatus, ProductStatus, VerificationState
from app.models.trade import (
    Conversation,
    ConversationParticipant,
    Meeting,
    Message,
    Offer,
    Transaction,
)
from app.models.user import User
from app.services.notifications import notify
from app.utils.datetime import as_utc


def _cover(product: Optional[Product]) -> Optional[str]:
    if not product or not product.images:
        return None
    return sorted(product.images, key=lambda i: i.position)[0].url


def _chat_user(user: Optional[User]) -> Optional[dict]:
    if not user:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "college": user.college,
        "verification_status": user.verification_status.value,
    }


def get_conversation(db: Session, conversation_id: str) -> Conversation:
    conversation = db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .options(
            selectinload(Conversation.product).selectinload(Product.images),
            selectinload(Conversation.buyer),
            selectinload(Conversation.seller),
            selectinload(Conversation.participants),
        )
    ).scalar_one_or_none()
    if not conversation:
        raise NotFoundError("Conversation not found.")
    return conversation


def ensure_participant(conversation: Conversation, user: User) -> None:
    if user.id not in (conversation.buyer_id, conversation.seller_id):
        raise ForbiddenError("You do not have access to this conversation.")


def unread_count(db: Session, conversation: Conversation, user_id: str) -> int:
    participant = next((p for p in conversation.participants if p.user_id == user_id), None)
    stmt = select(func.count(Message.id)).where(
        Message.conversation_id == conversation.id, Message.sender_id != user_id
    )
    if participant and participant.last_read_at:
        stmt = stmt.where(Message.created_at > as_utc(participant.last_read_at))
    return db.execute(stmt).scalar_one()


def conversation_payload(db: Session, conversation: Conversation, viewer: User,
                         with_detail: bool = False) -> dict:
    ensure_participant(conversation, viewer)
    counterpart = conversation.seller if viewer.id == conversation.buyer_id else conversation.buyer
    last = db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    latest_offer = db.execute(
        select(Offer).where(Offer.conversation_id == conversation.id).order_by(Offer.created_at.desc()).limit(1)
    ).scalar_one_or_none()
    product = conversation.product

    data = {
        "id": conversation.id,
        "product": {
            "id": product.id,
            "title": product.title,
            "price": float(product.price),
            "cover_image": _cover(product),
            "status": product.status.value,
        },
        "buyer": _chat_user(conversation.buyer),
        "seller": _chat_user(conversation.seller),
        "counterpart": _chat_user(counterpart),
        "last_message": last.body if last else None,
        "last_message_at": last.created_at if last else conversation.last_message_at,
        "unread_count": unread_count(db, conversation, viewer.id),
        "created_at": conversation.created_at,
        "latest_offer": {
            "id": latest_offer.id,
            "amount": float(latest_offer.amount),
            "status": latest_offer.status,
            "created_at": latest_offer.created_at,
        } if latest_offer else None,
    }

    if with_detail:
        messages = db.execute(
            select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc())
        ).scalars().all()
        offers = db.execute(
            select(Offer).where(Offer.conversation_id == conversation.id).order_by(Offer.created_at.asc())
        ).scalars().all()
        meetings = db.execute(
            select(Meeting).where(Meeting.conversation_id == conversation.id).order_by(Meeting.created_at.desc())
        ).scalars().all()
        transaction = db.execute(
            select(Transaction)
            .where(Transaction.product_id == product.id,
                   Transaction.buyer_id == conversation.buyer_id,
                   Transaction.seller_id == conversation.seller_id)
            .order_by(Transaction.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        data["messages"] = [
            {
                "id": m.id,
                "conversation_id": m.conversation_id,
                "sender_id": m.sender_id,
                "body": m.body,
                "message_type": m.message_type,
                "offer_id": m.offer_id,
                "created_at": m.created_at,
            }
            for m in messages
        ]
        from app.services.offer_service import offer_payload
        from app.services.meeting_service import meeting_payload
        from app.services.transaction_service import transaction_payload

        data["offers"] = [offer_payload(db, o, viewer) for o in offers]
        data["meetings"] = [meeting_payload(m, viewer, conversation) for m in meetings]
        data["transaction"] = transaction_payload(db, transaction, viewer) if transaction else None
    return data


def list_conversations(db: Session, viewer: User) -> List[dict]:
    conversations = db.execute(
        select(Conversation)
        .where((Conversation.buyer_id == viewer.id) | (Conversation.seller_id == viewer.id))
        .options(
            selectinload(Conversation.product).selectinload(Product.images),
            selectinload(Conversation.buyer),
            selectinload(Conversation.seller),
            selectinload(Conversation.participants),
        )
        .order_by(Conversation.last_message_at.desc(), Conversation.created_at.desc())
    ).scalars().all()
    return [conversation_payload(db, c, viewer) for c in conversations]


def start_conversation(db: Session, buyer: User, product_id: str, message: Optional[str] = None) -> Conversation:
    product = db.execute(
        select(Product).where(Product.id == product_id).options(
            selectinload(Product.images), selectinload(Product.seller), selectinload(Product.category)
        )
    ).scalar_one_or_none()
    if not product:
        raise NotFoundError("This listing could not be found.")
    if product.seller_id == buyer.id:
        raise ValidationError("You cannot message yourself about your own listing.")
    if buyer.verification_status != VerificationState.verified:
        raise ForbiddenError("Verify your student account before contacting sellers.")
    if product.status in (ProductStatus.sold, ProductStatus.removed, ProductStatus.rejected, ProductStatus.draft):
        raise ConflictError("This listing is no longer available for messaging.")

    conversation = db.execute(
        select(Conversation).where(
            Conversation.product_id == product.id,
            Conversation.buyer_id == buyer.id,
            Conversation.seller_id == product.seller_id,
        )
    ).scalar_one_or_none()

    if not conversation:
        conversation = Conversation(
            product_id=product.id,
            buyer_id=buyer.id,
            seller_id=product.seller_id,
            last_message_at=utcnow(),
        )
        db.add(conversation)
        db.flush()
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=buyer.id, created_at=utcnow()))
        db.add(ConversationParticipant(conversation_id=conversation.id, user_id=product.seller_id, created_at=utcnow()))
        notify(
            db,
            product.seller_id,
            "new_message",
            "New conversation started",
            f"{buyer.full_name} is interested in '{product.title}'.",
            f"/messages/{conversation.id}",
        )

    if message and message.strip():
        db.add(
            Message(
                conversation_id=conversation.id,
                sender_id=buyer.id,
                body=message.strip(),
                message_type=MessageType.text,
                created_at=utcnow(),
            )
        )
        conversation.last_message_at = utcnow()

    db.commit()
    db.refresh(conversation)
    return get_conversation(db, conversation.id)


def post_message(db: Session, conversation: Conversation, sender: User, body: str, message_type: MessageType = MessageType.text, offer_id: Optional[str] = None) -> Message:
    ensure_participant(conversation, sender)
    text = (body or "").strip()
    if not text:
        raise ValidationError("Type a message before sending.")
    if conversation.product.status in (ProductStatus.removed,):
        raise ConflictError("This listing was removed; messaging is no longer available.")
    message = Message(
        conversation_id=conversation.id,
        sender_id=sender.id,
        body=text,
        message_type=message_type,
        offer_id=offer_id,
        created_at=utcnow(),
    )
    db.add(message)
    conversation.last_message_at = utcnow()
    recipient = conversation.seller_id if sender.id == conversation.buyer_id else conversation.buyer_id
    notify(
        db,
        recipient,
        "new_message",
        f"New message from {sender.full_name}",
        text[:120],
        f"/messages/{conversation.id}",
    )
    db.commit()
    db.refresh(message)
    return message


def mark_read(db: Session, conversation: Conversation, user: User) -> None:
    ensure_participant(conversation, user)
    participant = next((p for p in conversation.participants if p.user_id == user.id), None)
    if not participant:
        participant = ConversationParticipant(conversation_id=conversation.id, user_id=user.id, created_at=utcnow())
        db.add(participant)
    participant.last_read_at = utcnow()
    db.commit()


def total_unread(db: Session, user_id: str) -> int:
    conversations = db.execute(
        select(Conversation).where((Conversation.buyer_id == user_id) | (Conversation.seller_id == user_id))
    ).scalars().all()
    return sum(unread_count(db, c, user_id) for c in conversations)
