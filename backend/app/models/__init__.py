"""Import every model so metadata / Alembic sees the full schema."""

from app.models.catalog import Category, Product, ProductImage, Wishlist
from app.models.enums import (
    MeetingStatus,
    MessageType,
    OfferStatus,
    ProductCondition,
    ProductStatus,
    ReportStatus,
    ReportTargetType,
    TransactionStatus,
    UserRole,
    VerificationState,
)
from app.models.trade import (
    Conversation,
    ConversationParticipant,
    Meeting,
    Message,
    Offer,
    Transaction,
)
from app.models.trust import Notification, Report, Review
from app.models.user import AdminAuditLog, StudentVerification, User

__all__ = [
    "AdminAuditLog",
    "Category",
    "Conversation",
    "ConversationParticipant",
    "Meeting",
    "Message",
    "Notification",
    "Offer",
    "Product",
    "ProductImage",
    "Report",
    "Review",
    "StudentVerification",
    "Transaction",
    "User",
    "Wishlist",
    "MeetingStatus",
    "MessageType",
    "OfferStatus",
    "ProductCondition",
    "ProductStatus",
    "ReportStatus",
    "ReportTargetType",
    "TransactionStatus",
    "UserRole",
    "VerificationState",
]
