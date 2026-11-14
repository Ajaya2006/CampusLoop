"""Authenticated WebSocket chat endpoint."""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.trade import Conversation
from app.models.user import User
from app.services import chat_service
from app.websocket.manager import manager

logger = logging.getLogger("campusloop.ws")

router = APIRouter()


def _authenticate(token: str | None):
    if not token:
        return None, None
    try:
        payload = decode_token(token, "access")
    except ValueError:
        return None, None
    db = SessionLocal()
    try:
        user = db.get(User, payload["sub"])
        if not user or not user.is_active:
            return None, None
        return user, db
    except Exception:  # pragma: no cover
        db.close()
        return None, None


@router.websocket("/ws/chat/{conversation_id}")
async def chat_socket(websocket: WebSocket, conversation_id: str):
    token = websocket.query_params.get("token")
    user, session = _authenticate(token)
    if not user:
        await websocket.close(code=4401)
        return

    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        session.close()
        await websocket.close(code=4404)
        return
    if user.id not in (conversation.buyer_id, conversation.seller_id):
        session.close()
        await websocket.close(code=4403)
        return
    session.close()

    await manager.connect(conversation_id, websocket)
    await websocket.send_json({"type": "ready", "conversation_id": conversation_id, "user_id": user.id})

    try:
        while True:
            data = await websocket.receive_json()
            event = (data or {}).get("type", "message")

            if event == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            db = SessionLocal()
            try:
                chat = chat_service.get_conversation(db, conversation_id)
                actor = db.get(User, user.id)
                if not actor or not actor.is_active:
                    await websocket.close(code=4401)
                    return

                if event == "message":
                    body = str((data or {}).get("body", "")).strip()
                    if not body:
                        await websocket.send_json({"type": "error", "detail": "Message cannot be empty."})
                        continue
                    if len(body) > 4000:
                        await websocket.send_json({"type": "error", "detail": "Message is too long."})
                        continue
                    message = chat_service.post_message(db, chat, actor, body)
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
                elif event == "typing":
                    await manager.broadcast(conversation_id, {"type": "typing", "user_id": actor.id})
                elif event == "read":
                    chat_service.mark_read(db, chat, actor)
                    await manager.broadcast(conversation_id, {"type": "read", "user_id": actor.id})
                else:
                    await websocket.send_json({"type": "error", "detail": "Unsupported event."})
            except Exception as exc:  # keep the socket alive on business errors
                logger.warning("WebSocket event failed: %s", exc)
                try:
                    await websocket.send_json({"type": "error", "detail": str(exc)})
                except Exception:
                    break
            finally:
                db.close()
    except WebSocketDisconnect:
        pass
    except Exception:  # pragma: no cover
        logger.exception("WebSocket crashed")
    finally:
        await manager.disconnect(conversation_id, websocket)
