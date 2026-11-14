"""In-app notifications."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import NotFoundError
from app.db.base import utcnow
from app.db.session import get_db
from app.models.trust import Notification
from app.models.user import User
from app.schemas.common import MessageOut
from app.schemas.trust import NotificationOut, UnreadCountOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationOut])
def list_notifications(unread_only: bool = False, limit: int = Query(default=30, ge=1, le=100),
                       current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Notification).where(Notification.user_id == current.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    return db.execute(stmt.order_by(Notification.created_at.desc()).limit(limit)).scalars().all()


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current.id, Notification.is_read.is_(False)
        )
    ).scalar_one()
    return {"count": int(total)}


@router.post("/read-all", response_model=MessageOut)
def mark_all_read(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(
        update(Notification)
        .where(Notification.user_id == current.id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=utcnow())
    )
    db.commit()
    return {"message": "All notifications marked as read."}


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, current: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != current.id:
        raise NotFoundError("Notification not found.")
    notification.is_read = True
    notification.read_at = utcnow()
    db.commit()
    db.refresh(notification)
    return notification


@router.delete("/{notification_id}", response_model=MessageOut)
def delete_notification(notification_id: str, current: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != current.id:
        raise NotFoundError("Notification not found.")
    db.delete(notification)
    db.commit()
    return {"message": "Notification removed."}
