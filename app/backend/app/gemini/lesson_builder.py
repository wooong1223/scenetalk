"""
Duolingo-style lesson builder (Gemini 4 Argon, thinking_level="low").

One verified call turns the subtitle track of a YouTube scene into:
  - 5–8 vocabulary cards (expression, meaning, nuance, example)
  - 6–10 quiz items: meaning_choice / fill_blank / match
Lessons are cached per video_id in memory and on disk (assets/lessons/{video_id}.json).
"""
from __future__ import annotations

import json
import logging
import random
import re
from pathlib import Path

from ..config import get_settings
from ..models.domain import (
    ArgonCallTrace,
    Lesson,
    LessonVocab,
    MatchPair,
    QuizItem,
    SubtitleLine,
    SubtitleTrack,
)
from .client import get_genai_client
from .subtitle_explainer import extract_youtube_subtitles
from .verifier import verified_call_with_trace

logger = logging.getLogger("scenetalk.lesson")
_CACHE: dict[str, Lesson] = {}
_YT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

_PROMPT = """
You are LessonBuilder for SceneTalk, a Duolingo-style Korean learning app built on K-drama scenes.
From the subtitle lines below, build ONE short lesson for an intermediate learner of Korean.

Rules:
1. `vocab`: pick 6 to 8 of the most useful, reusable Korean expressions/idioms/phrases that appear in the lines
   (not proper nouns). For each give `meaning_ko` (easy Korean paraphrase), `meaning_en`, `nuance_ko`
   (politeness/when to use/drama subtext, 1 sentence), `example_ko` (a NEW natural sentence), `example_en`,
   `formality`, and `source_line_ko` (the original subtitle line it came from).
2. `quiz`: build 8 to 10 items mixing the three kinds roughly evenly, each targeting one vocab expression:
   - "meaning_choice": `prompt_ko` = the Korean expression (optionally with the source line for context),
     `choices` = exactly 4 English meanings (1 correct + 3 plausible distractors), `answer_index`.
   - "fill_blank": `prompt_ko` = the source line (or a new sentence) with the expression replaced by "____",
     `choices` = exactly 4 Korean options (1 correct + 3 distractors from other vocab), `answer_index`,
     `prompt_en` = English translation of the full sentence as a hint.
   - "match": `pairs` = exactly 4 {{ko, en}} pairs drawn from the vocab. `choices` empty.
   Every item needs a 1-sentence `explanation_ko`.
3. Distractors must be wrong but believable. Shuffle correct answers across positions 0–3.
4. `title_ko`/`title_en`: a short lesson title based on the scene.

Video ID: {video_id}
Video title: {title}
Subtitle lines:
{lines}
""".strip()


def _lesson_cache_path(video_id: str) -> Path:
    return get_settings().assets_dir / "lessons" / f"{video_id}.json"


def _load_track(video_id: str) -> SubtitleTrack | None:
    s = get_settings()
    path = s.assets_dir / "subtitles" / f"{video_id}.json"
    if path.exists():
        return SubtitleTrack.model_validate_json(path.read_text("utf-8"))
    return None


def _sanitize(lesson: Lesson, video_id: str) -> Lesson:
    """Drop malformed quiz items; guarantee the client never sees an unplayable card."""
    good: list[QuizItem] = []
    for q in lesson.quiz:
        if q.kind == "match":
            if len(q.pairs) >= 3:
                q.pairs = q.pairs[:4]
                q.choices = []
                good.append(q)
        else:
            if len(q.choices) >= 2 and 0 <= q.answer_index < len(q.choices):
                q.choices = q.choices[:4]
                if q.answer_index >= len(q.choices):
                    q.answer_index = 0
                good.append(q)
    lesson.quiz = good
    lesson.video_id = video_id
    if len(lesson.quiz) < 3:
        fb = fallback_lesson(video_id, _load_track(video_id))
        lesson.quiz = (lesson.quiz + fb.quiz)[:10]
    return lesson


