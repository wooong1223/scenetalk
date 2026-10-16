from __future__ import annotations

from ..models.domain import (
    CharacterSpec,
    CorrectionItem,
    DirectorDecision,
    ExpressionNuance,
    ExpressionUsageResult,
    LearningReport,
    LightingSpec,
    PropSpec,
    ScenePlan,
    SessionRecord,
    StoryEvent,
    StoryState,
    WorldSpec,
)
from ..story.state import _stem_ko


def fallback_scene_plan(
    saved_expressions: list[str],
    video_id: str = "V1b8VxrkbZU",
) -> ScenePlan:
    exprs = saved_expressions or ["밀정이 되란 소리예요?", "눈치를 보다"]
    if video_id == "V1b8VxrkbZU":
        return ScenePlan(
            world=WorldSpec(
                template_id="generic_room",
                setting_title_ko="1930년대 경성 비밀 접선실 & 통역관 집무실",
                setting_summary_ko=(
                    "미국행 배편을 대가로 조선총독부 통역관으로 잠입하라는 비밀 제안을 받은 "
                    "긴장감 넘치는 경성의 응접실입니다."
                ),
                time_of_day="sunset",
                weather="clear",
                lighting=LightingSpec(
                    preset="warm_cafe",
                    ambient_intensity=0.75,
                    key_color_hex="#f6c98e",
                ),
                props=[
                    PropSpec(
                        id="table",
                        kind="table",
                        label_ko="고풍스러운 집무 책상",
                        position=(0.0, 0.4, -0.5),
                        clue_text_ko="책상 위에 미국행 선박 티켓과 위조 신분증이 놓여 있다.",
                    ),
                    PropSpec(
                        id="coffee_cup",
                        kind="coffee_cup",
                        label_ko="식어가는 찻잔",
                        position=(0.3, 0.85, -0.4),
                        clue_text_ko="접선 상대가 방금 내려놓은 찻잔에서 아직 온기가 느껴진다.",
                    ),
                    PropSpec(
                        id="menu_board",
                        kind="menu_board",
                        label_ko="작전 암호 보드",
                        position=(-1.8, 1.5, -1.8),
                        clue_text_ko="'백 일간의 잠입 — 정체를 숨길 것'이라는 지령이 적혀 있다.",
                    ),
                    PropSpec(
                        id="window",
                        kind="window",
                        label_ko="경성 거리가 내려다보이는 창문",
                        position=(2.2, 1.4, -1.2),
                        clue_text_ko="창밖으로 순사들이 순찰을 돌며 주변 눈치를 살피고 있다.",
                    ),
                    PropSpec(
                        id="phone",
                        kind="phone",
                        label_ko="앤티크 유선 전화기",
                        position=(-0.45, 0.85, -0.45),
                        clue_text_ko="총독부 인사과에서 언제든 확인 전화가 걸려올 수 있는 전화기다.",
                    ),
                    PropSpec(
                        id="door",
                        kind="door",
                        label_ko="집무실 나무 출입문",
                        position=(-2.2, 1.1, 0.8),
                        clue_text_ko="복도 밖에서 낮고 빠른 발소리가 가까워지고 있다.",
                    ),
                ],
                background_mood_tags=["경성시대", "잠입미션", "긴장감", "백일의거짓말"],
            ),
            character=CharacterSpec(
                id="npc_main",
                display_name_ko="강태준 (비밀 작전 책임자)",
                role_in_scene_ko="경성 잠입 작전을 지휘하며 당신에게 통역관 위장 잠입을 제안한 인물",
                persona_summary_ko=(
                    "냉철하고 침착해 보이지만 당신이 위험에 처할까 봐 속으로 걱정하는 "
                    "독립 비밀 조직의 핵심 요원."
                ),
                speaking_style_ko="차분하고 단호한 존댓말과 반말 혼용 ('~소', '~해요', '분명히 위험해질 겁니다')",
                relationship_to_user_ko="미국행 티켓을 조건으로 백 일간의 잠입 거래를 제안한 파트너",
                initial_emotion="neutral",
                secret_or_tension_ko="이번 총독부 잠입 작전이 생각보다 훨씬 위험해 당신을 끝까지 지켜야 한다는 책임감을 느끼고 있다.",
                opening_line_ko="너구나, 소문으로만 듣던 그 실력자가. 미국에 꼭 가고 싶다고 했나? 내 제안을 들을 준비가 됐는지 말해 봐요.",
                voice_name="Charon",
                appearance_prompt_en=(
                    "A fictional Korean man in his early 30s in 1930s Gyeongseong, slicked-back hair, "
                    "dark three-piece wool suit with a white shirt and dark tie, composed and watchful."
                ),
            ),
            initial_story=StoryState(
                phase="opening",
                turn_count=0,
                user_Goal_ko=(
                    "저장한 드라마 표현을 자연스럽게 사용해 잠입 조건을 협상하고 "
                    "강태준에게 당신의 각오를 증명하세요."
                ),
                saved_expressions=exprs,
                candidate_events=[
                    StoryEvent(
                        id="evt_phone_1",
                        kind="phone_rings",
                        title_ko="총독부에서 걸려온 긴급 전화",
                        description_ko="책상 위의 앤티크 전화기가 요란하게 울리며 신원 확인을 요구합니다!",
                        world_patch_lighting_preset="dramatic_neon",
                        director_instruction_ko=(
                            "전화벨 소리에 긴장하며 사용자에게 지금 당장 새로 부임한 통역관처럼 "
                            "침착하게 대답해 보라고 지시하세요."
                        ),
                    ),
                    StoryEvent(
                        id="evt_rain_1",
                        kind="sudden_rain",
                        title_ko="창밖 경성 거리에 쏟아지는 폭우와 순찰대",
                        description_ko="갑자기 폭우가 쏟아지며 창밖으로 경비대의 호루라기 소리가 들립니다.",
                        world_patch_weather="rain",
                        world_patch_lighting_preset="cool_evening",
                        director_instruction_ko=(
                            "창밖의 빗소리와 순찰대를 언급하며, 들키지 않으려면 주변 눈치를 잘 보고 "
                            "정체를 숨겨야 한다고 당부하세요."
                        ),
                    ),
                    StoryEvent(
                        id="evt_confess_1",
                        kind="confession_moment",
                        title_ko="강태준의 진심 어린 경고와 약속",
                        description_ko="강태준이 미국행 티켓을 건네며 반드시 살아 돌아오라고 진심을 고백합니다.",
                        world_patch_lighting_preset="warm_cafe",
                        director_instruction_ko=(
                            "분위기를 부드럽게 바꾸어, 백 일 뒤 반드시 미국으로 보내주겠다고 약속하며 "
                            "사용자의 마지막 대답을 이끌어내세요."
                        ),
                    ),
                ],
            ),
        )

    return ScenePlan(
        world=WorldSpec(
            template_id="cafe",
            setting_title_ko="서울 연남동의 비 오는 오후 카페",
            setting_summary_ko="창밖에 빗방울이 맺힌 아늑한 동네 카페에서 어색한 침묵이 흐르고 있습니다.",
            time_of_day="sunset",
            weather="rain",
            lighting=LightingSpec(
                preset="warm_cafe",
                ambient_intensity=0.8,
                key_color_hex="#ffd9a8",
            ),
            props=[
                PropSpec(
                    id="coffee_cup",
                    kind="coffee_cup",
                    label_ko="식어가는 아메리카노",
                    position=(0.25, 0.78, -0.4),
                    clue_text_ko="상대방이 아까부터 만지작거리기만 하고 마시지 않은 커피잔이다.",
                ),
                PropSpec(
                    id="menu_board",
                    kind="menu_board",
                    label_ko="칠판 메뉴판",
                    position=(-1.6, 1.5, -1.8),
                    clue_text_ko="'오늘의 추천: 따뜻한 바닐라 라떼'라고 적혀 있다.",
                ),
                PropSpec(
                    id="rain_window",
                    kind="rain_window",
                    label_ko="빗방울 맺힌 창문",
                    position=(1.8, 1.3, -1.0),
                    clue_text_ko="창밖으로 갑작스러운 소나기가 쏟아지고 있다.",
                ),
                PropSpec(
                    id="phone",
                    kind="phone",
                    label_ko="테이블 위 휴대폰",
                    position=(-0.3, 0.78, -0.45),
                    clue_text_ko="어제 부재중 전화 알림이 떠 있는 휴대폰이다.",
                ),
            ],
            background_mood_tags=["로맨스", "어색한기류", "비오는카페"],
        ),
        character=CharacterSpec(
            id="npc_main",
            display_name_ko="서연",
            role_in_scene_ko="어제 연락이 닿지 않아 서운해하는 오랜 친구",
            persona_summary_ko="겉으로는 아무렇지 않은 척하지만 속으로는 설명을 기다리는 다정한 성격.",
            speaking_style_ko="친근한 반말과 부드러운 어미 ('~잖아', '~거야?')",
            relationship_to_user_ko="미묘한 감정이 오가는 소꿉친구",
            initial_emotion="sad",
            secret_or_tension_ko="어제 사용자가 약속 시간에 연락이 없었던 이유를 듣고 싶어 한다.",
            opening_line_ko="왔어? 비도 오는데... 아까부터 왜 그렇게 내 눈치만 봐?",
            voice_name="Kore",
        ),
        initial_story=StoryState(
            phase="opening",
            turn_count=0,
            user_Goal_ko="저장한 한국어 표현을 자연스럽게 사용해 서연의 서운한 마음을 풀어주세요.",
            saved_expressions=exprs,
            candidate_events=[
                StoryEvent(
                    id="evt_rain_1",
                    kind="sudden_rain",
                    title_ko="갑작스러운 폭우",
                    description_ko="창밖의 빗소리가 거세지며 카페 조명이 한층 따뜻해집니다.",
                    world_patch_weather="rain",
                    world_patch_lighting_preset="warm_cafe",
                    director_instruction_ko="빗소리를 언급하며 우산이 하나뿐이라는 사실을 자연스럽게 꺼내세요.",
                ),
                StoryEvent(
                    id="evt_phone_1",
                    kind="phone_rings",
                    title_ko="테이블 위 휴대폰 진동",
                    description_ko="테이블 위 휴대폰이 갑자기 울리며 어제의 오해가 풀릴 단서가 나타납니다.",
                    world_patch_lighting_preset="dramatic_neon",
                    director_instruction_ko="휴대폰 화면을 보고 놀라며 어제 무슨 일이 있었는지 다시 물어보세요.",
                ),
                StoryEvent(
                    id="evt_confess_1",
                    kind="confession_moment",
                    title_ko="솔직한 속마음 고백",
                    description_ko="서연이 삐졌던 진짜 이유를 솔직하게 털어놓습니다.",
                    world_patch_lighting_preset="warm_cafe",
                    director_instruction_ko="부드러운 미소와 함께 사실은 많이 보고 싶었다고 고백하며 대화를 마무리로 이끄세요.",
                ),
            ],
        ),
    )


