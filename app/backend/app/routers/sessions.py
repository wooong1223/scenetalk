from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, HTTPException
from ..gemini.hint_coach import generate_instant_hints
from ..gemini.learning_verifier import build_learning_report
from ..gemini.media import schedule_scene_media
from ..gemini.scene_planner import plan_scene_with_trace
from ..models.domain import (
    CreateSessionRequest,
    HintResponse,
    LearningReport,
    SessionRecord,
)
from ..services.session_store import store

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionRecord])
async def list_sessions() -> list[SessionRecord]:
    records = await store.list_all()
    return records[:10]


@router.post("", response_model=SessionRecord)
async def create_session(req: CreateSessionRequest) -> SessionRecord:
    plan, trace = await plan_scene_with_trace(req)
    rec = SessionRecord(
        session_id=uuid.uuid4().hex[:12],
        created_at=datetime.now(timezone.utc),
        video_id=req.video_id,
        timestamp_sec=req.timestamp_sec,
        world=plan.world,
        character=plan.character,
        story=plan.initial_story,
        last_interaction_id=trace.interaction_id or None,
        argon_traces=[trace],
        user_language=req.ui_language,
    )
    await store.put(rec)
    schedule_scene_media(rec.session_id)
    return rec


@router.get("/{session_id}", response_model=SessionRecord)
async def get_session(session_id: str) -> SessionRecord:
    rec = await store.get(session_id)
    if not rec:
        raise HTTPException(404, "Session not found")
    return rec


@router.post("/{session_id}/hint", response_model=HintResponse)
async def hint_session(session_id: str) -> HintResponse:
    rec = await store.get(session_id)
    if not rec:
        raise HTTPException(404, "Session not found")
    hints, _ = await generate_instant_hints(rec)
    await store.put(rec)
    return hints


@router.post("/{session_id}/complete", response_model=LearningReport)
async def complete_session(session_id: str) -> LearningReport:
    rec = await store.get(session_id)
    if not rec:
        raise HTTPException(404, "Session not found")
    report = await build_learning_report(rec)
    rec.report = report
    await store.put(rec)
    return report
