from __future__ import annotations

from ..config import get_settings
from ..models.domain import ArgonCallTrace, DirectorDecision, SessionRecord
from .client import get_genai_client
from .fallbacks import fallback_director_decision
from .verifier import verified_call_with_trace


async def run_story_director_with_trace(
    session: SessionRecord,
) -> tuple[DirectorDecision, ArgonCallTrace]:
    s = get_settings()
    recent = "\n".join(
        f"{t.speaker}: {t.text_ko}" for t in session.transcript[-6:]
    )
    candidates = [
        {"id": e.id, "kind": e.kind, "title_ko": e.title_ko}
        for e in session.story.candidate_events
    ]
    prompt = (
        "You are StoryDirector for a live interactive K-drama scene.\n"
        f"Setting: {session.world.setting_title_ko}\n"
        f"Character: {session.character.display_name_ko} ({session.character.role_in_scene_ko})\n"
        f"Current phase: {session.story.phase}, turn_count: {session.story.turn_count}\n"
        f"User goal: {session.story.user_Goal_ko}\n"
        f"Saved target expressions: {session.story.saved_expressions}\n"
        f"Already used expressions: {session.story.used_expressions}\n"
        f"Active gaze prop: {session.story.active_gaze_prop_id}, selected prop: {session.story.selected_prop_id}\n"
        f"Candidate dramatic events (pick at most one id when turn_count >= 2 and tension warrants, else null): {candidates}\n"
        f"Recent dialogue turns:\n{recent}\n\n"
        "Decide the next narrative phase (`next_phase`), character emotion (`character_emotion`), "
        "optional gesture (`character_gesture`), optional `trigger_event_id` (must match a candidate id or null), "
        "any `newly_used_expressions` from the saved target expressions that the user used semantically in their latest turn, "
        "and a concise 1–2 sentence Korean stage direction (`director_note_to_character_ko`) for the character's next response."
    )
    decision, trace = await verified_call_with_trace(
        client=get_genai_client(),
        model=s.GEMINI_PLANNER_MODEL,
        prompt=prompt,
        schema=DirectorDecision,
        thinking_level="low",
        timeout_sec=15.0,
        fallback_factory=lambda: fallback_director_decision(session.story),
        max_retries=1,
        previous_interaction_id=session.last_interaction_id,
        stage="story_director",
        summary_ko=f"턴 {session.story.turn_count} 서사 디렉팅 (thinking_level=low)",
    )
    if trace.interaction_id:
        session.last_interaction_id = trace.interaction_id
    session.last_director_note_ko = decision.director_note_to_character_ko
    session.argon_traces.append(trace)
    return decision, trace


async def run_story_director(session: SessionRecord) -> DirectorDecision:
    decision, _ = await run_story_director_with_trace(session)
    return decision
