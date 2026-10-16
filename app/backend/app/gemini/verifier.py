from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any, Callable, Literal, TypeVar
from pydantic import BaseModel, ValidationError
from google import genai
from ..models.domain import ArgonCallTrace, ArgonStageId

logger = logging.getLogger("scenetalk.verifier")
T = TypeVar("T", bound=BaseModel)
ThinkingLevel = Literal["minimal", "low", "medium", "high"]

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _extract_json(text: str) -> str:
    text = (text or "").strip()
    m = _JSON_BLOCK_RE.search(text)
    if m:
        return m.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def _normalize_input_items(parts: list[Any] | None, full_prompt: str) -> list[Any]:
    items: list[Any] = []
    for p in parts or []:
        if isinstance(p, str):
            items.append({"type": "text", "text": p})
        else:
            items.append(p)
    items.append({"type": "text", "text": full_prompt})
    return items


def _detect_modalities(parts: list[Any] | None) -> list[str]:
    mods = ["text"]
    for p in parts or []:
        if isinstance(p, dict):
            ptype = p.get("type", "")
            if ptype and ptype not in mods:
                mods.append(str(ptype))
    return mods


def _read_interaction_text(ix: Any) -> str:
    output_text = getattr(ix, "output_text", None)
    if output_text:
        return str(output_text)
    outputs = getattr(ix, "outputs", None) or []
    for out in reversed(outputs):
        txt = getattr(out, "text", None)
        if txt:
            return str(txt)
    return ""


async def verified_call_with_trace(
    *,
    client: genai.Client,
    model: str,
    prompt: str,
    parts: list[Any] | None = None,
    schema: type[T],
    thinking_level: ThinkingLevel,
    timeout_sec: float,
    fallback_factory: Callable[[], T],
    max_retries: int = 2,
    previous_interaction_id: str | None = None,
    stage: ArgonStageId = "scene_planner",
    summary_ko: str = "",
) -> tuple[T, ArgonCallTrace]:
    """
    Execute verified_call and also return an ArgonCallTrace capturing the
    exact thinking_level, interaction_id, previous_interaction_id, latency_ms,
    repair_attempts, and input modalities used by Gemini 4 Argon.
    """
    schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False)
    base_instruction = (
        f"{prompt}\n\n"
        "Respond with ONLY a single valid JSON object matching this JSON Schema "
        "(no markdown fences, no commentary):\n"
        f"{schema_json}"
    )

    last_error = ""
    last_raw = ""
    current_prev_id = previous_interaction_id
    t_start = time.perf_counter()
    modalities = _detect_modalities(parts)

    for attempt in range(max_retries + 1):
        t0 = time.perf_counter()
        retry_suffix = (
            ""
            if attempt == 0
            else (
                f"\n\n[SELF-REPAIR ATTEMPT {attempt}]\n"
                f"Your previous output failed validation:\n{last_error}\n"
                f"Previous output (truncated):\n{last_raw[:600]}\n"
                "Return corrected JSON only."
            )
        )
        full_prompt = base_instruction + retry_suffix
        try:
            active_parts = parts if attempt == 0 else None
            create_kwargs: dict[str, Any] = {
                "model": model,
                "input": _normalize_input_items(active_parts, full_prompt),
                "generation_config": {"thinking_level": thinking_level},
            }
            if current_prev_id:
                create_kwargs["previous_interaction_id"] = current_prev_id

            ix = await asyncio.wait_for(
                client.aio.interactions.create(**create_kwargs),
                timeout=timeout_sec,
            )
            ix_id = str(getattr(ix, "id", "") or "")
            if ix_id:
                current_prev_id = ix_id
            last_raw = _read_interaction_text(ix)
            cleaned = _extract_json(last_raw)
            parsed = schema.model_validate_json(cleaned)
            dt = int((time.perf_counter() - t0) * 1000)
            total_dt = int((time.perf_counter() - t_start) * 1000)
            logger.info(
                "verified_call ok schema=%s attempt=%d latency_ms=%d ix_id=%s",
                schema.__name__,
                attempt,
                dt,
                ix_id[:16],
            )
            trace = ArgonCallTrace(
                stage=stage,
                model=model,
                thinking_level=thinking_level,
                interaction_id=ix_id,
                previous_interaction_id=previous_interaction_id,
                latency_ms=total_dt,
                repair_attempts=attempt,
                fallback_used=False,
                modalities=modalities,
                summary_ko=summary_ko or f"{schema.__name__} 생성 완료",
            )
            return parsed, trace
        except (ValidationError, json.JSONDecodeError) as e:
            last_error = str(e)
            dt = int((time.perf_counter() - t0) * 1000)
            logger.warning(
                "verified_call schema_fail schema=%s attempt=%d latency_ms=%d err=%s",
                schema.__name__,
                attempt,
                dt,
                last_error[:240],
            )
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            dt = int((time.perf_counter() - t0) * 1000)
            logger.warning(
                "verified_call api_fail schema=%s attempt=%d latency_ms=%d err=%s",
                schema.__name__,
                attempt,
                dt,
                last_error[:240],
            )

    total_dt = int((time.perf_counter() - t_start) * 1000)
    logger.error(
        "verified_call exhausted retries for schema=%s; using fallback",
        schema.__name__,
    )
    trace = ArgonCallTrace(
        stage=stage,
        model=model,
        thinking_level=thinking_level,
        interaction_id="",
        previous_interaction_id=previous_interaction_id,
        latency_ms=total_dt,
        repair_attempts=max_retries,
        fallback_used=True,
        modalities=modalities,
        summary_ko=summary_ko or f"{schema.__name__} 안전 폴백 적용",
    )
    return fallback_factory(), trace


async def verified_call(
    *,
    client: genai.Client,
    model: str,
    prompt: str,
    parts: list[Any] | None = None,
    schema: type[T],
    thinking_level: ThinkingLevel,
    timeout_sec: float,
    fallback_factory: Callable[[], T],
    max_retries: int = 2,
    previous_interaction_id: str | None = None,
) -> T:
    """
    Call Gemini 4 Argon via the Interactions API, validate against `schema`,
    retry up to `max_retries` times with the validation error fed back,
    and fall back to `fallback_factory()` if all attempts fail.
    """
    parsed, _ = await verified_call_with_trace(
        client=client,
        model=model,
        prompt=prompt,
        parts=parts,
        schema=schema,
        thinking_level=thinking_level,
        timeout_sec=timeout_sec,
        fallback_factory=fallback_factory,
        max_retries=max_retries,
        previous_interaction_id=previous_interaction_id,
    )
    return parsed
