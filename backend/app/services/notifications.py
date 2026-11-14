"""In-app notification creation. Every notification is created server-side."""

from typing import Optional

from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.trust import Notification


def notify(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
    commit: bool = False,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link,
        is_read=False,
        created_at=utcnow(),
    )
    db.add(notification)
    if commit:
        db.commit()
    return notification


def notify_many(db: Session, user_ids, type: str, title: str, body: Optional[str] = None, link: Optional[str] = None) -> None:
    for user_id in {uid for uid in user_ids if uid}:
        notify(db, user_id, type, title, body, link)