def fallback_lesson(video_id: str, track: SubtitleTrack | None) -> Lesson:
    """Deterministic lesson built straight from subtitle tokens (no network)."""
    rng = random.Random(video_id)
    lines: list[SubtitleLine] = list(track.lines) if track else []
    if not lines:
        lines = [
            SubtitleLine(index=0, start_sec=0, end_sec=3, text_ko="주변 눈치를 잘 봐야 해.",
                         text_en="You have to read the room carefully.", tokens=["눈치를 보다"]),
            SubtitleLine(index=1, start_sec=3, end_sec=6, text_ko="밀정이 되란 소리예요?",
                         text_en="Are you telling me to become a spy?", tokens=["밀정이 되란 소리예요?"]),
            SubtitleLine(index=2, start_sec=6, end_sec=9, text_ko="정체를 숨기고 백 일만 버티면 돼.",
                         text_en="Hide your identity and just hold out for a hundred days.", tokens=["정체를 숨기다"]),
        ]
    vocab: list[LessonVocab] = []
    seen: set[str] = set()
    for ln in lines:
        for tok in ln.tokens or []:
            if tok in seen or len(tok) < 2:
                continue
            seen.add(tok)
            vocab.append(
                LessonVocab(
                    expression=tok,
                    meaning_ko=f"'{tok}' — 장면 속 핵심 표현",
                    meaning_en=ln.text_en or "key expression from this scene",
                    nuance_ko="드라마 속 긴장감 있는 대화에서 쓰인 표현입니다.",
                    example_ko=ln.text_ko,
                    example_en=ln.text_en,
                    formality="polite",
                    source_line_ko=ln.text_ko,
                )
            )
            if len(vocab) >= 6:
                break
        if len(vocab) >= 6:
            break
    while len(vocab) < 3:
        ln = lines[len(vocab) % len(lines)]
        vocab.append(
            LessonVocab(expression=ln.text_ko, meaning_ko=ln.text_ko, meaning_en=ln.text_en,
                        example_ko=ln.text_ko, example_en=ln.text_en, source_line_ko=ln.text_ko)
        )

    quiz: list[QuizItem] = []
    meanings = [v.meaning_en for v in vocab]
    for i, v in enumerate(vocab):
        distract = [m for j, m in enumerate(meanings) if j != i]
        rng.shuffle(distract)
        choices = distract[:3] + [v.meaning_en]
        rng.shuffle(choices)
        quiz.append(
            QuizItem(
                kind="meaning_choice", expression=v.expression, prompt_ko=v.expression,
                prompt_en="Choose the closest English meaning.", choices=choices,
                answer_index=choices.index(v.meaning_en),
                explanation_ko=f"'{v.expression}'은(는) \"{v.meaning_en}\"라는 뜻입니다.",
            )
        )
        if v.expression in v.source_line_ko and len(vocab) >= 4:
            others = [o.expression for o in vocab if o.expression != v.expression]
            rng.shuffle(others)
            ch = others[:3] + [v.expression]
            rng.shuffle(ch)
            quiz.append(
                QuizItem(
                    kind="fill_blank", expression=v.expression,
                    prompt_ko=v.source_line_ko.replace(v.expression, "____", 1),
                    prompt_en=v.example_en, choices=ch, answer_index=ch.index(v.expression),
                    explanation_ko=f"원문: {v.source_line_ko}",
                )
            )
    if len(vocab) >= 4:
        quiz.append(
            QuizItem(
                kind="match", expression="",
                prompt_ko="표현과 뜻을 연결하세요.", prompt_en="Match each expression to its meaning.",
                pairs=[MatchPair(ko=v.expression, en=v.meaning_en) for v in vocab[:4]],
                explanation_ko="장면의 핵심 표현 4개입니다.",
            )
        )
    title = track.title if track else f"K-Scene {video_id}"
    return Lesson(
        video_id=video_id, title_ko=title[:40], title_en="Scene expressions",
        vocab=vocab[:8], quiz=quiz[:10],
        argon_trace=ArgonCallTrace(stage="lesson_builder", thinking_level="low",
                                   fallback_used=True, summary_ko="자막 토큰 기반 폴백 레슨"),
    )


async def build_lesson(video_id: str, *, force: bool = False) -> Lesson:
    if not force:
        if video_id in _CACHE:
            return _CACHE[video_id]
        p = _lesson_cache_path(video_id)
        if p.exists():
            try:
                lesson = Lesson.model_validate_json(p.read_text("utf-8"))
                _CACHE[video_id] = lesson
                return lesson
            except Exception as e:
                logger.warning("bad cached lesson %s: %s", video_id, e)

    track = _load_track(video_id)
    if track is None and _YT_ID_RE.match(video_id):
        track = await extract_youtube_subtitles(video_id)
    if track is None:
        track = _load_track(get_settings().DEMO_VIDEO_ID)

    lines_txt = "\n".join(
        f"[{ln.start_sec:.1f}s] {ln.text_ko} ({ln.text_en})" + (f"  tokens: {', '.join(ln.tokens)}" if ln.tokens else "")
        for ln in (track.lines if track else [])
    )
    prompt = _PROMPT.format(video_id=video_id, title=track.title if track else video_id, lines=lines_txt)
    s = get_settings()
    lesson, trace = await verified_call_with_trace(
        client=get_genai_client(),
        model=s.GEMINI_PLANNER_MODEL,
        prompt=prompt,
        schema=Lesson,
        thinking_level="low",
        timeout_sec=60.0,
        max_retries=1,
        fallback_factory=lambda: fallback_lesson(video_id, track),
        stage="lesson_builder",
        summary_ko="자막 기반 듀오링고형 레슨 생성 (어휘 카드 + 퀴즈)",
    )
    lesson = _sanitize(lesson, video_id)
    lesson.argon_trace = trace
    _CACHE[video_id] = lesson
    try:
        p = _lesson_cache_path(video_id)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(lesson.model_dump_json(indent=2), encoding="utf-8")
    except Exception as e:
        logger.warning("could not cache lesson: %s", e)
    return lesson
