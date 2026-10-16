import logging
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .live.bridge import run_live_bridge
from .routers import lessons, sessions, subtitles
from .services.session_store import store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="SceneTalk", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(subtitles.router)
app.include_router(sessions.router)
app.include_router(lessons.router)


@app.get("/api/health")
async def health() -> dict[str, object]:
    s = get_settings()
    return {
        "ok": True,
        "planner_model": s.GEMINI_PLANNER_MODEL,
        "live_model": s.GEMINI_LIVE_MODEL,
        "demo_video_id": s.DEMO_VIDEO_ID,
    }


@app.websocket("/ws/sessions/{session_id}")
async def ws_session(ws: WebSocket, session_id: str) -> None:
    rec = await store.get(session_id)
    if not rec:
        await ws.close(code=4404)
        return
    await run_live_bridge(ws, rec)


s = get_settings()
# NOTE: /assets/* is mounted per-subfolder (not the whole dir) because the Vite build
# also emits /assets/index-*.js under web/dist, served by the catch-all mount below.
(s.assets_dir / "generated").mkdir(parents=True, exist_ok=True)
app.mount(
    "/assets/generated",
    StaticFiles(directory=s.assets_dir / "generated"),
    name="assets_generated",
)
if (s.assets_dir / "subtitles").exists():
    app.mount(
        "/assets/subtitles",
        StaticFiles(directory=s.assets_dir / "subtitles"),
        name="assets_subtitles",
    )

if s.web_dist_dir.exists():
    index_html = s.web_dist_dir / "index.html"

    @app.get("/scene/{rest_of_path:path}")
    @app.get("/result/{rest_of_path:path}")
    @app.get("/learn/{rest_of_path:path}")
    async def spa_routes(rest_of_path: str) -> FileResponse:
        return FileResponse(index_html)

    app.mount(
        "/",
        StaticFiles(directory=s.web_dist_dir, html=True),
        name="web",
    )
