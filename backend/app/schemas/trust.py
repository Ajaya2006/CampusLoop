"""Report and notification schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ReportStatus, ReportTargetType


REPORT_REASONS = [
    {"value": "fake_product", "label": "Fake or counterfeit product"},
    {"value": "incorrect_description", "label": "Incorrect description"},
    {"value": "fraud", "label": "Fraud or scam attempt"},
    {"value": "suspicious_user", "label": "Suspicious user"},
    {"value": "inappropriate", "label": "Inappropriate listing"},
    {"value": "misleading_price", "label": "Misleading price"},
    {"value": "spam", "label": "Spam"},
    {"value": "other", "label": "Other violation"},
]


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: str
    reason: str = Field(min_length=2, max_length=80)
    details: Optional[str] = Field(default=None, max_length=2000)


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reporter_id: str
    target_type: ReportTargetType
    target_id: str
    reason: str
    details: Optional[str] = None
    status: ReportStatus
    resolution_note: Optional[str] = None
    reviewed_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    target_label: Optional[str] = None
    target_link: Optional[str] = None


class ReportResolve(BaseModel):
    status: ReportStatus
    resolution_note: Optional[str] = Field(default=None, max_length=2000)
    remove_listing: bool = False
    suspend_user: bool = False


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None


class UnreadCountOut(BaseModel):
    count: int
