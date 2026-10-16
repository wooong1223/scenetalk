from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from pydantic import AliasChoices, BaseModel, Field, field_validator

# ---------- Gemini 4 Argon Telemetry & Showcase ----------

ThinkingLevelId = Literal["minimal", "low", "medium", "high"]
ArgonStageId = Literal[
    "scene_planner",
    "subtitle_explainer",
    "story_director",
    "hint_coach",
    "learning_verifier",
    "youtube_extractor",
    "lesson_builder",
]


class ArgonCallTrace(BaseModel):
    stage: ArgonStageId
    model: str = "gemini-4-argon"
    thinking_level: ThinkingLevelId
    interaction_id: str = ""
    previous_interaction_id: str | None = None
    latency_ms: int = 0
    repair_attempts: int = 0
    fallback_used: bool = False
    modalities: list[str] = Field(default_factory=lambda: ["text"])
    summary_ko: str = ""


# ---------- Subtitle / Watch Mode ----------


class SubtitleLine(BaseModel):
    index: int
    start_sec: float = Field(ge=0)
    end_sec: float = Field(ge=0)
    text_ko: str
    text_en: str = ""
    tokens: list[str] = Field(default_factory=list)


class SubtitleTrack(BaseModel):
    video_id: str
    title: str
    lines: list[SubtitleLine]


class ExplainRequest(BaseModel):
    video_id: str
    timestamp_sec: float = Field(ge=0)
    line_ko: str
    target_expression: str


class ExpressionNuance(BaseModel):
    expression: str
    meaning_ko: str
    meaning_en: str
    nuance_note: str = Field(description="When/with whom to use; politeness level")
    formality: Literal["casual", "polite", "formal"]
    examples_ko: list[str] = Field(min_length=2, max_length=3)
    practice_tip_ko: str


# ---------- Quiz Lesson (Gemini 4 Argon thinking_level="low") ----------

QuizKind = Literal["meaning_choice", "fill_blank", "match"]


class LessonVocab(BaseModel):
    expression: str
    meaning_ko: str
    meaning_en: str
    nuance_ko: str = ""
    example_ko: str = ""
    example_en: str = ""
    formality: Literal["casual", "polite", "formal"] = "polite"
    source_line_ko: str = ""

    @field_validator("formality", mode="before")
    @classmethod
    def _coerce_formality(cls, v: Any) -> str:
        s = str(v or "polite").strip().lower()
        return s if s in ("casual", "polite", "formal") else "polite"


class MatchPair(BaseModel):
    ko: str
    en: str


class QuizItem(BaseModel):
    kind: QuizKind
    expression: str = ""
    prompt_ko: str = Field(
        default="",
        description="Question text. For fill_blank: the Korean sentence with the target replaced by ____",
    )
    prompt_en: str = Field(default="", description="English translation / hint")
    choices: list[str] = Field(
        default_factory=list,
        description="Exactly 4 options for meaning_choice / fill_blank; empty for match",
    )
    answer_index: int = Field(default=0, ge=0, le=3)
    pairs: list[MatchPair] = Field(
        default_factory=list,
        description="Exactly 4 ko/en pairs for match; empty otherwise",
    )
    explanation_ko: str = ""

    @field_validator("kind", mode="before")
    @classmethod
    def _coerce_kind(cls, v: Any) -> str:
        s = str(v or "meaning_choice").strip().lower()
        return s if s in ("meaning_choice", "fill_blank", "match") else "meaning_choice"


class Lesson(BaseModel):
    video_id: str
    title_ko: str
    title_en: str = ""
    vocab: list[LessonVocab] = Field(min_length=3, max_length=10)
    quiz: list[QuizItem] = Field(min_length=3, max_length=14)
    argon_trace: ArgonCallTrace | None = None


# ---------- Generated Scene Media (gemini-nano-banana-2.1) ----------


class SceneMedia(BaseModel):
    status: Literal["pending", "partial", "ready", "failed"] = "pending"
    panorama_url: str | None = None
    character_urls: dict[str, str] = Field(default_factory=dict)
    model: str = "gemini-nano-banana-2.1"
    updated_at: str = ""
    error: str | None = None


# ---------- 3D World & Character ----------

TemplateId = Literal["cafe", "generic_room"]
TimeOfDay = Literal["day", "sunset", "night"]
Weather = Literal["clear", "rain"]
EmotionId = Literal["neutral", "happy", "sad", "angry", "surprised"]
GestureId = Literal["nod", "wave", "look_away", "smile", "shrug"]
PropKind = Literal[
    "counter",
    "table",
    "chair",
    "coffee_cup",
    "menu_board",
    "window",
    "rain_window",
    "door",
    "phone",
]