_KNOWN_NUANCES: dict[str, dict[str, str | list[str]]] = {
    "밀정이 되란 소리예요?": {
        "meaning_ko": "상대방의 제안이 '스파이(밀정)가 되라는 뜻이냐'고 놀라거나 따져 물을 때 쓰는 표현입니다.",
        "meaning_en": "Are you telling me to become a spy / informant? (incredulous rhetorical question)",
        "nuance_note": "'-(으)란 소리예요?'는 상대방의 의도를 되물으며 당황스러움이나 강한 감정을 표현할 때 드라마에서 자주 쓰입니다.",
        "formality": "polite",
        "examples_ko": [
            "지금 저보고 총독부의 밀정이 되란 소리예요?",
            "이 위험한 일을 혼자 다 하란 소리예요?",
            "그 말을 지금 믿으란 소리예요?",
        ],
        "practice_tip_ko": "상대방이 뜻밖의 제안을 했을 때 '밀정이 되란 소리예요?'라고 되물어 보세요.",
    },
    "나는 꼭 미국에 갈 거예요": {
        "meaning_ko": "어떤 어려움이 있어도 반드시 목표(미국행)를 이루겠다는 강한 의지를 나타내는 표현입니다.",
        "meaning_en": "I am definitely going to go to America (strong determination).",
        "nuance_note": "'꼭 -(으)ㄹ 거예요'는 화자의 확고한 결심과 목표를 정중하면서도 단호하게 전달합니다.",
        "formality": "polite",
        "examples_ko": [
            "나는 꼭 미국에 갈 거예요. 그러니까 이 작전을 수락하겠어요.",
            "이번 기회를 잡아서 나는 꼭 미국에 갈 거예요.",
            "무슨 일이 있어도 나는 꼭 해낼 거예요.",
        ],
        "practice_tip_ko": "작전을 수락하는 이유나 본인의 목표를 말할 때 이 표현을 힘주어 사용해 보세요.",
    },
    "눈치를 보다": {
        "meaning_ko": "상대방의 기분이나 주변 상황을 살피며 조심스럽게 행동하다.",
        "meaning_en": "To read the room / to gauge someone's mood or reaction cautiously.",
        "nuance_note": "일상 대화부터 잠입·로맨스 드라마까지 상대의 표정과 기류를 살필 때 가장 자주 쓰이는 관용 표현입니다.",
        "formality": "polite",
        "examples_ko": [
            "들키지 않으려면 주변 눈치를 잘 봐야 해요.",
            "아까부터 왜 그렇게 내 눈치를 봐요?",
            "너무 눈치 보지 말고 편하게 말해 봐요.",
        ],
        "practice_tip_ko": "'눈치를 보다', '눈치를 보지 마세요'처럼 상황에 맞게 활용해서 말해 보세요.",
    },
    "정체를 숨기다": {
        "meaning_ko": "자신의 본래 신분이나 진짜 모습을 남에게 들키지 않게 감추다.",
        "meaning_en": "To hide one's true identity / stay undercover.",
        "nuance_note": "시대극이나 스릴러 드라마에서 위장 잠입·비밀 임무를 수행할 때 핵심적으로 쓰이는 표현입니다.",
        "formality": "polite",
        "examples_ko": [
            "백 일 동안 완벽하게 정체를 숨겨야 합니다.",
            "총독부 안에서는 끝까지 정체를 숨길게요.",
            "정체를 숨기는 건 제가 제일 자신 있는 일이에요.",
        ],
        "practice_tip_ko": "잠입 각오를 다질 때 '정체를 숨기다 / 정체를 숨길게요' 형태로 발화해 보세요.",
    },
    "삐지다": {
        "meaning_ko": "사소한 일로 마음이 상해 토라지거나 서운해하다.",
        "meaning_en": "To sulk / to get mildly upset or pout.",
        "nuance_note": "친한 친구나 연인 사이에서 귀엽게 서운함을 표현하거나 달래줄 때 자주 씁니다.",
        "formality": "casual",
        "examples_ko": [
            "혹시 어제 연락 안 해서 아직도 삐진 거야?",
            "에이, 그런 걸로 삐지지 마.",
            "나 진짜 삐지기 직전이거든!",
        ],
        "practice_tip_ko": "상대방의 기분을 풀어줄 때 '혹시 삐진 거야?'라고 부드럽게 물어보세요.",
    },
}


