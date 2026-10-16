"""
Scene media generation with gemini-nano-banana-2.1.

For every roleplay session we generate:
  1. a photoreal 360° panorama of the setting (21:9, mapped onto a sphere by the web client)
  2. a photoreal half-body portrait of the fictional character on a solid green screen
  3. four emotion variants of the same portrait via multi-turn image editing
     (happy / sad / angry / surprised), chroma-keyed client-side.

Generation is asynchronous: the session is usable (voice works) while images stream in.
The demo video uses pre-generated assets (same model) so the demo never waits or breaks.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from google.genai import types

from ..config import get_settings
from ..models.domain import SessionRecord
from ..services.session_store import store
from .client import get_genai_client

logger = logging.getLogger("scenetalk.media")

MEDIA_MODEL = "gemini-nano-banana-2.1"
EMOTION_VARIANTS: dict[str, str] = {
    "happy": "a warm genuine smile, relaxed eyes",
    "sad": "clearly sad and wistful (downcast eyes, slightly furrowed brow, closed mouth)",
    "angry": "clearly angry and stern (furrowed brow, tense jaw, intense glare)",
    "surprised": "clearly surprised (raised eyebrows, wide eyes, slightly open mouth)",
}
ALL_EMOTIONS = ["neutral", *EMOTION_VARIANTS.keys()]

_PANO_SUFFIX = (
    " Photorealistic equirectangular 360 degree panorama, seamless left-right wrap, "
    "eye-level camera, cinematic K-drama lighting, ultra detailed. No people, no text, no watermark."
)
_PORTRAIT_SUFFIX = (
    " Photorealistic half-body portrait, standing and facing the camera, neutral calm expression, "
    "soft cinematic key light. Plain solid bright green background (#00FF00) filling the entire frame "
    "behind the person, no shadows on the background, no props, no text. "
    "This is an original fictional character, not a real celebrity."
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _demo_urls() -> tuple[str, dict[str, str]]:
    return (
        "/assets/generated/demo/pano.jpg",
        {e: f"/assets/generated/demo/char_{e}.jpg" for e in ALL_EMOTIONS},
    )


def _panorama_prompt(rec: SessionRecord) -> str:
    w = rec.world
    base = w.backdrop_prompt_en.strip()
    if not base:
        base = (
            f"Interior setting for a Korean drama scene: {w.setting_title_ko}. {w.setting_summary_ko} "
            f"Time of day: {w.time_of_day}. Weather: {w.weather}. Mood: {', '.join(w.background_mood_tags) or 'tense, intimate'}."
        )
    return base + _PANO_SUFFIX


def _portrait_prompt(rec: SessionRecord) -> str:
    c = rec.character
    base = c.appearance_prompt_en.strip()
    if not base:
        base = (
            f"A fictional Korean person who is: {c.role_in_scene_ko}. Persona: {c.persona_summary_ko} "
            f"Setting: {rec.world.setting_title_ko}. Dress appropriately for that setting and era."
        )
    return base + _PORTRAIT_SUFFIX


def _generate_image_sync(
    prompt: str,
    aspect_ratio: str,
    ref_image: bytes | None = None,
    ref_mime: str = "image/jpeg",
) -> tuple[bytes, str] | None:
    client = get_genai_client()
    contents: list = [prompt]
    if ref_image:
        contents = [types.Part.from_bytes(data=ref_image, mime_type=ref_mime), prompt]
    t0 = time.perf_counter()
    try:
        r = client.models.generate_content(
            model=MEDIA_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio=aspect_ratio),
            ),
        )
    except Exception as e:
        logger.warning("nano-banana call failed (%s): %s", aspect_ratio, str(e)[:200])
        return None
    for cand in r.candidates or []:
        for p in (cand.content.parts if cand.content else []) or []:
            if getattr(p, "inline_data", None) and p.inline_data.data:
                logger.info(
                    "nano-banana ok aspect=%s bytes=%d latency_ms=%d",
                    aspect_ratio,
                    len(p.inline_data.data),
                    int((time.perf_counter() - t0) * 1000),
                )
                return p.inline_data.data, p.inline_data.mime_type or "image/jpeg"
    logger.warning("nano-banana returned no image (%s)", aspect_ratio)
    return None


def _ext_for(mime: str) -> str:
    return ".png" if "png" in mime else ".jpg"


async def _persist(rec: SessionRecord) -> None:
    rec.media.updated_at = _now_iso()
    await store.put(rec)


async def generate_scene_media(session_id: str) -> None:
    """Background task: fill `session.media` progressively. Never raises."""
    rec = await store.get(session_id)
    if not rec:
        return
    s = get_settings()
    force_live = os.environ.get("MEDIA_ALWAYS_GENERATE", "") == "1"
    demo_pano, demo_chars = _demo_urls()

    # Demo video → instant, pre-generated (same model) assets so the demo never waits.
    if (rec.video_id == s.DEMO_VIDEO_ID and not force_live) or not s.GEMINI_API_KEY:
        rec.media.status = "ready"
        rec.media.panorama_url = demo_pano
        rec.media.character_urls = dict(demo_chars)
        rec.media.model = f"{MEDIA_MODEL} (pre-generated)"
        await _persist(rec)
        return

    out_dir: Path = s.assets_dir / "generated" / session_id
    out_dir.mkdir(parents=True, exist_ok=True)
    url_base = f"/assets/generated/{session_id}"

    try:
        pano_task = asyncio.to_thread(_generate_image_sync, _panorama_prompt(rec), "21:9")
        char_task = asyncio.to_thread(_generate_image_sync, _portrait_prompt(rec), "3:4")
        pano_res, char_res = await asyncio.gather(pano_task, char_task)

        if pano_res:
            data, mime = pano_res
            (out_dir / f"pano{_ext_for(mime)}").write_bytes(data)
            rec.media.panorama_url = f"{url_base}/pano{_ext_for(mime)}"
        else:
            rec.media.panorama_url = demo_pano

        neutral_bytes: bytes | None = None
        neutral_mime = "image/jpeg"
        if char_res:
            neutral_bytes, neutral_mime = char_res
            (out_dir / f"char_neutral{_ext_for(neutral_mime)}").write_bytes(neutral_bytes)
            rec.media.character_urls["neutral"] = f"{url_base}/char_neutral{_ext_for(neutral_mime)}"
        else:
            rec.media.character_urls = dict(demo_chars)

        rec.media.status = "partial" if neutral_bytes else "ready"
        await _persist(rec)
        if not neutral_bytes:
            return

        async def _variant(emotion: str) -> None:
            prompt = (
                "Edit this photo: keep the exact same person, same clothing, same framing, "
                "same solid bright green background. Change only the facial expression to "
                f"{EMOTION_VARIANTS[emotion]}."
            )
            res = await asyncio.to_thread(
                _generate_image_sync, prompt, "3:4", neutral_bytes, neutral_mime
            )
            if res:
                data, mime = res
                (out_dir / f"char_{emotion}{_ext_for(mime)}").write_bytes(data)
                rec.media.character_urls[emotion] = f"{url_base}/char_{emotion}{_ext_for(mime)}"
                await _persist(rec)

        await asyncio.gather(*(_variant(e) for e in EMOTION_VARIANTS))
        rec.media.status = "ready"
        await _persist(rec)
    except Exception as e:  # pragma: no cover - defensive
        logger.exception("scene media generation failed for %s: %s", session_id, e)
        rec.media.status = "failed"
        rec.media.error = str(e)[:200]
        rec.media.panorama_url = rec.media.panorama_url or demo_pano
        if not rec.media.character_urls:
            rec.media.character_urls = dict(demo_chars)
        await _persist(rec)


def schedule_scene_media(session_id: str) -> None:
    """Fire-and-forget from request handlers."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(generate_scene_media(session_id))
