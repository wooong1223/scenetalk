"""
End-to-end backend smoke test for SceneTalk.
Starts expected checks against a running uvicorn server on http://127.0.0.1:8080
and exercises every stage of the demo flow against real Gemini APIs:
  1. GET /api/health
  2. GET /api/subtitles/{video_id}
  3. POST /api/subtitles/explain          (Gemini 4 Argon, thinking_level=low)
  4. POST /api/sessions                   (Gemini 4 Argon, thinking_level=medium)
  5. WS  /ws/sessions/{id}                (Gemini 3.8 Live opening + gaze + trigger_event)
  6. POST /api/sessions/{id}/hint         (Gemini 4 Argon, thinking_level=minimal)
  7. POST /api/sessions/{id}/complete     (Gemini 4 Argon, thinking_level=high)
Exits 0 iff all assertions pass.
"""
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
import httpx
import websockets

BASE = os.environ.get("SCENETALK_BASE_URL", "http://127.0.0.1:8080")
WS_BASE = BASE.replace("https://", "wss://").replace("http://", "ws://")


async def _ensure_server() -> subprocess.Popen | None:
    try:
        async with httpx.AsyncClient(base_url=BASE, timeout=1.5) as c:
            r = await c.get("/api/health")
            if r.status_code == 200:
                return None
    except Exception:
        pass
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8080"],
        cwd=str(backend_dir),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(30):
        await asyncio.sleep(0.3)
        try:
            async with httpx.AsyncClient(base_url=BASE, timeout=1.5) as c:
                r = await c.get("/api/health")
                if r.status_code == 200:
                    return proc
        except Exception:
            continue
    proc.terminate()
    raise RuntimeError("Failed to start local uvicorn server on 127.0.0.1:8080")


async def main() -> None:
    proc = await _ensure_server()
    try:
        await _run_checks()
    finally:
        if proc is not None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except Exception:
                proc.kill()


async def _run_checks() -> None:
    async with httpx.AsyncClient(base_url=BASE, timeout=180.0) as c:
        # 1. Health
        r = await c.get("/api/health")
        assert r.status_code == 200 and r.json()["ok"] is True, r.text
        vid = r.json()["demo_video_id"]
        print(f"[1/7] health ok (demo_video_id={vid})")

        # 2. Subtitles
        r = await c.get(f"/api/subtitles/{vid}")
        assert r.status_code == 200 and len(r.json()["lines"]) >= 3, r.text
        print(f"[2/7] subtitles ok ({len(r.json()['lines'])} lines)")

        # 3. Explain expression (Gemini 4 Argon, thinking_level=low)
        r = await c.post(
            "/api/subtitles/explain",
            json={
                "video_id": vid,
                "timestamp_sec": 16.5,
                "line_ko": "밀정이 되란 소리예요?",
                "target_expression": "밀정이 되란 소리예요?",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["expression"] and len(body["examples_ko"]) >= 2, body
        print(f"[3/7] explain ok: {body['meaning_en']}")

        # 4. Create session (Gemini 4 Argon, thinking_level=medium)
        r = await c.post(
            "/api/sessions",
            json={
                "video_id": vid,
                "timestamp_sec": 16.5,
                "saved_expressions": ["밀정이 되란 소리예요?", "눈치를 보다"],
            },
        )
        assert r.status_code == 200, r.text
        sess = r.json()
        sid = sess["session_id"]
        assert sess["world"]["template_id"] in ("cafe", "generic_room")
        assert len(sess["world"]["props"]) >= 3
        print(
            f"[4/7] session created id={sid} template={sess['world']['template_id']} "
            f"character={sess['character']['display_name_ko']}"
        )

        # 5. Live WebSocket handshake + opening turn + gaze + trigger_event
        got_ready = False
        got_audio_or_transcript = False
        got_story_update = False
        sent_events = False
        async with websockets.connect(
            f"{WS_BASE}/ws/sessions/{sid}", max_size=8_000_000
        ) as ws:
            deadline = asyncio.get_event_loop().time() + 25.0
            while asyncio.get_event_loop().time() < deadline:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
                except asyncio.TimeoutError:
                    if got_ready and got_audio_or_transcript and got_story_update:
                        break
                    continue
                msg = json.loads(raw)
                t = msg.get("type")
                if t == "error":
                    raise RuntimeError(f"WS emitted error: {msg}")
                if t == "ready":
                    got_ready = True
                    if not sent_events:
                        sent_events = True
                        await ws.send(
                            json.dumps(
                                {
                                    "type": "gaze_changed",
                                    "prop_id": sess["world"]["props"][0]["id"],
                                }
                            )
                        )
                        await ws.send(
                            json.dumps({"type": "trigger_event", "event_id": None})
                        )
                elif t in ("audio_chunk", "transcript"):
                    got_audio_or_transcript = True
                elif t == "story_update":
                    got_story_update = True
                if got_ready and got_audio_or_transcript and got_story_update:
                    break

        assert got_ready, "WS did not emit ready"
        assert got_story_update, "WS did not emit story_update after trigger_event"
        assert got_audio_or_transcript, "WS did not stream opening audio/transcript from Gemini Live"
        print("[5/7] live bridge ok (ready + opening stream + story_update)", flush=True)

        # 6. Instant Hint Coach (Gemini 4 Argon, thinking_level=minimal)
        r = await c.post(f"/api/sessions/{sid}/hint")
        assert r.status_code == 200, r.text
        hints = r.json()
        assert len(hints["hints"]) >= 1
        print(f"[6/7] argon minimal hint coach ok: {hints['hints'][0]['line_ko']}")

        # 7. Complete session (Gemini 4 Argon, thinking_level=high)
        r = await c.post(f"/api/sessions/{sid}/complete")
        assert r.status_code == 200, r.text
        rep = r.json()
        assert 0 <= rep["fluency_score"] <= 100
        assert len(rep["expression_results"]) == 2
        print(
            f"[7/7] learning report ok (score={rep['fluency_score']})",
            flush=True,
        )


if __name__ == "__main__":
    import traceback

    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"SMOKE FAILED: {exc!r}", file=sys.stderr, flush=True)
        traceback.print_exc()
        sys.exit(1)
