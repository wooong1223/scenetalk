"""Local SDK import/interface check only. No API requests are made."""
import json
from importlib.metadata import version
from google import genai

with genai.Client(api_key="offline-environment-check-placeholder") as client:
    assert callable(client.interactions.create), "Interactions API not available"
    assert callable(client.aio.live.connect), "Live API not available"
print(json.dumps({"version": version("google-genai"), "interactions": True, "live": True, "network_calls": 0}))
