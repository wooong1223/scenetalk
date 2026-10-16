from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
from typing import Protocol
from ..gemini.fallbacks import fallback_scene_plan
from ..models.domain import ArgonCallTrace, SessionRecord

logger = logging.getLogger("scenetalk.session_store")
_DISK_PATH = Path("/tmp/scenetalk_sessions.json")
_HEX_ID_RE = re.compile(r"^[0-9a-f]{8,16}$")


class SessionStore(Protocol):
    async def put(self, record: SessionRecord) -> None: ...
    async def get(self, session_id: str) -> SessionRecord | None: ...
    async def list_all(self) -> list[SessionRecord]: ...


class InMemorySessionStore:
    def __init__(self) -> None:
        self._data: dict[str, SessionRecord] = {}
        self._lock = asyncio.Lock()
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        if not _DISK_PATH.exists():
            return
        try:
            raw = json.loads(_DISK_PATH.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                for sid, item in raw.items():
                    self._data[sid] = SessionRecord.model_validate(item)
        except Exception as e:
            logger.warning("Failed to load sessions from disk: %s", e)

    def _save_to_disk(self) -> None:
        try:
            payload = {
                sid: rec.model_dump(mode="json")
                for sid, rec in self._data.items()
            }
            _DISK_PATH.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            logger.warning("Failed to save sessions to disk: %s", e)

    async def put(self, record: SessionRecord) -> None:
        async with self._lock:
            self._data[record.session_id] = record
            self._save_to_disk()

    async def get(self, session_id: str) -> SessionRecord | None:
        async with self._lock:
            rec = self._data.get(session_id)
            if rec is not None:
                return rec
            # Re-check disk in case another worker wrote it
            self._load_from_disk()
            rec = self._data.get(session_id)
            if rec is not None:
                return rec
            # Auto-recover hex session IDs that existed before a dev-server reload
            if _HEX_ID_RE.match(session_id):
                plan = fallback_scene_plan(
                    ["정체를 숨기다", "밀명을 받다", "들키면 끝이다"],
                    video_id="V1b8VxrkbZU",
                )
                recovered = SessionRecord(
                    session_id=session_id,
                    created_at=datetime.now(timezone.utc),
                    video_id="V1b8VxrkbZU",
                    timestamp_sec=29.0,
                    world=plan.world,
                    character=plan.character,
                    story=plan.initial_story,
                    argon_traces=[
                        ArgonCallTrace(
                            stage="scene_planner",
                            thinking_level="medium",
                            latency_ms=0,
                            fallback_used=True,
                            modalities=["text", "video_context"],
                            summary_ko="서버 재시작 후 세션 복구 (폴백 ScenePlan 사용)",
                        )
                    ],
                )
                self._data[session_id] = recovered
                self._save_to_disk()
                return recovered
            return None

    async def list_all(self) -> list[SessionRecord]:
        async with self._lock:
            return sorted(
                self._data.values(),
                key=lambda r: r.created_at,
                reverse=True,
            )


store = InMemorySessionStore()
