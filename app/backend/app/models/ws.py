from __future__ import annotations

from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field
from .domain import (
    ArgonCallTrace,
    BeatPhase,
    EmotionId,
    GestureId,
    StoryEvent,
    Weather,
)

# ----- Client -> Server -----


class WsAudioChunkIn(BaseModel):
    type: Literal["audio_chunk"] = "audio_chunk"
    pcm16_b64: str  # 16kHz mono Int16 LE base64


class WsUserSpeechEndIn(BaseModel):
    type: Literal["user_speech_end"] = "user_speech_end"


class WsUserTextIn(BaseModel):
    type: Literal["user_text"] = "user_text"
    text_ko: str


class WsGazeChangedIn(BaseModel):
    type: Literal["gaze_changed"] = "gaze_changed"
    prop_id: str | None


class WsObjectSelectedIn(BaseModel):
    type: Literal["object_selected"] = "object_selected"
    prop_id: str


class WsTriggerEventIn(BaseModel):
    type: Literal["trigger_event"] = "trigger_event"
    event_id: str | None = None  # None = pick next candidate event


ClientWsMessage = Annotated[
    Union[
        WsAudioChunkIn,
        WsUserSpeechEndIn,
        WsUserTextIn,
        WsGazeChangedIn,
        WsObjectSelectedIn,
        WsTriggerEventIn,
    ],
    Field(discriminator="type"),
]

# ----- Server -> Client -----


class WsReadyOut(BaseModel):
    type: Literal["ready"] = "ready"
    session_id: str


class WsAudioChunkOut(BaseModel):
    type: Literal["audio_chunk"] = "audio_chunk"
    pcm24_b64: str  # 24kHz mono Int16 LE base64 from Gemini Live


class WsTranscriptOut(BaseModel):
    type: Literal["transcript"] = "transcript"
    speaker: Literal["user", "character", "system"]
    text_ko: str
    final: bool = True


class WsCharacterStateOut(BaseModel):
    type: Literal["character_state"] = "character_state"
    emotion: EmotionId
    gesture: GestureId | None = None


class WsStoryUpdateOut(BaseModel):
    type: Literal["story_update"] = "story_update"
    phase: BeatPhase
    used_expressions: list[str]
    event: StoryEvent | None = None
    weather: Weather | None = None
    lighting_preset: Literal["warm_cafe", "cool_evening", "dramatic_neon"] | None = None
    director_note_ko: str = ""
    argon_trace: ArgonCallTrace | None = None


class WsErrorOut(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str
    recoverable: bool = True
