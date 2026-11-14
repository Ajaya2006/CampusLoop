"""Meeting scheduling endpoints."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_verified
from app.db.session import get_db
from app.models.user import User
from app.schemas.trade import MeetingCreate, MeetingOut, MeetingRespond
from app.services import meeting_service
from app.services.chat_service import get_conversation
from app.websocket.manager import manager

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=List[MeetingOut])
def list_meetings(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return meeting_service.list_my_meetings(db, current)


@router.post("", response_model=MeetingOut, status_code=201)
async def propose_meeting(payload: MeetingCreate, current: User = Depends(require_verified),
                          db: Session = Depends(get_db)):
    meeting = meeting_service.propose_meeting(
        db, current, payload.conversation_id, payload.scheduled_at, payload.location, payload.notes
    )
    await manager.broadcast(payload.conversation_id, {"type": "meeting", "meeting_id": meeting.id})
    return meeting_service.meeting_payload(meeting, current, get_conversation(db, meeting.conversation_id))


@router.patch("/{meeting_id}", response_model=MeetingOut)
async def respond_meeting(meeting_id: str, payload: MeetingRespond,
                          current: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    meeting = meeting_service.respond_meeting(
        db, current, meeting_id, payload.action, payload.scheduled_at, payload.location, payload.notes
    )
    await manager.broadcast(meeting.conversation_id, {"type": "meeting", "meeting_id": meeting.id})
    return meeting_service.meeting_payload(meeting, current, get_conversation(db, meeting.conversation_id))