_VALID_PROP_KINDS = {
    "counter",
    "table",
    "chair",
    "coffee_cup",
    "menu_board",
    "window",
    "rain_window",
    "door",
    "phone",
}
_PROP_SYNONYMS = {
    "desk": "table",
    "cup": "coffee_cup",
    "tea_cup": "coffee_cup",
    "mug": "coffee_cup",
    "board": "menu_board",
    "sign": "menu_board",
    "notebook": "menu_board",
    "document": "menu_board",
    "telephone": "phone",
    "mobile": "phone",
    "umbrella": "door",
}


class PropSpec(BaseModel):
    id: str = Field(description="Unique within scene, e.g. 'coffee_cup_1' or 'coffee_cup'")
    kind: PropKind
    label_ko: str
    position: tuple[float, float, float] = (0.0, 0.8, -0.5)
    rotation_y: float = 0.0
    interactable: bool = True
    clue_text_ko: str = Field(
        default="",
        description="1-line hint injected into Live context when gazed at or clicked",
    )

    @field_validator("kind", mode="before")
    @classmethod
    def _coerce_kind(cls, v: Any) -> str:
        s = str(v or "table").strip().lower()
        if s in _VALID_PROP_KINDS:
            return s
        return _PROP_SYNONYMS.get(s, "table")

    @field_validator("position", mode="before")
    @classmethod
    def _coerce_position(cls, v: Any) -> tuple[float, float, float]:
        if isinstance(v, (list, tuple)) and len(v) >= 3:
            return (float(v[0]), float(v[1]), float(v[2]))
        if isinstance(v, dict):
            return (
                float(v.get("x", 0.0)),
                float(v.get("y", 0.8)),
                float(v.get("z", -0.5)),
            )
        return (0.0, 0.8, -0.5)


