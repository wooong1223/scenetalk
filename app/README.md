# SceneTalk — *"Watch it. Enter it. Live the story."*

> **Google DeepMind AI Hackathon 2026 · Track 1 (Entertainment)**  
> Powered by **Gemini 4 Argon (`gemini-4-argon`)** & **Gemini 3.8 Live (`gemini-3.8-live`)**

**SceneTalk** transforms passive K-drama viewing into a first-person 3D interactive multiverse and Korean pragmatics experience. Watch a K-drama scene, dissect the nuance and honorific subtext of any line with **Gemini 4 Argon**, save key expressions as your mission, and step directly inside a 3D reconstruction of the scene to converse face-to-face with the protagonist via **Gemini 3.8 Live**.

---

## 🧠 How SceneTalk Maximizes `gemini-4-argon`

SceneTalk showcases **all four adaptive thinking tiers (`minimal`, `low`, `medium`, `high`)**, **stateful `previous_interaction_id` chaining**, **multimodal YouTube video context**, and **self-repair JSON schema verification** via the new `google-genai` Interactions API (`client.interactions.create`):

1. **`thinking_level="medium"` — Multimodal 3D `ScenePlanner`** (`app/backend/app/gemini/scene_planner.py`)
   - Ingests the YouTube video context (`{"type": "video", "uri": ...}`), scene screenshot, and subtitle window around the user's timestamp.
   - Generates a complete 3D `WorldSpec` (`cafe` or `generic_room`, lighting, weather, and interactive 3D props with clues), `CharacterSpec` persona, and 4-phase `StoryState`.
2. **`thinking_level="low"` — Fast `SubtitleExplainer` & Stateful `StoryDirector`** (`subtitle_explainer.py`, `story_director.py`)
   - `SubtitleExplainer` delivers instant Korean pragmatic/honorific breakdowns during Watch Mode.
   - `StoryDirector` chains from `ScenePlanner` via **`previous_interaction_id`**, tracking narrative state across turns without re-sending the entire prompt history, and dynamically shifts 3D weather, lighting, and dramatic beats (`opening` → `rising_tension` → `twist` → `resolution`).
3. **`thinking_level="minimal"` — Sub-Second `HintCoach`** (`app/backend/app/gemini/hint_coach.py`)
   - When a learner gets stuck mid-conversation inside the 3D scene, `HintCoach` uses `thinking_level="minimal"` chained via `previous_interaction_id` to generate natural in-character Korean lines weaving in their unused mission expressions in ~1 second.
4. **`thinking_level="high"` — Deep Pragmatics & Multiverse `LearningVerifier`** (`app/backend/app/gemini/learning_verifier.py`)
   - At the end of the scene, `LearningVerifier` performs deep reasoning (`thinking_level="high"`) over the entire conversation transcript, evaluating Korean honorific/banmal consistency, mission expression usage, natural rewrites, and an **Original K-Drama vs. User Multiverse Story Comparison**.
5. **Live HUD & Result Page Transparency (`ArgonCallTrace`)**
   - Every `gemini-4-argon` call is logged with its `thinking_level`, `latency_ms`, `interaction_id`, `previous_interaction_id`, and schema verification status, displayed live in the 3D HUD and on the final Learning Report page.

---

## 🏗️ Directory Structure

```text
app/
├── backend/              # FastAPI + google-genai==2.31.0 (Python 3.11 / uv)
│   ├── app/
│   │   ├── gemini/       # gemini-4-argon 4-tier agents + self-repair verifier
│   │   ├── live/         # gemini-3.8-live bidirectional WebSocket audio & tool bridge
│   │   ├── models/       # Pydantic v2 strict schemas (domain.py, ws.py)
│   │   ├── routers/      # /api/subtitles, /api/sessions, /ws/sessions/{id}
│   │   └── story/        # Story state machine & expression matcher
│   └── tests/            # Pytest unit suite
├── web/                  # React 18 + Three.js (@react-three/fiber + @pixiv/three-vrm)
│   └── src/
│       ├── scene/        # 3D CafeTemplate, GenericRoomTemplate, VrmCharacter, Gaze raycaster
│       ├── audio/        # 16kHz PCM mic capture & 24kHz PCM playback + RMS lip-sync
│       └── ui/           # LauncherPage (/), Hud (/scene/:id), ResultPage (/result/:id)
├── extension/            # Chrome Extension (Manifest V3) — YouTube Watch Mode Side Panel
├── assets/               # Subtitle tracks (V1b8VxrkbZU.json, demo_cafe.json) & 3D VRM asset
├── scripts/              # End-to-end live smoke verification (smoke_e2e.py)
└── Dockerfile            # Multi-stage Cloud Run production container
```

---

## 🚀 Quickstart (Local Development)

### 1. Environment Setup
Create a `.env` file in the repository root (or `app/.env`):
```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_PLANNER_MODEL=gemini-4-argon
GEMINI_LIVE_MODEL=gemini-3.8-live
GOOGLE_CLOUD_PROJECT=h2gdm-hack26icn-2679
DEMO_VIDEO_ID=V1b8VxrkbZU
```

### 2. Build the 3D Web Client
```bash
cd app/web
npm install
npm run build
```

### 3. Run the FastAPI Backend (Serves API + Web SPA + 3D Assets)
```bash
cd app/backend
uv sync --dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open **`http://localhost:8000`** in Chrome:
1. Choose **`#100일의거짓말 EP.0` (`V1b8VxrkbZU`)** or **Rainy Seoul Café (`demo_cafe`)**.
2. Click any Korean subtitle line or `#keyword` chip to inspect its nuance via `gemini-4-argon` (`thinking_level="low"`).
3. Click **"🚪 Enter the Scene — 3D 씬 속으로 들어가기"** (`gemini-4-argon` `thinking_level="medium"`).
4. Inside the 3D scene:
   - Speak via **🎙️ 음성 대화 시작** (16kHz PCM mic -> `gemini-3.8-live` -> 24kHz PCM voice + real-time 3D character lip-sync & emotions) or type Korean lines in the bottom bar.
   - Gaze at or click 3D props (`메뉴판`, `커피잔`, `단서 수첩`, `창문`), request a **💡 대사 힌트 (`thinking_level="minimal"`)**, or trigger **⚡ 스토리 반전 (`StoryDirector`)**.
   - Click **🏁 씬 종료 & 학습 리포트** to run `LearningVerifier` (`thinking_level="high"`).

### 4. Chrome Extension (Optional — YouTube Side Panel)
```bash
cd app/extension
npm run build
```
1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Click **Load unpacked** and select `app/extension/dist`.
3. Visit [`https://www.youtube.com/watch?v=V1b8VxrkbZU`](https://www.youtube.com/watch?v=V1b8VxrkbZU) and click the **SceneTalk** extension icon to open the Side Panel.

---

## 🧪 Automated Tests & Live E2E Smoke Test

```bash
# Run unit tests
cd app/backend
uv run pytest -v

# Run 7-stage live E2E smoke test against gemini-4-argon & gemini-3.8-live
uv run python ../scripts/smoke_e2e.py
```

---

## ☁️ Google Cloud Run Deployment

```bash
gcloud run deploy scenetalk \
  --source app \
  --project h2gdm-hack26icn-2679 \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_PLANNER_MODEL=gemini-4-argon,GEMINI_LIVE_MODEL=gemini-3.8-live,DEMO_VIDEO_ID=V1b8VxrkbZU"
```