def fallback_nuance(expression: str) -> ExpressionNuance:
    preset = _KNOWN_NUANCES.get(expression.strip())
    if preset:
        return ExpressionNuance(
            expression=expression,
            meaning_ko=str(preset["meaning_ko"]),
            meaning_en=str(preset["meaning_en"]),
            nuance_note=str(preset["nuance_note"]),
            formality=str(preset["formality"]),  # type: ignore[arg-type]
            examples_ko=list(preset["examples_ko"]),
            practice_tip_ko=str(preset["practice_tip_ko"]),
        )

    return ExpressionNuance(
        expression=expression,
        meaning_ko=f"'{expression}' — 드라마 대화에서 감정과 의도를 생생하게 전달하는 핵심 한국어 표현입니다.",
        meaning_en=f"'{expression}' — an expressive Korean phrase used to convey nuance and emotional subtext in K-dramas.",
        nuance_note="친밀한 대화나 극적인 상황에서 화자의 태도를 자연스럽게 강조할 때 사용합니다.",
        formality="polite",
        examples_ko=[
            f"지금 상황에서 '{expression}'라고 말하면 딱 맞겠네요.",
            f"그럴 땐 당황하지 말고 '{expression}'라고 대답해 보세요.",
        ],
        practice_tip_ko=f"오늘 대화에서 캐릭터의 말에 반응할 때 '{expression}'를 한 번 이상 소리 내어 사용해 보세요.",
    )


