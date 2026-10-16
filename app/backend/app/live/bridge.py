from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any
from fastapi import WebSocket, WebSocketDisconnect
from google.genai import types
from pydantic import TypeAdapter

from ..config import get_settings
from ..gemini.client import get_genai_client
from ..gemini.story_director import run_story_director_with_trace
from ..models.domain import EmotionId, GestureId, SessionRecord
from ..models.ws import (
    ClientWsMessage,
    WsAudioChunkIn,
    WsAudioChunkOut,
    WsCharacterStateOut,
    WsErrorOut,
    WsGazeChangedIn,
    WsObjectSelectedIn,
    WsReadyOut,
    WsStoryUpdateOut,
    WsTranscriptOut,
    WsTriggerEventIn,
    WsUserSpeechEndIn,
    WsUserTextIn,
)
from ..services.session_store import store
from ..story.state import apply_director_decision, apply_event, apply_turn
from .context import build_system_instruction
from .tools import LIVE_TOOLS

logger = logging.getLogger("scenetalk.live")
_CLIENT_MSG_ADAPTER: TypeAdapter[ClientWsMessage] = TypeAdapter(ClientWsMessage)
_VALID_EMOTIONS: set[str] = {"neutral", "happy", "sad", "angry", "surprised"}
_VALID_GESTURES: set[str] = {"nod", "wave", "look_away", "smile", "shrug"}


async def _send_ws(ws: WebSocket, payload: Any) -> None:
    try:
        await ws.send_text(payload.model_dump_json())
    except Exception:
        pass


async def _send_director_text(
    live: Any,
    text: str,
    *,
    turn_complete: bool,
) -> None:
    await live.send_client_content(
        turns=[
            types.Content(
                role="user",
                parts=[types.Part(text=text)],
            )
        ],
        turn_complete=turn_complete,
    )


async def _run_director_step(
    session: SessionRecord,
    ws: WebSocket,
    live: Any,
    current_emotion_ref: list[EmotionId],
) -> None:
    """
    Run Gemini 4 Argon StoryDirector (`thinking_level="low"`) after a user turn,
    update StoryState, emit WsStoryUpdateOut (with ArgonCallTrace!), and inject
    stage directions into the active Gemini 3.8 Live session.
    """
    try:
        decision, trace = await run_story_director_with_trace(session)
        ev = apply_director_decision(session, decision)
        current_emotion_ref[0] = decision.character_emotion
        await _send_ws(
            ws,
            WsCharacterStateOut(
                emotion=decision.character_emotion,
                gesture=decision.character_gesture,
            ),
        )
        await _send_ws(
            ws,
            WsStoryUpdateOut(
                phase=session.story.phase,
                used_expressions=session.story.used_expressions,
                event=ev,
                weather=session.world.weather,
                lighting_preset=session.world.lighting.preset,
                director_note_ko=decision.director_note_to_character_ko,
                argon_trace=trace,
            ),
        )
        note = f"[DIRECTOR NOTE] {decision.director_note_to_character_ko}"
        if ev:
            note += f" / [EVENT: {ev.title_ko}] {ev.director_instruction_ko}"
        await _send_director_text(live, note, turn_complete=False)
        await store.put(session)
    except Exception as e:
        logger.warning("StoryDirector background step failed: %s", e)


