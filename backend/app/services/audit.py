"""Audit logging for sensitive administrative actions."""

from typing import Optional

from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.user import AdminAuditLog


def log_admin_action(
    db: Session,
    admin_id: Optional[str],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AdminAuditLog:
    entry = AdminAuditLog(
        admin_id=admin_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        ip_address=ip_address,
        created_at=utcnow(),
    )
    db.add(entry)
    return entry
