"""In-process WebSocket connection registry.

Each conversation has its own set of sockets. A multi-worker deployment would
replace this with a Redis pub/sub fan-out; the interface stays the same.
"""

import asyncio
from collections import defaultdict
from typing import Dict, List, Set

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: Dict[str, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, conversation_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[conversation_id].add(websocket)

    async def disconnect(self, conversation_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            room = self._rooms.get(conversation_id)
            if room:
                room.discard(websocket)
                if not room:
                    self._rooms.pop(conversation_id, None)

    async def broadcast(self, conversation_id: str, payload: dict) -> None:
        sockets: List[WebSocket] = list(self._rooms.get(conversation_id, set()))
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:  # pragma: no cover - dead socket cleanup
                await self.disconnect(conversation_id, socket)

    async def send_user(self, conversation_id: str, payload: dict) -> None:
        await self.broadcast(conversation_id, payload)


manager = ConnectionManager()
