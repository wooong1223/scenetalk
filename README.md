# SceneTalk — *Watch it. Learn it. Live the story.*

> **Google DeepMind AI Hackathon 2026 (Seoul) · Entertainment track**
> Built on **Gemini 4 Argon** (`gemini-4-argon`), **Gemini 3.8 Live** (`gemini-3.8-live`) and **Nano Banana 2.1** (`gemini-nano-banana-2.1`).

SceneTalk is for native English speakers who love K-content and want to actually *speak* Korean. Paste a YouTube link to a K-drama scene and it turns into two things (UI in English; French and Spanish are listed as coming soon):

1. **Expression Lesson** — a bite-sized, game-like lesson built from the scene's subtitles: vocabulary cards, meaning quizzes, fill-in-the-blank and matching, with instant feedback and nuance explanations.
2. **Roleplay** — step *into the situation of the clip*. Nano Banana generates a photoreal 360° panorama of the setting and a full-body photoreal fictional counterpart character; Gemini 3.8 Live voices that character in real time while Gemini 4 Argon directs the story and finally grades how naturally you used the expressions you just learned.

---

## Problem and target user

Overseas K-drama fans want to *speak* like the characters, not just read subtitles. Flashcards teach words without context; language tutors are expensive and never know the scene you just watched. SceneTalk uses the exact scene the learner is already emotionally invested in as both the textbook and the stage.

## Main workflow (3-minute demo)

