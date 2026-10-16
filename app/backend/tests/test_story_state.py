from datetime import datetime, timezone
from app.gemini.fallbacks import fallback_scene_plan
from app.models.domain import DirectorDecision, SessionRecord
from app.story.state import apply_director_decision, apply_event, apply_turn


def _make_session() -> SessionRecord:
    plan = fallback_scene_plan(["밀정이 되란 소리예요?", "눈치를 보다"], video_id="V1b8VxrkbZU")
    return SessionRecord(
        session_id="test_sess_1",
        created_at=datetime.now(timezone.utc),
        video_id="V1b8VxrkbZU",
        timestamp_sec=16.5,
        world=plan.world,
        character=plan.character,
        story=plan.initial_story,
    )


def test_apply_turn_matches_korean_expressions_and_stems():
    sess = _make_session()
    newly = apply_turn(sess, "user", "지금 저보고 밀정이 되란 소리예요? 주변 눈치를 보지 않을 수 없네요.")
    assert "밀정이 되란 소리예요?" in newly
    assert "눈치를 보다" in newly
    assert sess.story.turn_count == 1
    assert len(sess.story.used_expressions) == 2


def test_apply_event_updates_phase_and_world_patches():
    sess = _make_session()
    ev = apply_event(sess, "evt_rain_1")
    assert ev is not None
    assert ev.id == "evt_rain_1"
    assert sess.story.phase == "twist"
    assert sess.world.weather == "rain"
    assert sess.world.lighting.preset == "cool_evening"


def test_apply_director_decision_triggers_candidate_event():
    sess = _make_session()
    decision = DirectorDecision(
        next_phase="rising_tension",
        character_emotion="surprised",
        character_gesture="nod",
        trigger_event_id="evt_phone_1",
        newly_used_expressions=["눈치를 보다"],
        director_note_to_character_ko="전화벨 소리에 긴장하며 대답을 재촉하세요.",
    )
    ev = apply_director_decision(sess, decision)
    assert ev is not None
    assert ev.id == "evt_phone_1"
    assert "눈치를 보다" in sess.story.used_expressions
    assert sess.story.phase == "twist"
