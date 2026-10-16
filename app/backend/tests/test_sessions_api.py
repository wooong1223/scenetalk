import pytest
from httpx import ASGITransport, AsyncClient
from app.gemini.fallbacks import fallback_learning_report, fallback_nuance, fallback_scene_plan
from app.main import app
from app.models.domain import ArgonCallTrace


@pytest.mark.asyncio
async def test_health_and_subtitles_and_session_lifecycle(monkeypatch):
    # Mock Gemini network calls for deterministic unit test execution
    async def _fake_plan(req):
        plan = fallback_scene_plan(req.saved_expressions, video_id=req.video_id)
        trace = ArgonCallTrace(
            stage="scene_planner",
            thinking_level="medium",
            interaction_id="ix_test_plan",
            latency_ms=120,
            modalities=["text", "video"],
        )
        return plan, trace

    async def _fake_explain(req):
        return fallback_nuance(req.target_expression)

    async def _fake_report(session):
        return fallback_learning_report(session)

    monkeypatch.setattr("app.routers.sessions.plan_scene_with_trace", _fake_plan)
    monkeypatch.setattr("app.routers.subtitles.explain_expression", _fake_explain)
    monkeypatch.setattr("app.routers.sessions.build_learning_report", _fake_report)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r_health = await ac.get("/api/health")
        assert r_health.status_code == 200
        assert r_health.json()["ok"] is True

        r_sub = await ac.get("/api/subtitles/V1b8VxrkbZU")
        assert r_sub.status_code == 200
        assert len(r_sub.json()["lines"]) >= 10

        r_exp = await ac.post(
            "/api/subtitles/explain",
            json={
                "video_id": "V1b8VxrkbZU",
                "timestamp_sec": 16.5,
                "line_ko": "밀정이 되란 소리예요?",
                "target_expression": "밀정이 되란 소리예요?",
            },
        )
        assert r_exp.status_code == 200
        assert r_exp.json()["expression"] == "밀정이 되란 소리예요?"

        r_sess = await ac.post(
            "/api/sessions",
            json={
                "video_id": "V1b8VxrkbZU",
                "timestamp_sec": 16.5,
                "saved_expressions": ["밀정이 되란 소리예요?", "눈치를 보다"],
            },
        )
        assert r_sess.status_code == 200
        sess_data = r_sess.json()
        sid = sess_data["session_id"]
        assert sess_data["world"]["template_id"] in ("cafe", "generic_room")
        assert len(sess_data["argon_traces"]) == 1

        r_comp = await ac.post(f"/api/sessions/{sid}/complete")
        assert r_comp.status_code == 200
        rep = r_comp.json()
        assert rep["session_id"] == sid
        assert len(rep["expression_results"]) == 2

        # Verify built SPA routes and 3D VRM asset mount
        for route in ("/", f"/scene/{sid}", f"/result/{sid}", "/assets/generated/demo/pano.jpg"):
            r_static = await ac.get(route)
            assert r_static.status_code == 200, f"Route {route} returned {r_static.status_code}"

