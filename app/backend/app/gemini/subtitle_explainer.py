from __future__ import annotations

import logging
import re
from ..config import get_settings
from ..models.domain import (
    ExplainRequest,
    ExpressionNuance,
    SubtitleLine,
    SubtitleTrack,
)
from .client import get_genai_client
from .fallbacks import fallback_nuance
from .verifier import verified_call

logger = logging.getLogger("scenetalk.subtitle_explainer")
_CACHE: dict[tuple[str, str], ExpressionNuance] = {}
_SUBTITLE_CACHE: dict[str, SubtitleTrack] = {}
_YT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


async def explain_expression(req: ExplainRequest) -> ExpressionNuance:
    key = (req.video_id, req.target_expression.strip())
    if key in _CACHE:
        return _CACHE[key]

    s = get_settings()
    prompt = (
        "You are a Korean language & K-drama nuance coach for overseas K-content learners.\n"
        f"Video ID: {req.video_id} (timestamp {req.timestamp_sec:.1f}s)\n"
        f"Scene dialogue line: {req.line_ko}\n"
        f"Target Korean expression: {req.target_expression}\n\n"
        "Explain the exact meaning in Korean (`meaning_ko`) and English (`meaning_en`), "
        "its social/emotional nuance and politeness level (`nuance_note`, `formality`), "
        "2–3 natural Korean example sentences (`examples_ko`), and a 1-sentence roleplay "
        "speaking tip (`practice_tip_ko`) for using this expression inside the scene."
    )
    res = await verified_call(
        client=get_genai_client(),
        model=s.GEMINI_PLANNER_MODEL,
        prompt=prompt,
        schema=SubtitleTrack if False else ExpressionNuance,
        thinking_level="low",
        timeout_sec=30.0,
        fallback_factory=lambda: fallback_nuance(req.target_expression),
    )
    _CACHE[key] = res
    return res


async def extract_youtube_subtitles(video_id: str) -> SubtitleTrack | None:
    """
    If a user opens a YouTube video_id not pre-authored in assets/subtitles/,
    use Gemini 4 Argon's direct YouTube URL ingestion to transcribe & extract
    Korean dialogue lines and key expressions dynamically.
    """
    if video_id in _SUBTITLE_CACHE:
        return _SUBTITLE_CACHE[video_id]
    if not _YT_ID_RE.match(video_id):
        return None

    s = get_settings()
    yt_url = f"https://www.youtube.com/watch?v={video_id}"
    prompt = (
        f"Watch this YouTube video ({yt_url}) and extract 6 to 12 key Korean dialogue lines "
        "with accurate `start_sec`, `end_sec`, `text_ko`, `text_en`, and 2–3 notable Korean "
        "expressions/idioms in `tokens` for each line. Set `video_id` to "
        f"'{video_id}' and `title` to the Korean title or scene summary."
    )
    track = await verified_call(
        client=get_genai_client(),
        model=s.GEMINI_PLANNER_MODEL,
        prompt=prompt,
        parts=[{"type": "video", "uri": yt_url}],
        schema=SubtitleTrack,
        thinking_level="low",
        timeout_sec=60.0,
        fallback_factory=lambda: SubtitleTrack(
            video_id=video_id,
            title=f"YouTube K-Scene ({video_id})",
            lines=[
                SubtitleLine(
                    index=0,
                    start_sec=0.0,
                    end_sec=5.0,
                    text_ko="지금 무슨 생각을 하고 있는지 솔직하게 말해 봐요.",
                    text_en="Tell me honestly what you are thinking right now.",
                    tokens=["솔직하게", "말해 봐요", "눈치를 보다"],
                )
            ],
        ),
        max_retries=1,
    )
    _SUBTITLE_CACHE[video_id] = track
    return track
