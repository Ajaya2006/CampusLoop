"""Conversation, message, offer, meeting and transaction models."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import (
    MeetingStatus,
    MessageType,
    OfferStatus,
    TransactionStatus,
    enum_type,
)


class Conversation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "conversations"

    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buyer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seller_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)

    product: Mapped["Product"] = relationship()  # noqa: F821
    buyer: Mapped["User"] = relationship(foreign_keys=[buyer_id])  # noqa: F821
    seller: Mapped["User"] = relationship(foreign_keys=[seller_id])  # noqa: F821
    participants: Mapped[List["ConversationParticipant"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    messages: Mapped[List["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    offers: Mapped[List["Offer"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("product_id", "buyer_id", "seller_id", name="uq_conversation_product_pair"),
    )


class ConversationParticipant(Base, UUIDMixin):
    __tablename__ = "conversation_participants"

    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    last_read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()  # noqa: F821

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_participant_conversation_user"),
    )


class Message(Base, UUIDMixin):
    __tablename__ = "messages"

    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[MessageType] = mapped_column(
        enum_type(MessageType), default=MessageType.text, nullable=False
    )
    offer_id: Mapped[Optional[str]] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sender: Mapped[Optional["User"]] = relationship()  # noqa: F821


class Offer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "offers"

    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    buyer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seller_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[OfferStatus] = mapped_column(
        enum_type(OfferStatus), default=OfferStatus.pending, nullable=False, index=True
    )
    offered_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    parent_offer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("offers.id", ondelete="SET NULL")
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="offers")
    parent_offer: Mapped[Optional["Offer"]] = relationship(remote_side="Offer.id")

    __table_args__ = (CheckConstraint("amount > 0", name="ck_offers_amount_positive"),)


class Meeting(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "meetings"

    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    proposed_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[MeetingStatus] = mapped_column(
        enum_type(MeetingStatus), default=MeetingStatus.proposed, nullable=False, index=True
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text)
    transaction_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("transactions.id", ondelete="SET NULL")
    )

    conversation: Mapped["Conversation"] = relationship()
    proposer: Mapped[Optional["User"]] = relationship(foreign_keys=[proposed_by_id])  # noqa: F821

    __table_args__ = (Index("ix_meetings_status_scheduled", "status", "scheduled_at"),)


class Transaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "transactions"

    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    buyer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    seller_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    offer_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("offers.id", ondelete="SET NULL")
    )
    meeting_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("meetings.id", ondelete="SET NULL")
    )
    agreed_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        enum_type(TransactionStatus), default=TransactionStatus.pending, nullable=False, index=True
    )
    buyer_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    seller_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text)

    product: Mapped["Product"] = relationship()  # noqa: F821
    buyer: Mapped["User"] = relationship(foreign_keys=[buyer_id])  # noqa: F821
    seller: Mapped["User"] = relationship(foreign_keys=[seller_id])  # noqa: F821
    meeting: Mapped[Optional["Meeting"]] = relationship(foreign_keys=[meeting_id], post_update=True)

    __table_args__ = (
        CheckConstraint("agreed_price > 0", name="ck_transactions_price_positive"),
        Index("ix_transactions_status_created", "status", "created_at"),
    )
