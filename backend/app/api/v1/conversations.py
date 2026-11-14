"""Conversations and message history (REST side of the chat)."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_verified
from app.core.rate_limit import message_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import MessageOut
from app.schemas.trade import (
    ConversationCreate,
    ConversationDetail,
    ConversationOut,
    MessageCreate,
    MessageOut as MessageSchema,
)
from app.services import chat_service
from app.websocket.manager import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=List[ConversationOut])
def list_conversations(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return chat_service.list_conversations(db, current)


@router.post("", response_model=ConversationOut, status_code=201,
             dependencies=[Depends(message_limiter)])
def start_conversation(payload: ConversationCreate, current: User = Depends(require_verified),
                       db: Session = Depends(get_db)):
    conversation = chat_service.start_conversation(db, current, payload.product_id, payload.message)
    return chat_service.conversation_payload(db, conversation, current)


@router.get("/unread-count", response_model=MessageOut)
def unread(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"message": str(chat_service.total_unread(db, current.id))}


@router.get("/{conversation_id}", response_model=ConversationDetail)
def read_conversation(conversation_id: str, current: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    conversation = chat_service.get_conversation(db, conversation_id)
    return chat_service.conversation_payload(db, conversation, current, with_detail=True)


@router.post("/{conversation_id}/messages", response_model=MessageSchema,
             dependencies=[Depends(message_limiter)])
async def send_message(conversation_id: str, payload: MessageCreate,
                       current: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    conversation = chat_service.get_conversation(db, conversation_id)
    message = chat_service.post_message(db, conversation, current, payload.body)
    await manager.broadcast(conversation_id, {
        "type": "message",
        "message": {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "body": message.body,
            "message_type": message.message_type.value,
            "created_at": message.created_at.isoformat(),
        },
    })
    return message


@router.post("/{conversation_id}/read", response_model=MessageOut)
async def mark_read(conversation_id: str, current: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    conversation = chat_service.get_conversation(db, conversation_id)
    chat_service.mark_read(db, conversation, current)
    await manager.broadcast(conversation_id, {"type": "read", "user_id": current.id})
    return {"message": "Marked as read."}
