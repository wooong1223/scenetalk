# SceneTalk — Multi-Agent Architecture (`AGENTS.md`)

**SceneTalk** (*"Watch it. Enter it. Live the story."*) is orchestrated by six specialized **`gemini-4-argon`** reasoning agents (via the Interactions API `client.interactions.create`) paired with a real-time **`gemini-3.8-live`** voice & acting agent (via the Live WebSocket API `client.aio.live.connect`).

---

## 1. Gemini 4 Argon (`gemini-4-argon`) 4-Tier Adaptive Thinking Agents

| Agent | Module | `thinking_level` | Modalities & Inputs | Stateful Chaining | Role & Output Schema |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ScenePlanner** | `app/backend/app/gemini/scene_planner.py` | **`medium`** | YouTube Video URI (`{"type": "video", "uri": ...}`) + Scene Screenshot (`image/jpeg`) + Subtitle Context | Root interaction (`interaction.id` saved to `session.last_interaction_id`) | Synthesizes the 3D `WorldSpec` (`cafe` or `generic_room`), 3D props with clues, `CharacterSpec` persona, and initial `StoryState` (`ScenePlan`). |
| **LessonBuilder** | `app/backend/app/gemini/lesson_builder.py` | **`low`** | Full subtitle track | Stateless, cached per video | Bite-sized quiz lesson: 6–8 vocab cards + 8–10 quiz items (`meaning_choice` / `fill_blank` / `match`) (`Lesson`). |
| **SubtitleExplainer** | `app/backend/app/gemini/subtitle_explainer.py` | **`low`** | Korean subtitle line + target expression + timestamp context | Stateless fast lookup | Explains Korean pragmatics, honorific/banmal formality (`casual`/`polite`/`formal`), drama subtext, and speaking tips (`ExpressionNuance`). |
| **StoryDirector** | `app/backend/app/gemini/story_director.py` | **`low`** | User turn / gaze / prop click / twist request | **Chained** via `previous_interaction_id` from `ScenePlanner` and prior `StoryDirector` turns | Directs dramatic beats (`opening` -> `rising_tension` -> `twist` -> `resolution`), character emotion/gesture, dynamic weather/lighting shifts, and live acting instructions (`DirectorDecision`). |
| **HintCoach** | `app/backend/app/gemini/hint_coach.py` | **`minimal`** | Current dialogue state + unused saved expressions | **Chained** via `previous_interaction_id` | Ultra-low-latency (~1s) emergency line coach suggesting 2 natural Korean lines weaving in the user's saved mission expressions (`HintResponse`). |
| **LearningVerifier** | `app/backend/app/gemini/learning_verifier.py` | **`high`** | Full session transcript + saved mission expressions + story events | **Chained** via `previous_interaction_id` | Deep post-scene evaluation of Korean pragmatic naturalness, honorific consistency, grammar rewrites, and **Original vs. User Multiverse Story Comparison** (`LearningReport`). |

---

## 2. Gemini 3.8 Live (`gemini-3.8-live`) Real-Time Voice & Acting Agent

- **Module**: `app/backend/app/live/bridge.py` (`run_live_bridge`)
- **Transport**: Bidirectional WebSocket (`/ws/sessions/{session_id}`) streaming 16kHz PCM microphone audio in and 24kHz PCM character voice audio out.
- **Function Calling Tools** (`app/backend/app/live/tools.py`):
  - `set_emotion(emotion)` — Switches the photoreal character portrait (`neutral`, `happy`, `sad`, `angry`, `surprised`) with a crossfade.
  - `play_gesture(gesture)` — Plays a short billboard motion (`nod`, `wave`, `look_away`, `smile`, `shrug`).
  - `propose_story_event()` — Fires the next pre-planned plot twist (weather / lighting patch + director instruction).

---

## 3. Self-Repair Schema Verifier (`verifier.py`)

Every `gemini-4-argon` agent call is wrapped in `verified_call_with_trace()` (`app/backend/app/gemini/verifier.py`):
1. Passes `response_format=schema_cls.model_json_schema()` and `generation_config={"thinking_level": ...}` (never passing `temperature`, `top_p`, `top_k`, or `thinking_budget`).
2. Validates the JSON output against strict Pydantic models (`domain.py`).
3. If validation fails, automatically re-prompts `gemini-4-argon` with `previous_interaction_id` and the exact validation error (`repair_attempts`), and records an `ArgonCallTrace` for transparent HUD & Result Page visualization.

---

## 4. Scene Media Agent (`gemini-nano-banana-2.1`)

- **Module**: `app/backend/app/gemini/media.py` (`generate_scene_media`, background task per session)
- Generates a photoreal 21:9 360° panorama from `WorldSpec.backdrop_prompt_en` and a green-screen portrait from `CharacterSpec.appearance_prompt_en`, then four emotion variants of the same person via multi-turn image editing. Status streams `pending → partial → ready`; failures fall back to pre-generated demo assets under `app/assets/generated/demo/`.
