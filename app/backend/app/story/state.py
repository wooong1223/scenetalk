from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from ..models.domain import (
    DirectorDecision,
    EmotionId,
    SessionRecord,
    StoryEvent,
    TranscriptTurn,
)


def _stem_ko(expr: str) -> str:
    """
    Lightweight Korean expression stemmer so conjugated user utterances
    (e.g. '눈치 보지 마', '삐졌어?', '밀정이 되란 소리야?', '정체를 숨길게요')
    match dictionary-form saved expressions ('눈치를 보다', '삐지다', '밀정이 되란 소리예요?', '정체를 숨기다').
    """
    s = expr.strip().rstrip("?.!~")
    if s.endswith("소리예요"):
        return s[: -len("소리예요")].strip()
    if s.endswith("거예요"):
        return s[: -len("거예요")].strip()
    if s.endswith("하다") and len(s) > 2:
        s = s[:-2]
    elif s.endswith("다") and len(s) > 2:
        s = s[:-1]
    # Remove object/subject particles inside multi-word idioms for flexible matching
    for particle in ("를 ", "을 ", "이 ", "가 "):
        if particle in s:
            head = s.split(particle)[0].strip()
            if len(head) >= 2:
                return head
    return s[: max(2, len(s) - 1)] if len(s) > 3 else s


def match_expression_in_text(expr: str, text_ko: str) -> bool:
    clean_text = text_ko.strip()
    if not clean_text:
        return False
    if expr in clean_text:
        return True
    stem = _stem_ko(expr)
    if stem and len(stem) >= 2 and stem in clean_text:
        return True
    # Also check without spaces
    no_space_text = clean_text.replace(" ", "")
    no_space_stem = stem.replace(" ", "")
    if no_space_stem and len(no_space_stem) >= 2 and no_space_stem in no_space_text:
        return True
    return False


def apply_turn(
    session: SessionRecord,
    speaker: Literal["user", "character", "system"],
    text_ko: str,
    emotion: EmotionId | None = None,
) -> list[str]:
    clean = text_ko.strip()
    if not clean:
        return []
    session.transcript.append(
        TranscriptTurn(
            speaker=speaker,
            text_ko=clean,
            timestamp_iso=datetime.now(timezone.utc).isoformat(),
            emotion=emotion,
        )
    )
    newly_used: list[str] = []
    if speaker == "user":
        session.story.turn_count += 1
        for expr in session.story.saved_expressions:
            if expr in session.story.used_expressions:
                continue
            if match_expression_in_text(expr, clean):
                session.story.used_expressions.append(expr)
                newly_used.append(expr)
    return newly_used


def apply_director_decision(
    session: SessionRecord,
    decision: DirectorDecision,
) -> StoryEvent | None:
    session.story.phase = decision.next_phase
    for expr in decision.newly_used_expressions:
        if (
            expr in session.story.saved_expressions
            and expr not in session.story.used_expressions
        ):
            session.story.used_expressions.append(expr)
    if decision.trigger_event_id:
        return apply_event(session, decision.trigger_event_id)
    return None


def apply_event(
    session: SessionRecord,
    event_id: str | None = None,
) -> StoryEvent | None:
    triggered_ids = {e.id for e in session.story.triggered_events}
    remaining = [
        e for e in session.story.candidate_events if e.id not in triggered_ids
    ]
    if not remaining:
        return None
    chosen = (
        next((e for e in remaining if e.id == event_id), None) or remaining[0]
    )
    session.story.triggered_events.append(chosen)
    session.story.phase = "twist"
    if chosen.world_patch_weather:
        session.world.weather = chosen.world_patch_weather
    if chosen.world_patch_lighting_preset:
        session.world.lighting.preset = chosen.world_patch_lighting_preset
    return chosen
