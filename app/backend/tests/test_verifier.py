from types import SimpleNamespace
import pytest
from pydantic import BaseModel
from app.gemini.verifier import verified_call


class _Demo(BaseModel):
    value: int


class _FakeInteractions:
    def __init__(self, outputs: list[str]) -> None:
        self._outputs = outputs
        self.calls = 0

    async def create(self, **kwargs):
        out = self._outputs[self.calls]
        self.calls += 1
        return SimpleNamespace(
            id=f"ix_{self.calls}",
            output_text=out,
            outputs=[SimpleNamespace(text=out)],
        )


def _fake_client(outputs: list[str]):
    fx = _FakeInteractions(outputs)
    return SimpleNamespace(aio=SimpleNamespace(interactions=fx)), fx


@pytest.mark.asyncio
async def test_verifier_recovers_on_second_attempt():
    client, fx = _fake_client(["not-json", '{"value": 42}'])
    res = await verified_call(
        client=client,
        model="gemini-4-argon",
        prompt="give me 42",
        schema=_Demo,
        thinking_level="low",
        timeout_sec=5.0,
        fallback_factory=lambda: _Demo(value=-1),
    )
    assert res.value == 42
    assert fx.calls == 2


@pytest.mark.asyncio
async def test_verifier_falls_back_after_exhausting_retries():
    client, fx = _fake_client(["bad1", "bad2", "bad3"])
    res = await verified_call(
        client=client,
        model="gemini-4-argon",
        prompt="give me 42",
        schema=_Demo,
        thinking_level="low",
        timeout_sec=5.0,
        fallback_factory=lambda: _Demo(value=-1),
    )
    assert res.value == -1
    assert fx.calls == 3