| Step | What the user does | What Gemini does |
|---|---|---|
| 1 | Pastes a YouTube link on the home page | Subtitles are loaded from cache, or **Argon extracts them directly from the YouTube video** (`youtube_extractor`, `thinking_level=low`) |
| 2 | Starts **① Expression Lesson** | **Argon `LessonBuilder`** (`thinking_level=low`) turns the subtitle track into 6–8 vocab cards and 8–10 quiz items (`meaning_choice`, `fill_blank`, `match`), schema-verified |
| 3 | Answers quiz cards, earns XP; learned expressions become the **mission** | Any subtitle line can also be clicked for an on-demand nuance card (`SubtitleExplainer`, `thinking_level=minimal`) |
| 4 | Clicks **② Enter this scene** (the whole clip's situation, not one frame) | **Argon `ScenePlanner`** (`thinking_level=medium`, multimodal: YouTube video URI + subtitles + optional screenshot) designs the world, a fictional character, clue props and 2–3 candidate plot twists, plus two English image prompts |
| 5 | Looks around a photoreal 360° room, talks to the character with the microphone | **Nano Banana 2.1** renders the panorama and a green-screen portrait, then edits 4 emotion variants of the *same* person (multi-turn image editing). **Gemini 3.8 Live** plays the character for a Korean learner (clear, short lines, reacts to whatever the user actually says, including greetings and off-script turns), streams voice both ways, calls `set_emotion` / `play_gesture` / `propose_story_event` tools; the portrait is chroma-keyed and crossfades per emotion |
| 6 | Gazes at or clicks clue props, asks for a hint, triggers a twist | Hotspot events are injected into the Live session as director notes. **Argon `StoryDirector`** (`thinking_level=low`, chained with `previous_interaction_id`) advances the beat and can change weather/lighting. **Argon `HintCoach`** (`thinking_level=minimal`) suggests in-character lines using unused mission expressions |
| 7 | Ends the scene | **Argon `LearningVerifier`** (`thinking_level=high`) grades fluency, finds which mission expressions were actually used, rewrites awkward lines, and compares the user's "multiverse" story with the original scene |

## Google AI technologies used

| Model | Role | Where |
|---|---|---|
| `gemini-4-argon` | Five reasoning agents across all four thinking levels (`minimal` → `high`), Interactions API with `previous_interaction_id` chaining, YouTube-URI multimodal input | `app/backend/app/gemini/*.py` |
| `gemini-3.8-live` | Real-time bidirectional voice character (16 kHz PCM in, 24 kHz PCM out), input/output transcription, non-blocking function calling | `app/backend/app/live/bridge.py` |
| `gemini-nano-banana-2.1` | Photoreal 2K 21:9 panorama + consistent full-body character portraits via multi-turn edits | `app/backend/app/gemini/media.py` |
| Google Cloud Run | Single container (FastAPI serves API, WebSocket, generated media and the built web app) | `app/Dockerfile` |

## Verification and evidence (the "autonomous verification loop")

- **Schema self-repair loop.** Every Argon call goes through `verified_call_with_trace` (`app/backend/app/gemini/verifier.py`): the output is validated against strict Pydantic schemas; on failure the exact validation error is fed back to Argon on the same interaction chain for a repair attempt; after retries a deterministic fallback is used so the demo never dead-ends. Each call records an `ArgonCallTrace` (`thinking_level`, `latency_ms`, `repair_attempts`, `fallback_used`, modalities) that is shown live in the HUD and on the result page.
- **Lesson sanitizer.** Generated quiz items are checked for playable shape (4 choices, valid answer index, 4 match pairs) before they reach the client.
- **Progressive media with fallbacks.** Scene images stream in asynchronously (`pending → partial → ready`); if any generation fails the session falls back to pre-generated assets made with the same model, so voice roleplay is never blocked by image latency.
- **Tests.** `app/backend/tests` (pytest, mocked Gemini) and `app/scripts/smoke_e2e.py`, a live end-to-end run against the real models covering health → subtitles → explain → session → lesson → media → Live WebSocket → hint → report.

## Live service URL

https://scenetalk-vkmemtikza-du.a.run.app

## Public GitHub repository URL

https://github.com/wooong1223/scenetalk

## Demo video URL

_Filled in at submission time._

## Setup and run instructions

```bash
# 0. environment
cp app/.env.example .env          # then set GEMINI_API_KEY

# 1. web client
cd app/web && npm install && npm run build && cd ../..

# 2. backend (serves API + WebSocket + built web app on one port)
cd app/backend && uv sync --dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 8080
# open http://localhost:8080
```

Development mode: run the backend on port 8000 and `npm run dev` in `app/web` (Vite proxies `/api`, `/ws`, `/assets`).

```bash
# unit tests
cd app/backend && uv run pytest -q

# live end-to-end smoke test (calls real Gemini models; needs a running backend)
SCENETALK_BASE_URL=http://127.0.0.1:8000 uv run python ../scripts/smoke_e2e.py
```

Cloud Run (one service, one HTTPS URL):

```bash
gcloud run deploy scenetalk --source app --region asia-northeast3 \
  --allow-unauthenticated --set-env-vars GEMINI_API_KEY=...
```

### Repository layout

```
app/
├── backend/app/
│   ├── gemini/        scene_planner · lesson_builder · story_director · hint_coach · learning_verifier
│   │                  subtitle_explainer (+ YouTube extraction) · media (Nano Banana) · verifier
│   ├── live/          Gemini 3.8 Live bridge, tools, system context
│   ├── routers/       /api/subtitles · /api/lessons · /api/sessions · /ws/sessions/{id}
│   ├── models/        Pydantic schemas (domain.py, ws.py)
│   └── story/         story state machine
├── web/src/
│   ├── ui/            LauncherPage (/) · LessonPage (/learn/:videoId) · Hud · ResultPage
│   ├── scene/         PanoramaWorld (360° sphere + chroma-keyed character billboard + clue hotspots)
│   └── audio/         mic capture / PCM playback / WebSocket client
├── assets/            subtitle tracks, demo lesson, pre-generated demo scene media
├── scripts/           smoke_e2e.py
└── Dockerfile
docs/prep/             pre-hackathon notes and the original architecture spec (Korean)
```

## Limitations and human review checkpoints

- Characters are always **original fictional counterparts**; the planner is instructed never to name or imitate real actors, and portraits are generated from text descriptions only.
- Subtitle extraction for arbitrary YouTube links depends on Argon's video understanding; timestamps can be approximate. The demo clip ships with a curated subtitle track.
- Sessions live in process memory (plus a local JSON mirror) — fine for a single Cloud Run instance, not for horizontal scale.
- Learning feedback is coaching, not certification. Scores and corrections are shown with the model trace so a teacher or learner can review them.
- Browser microphone access is required for voice; a text input is provided as a fallback.
