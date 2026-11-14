"""Chat, offer, meeting and transaction schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MeetingStatus, MessageType, OfferStatus, TransactionStatus


class ChatUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    avatar_url: Optional[str] = None
    college: str
    verification_status: str


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    sender_id: Optional[str] = None
    body: str
    message_type: MessageType
    offer_id: Optional[str] = None
    created_at: datetime


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class ConversationCreate(BaseModel):
    product_id: str
    message: Optional[str] = Field(default=None, max_length=4000)


class OfferBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: float
    status: OfferStatus
    created_at: datetime


class ConversationProduct(BaseModel):
    id: str
    title: str
    price: float
    cover_image: Optional[str] = None
    status: str


class ConversationOut(BaseModel):
    id: str
    product: ConversationProduct
    buyer: ChatUser
    seller: ChatUser
    counterpart: ChatUser
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime
    latest_offer: Optional[OfferBrief] = None


class ConversationDetail(ConversationOut):
    messages: list[MessageOut] = []
    offers: list["OfferOut"] = []
    meetings: list["MeetingOut"] = []
    transaction: Optional["TransactionOut"] = None


class OfferCreate(BaseModel):
    conversation_id: str
    amount: float = Field(gt=0, le=10_000_000)
    message: Optional[str] = Field(default=None, max_length=1000)


class OfferRespond(BaseModel):
    action: str = Field(pattern="^(accept|reject|counter|cancel)$")
    amount: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    message: Optional[str] = Field(default=None, max_length=1000)


class OfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    product_id: str
    buyer_id: str
    seller_id: str
    amount: float
    message: Optional[str] = None
    status: OfferStatus
    offered_by_id: Optional[str] = None
    parent_offer_id: Optional[str] = None
    responded_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    product_title: Optional[str] = None
    product_image: Optional[str] = None
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = None
    is_expired: bool = False
    can_respond: bool = False


class MeetingCreate(BaseModel):
    conversation_id: str
    scheduled_at: datetime
    location: str = Field(min_length=3, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=1000)


class MeetingRespond(BaseModel):
    action: str = Field(pattern="^(accept|reject|reschedule|cancel|complete)$")
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=1000)


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    product_id: str
    proposed_by_id: Optional[str] = None
    scheduled_at: datetime
    location: str
    notes: Optional[str] = None
    status: MeetingStatus
    responded_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    created_at: datetime
    product_title: Optional[str] = None
    conversation_title: Optional[str] = None
    counterpart_name: Optional[str] = None
    is_proposer: bool = False
    can_respond: bool = False


class TransactionCreate(BaseModel):
    offer_id: Optional[str] = None
    conversation_id: Optional[str] = None
    agreed_price: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    meeting_id: Optional[str] = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    buyer_id: str
    seller_id: str
    offer_id: Optional[str] = None
    meeting_id: Optional[str] = None
    agreed_price: float
    status: TransactionStatus
    buyer_confirmed_at: Optional[datetime] = None
    seller_confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    created_at: datetime
    product_title: Optional[str] = None
    product_image: Optional[str] = None
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = None
    counterpart_name: Optional[str] = None
    role: Optional[str] = None
    meeting: Optional[MeetingOut] = None
    has_reviewed: bool = False
    can_review: bool = False


class TransactionAction(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)


class ReviewCreate(BaseModel):
    transaction_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    transaction_id: str
    reviewer_id: str
    reviewee_id: str
    product_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    reviewer_name: Optional[str] = None
    reviewer_avatar: Optional[str] = None


ConversationDetail.model_rebuild()
