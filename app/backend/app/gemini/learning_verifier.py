from __future__ import annotations

from ..config import get_settings
from ..models.domain import LearningReport, SessionRecord
from .client import get_genai_client
from .fallbacks import fallback_learning_report
from .verifier import verified_call_with_trace


async def build_learning_report(session: SessionRecord) -> LearningReport:
    s = get_settings()
    transcript_txt = "\n".join(
        f"[{t.speaker}] {t.text_ko}" for t in session.transcript
    ) or "(No user utterances recorded in this session)"
    triggered_titles = [e.title_ko for e in session.story.triggered_events]
    prompt = (
        f"You are LearningVerifier for SceneTalk (session_id={session.session_id}).\n"
        f"Scene setting: {session.world.setting_title_ko}\n"
        f"Counterpart character: {session.character.display_name_ko} ({session.character.role_in_scene_ko})\n"
        f"User mission goal: {session.story.user_Goal_ko}\n"
        f"Saved target Korean expressions: {session.story.saved_expressions}\n"
        f"Expressions detected during live session: {session.story.used_expressions}\n"
        f"Triggered dramatic story events: {triggered_titles}\n"
        f"Full conversation transcript:\n{transcript_txt}\n\n"
        "Evaluate the learner's Korean performance thoroughly with deep reasoning (`thinking_level='high'`):\n"
        "1. Set `session_id` to the exact session_id above.\n"
        "2. Compute a fair `fluency_score` (0..100) based on appropriateness, politeness consistency, and expression mastery.\n"
        "3. Provide warm, encouraging `summary_ko` and `summary_en`.\n"
        "4. For EVERY expression in `saved_expressions`, include an `ExpressionUsageResult` in `expression_results` "
        "indicating whether it was used (`used`), the `evidence_utterance_ko` (if used), and specific `feedback_ko`.\n"
        "5. Provide up to 3 high-value `corrections` (`user_utterance_ko`, `issue_ko`, `natural_rewrite_ko`, `reason_en`).\n"
        "6. Suggest an inspiring `next_mission_ko` for their next scene replay.\n"
        "7. In `story_comparison_ko`, write a vivid 2-3 sentence comparison between the original K-drama clip's plot "
        "and how the user's dialogue & triggered story twists created a unique alternate ending."
    )
    report, trace = await verified_call_with_trace(
        client=get_genai_client(),
        model=s.GEMINI_PLANNER_MODEL,
        prompt=prompt,
        schema=LearningReport,
        thinking_level="high",
        timeout_sec=180.0,
        fallback_factory=lambda: fallback_learning_report(session),
        previous_interaction_id=session.last_interaction_id,
        stage="learning_verifier",
        summary_ko="심층 한국어 화용론 평가 및 멀티버스 스토리 비교 (thinking_level=high)",
    )
    report.session_id = session.session_id
    if not report.story_comparison_ko:
        report.story_comparison_ko = (
            f"원작 장면에서는 일방적인 제안과 긴장감 속에 대화가 끝났지만, "
            f"당신은 {session.character.display_name_ko}와(과) 직접 협상하며 "
            f"자신만의 한국어 표현으로 새로운 결말을 만들어냈습니다!"
        )
    if trace.interaction_id:
        session.last_interaction_id = trace.interaction_id
    session.argon_traces.append(trace)
    return report
