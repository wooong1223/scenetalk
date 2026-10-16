from __future__ import annotations

from ..config import get_settings
from ..models.domain import ArgonCallTrace, HintItem, HintResponse, SessionRecord
from .client import get_genai_client
from .verifier import verified_call_with_trace


def fallback_hints(session: SessionRecord) -> HintResponse:
    unused = [
        e
        for e in session.story.saved_expressions
        if e not in session.story.used_expressions
    ]
    target1 = unused[0] if unused else (
        session.story.saved_expressions[0]
        if session.story.saved_expressions
        else "눈치를 보다"
    )
    target2 = unused[1] if len(unused) > 1 else (
        session.story.saved_expressions[-1]
        if session.story.saved_expressions
        else "나는 꼭 미국에 갈 거예요"
    )
    return HintResponse(
        hints=[
            HintItem(
                line_ko=f"솔직히 말씀드리면... 지금 저보고 '{target1}' 같은 상황을 감수하라는 말씀인가요?",
                translation_en=f"Speaking honestly... are you asking me to handle a situation like '{target1}'?",
                target_expression=target1,
                nuance_tip_ko="상대방의 의중을 떠보며 극적인 긴장감을 높이는 대사입니다.",
            ),
            HintItem(
                line_ko=f"더 이상 망설이지 않겠어요. '{target2}'라는 제 결심은 변함없으니까요.",
                translation_en=f"I won't hesitate any longer. Because my resolve ('{target2}') remains unchanged.",
                target_expression=target2,
                nuance_tip_ko="단호하고 또렷한 어조로 말하면 캐릭터의 신뢰를 얻을 수 있습니다.",
            ),
        ],
        argon_coach_note_ko="Gemini 4 Argon (minimal thinking)이 현재 씬 맥락과 미사용 목표 표현을 결합해 즉석 대사를 추천했습니다.",
    )


async def generate_instant_hints(
    session: SessionRecord,
) -> tuple[HintResponse, ArgonCallTrace]:
    """
    Showcase Gemini 4 Argon's ultra-fast `thinking_level="minimal"` mode:
    Generates 2 context-aware K-drama lines in <1.5s that naturally weave in
    the learner's remaining saved expressions and current 3D gaze prop.
    """
    s = get_settings()
    unused = [
        e
        for e in session.story.saved_expressions
        if e not in session.story.used_expressions
    ]
    recent = "\n".join(
        f"{t.speaker}: {t.text_ko}" for t in session.transcript[-4:]
    ) or f"character: {session.character.opening_line_ko}"

    gaze_info = ""
    if session.story.active_gaze_prop_id:
        prop = next(
            (p for p in session.world.props if p.id == session.story.active_gaze_prop_id),
            None,
        )
        if prop:
            gaze_info = f"User is currently gazing at prop: {prop.label_ko} ({prop.clue_text_ko})"

    prompt = (
        "You are an instant K-drama dialogue coach powered by Gemini 4 Argon (thinking_level='minimal').\n"
        f"Setting: {session.world.setting_title_ko}\n"
        f"Counterpart character: {session.character.display_name_ko} ({session.character.speaking_style_ko})\n"
        f"Current narrative phase: {session.story.phase}\n"
        f"Unused target Korean expressions to practice: {unused or session.story.saved_expressions}\n"
        f"{gaze_info}\n"
        f"Recent dialogue:\n{recent}\n\n"
        "Give the learner 2 natural, dramatic Korean response lines (`hints`) they can speak right now "
        "that weave in the unused target expressions, along with English translations and a 1-line speaking tip."
    )
    res, trace = await verified_call_with_trace(
        client=get_genai_client(),
        model=s.GEMINI_PLANNER_MODEL,
        prompt=prompt,
        schema=HintResponse,
        thinking_level="minimal",
        timeout_sec=12.0,
        fallback_factory=lambda: fallback_hints(session),
        max_retries=1,
        previous_interaction_id=session.last_interaction_id,
        stage="hint_coach",
        summary_ko="실시간 K-드라마 대사 코칭 (thinking_level=minimal)",
    )
    if trace.interaction_id:
        session.last_interaction_id = trace.interaction_id
    session.argon_traces.append(trace)
    return res, trace
