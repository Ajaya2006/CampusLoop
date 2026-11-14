"""Offline student-to-student transaction lifecycle.

Concurrency: the product row is locked (``SELECT ... FOR UPDATE`` where the
database supports it) and its status is re-checked inside the same database
transaction, so two buyers cannot both complete a sale of one listing.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.catalog import Product
from app.models.enums import (
    MeetingStatus,
    MessageType,
    OfferStatus,
    ProductStatus,
    TransactionStatus,
)
from app.models.trade import Conversation, Meeting, Message, Offer, Transaction
from app.models.trust import Review
from app.models.user import User
from app.services.chat_service import get_conversation
from app.services.notifications import notify
from app.utils.datetime import as_utc

OPEN_STATUSES = (TransactionStatus.pending, TransactionStatus.meeting_scheduled, TransactionStatus.completion_requested)


def transaction_payload(db: Session, transaction: Transaction, viewer: User) -> dict:
    product = db.get(Product, transaction.product_id)
    images = sorted(product.images, key=lambda i: i.position) if product else []
    buyer = db.get(User, transaction.buyer_id)
    seller = db.get(User, transaction.seller_id)
    counterpart = seller if viewer.id == transaction.buyer_id else buyer
    meeting = db.get(Meeting, transaction.meeting_id) if transaction.meeting_id else None
    reviewed = db.execute(
        select(func.count(Review.id)).where(
            Review.transaction_id == transaction.id, Review.reviewer_id == viewer.id
        )
    ).scalar_one()
    return {
        "id": transaction.id,
        "product_id": transaction.product_id,
        "buyer_id": transaction.buyer_id,
        "seller_id": transaction.seller_id,
        "offer_id": transaction.offer_id,
        "meeting_id": transaction.meeting_id,
        "agreed_price": float(transaction.agreed_price),
        "status": transaction.status,
        "buyer_confirmed_at": transaction.buyer_confirmed_at,
        "seller_confirmed_at": transaction.seller_confirmed_at,
        "completed_at": transaction.completed_at,
        "cancelled_at": transaction.cancelled_at,
        "cancel_reason": transaction.cancel_reason,
        "created_at": transaction.created_at,
        "product_title": product.title if product else None,
        "product_image": images[0].url if images else None,
        "buyer_name": buyer.full_name if buyer else None,
        "seller_name": seller.full_name if seller else None,
        "counterpart_name": counterpart.full_name if counterpart else None,
        "role": "buyer" if viewer.id == transaction.buyer_id else "seller",
        "has_reviewed": reviewed > 0,
        "can_review": transaction.status == TransactionStatus.completed and reviewed == 0,
        "meeting": None if not meeting else {
            "id": meeting.id,
            "conversation_id": meeting.conversation_id,
            "product_id": meeting.product_id,
            "proposed_by_id": meeting.proposed_by_id,
            "scheduled_at": meeting.scheduled_at,
            "location": meeting.location,
            "notes": meeting.notes,
            "status": meeting.status,
            "responded_at": meeting.responded_at,
            "confirmed_at": meeting.confirmed_at,
            "cancel_reason": meeting.cancel_reason,
            "created_at": meeting.created_at,
            "product_title": product.title if product else None,
            "counterpart_name": counterpart.full_name if counterpart else None,
            "is_proposer": meeting.proposed_by_id == viewer.id,
            "can_respond": False,
        },
    }


def _locked_product(db: Session, product_id: str) -> Product:
    product = db.execute(
        select(Product).where(Product.id == product_id).with_for_update()
    ).scalar_one_or_none()
    if not product:
        raise NotFoundError("This listing could not be found.")
    return product


def create_transaction(
    db: Session,
    user: User,
    *,
    offer_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    agreed_price: Optional[float] = None,
    meeting_id: Optional[str] = None,
) -> Transaction:
    conversation: Optional[Conversation] = None
    offer: Optional[Offer] = None

    if offer_id:
        offer = db.get(Offer, offer_id)
        if not offer:
            raise NotFoundError("Offer not found.")
        conversation = get_conversation(db, offer.conversation_id)
        if user.id not in (conversation.buyer_id, conversation.seller_id):
            raise ForbiddenError("You are not part of this negotiation.")
        if offer.status != OfferStatus.accepted:
            raise ConflictError("Only an accepted offer can become a transaction.")
        conversation_id = conversation.id
        price = offer.amount
    else:
        if conversation_id:
            conversation = get_conversation(db, conversation_id)
            if user.id != conversation.buyer_id:
                raise ForbiddenError("Only the buyer can start this purchase.")
        else:
            raise ValidationError("Provide an accepted offer or a conversation.")

    product = _locked_product(db, conversation.product_id)
    if product.seller_id != conversation.seller_id:
        raise ConflictError("This listing changed ownership and cannot be purchased.")

    if agreed_price is not None and not offer_id:
        raise ValidationError("Agree a price through an offer before starting the transaction.")

    price = offer.amount if offer else Decimal(str(conversation.product.price))

    existing = db.execute(
        select(Transaction).where(
            Transaction.product_id == product.id,
            Transaction.status.in_([*OPEN_STATUSES, TransactionStatus.completed]),
        )
    ).scalars().first()
    if existing:
        if existing.status == TransactionStatus.completed:
            raise ConflictError("This item has already been sold.")
        if _same_pair(existing, conversation):
            return existing
        raise ConflictError("Another buyer already has an open transaction for this item.")

    if product.status not in (ProductStatus.available, ProductStatus.approved):
        raise ConflictError("This listing is no longer available.")

    if meeting_id:
        meeting = db.get(Meeting, meeting_id)
        if not meeting or meeting.conversation_id != conversation.id:
            raise ValidationError("That meeting does not belong to this conversation.")
    else:
        meeting = db.execute(
            select(Meeting).where(
                Meeting.conversation_id == conversation.id,
                Meeting.status.in_([MeetingStatus.proposed, MeetingStatus.rescheduled, MeetingStatus.confirmed]),
            )
        ).scalars().first()

    transaction = Transaction(
        product_id=product.id,
        buyer_id=conversation.buyer_id,
        seller_id=conversation.seller_id,
        offer_id=offer.id if offer else None,
        meeting_id=meeting.id if meeting else None,
        agreed_price=price,
        status=TransactionStatus.meeting_scheduled if meeting else TransactionStatus.pending,
    )
    db.add(transaction)
    db.flush()
    if meeting:
        meeting.transaction_id = transaction.id

    product.status = ProductStatus.reserved
    db.add(Message(
        conversation_id=conversation.id,
        sender_id=user.id,
        body=f"Deal agreed at ₹{float(price):,.0f}. Transaction started.",
        message_type=MessageType.system,
        created_at=utcnow(),
    ))
    conversation.last_message_at = utcnow()
    other_id = conversation.seller_id if user.id == conversation.buyer_id else conversation.buyer_id
    notify(db, other_id, "transaction_started", "Transaction started",
           f"A transaction for '{product.title}' at ₹{float(price):,.0f} has started.",
           "/transactions")
    db.commit()
    db.refresh(transaction)
    return transaction


def _same_pair(transaction: Transaction, conversation: Conversation) -> bool:
    return transaction.buyer_id == conversation.buyer_id and transaction.seller_id == conversation.seller_id


def get_transaction(db: Session, transaction_id: str) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if not transaction:
        raise NotFoundError("Transaction not found.")
    return transaction


def ensure_party(transaction: Transaction, user: User) -> None:
    if user.id not in (transaction.buyer_id, transaction.seller_id):
        raise ForbiddenError("You are not part of this transaction.")


def confirm_completion(db: Session, user: User, transaction_id: str) -> Transaction:
    transaction = db.execute(
        select(Transaction).where(Transaction.id == transaction_id).with_for_update()
    ).scalar_one_or_none()
    if not transaction:
        raise NotFoundError("Transaction not found.")
    ensure_party(transaction, user)

    if transaction.status == TransactionStatus.completed:
        raise ConflictError("This transaction is already completed.")
    if transaction.status == TransactionStatus.cancelled:
        raise ConflictError("This transaction was cancelled.")

    now = utcnow()
    if user.id == transaction.buyer_id:
        transaction.buyer_confirmed_at = now
    else:
        transaction.seller_confirmed_at = now

    both = transaction.buyer_confirmed_at is not None and transaction.seller_confirmed_at is not None
    if both:
        product = _locked_product(db, transaction.product_id)
        if product.status == ProductStatus.sold:
            raise ConflictError("This item was already marked as sold.")
        product.status = ProductStatus.sold
        product.sold_at = now
        transaction.status = TransactionStatus.completed
        transaction.completed_at = now
        meeting = db.get(Meeting, transaction.meeting_id) if transaction.meeting_id else None
        if meeting and meeting.status == MeetingStatus.confirmed:
            meeting.status = MeetingStatus.completed
        conversation = db.execute(
            select(Conversation).where(
                Conversation.product_id == transaction.product_id,
                Conversation.buyer_id == transaction.buyer_id,
                Conversation.seller_id == transaction.seller_id,
            )
        ).scalar_one_or_none()
        for user_id in (transaction.buyer_id, transaction.seller_id):
            notify(db, user_id, "transaction_completed", "Transaction completed",
                   f"'{product.title}' is now marked as sold. You can leave a review.",
                   "/transactions")
        if conversation:
            db.add(Message(
                conversation_id=conversation.id,
                sender_id=None,
                body="Transaction completed. The listing is marked as sold.",
                message_type=MessageType.system,
                created_at=now,
            ))
            conversation.last_message_at = now
    else:
        transaction.status = TransactionStatus.completion_requested
        other_id = transaction.seller_id if user.id == transaction.buyer_id else transaction.buyer_id
        notify(db, other_id, "transaction_confirmation", "Completion confirmation needed",
               "The other student marked this transaction as complete. Confirm to finish the sale.",
               "/transactions")

    db.commit()
    db.refresh(transaction)
    return transaction


def cancel_transaction(db: Session, user: User, transaction_id: str, reason: Optional[str] = None) -> Transaction:
    transaction = db.execute(
        select(Transaction).where(Transaction.id == transaction_id).with_for_update()
    ).scalar_one_or_none()
    if not transaction:
        raise NotFoundError("Transaction not found.")
    ensure_party(transaction, user)
    if transaction.status == TransactionStatus.completed:
        raise ConflictError("Completed transactions cannot be cancelled.")
    if transaction.status == TransactionStatus.cancelled:
        raise ConflictError("This transaction is already cancelled.")

    transaction.status = TransactionStatus.cancelled
    transaction.cancelled_at = utcnow()
    transaction.cancel_reason = (reason or "").strip() or f"Cancelled by {user.full_name}."

    product = _locked_product(db, transaction.product_id)
    if product.status != ProductStatus.sold:
        product.status = ProductStatus.available

    meeting = db.get(Meeting, transaction.meeting_id) if transaction.meeting_id else None
    if meeting and meeting.status in (MeetingStatus.proposed, MeetingStatus.confirmed, MeetingStatus.rescheduled):
        meeting.status = MeetingStatus.cancelled
        meeting.cancel_reason = "Transaction cancelled."

    other_id = transaction.seller_id if user.id == transaction.buyer_id else transaction.buyer_id
    notify(db, other_id, "transaction_cancelled", "Transaction cancelled",
           transaction.cancel_reason, "/transactions")
    db.commit()
    db.refresh(transaction)
    return transaction


def list_my_transactions(db: Session, user: User) -> list:
    transactions = db.execute(
        select(Transaction)
        .where((Transaction.buyer_id == user.id) | (Transaction.seller_id == user.id))
        .order_by(Transaction.created_at.desc())
    ).scalars().all()
    return [transaction_payload(db, t, user) for t in transactions]