def fallback_director_decision(story: StoryState) -> DirectorDecision:
    next_phase = story.phase
    if story.turn_count >= 4:
        next_phase = "resolution"
    elif story.turn_count >= 2 and story.phase == "opening":
        next_phase = "rising_tension"

    return DirectorDecision(
        next_phase=next_phase,
        character_emotion="neutral",
        character_gesture="nod",
        trigger_event_id=None,
        newly_used_expressions=[],
        director_note_to_character_ko=(
            "사용자의 말에 자연스럽게 공감하며, 저장된 목표 표현을 사용할 수 있도록 짧게 질문을 이어가세요."
        ),
    )


def fallback_learning_report(session: SessionRecord) -> LearningReport:
    user_turns = [t.text_ko for t in session.transcript if t.speaker == "user"]
    results: list[ExpressionUsageResult] = []
    for expr in session.story.saved_expressions:
        stem = _stem_ko(expr)
        evidence = next(
            (u for u in user_turns if expr in u or (stem and stem in u)),
            "",
        )
        used = bool(evidence) or (expr in session.story.used_expressions)
        results.append(
            ExpressionUsageResult(
                expression=expr,
                used=used,
                evidence_utterance_ko=evidence,
                feedback_ko=(
                    f"대화 맥락에 맞게 '{expr}' 표현을 아주 자연스럽게 활용했습니다!"
                    if used
                    else f"아쉽게도 이번 씬에서는 '{expr}' 표현을 직접 발화하지 않았어요. 다음 씬에서 첫 마디로 시도해 보세요!"
                ),
            )
        )

    used_count = sum(1 for r in results if r.used)
    total_expr = max(1, len(results))
    base_score = 72 + int((used_count / total_expr) * 23) if user_turns else 60

    return LearningReport(
        session_id=session.session_id,
        fluency_score=min(98, base_score),
        summary_ko=(
            f"{session.character.display_name_ko}와의 드라마 씬 대화를 성공적으로 마쳤습니다! "
            f"총 {len(user_turns)}번의 발화 중 목표 표현 {used_count}/{len(results)}개를 달성했습니다."
        ),
        summary_en=(
            f"Completed the interactive K-drama scene with {session.character.display_name_ko}! "
            f"You spoke {len(user_turns)} turn(s) and used {used_count}/{len(results)} target expression(s)."
        ),
        expression_results=results,
        corrections=[
            CorrectionItem(
                user_utterance_ko=user_turns[0] if user_turns else "나는 꼭 미국에 갈 거예요.",
                issue_ko="감정선과 어조가 자연스러우나, 앞뒤 연결 어미를 더하면 훨씬 원어민 드라마 대사처럼 들립니다.",
                natural_rewrite_ko=(
                    f"제가 말씀드렸잖아요, {user_turns[0]}"
                    if user_turns
                    else "무슨 일이 있어도 나는 꼭 미국에 갈 거예요."
                ),
                reason_en="Adding contextual discourse markers ('제가 말씀드렸잖아요' / '무슨 일이 있어도') elevates dramatic naturalness.",
            )
        ],
        next_mission_ko="다음 도전: 스토리 반전 이벤트를 발동시킨 뒤, 사용하지 못한 표현까지 모두 활용해 엔딩을 바꿔보세요!",
        story_comparison_ko=(
            f"원작 장면에서는 주인공이 일방적으로 작전을 수락하거나 침묵했지만, "
            f"당신은 {session.character.display_name_ko}와(과) 직접 대면해 "
            f"목표 표현 {used_count}개를 구사하며 주도적으로 스토리를 이끌었습니다."
        ),
    )

