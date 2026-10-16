from __future__ import annotations

import asyncio
from typing import Protocol
from ..models.domain import SessionRecord


class SessionStore(Protocol):
    async def put(self, record: SessionRecord) -> None: ...
    async def get(self, session_id: str) -> SessionRecord | None: ...
    async def list_all(self) -> list[SessionRecord]: ...


class InMemorySessionStore:
    def __init__(self) -> None:
        self._data: dict[str, SessionRecord] = {}
        self._lock = asyncio.Lock()

    async def put(self, record: SessionRecord) -> None:
        async with self._lock:
            self._data[record.session_id] = record

    async def get(self, session_id: str) -> SessionRecord | None:
        async with self._lock:
            return self._data.get(session_id)

    async def list_all(self) -> list[SessionRecord]:
        async with self._lock:
            return sorted(
                self._data.values(),
                key=lambda r: r.created_at,
                reverse=True,
            )


store = InMemorySessionStore()