class LightingSpec(BaseModel):
    preset: Literal["warm_cafe", "cool_evening", "dramatic_neon"] = "warm_cafe"
    ambient_intensity: float = Field(default=0.7, ge=0.1, le=2.0)
    key_color_hex: str = Field(default="#ffd9a8", pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("preset", mode="before")
    @classmethod
    def _coerce_preset(cls, v: Any) -> str:
        s = str(v or "warm_cafe").strip().lower()
        if s in ("warm_cafe", "cool_evening", "dramatic_neon"):
            return s
        if "cool" in s or "night" in s or "rain" in s:
            return "cool_evening"
        if "neon" in s or "dramatic" in s:
            return "dramatic_neon"
        return "warm_cafe"

    @field_validator("key_color_hex", mode="before")
    @classmethod
    def _coerce_hex(cls, v: Any) -> str:
        s = str(v or "#ffd9a8").strip()
        if not s.startswith("#"):
            s = "#" + s
        if len(s) == 7:
            try:
                int(s[1:], 16)
                return s
            except ValueError:
                pass
        return "#ffd9a8"


class WorldSpec(BaseModel):
    template_id: TemplateId = "generic_room"
    setting_title_ko: str
    setting_summary_ko: str
    time_of_day: TimeOfDay = "sunset"
    weather: Weather = "clear"
    lighting: LightingSpec = Field(default_factory=LightingSpec)
    props: list[PropSpec] = Field(min_length=3, max_length=10)
    background_mood_tags: list[str] = Field(default_factory=list, max_length=5)
    backdrop_prompt_en: str = Field(
        default="",
        description="English prompt for a photoreal 360 panorama of this setting (no people, no text)",
    )

    @field_validator("background_mood_tags", mode="before")
    @classmethod
    def _limit_tags(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return [str(x) for x in v[:5]]
        return []


class CharacterSpec(BaseModel):
    id: str = "npc_main"
    display_name_ko: str
    role_in_scene_ko: str
    persona_summary_ko: str
    speaking_style_ko: str = Field(
        default="자연스럽고 감정이 살아있는 한국어 대화체",
        description="Politeness level, sentence endings, characteristic fillers",
    )
    relationship_to_user_ko: str = "드라마 장면 속 대화 상대"
    initial_emotion: EmotionId = "neutral"
    secret_or_tension_ko: str = Field(
        default="상대방의 진짜 의도를 확인하려 하고 있다.",
        description="Dramatic subtext that drives the scene's emotional arc",
    )
    opening_line_ko: str
    voice_name: str = "Kore"
    appearance_prompt_en: str = Field(
        default="",
        description="English prompt describing this fictional character's look (age, gender, era clothing, hair) for a photoreal portrait",
    )


# ---------- Story & Session State ----------

BeatPhase = Literal["opening", "rising_tension", "twist", "resolution"]
EventKind = Literal[
    "sudden_rain",
    "phone_rings",
    "misunderstanding",
    "confession_moment",
    "stranger_enters",
]


class StoryEvent(BaseModel):
    id: str
    kind: EventKind = "misunderstanding"
    title_ko: str
    description_ko: str
    world_patch_weather: Weather | None = None
    world_patch_lighting_preset: (
        Literal["warm_cafe", "cool_evening", "dramatic_neon"] | None
    ) = None
    director_instruction_ko: str = "극적인 반전 상황에 맞춰 대화를 이어가세요."

    @field_validator("kind", mode="before")
    @classmethod
    def _coerce_event_kind(cls, v: Any) -> str:
        s = str(v or "misunderstanding").strip().lower()
        if s in (
            "sudden_rain",
            "phone_rings",
            "misunderstanding",
            "confession_moment",
            "stranger_enters",
        ):
            return s
        return "misunderstanding"


class StoryState(BaseModel):
    phase: BeatPhase = "opening"
    turn_count: int = 0
    user_Goal_ko: str = Field(
        default="저장한 한국어 표현을 자연스럽게 사용해 대화를 이끌어가세요.",
        validation_alias=AliasChoices("user_Goal_ko", "user_goal_ko"),
    )
    saved_expressions: list[str] = Field(default_factory=list)
    used_expressions: list[str] = Field(default_factory=list)
    active_gaze_prop_id: str | None = None
    selected_prop_id: str | None = None
    triggered_events: list[StoryEvent] = Field(default_factory=list)
    candidate_events: list[StoryEvent] = Field(
        min_length=2,
        max_length=4,
        description="Pre-planned dramatic beats that can be triggered mid-scene",
    )

    @field_validator("candidate_events", mode="before")
    @classmethod
    def _limit_candidates(cls, v: Any) -> Any:
        if isinstance(v, list) and len(v) > 4:
            return v[:4]
        return v


class ScenePlan(BaseModel):
    """Combined output of ScenePlanner (single Gemini 4 Argon call)."""

    world: WorldSpec
    character: CharacterSpec
    initial_story: StoryState


# ---------- Turn-by-Turn Director ----------


class DirectorDecision(BaseModel):
    next_phase: BeatPhase
    character_emotion: EmotionId
    character_gesture: GestureId | None = None
    trigger_event_id: str | None = Field(
        default=None,
        description="Must match an id in StoryState.candidate_events or be null",
    )
    newly_used_expressions: list[str] = Field(default_factory=list)
    director_note_to_character_ko: str = Field(
        description="1–2 sentence stage direction injected into the Live session"
    )


# ---------- Instant Hint Coach (Gemini 4 Argon thinking_level="minimal") ----------


class HintItem(BaseModel):
    line_ko: str
    translation_en: str
    target_expression: str = ""
    nuance_tip_ko: str


class HintResponse(BaseModel):
    hints: list[HintItem] = Field(min_length=1, max_length=3)
    argon_coach_note_ko: str


# ---------- Transcript & End-of-Scene Report ----------


class TranscriptTurn(BaseModel):
    speaker: Literal["user", "character", "system"]
    text_ko: str
    timestamp_iso: str
    emotion: EmotionId | None = None


class CorrectionItem(BaseModel):
    user_utterance_ko: str
    issue_ko: str
    natural_rewrite_ko: str
    reason_en: str


class ExpressionUsageResult(BaseModel):
    expression: str
    used: bool
    evidence_utterance_ko: str = ""
    feedback_ko: str


class LearningReport(BaseModel):
    session_id: str
    fluency_score: int = Field(ge=0, le=100)
    summary_ko: str
    summary_en: str
    expression_results: list[ExpressionUsageResult]
    corrections: list[CorrectionItem] = Field(max_length=5)
    next_mission_ko: str
    story_comparison_ko: str = Field(
        default="",
        description="Comparison between the original YouTube scene plot and how the user's choices altered the story",
    )


# ---------- Session Record ----------


class CreateSessionRequest(BaseModel):
    video_id: str
    timestamp_sec: float = Field(ge=0)
    saved_expressions: list[str] = Field(default_factory=list, max_length=12)
    scene_screenshot_b64: str | None = None
    ui_language: Literal["en", "fr", "es"] = "en"


class SessionRecord(BaseModel):
    session_id: str
    created_at: datetime
    video_id: str
    timestamp_sec: float
    world: WorldSpec
    character: CharacterSpec
    story: StoryState
    transcript: list[TranscriptTurn] = Field(default_factory=list)
    report: LearningReport | None = None
    last_interaction_id: str | None = None
    last_director_note_ko: str = ""
    argon_traces: list[ArgonCallTrace] = Field(default_factory=list)
    media: SceneMedia = Field(default_factory=SceneMedia)
    user_language: Literal["en", "fr", "es"] = "en"
