# SceneTalk — *"Watch it. Enter it. Live the story."*

> **Google DeepMind AI Hackathon 2026 (Track 1: Gemini 4 Argon in Entertainment)**  
> Interactive K-Drama 3D Multiverse & Korean Pragmatics Platform powered by **`gemini-4-argon`** and **`gemini-3.8-live`**.

---

## 🌟 Overview

**SceneTalk** bridges the gap between watching K-content and living inside it:
1. **Watch Mode (Web Studio & Chrome Extension Side Panel)**: Watch an authentic K-drama clip (such as tvN's `#100일의거짓말 EP.0` — `https://www.youtube.com/watch?v=V1b8VxrkbZU` or the Rainy Seoul Café romance preset). Click any subtitle or expression to get an instant Korean pragmatics, honorific/banmal formality, and drama subtext breakdown powered by **`gemini-4-argon`** (`thinking_level="low"`), and save expressions as your in-scene mission.
2. **Enter Mode (First-Person 3D Scene & Real-Time Voice Acting)**: Click **"Enter the Scene"**. **`gemini-4-argon`** (`thinking_level="medium"`) synthesizes a 3D world (`cafe` or `generic_room`), interactive 3D props with clues, character persona, and dramatic arc. Inside the 3D scene, converse in real time with the 3D protagonist via **`gemini-3.8-live`** (bidirectional 16kHz/24kHz PCM audio + function calling for emotions, gestures, and story beats) while **`gemini-4-argon`** directs plot twists (`thinking_level="low"`, chained via `previous_interaction_id`) and provides sub-second emergency line hints (`thinking_level="minimal"`).
3. **Verify Mode (Deep Korean Pragmatics & Multiverse Report)**: Finish the scene to receive a comprehensive evaluation from **`gemini-4-argon`** (`thinking_level="high"`), including fluency score, mission expression mastery, natural Korean rewrites, **Original Drama vs. Your Multiverse Story Comparison**, and a full **4-Tier Thinking Pipeline Trace**.

---

## 🧠 Deep `gemini-4-argon` Integration Highlights

| Feature | How SceneTalk Uses It | Code Location |
| :--- | :--- | :--- |
| **4-Tier Adaptive `thinking_level`** | Uses all 4 levels: `minimal` (`HintCoach`), `low` (`SubtitleExplainer`, `StoryDirector`), `medium` (`ScenePlanner`), and `high` (`LearningVerifier`). | [`app/backend/app/gemini/`](file:///Users/jimmy/gdm_ai_hackathon/app/backend/app/gemini/) |
| **Stateful `previous_interaction_id` Chaining** | `ScenePlanner` creates the root interaction ID; `StoryDirector`, `HintCoach`, and `LearningVerifier` chain via `previous_interaction_id` to preserve narrative memory across turns. | [`verifier.py`](file:///Users/jimmy/gdm_ai_hackathon/app/backend/app/gemini/verifier.py), [`story_director.py`](file:///Users/jimmy/gdm_ai_hackathon/app/backend/app/gemini/story_director.py) |
| **Multimodal Video & Image Context** | `ScenePlanner` accepts YouTube video URIs (`{"type": "video", "uri": ...}`) and base64 video frame captures (`{"type": "image", ...}`) alongside time-coded subtitles. | [`scene_planner.py`](file:///Users/jimmy/gdm_ai_hackathon/app/backend/app/gemini/scene_planner.py) |
| **Self-Repair Strict Schema Verifier** | Wraps every `client.interactions.create` call with Pydantic JSON Schema validation + automatic self-repair via `previous_interaction_id` and records `ArgonCallTrace` telemetry. | [`verifier.py`](file:///Users/jimmy/gdm_ai_hackathon/app/backend/app/gemini/verifier.py) |
| **Gemini 3.8 Live Bidirectional Bridge** | Real-time 16kHz PCM mic input, 24kHz PCM voice output, RMS lip-sync, and live tool calling (`set_character_state`, `mark_expression_used`, `advance_story_beat`). | [`bridge.py`](file:///Users/jimmy/gdm_ai_hackathon/app/backend/app/live/bridge.py) |

---

## 📂 Repository Layout

All application code resides inside [`app/`](file:///Users/jimmy/gdm_ai_hackathon/app/):
- [`app/backend/`](file:///Users/jimmy/gdm_ai_hackathon/app/backend/) — FastAPI backend (`google-genai==2.31.0`, `uv`, Python 3.11)
- [`app/web/`](file:///Users/jimmy/gdm_ai_hackathon/app/web/) — React 18 + Three.js (`@react-three/fiber`, `@pixiv/three-vrm`) 3D Web App
- [`app/extension/`](file:///Users/jimmy/gdm_ai_hackathon/app/extension/) — Chrome Extension (Manifest V3) Side Panel for YouTube
- [`app/assets/`](file:///Users/jimmy/gdm_ai_hackathon/app/assets/) — Subtitle tracks (`V1b8VxrkbZU.json`, `demo_cafe.json`) & VRM asset
- [`app/scripts/smoke_e2e.py`](file:///Users/jimmy/gdm_ai_hackathon/app/scripts/smoke_e2e.py) — 7-stage live E2E verification script
- [`app/Dockerfile`](file:///Users/jimmy/gdm_ai_hackathon/app/Dockerfile) — Multi-stage production container for Google Cloud Run
- [`app/README.md`](file:///Users/jimmy/gdm_ai_hackathon/app/README.md) & [`app/AGENTS.md`](file:///Users/jimmy/gdm_ai_hackathon/app/AGENTS.md) — Detailed setup and agent specifications

---

## ⚡ Quick Run

See [`app/README.md`](file:///Users/jimmy/gdm_ai_hackathon/app/README.md) for full local development, Chrome Extension installation, E2E testing, and Cloud Run deployment instructions.
