"""Meeting scheduling with mutual confirmation."""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.enums import MeetingStatus, MessageType, ProductStatus
from app.models.trade import Conversation, Meeting, Message, Transaction
from app.models.user import User
from app.services.chat_service import ensure_participant, get_conversation
from app.services.notifications import notify
from app.utils.datetime import as_utc


def meeting_payload(meeting: Meeting, viewer: User, conversation: Optional[Conversation] = None) -> dict:
    counterpart_id = None
    title = None
    counterpart_name = None
    if conversation:
        counterpart = conversation.seller if viewer.id == conversation.buyer_id else conversation.buyer
        counterpart_id = counterpart.id if counterpart else None
        counterpart_name = counterpart.full_name if counterpart else None
        title = conversation.product.title if conversation.product else None
    return {
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
        "product_title": title,
        "counterpart_name": counterpart_name,
        "is_proposer": meeting.proposed_by_id == viewer.id,
        "can_respond": meeting.status in (MeetingStatus.proposed, MeetingStatus.rescheduled)
        and meeting.proposed_by_id != viewer.id,
    }


def _golden_meeting(db: Session, conversation_id: str, user: User) -> Meeting:
    meeting = db.execute(
        select(Meeting)
        .where(Meeting.conversation_id == conversation_id)
        .options(
            selectinload(Meeting.conversation).selectinload(Conversation.product),
            selectinload(Meeting.conversation).selectinload(Conversation.buyer),
            selectinload(Meeting.conversation).selectinload(Conversation.seller),
        )
        .order_by(Meeting.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if not meeting:
        raise NotFoundError("Meeting not found.")
    ensure_participant(meeting.conversation, user)
    return meeting


def propose_meeting(db: Session, user: User, conversation_id: str, scheduled_at, location: str, notes: Optional[str] = None) -> Meeting:
    conversation = get_conversation(db, conversation_id)
    ensure_participant(conversation, user)
    product = conversation.product
    if product.status in (ProductStatus.sold, ProductStatus.removed):
        raise ConflictError("This listing is no longer available.")

    moment = as_utc(scheduled_at)
    if not moment or moment <= utcnow():
        raise ValidationError("Choose a meeting date and time in the future.",
                              [{"field": "scheduled_at", "message": "Pick a future date and time"}])

    active = db.execute(
        select(Meeting).where(
            Meeting.conversation_id == conversation.id,
            Meeting.status.in_([MeetingStatus.proposed, MeetingStatus.rescheduled, MeetingStatus.confirmed]),
        )
    ).scalars().first()
    if active:
        raise ConflictError("There is already an open meeting for this conversation. Reschedule it instead.")

    meeting = Meeting(
        conversation_id=conversation.id,
        product_id=product.id,
        proposed_by_id=user.id,
        scheduled_at=moment,
        location=location.strip(),
        notes=(notes or "").strip() or None,
        status=MeetingStatus.proposed,
    )
    db.add(meeting)
    db.flush()

    other_id = conversation.seller_id if user.id == conversation.buyer_id else conversation.buyer_id
    db.add(Message(
        conversation_id=conversation.id,
        sender_id=user.id,
        body=f"Proposed a meeting on {moment:%d %b %Y, %H:%M} UTC at {meeting.location}.",
        message_type=MessageType.system,
        created_at=utcnow(),
    ))
    conversation.last_message_at = utcnow()
    notify(db, other_id, "meeting_proposed", "New meeting proposed",
           f"{user.full_name} proposed meeting at {meeting.location}.",
           f"/messages/{conversation.id}")
    db.commit()
    db.refresh(meeting)
    return meeting


def respond_meeting(db: Session, user: User, meeting_id: str, action: str,
                    scheduled_at=None, location: Optional[str] = None, notes: Optional[str] = None) -> Meeting:
    meeting = db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.conversation).selectinload(Conversation.product),
            selectinload(Meeting.conversation).selectinload(Conversation.buyer),
            selectinload(Meeting.conversation).selectinload(Conversation.seller),
        )
    ).scalar_one_or_none()
    if not meeting:
        raise NotFoundError("Meeting not found.")
    conversation = meeting.conversation
    ensure_participant(conversation, user)

    other_id = conversation.seller_id if user.id == conversation.buyer_id else conversation.buyer_id
    is_proposer = meeting.proposed_by_id == user.id

    if action == "accept":
        if is_proposer:
            raise ForbiddenError("The other student has to confirm the meeting.")
        if meeting.status not in (MeetingStatus.proposed, MeetingStatus.rescheduled):
            raise ConflictError("This meeting can no longer be confirmed.")
        meeting.status = MeetingStatus.confirmed
        meeting.confirmed_at = utcnow()
        meeting.responded_at = utcnow()
        notify(db, meeting.proposed_by_id, "meeting_confirmed", "Meeting confirmed",
               f"Meeting at {meeting.location} is confirmed.", f"/meetings")
        _attach_to_transaction(db, conversation, meeting)
    elif action == "reject":
        if is_proposer:
            raise ForbiddenError("You proposed this meeting; cancel it instead.")
        if meeting.status not in (MeetingStatus.proposed, MeetingStatus.rescheduled):
            raise ConflictError("This meeting can no longer be declined.")
        meeting.status = MeetingStatus.cancelled
        meeting.cancel_reason = "Declined by the other student."
        meeting.responded_at = utcnow()
        notify(db, meeting.proposed_by_id, "meeting_cancelled", "Meeting declined",
               "The other student declined the proposed meeting time.", f"/meetings")
    elif action == "reschedule":
        if not scheduled_at:
            raise ValidationError("Choose a new meeting date and time.")
        moment = as_utc(scheduled_at)
        if moment <= utcnow():
            raise ValidationError("Choose a future date and time for the new meeting.")
        if meeting.status not in (MeetingStatus.proposed, MeetingStatus.confirmed, MeetingStatus.rescheduled):
            raise ConflictError("This meeting cannot be rescheduled.")
        meeting.scheduled_at = moment
        meeting.location = (location or meeting.location).strip()
        if notes is not None:
            meeting.notes = notes.strip() or None
        meeting.status = MeetingStatus.rescheduled
        meeting.proposed_by_id = user.id
        meeting.confirmed_at = None
        meeting.responded_at = utcnow()
        notify(db, other_id, "meeting_rescheduled", "Meeting rescheduled",
               f"{user.full_name} suggested {moment:%d %b %Y, %H:%M} UTC at {meeting.location}.",
               f"/messages/{conversation.id}")
    elif action == "cancel":
        if meeting.status in (MeetingStatus.cancelled, MeetingStatus.completed):
            raise ConflictError("This meeting is already closed.")
        meeting.status = MeetingStatus.cancelled
        meeting.cancel_reason = (notes or "").strip() or f"Cancelled by {user.full_name}."
        meeting.responded_at = utcnow()
        notify(db, other_id, "meeting_cancelled", "Meeting cancelled", meeting.cancel_reason, f"/meetings")
    elif action == "complete":
        if meeting.status != MeetingStatus.confirmed:
            raise ConflictError("Confirm the meeting before marking it complete.")
        meeting.status = MeetingStatus.completed
    else:
        raise ValidationError("Unknown meeting action.")

    db.commit()
    db.refresh(meeting)
    return meeting


def _attach_to_transaction(db: Session, conversation: Conversation, meeting: Meeting) -> None:
    transaction = db.execute(
        select(Transaction).where(
            Transaction.product_id == meeting.product_id,
            Transaction.buyer_id == conversation.buyer_id,
            Transaction.seller_id == conversation.seller_id,
            Transaction.status.in_(["pending", "meeting_scheduled", "completion_requested"]),
        )
    ).scalars().first()
    if transaction:
        transaction.meeting_id = meeting.id
        meeting.transaction_id = transaction.id
        if transaction.status == "pending":
            transaction.status = "meeting_scheduled"


def list_my_meetings(db: Session, user: User) -> list:
    meetings = db.execute(
        select(Meeting)
        .join(Conversation, Conversation.id == Meeting.conversation_id)
        .where((Conversation.buyer_id == user.id) | (Conversation.seller_id == user.id))
        .options(
            selectinload(Meeting.conversation).selectinload(Conversation.product),
            selectinload(Meeting.conversation).selectinload(Conversation.buyer),
            selectinload(Meeting.conversation).selectinload(Conversation.seller),
        )
        .order_by(Meeting.scheduled_at.desc())
    ).scalars().all()
    return [meeting_payload(m, user, m.conversation) for m in meetings]
