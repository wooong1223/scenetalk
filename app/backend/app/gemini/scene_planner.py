from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any
from ..config import get_settings
from ..models.domain import ArgonCallTrace, CreateSessionRequest, ScenePlan, SubtitleTrack
from .client import get_genai_client
from .fallbacks import fallback_scene_plan
from .verifier import verified_call_with_trace

logger = logging.getLogger("scenetalk.scene_planner")
_YT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

_PLANNER_PROMPT = """
You are ScenePlanner for SceneTalk, an interactive 3D K-drama roleplay and Korean language learning experience.
The user will step into the SITUATION of this whole clip (anchored around {ts:.1f}s) and play the protagonist's side of the conversation.
Given the clip's dialogue and visuals and the user's saved Korean expressions {exprs}:
1. Choose template_id from ONLY ["cafe", "generic_room"] (use "generic_room" for offices, parlors, historical rooms, or indoor chambers; use "cafe" for cafes or restaurants).
2. Populate 4 to 6 interactive props whose `kind` is strictly from:
   ["counter", "table", "chair", "coffee_cup", "menu_board", "window", "rain_window", "door", "phone"]
   and give each prop a dramatic Korean `label_ko` and `clue_text_ko` tied to the video scene.
   Keep `position` within x in [-2.4, 2.4], y in [0.0, 2.0], z in [-2.2, 1.2].
3. Create ONE ORIGINAL FICTIONAL K-drama counterpart character (`CharacterSpec`) inspired by the scene's dramatic situation and tension.
   IMPORTANT: Never use a real actor's name (such as Kim Yoo-jung) or claim to be a real celebrity. Invent a fitting fictional character name in Korean.
   Set `voice_name` to "Kore" (female/warm) or "Puck" (male/energetic) or "Charon" (male/deep).
4. Set `initial_story.saved_expressions` to the exact list {exprs_json} and `initial_story.used_expressions` to [].
5. Pre-plan 2 to 3 dramatic `candidate_events` (`sudden_rain`, `phone_rings`, `misunderstanding`, `confession_moment`, `stranger_enters`) that can twist the story mid-conversation.
6. Write two ENGLISH image prompts for a photoreal image model:
   - `world.backdrop_prompt_en`: 2-3 sentences describing the physical space as a 360° interior/exterior view (era, architecture, furniture, window view, time of day, light color). No people, no text.
   - `character.appearance_prompt_en`: 1-2 sentences describing this FICTIONAL character's look (approximate age, gender, hairstyle, era-appropriate clothing, overall vibe). Never describe or name a real actor.

Subtitle context around timestamp {ts:.1f}s:
{subtitle_window}
""".strip()


def _load_subtitle_window(video_id: str, ts: float) -> str:
    s = get_settings()
    path = s.assets_dir / "subtitles" / f"{video_id}.json"
    track: SubtitleTrack | None = None
    if path.exists():
        track = SubtitleTrack.model_validate_json(path.read_text("utf-8"))
    else:
        # Subtitles extracted live from YouTube by Argon are cached in memory only.
        from .subtitle_explainer import _SUBTITLE_CACHE

        track = _SUBTITLE_CACHE.get(video_id)
    if track is None:
        return "(no subtitles available; analyze the attached YouTube video directly)"
    window = [ln for ln in track.lines if abs(ln.start_sec - ts) <= 60.0]
    if not window:
        window = track.lines[:10]
    header = f"Video Title: {track.title}\n"
    body = "\n".join(
        f"[{ln.start_sec:.1f}s-{ln.end_sec:.1f}s] {ln.text_ko} ({ln.text_en})"
        for ln in window
    )
    return header + body


async def plan_scene_with_trace(
    req: CreateSessionRequest,
) -> tuple[ScenePlan, ArgonCallTrace]:
    s = get_settings()
    exprs = (req.saved_expressions or ["밀정이 되란 소리예요?", "눈치를 보다"])[:6]
    subtitle_window = _load_subtitle_window(req.video_id, req.timestamp_sec)
    prompt = _PLANNER_PROMPT.format(
        ts=req.timestamp_sec,
        exprs=", ".join(exprs),
        exprs_json=json.dumps(exprs, ensure_ascii=False),
        subtitle_window=subtitle_window,
    )

    parts: list[Any] = []
    cached_sub_path = s.assets_dir / "subtitles" / f"{req.video_id}.json"
    if _YT_ID_RE.match(req.video_id) and not cached_sub_path.exists():
        yt_url = f"https://www.youtube.com/watch?v={req.video_id}"
        parts.append({"type": "video", "uri": yt_url})
        logger.info("ScenePlanner attaching direct YouTube URI for uncached video: %s", yt_url)

    if req.scene_screenshot_b64:
        try:
            raw_b64 = req.scene_screenshot_b64.split(",")[-1]
            base64.b64decode(raw_b64)
            parts.append(
                {
                    "type": "image",
                    "data": raw_b64,
                    "mime_type": "image/jpeg",
                }
            )
        except Exception:
            pass

    plan, trace = await verified_call_with_trace(
        client=get_genai_client(),
        model=s.GEMINI_PLANNER_MODEL,
        prompt=prompt,
        parts=parts or None,
        schema=ScenePlan,
        thinking_level="medium",
        timeout_sec=35.0,
        max_retries=1,
        fallback_factory=lambda: fallback_scene_plan(exprs, video_id=req.video_id),
        stage="scene_planner",
        summary_ko=f"멀티모달 3D 월드·캐릭터·스토리 설계 (thinking_level=medium, video={req.video_id})",
    )
    if _YT_ID_RE.match(req.video_id) and "video_context" not in trace.modalities:
        trace.modalities.append("video_context")
    plan.initial_story.saved_expressions = list(exprs)
    return plan, trace


async def plan_scene(req: CreateSessionRequest) -> ScenePlan:
    plan, _ = await plan_scene_with_trace(req)
    return plan