async def run_live_bridge(ws: WebSocket, session: SessionRecord) -> None:
    await ws.accept()
    s = get_settings()
    client = get_genai_client()

    live_cfg = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=types.Content(
            parts=[types.Part(text=build_system_instruction(session))]
        ),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=session.character.voice_name
                )
            )
        ),
        tools=LIVE_TOOLS,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )

    try:
        async with client.aio.live.connect(
            model=s.GEMINI_LIVE_MODEL,
            config=live_cfg,
        ) as live:
            await _send_ws(ws, WsReadyOut(session_id=session.session_id))
            await _send_director_text(
                live,
                f"[OPENING] 사용자가 방금 장면에 들어왔습니다. 첫 대사로 자연스럽게 말을 건네세요: {session.character.opening_line_ko}",
                turn_complete=True,
            )

            current_emotion_ref: list[EmotionId] = [
                session.character.initial_emotion
            ]
            t1 = asyncio.create_task(
                _pump_client_to_live(ws, live, session, current_emotion_ref)
            )
            t2 = asyncio.create_task(
                _pump_live_to_client(ws, live, session, current_emotion_ref)
            )
            done, pending = await asyncio.wait(
                {t1, t2},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for p in pending:
                p.cancel()
            for d in done:
                exc = d.exception()
                if exc and not isinstance(exc, (WebSocketDisconnect, asyncio.CancelledError)):
                    logger.warning("Bridge task ended with exception: %s", exc)
    except WebSocketDisconnect:
        logger.info("Client disconnected session=%s", session.session_id)
    except Exception as e:
        logger.exception("LiveBridge error session=%s: %s", session.session_id, e)
        await _send_ws(
            ws,
            WsErrorOut(
                code="LIVE_BRIDGE_ERROR",
                message=str(e)[:200],
                recoverable=True,
            ),
        )
    finally:
        await store.put(session)


async def _pump_client_to_live(
    ws: WebSocket,
    live: Any,
    session: SessionRecord,
    current_emotion_ref: list[EmotionId],
) -> None:
    while True:
        raw = await ws.receive_text()
        msg = _CLIENT_MSG_ADAPTER.validate_json(raw)

        if isinstance(msg, WsAudioChunkIn):
            pcm_bytes = base64.b64decode(msg.pcm16_b64)
            await live.send_realtime_input(
                audio=types.Blob(
                    data=pcm_bytes,
                    mime_type="audio/pcm;rate=16000",
                )
            )

        elif isinstance(msg, WsUserSpeechEndIn):
            # Flush the Push-to-Talk audio stream so Gemini 3.8 Live responds immediately
            try:
                await live.send_realtime_input(audio_stream_end=True)
            except Exception:
                # Fallback: send 300ms of silence if audio_stream_end is not accepted
                silence = bytes(16000 * 2 * 3 // 10)
                await live.send_realtime_input(
                    audio=types.Blob(
                        data=silence,
                        mime_type="audio/pcm;rate=16000",
                    )
                )

        elif isinstance(msg, WsUserTextIn):
            user_text = msg.text_ko.strip()
            if not user_text:
                continue
            apply_turn(session, "user", user_text)
            await _send_ws(
                ws,
                WsTranscriptOut(speaker="user", text_ko=user_text, final=True),
            )
            await _send_director_text(live, user_text, turn_complete=True)
            asyncio.create_task(
                _run_director_step(session, ws, live, current_emotion_ref)
            )

        elif isinstance(msg, WsGazeChangedIn):
            session.story.active_gaze_prop_id = msg.prop_id
            prop = next(
                (p for p in session.world.props if p.id == msg.prop_id),
                None,
            )
            if prop and prop.clue_text_ko:
                await _send_director_text(
                    live,
                    f"[DIRECTOR NOTE] 사용자가 지금 '{prop.label_ko}'을(를) 바라보고 있습니다 ({prop.clue_text_ko}). 다음 대사에서 자연스럽게 언급해도 좋습니다.",
                    turn_complete=False,
                )

        elif isinstance(msg, WsObjectSelectedIn):
            session.story.selected_prop_id = msg.prop_id
            prop = next(
                (p for p in session.world.props if p.id == msg.prop_id),
                None,
            )
            if prop:
                await _send_director_text(
                    live,
                    f"[DIRECTOR NOTE] 사용자가 방금 '{prop.label_ko}'을(를) 클릭해 살펴보았습니다 ({prop.clue_text_ko}). 이에 대해 즉각 한마디 반응하세요.",
                    turn_complete=True,
                )

        elif isinstance(msg, WsTriggerEventIn):
            ev = apply_event(session, msg.event_id)
            if ev:
                await _send_ws(
                    ws,
                    WsStoryUpdateOut(
                        phase=session.story.phase,
                        used_expressions=session.story.used_expressions,
                        event=ev,
                        weather=session.world.weather,
                        lighting_preset=session.world.lighting.preset,
                        director_note_ko=ev.director_instruction_ko,
                    ),
                )
                await _send_director_text(
                    live,
                    f"[EVENT: {ev.title_ko}] {ev.description_ko} — 지시: {ev.director_instruction_ko}",
                    turn_complete=True,
                )


async def _pump_live_to_client(
    ws: WebSocket,
    live: Any,
    session: SessionRecord,
    current_emotion_ref: list[EmotionId],
) -> None:
    char_text_buf: list[str] = []
    user_text_buf: list[str] = []

    while True:
        async for msg in live.receive():
            # 1. Non-blocking tool calls from Gemini 3.8 Live
            if getattr(msg, "tool_call", None) and msg.tool_call.function_calls:
                responses: list[types.FunctionResponse] = []
                for call in msg.tool_call.function_calls:
                    args = dict(call.args or {})
                    if call.name == "set_emotion":
                        emo_raw = str(args.get("emotion", "neutral"))
                        emo: EmotionId = (
                            emo_raw  # type: ignore[assignment]
                            if emo_raw in _VALID_EMOTIONS
                            else "neutral"
                        )
                        current_emotion_ref[0] = emo
                        await _send_ws(ws, WsCharacterStateOut(emotion=emo))
                    elif call.name == "play_gesture":
                        gest_raw = str(args.get("gesture", "nod"))
                        gest: GestureId = (
                            gest_raw  # type: ignore[assignment]
                            if gest_raw in _VALID_GESTURES
                            else "nod"
                        )
                        await _send_ws(
                            ws,
                            WsCharacterStateOut(
                                emotion=current_emotion_ref[0],
                                gesture=gest,
                            ),
                        )
                    elif call.name == "propose_story_event":
                        ev = apply_event(session, None)
                        if ev:
                            await _send_ws(
                                ws,
                                WsStoryUpdateOut(
                                    phase=session.story.phase,
                                    used_expressions=session.story.used_expressions,
                                    event=ev,
                                    weather=session.world.weather,
                                    lighting_preset=session.world.lighting.preset,
                                    director_note_ko=ev.director_instruction_ko,
                                ),
                            )
                    responses.append(
                        types.FunctionResponse(
                            id=call.id,
                            name=call.name,
                            response={"ok": True},
                        )
                    )
                await live.send_tool_response(function_responses=responses)

            # 2. Server content (audio chunks + transcriptions + turn_complete)
            sc = getattr(msg, "server_content", None)
            if not sc:
                continue

            if getattr(sc, "model_turn", None) and sc.model_turn.parts:
                for part in sc.model_turn.parts:
                    if getattr(part, "inline_data", None) and part.inline_data.data:
                        b64 = base64.b64encode(part.inline_data.data).decode("ascii")
                        await _send_ws(ws, WsAudioChunkOut(pcm24_b64=b64))
                    if getattr(part, "text", None) and not getattr(part, "thought", False):
                        char_text_buf.append(part.text)

            # Native audio transcriptions from Gemini 3.8 Live
            out_tr = getattr(sc, "output_transcription", None)
            if out_tr and getattr(out_tr, "text", None):
                char_text_buf.append(out_tr.text)

            in_tr = getattr(sc, "input_transcription", None)
            if in_tr and getattr(in_tr, "text", None):
                user_text_buf.append(in_tr.text)

            if getattr(sc, "turn_complete", False):
                # Flush spoken user transcript if captured from microphone audio
                if user_text_buf:
                    user_spoken = "".join(user_text_buf).strip()
                    user_text_buf.clear()
                    if user_spoken:
                        apply_turn(session, "user", user_spoken)
                        await _send_ws(
                            ws,
                            WsTranscriptOut(
                                speaker="user",
                                text_ko=user_spoken,
                                final=True,
                            ),
                        )
                        asyncio.create_task(
                            _run_director_step(
                                session, ws, live, current_emotion_ref
                            )
                        )

                # Flush character transcript
                if char_text_buf:
                    full_text = "".join(char_text_buf).strip()
                    char_text_buf.clear()
                    if full_text:
                        apply_turn(
                            session,
                            "character",
                            full_text,
                            current_emotion_ref[0],
                        )
                        await _send_ws(
                            ws,
                            WsTranscriptOut(
                                speaker="character",
                                text_ko=full_text,
                                final=True,
                            ),
                        )
                await store.put(session)
