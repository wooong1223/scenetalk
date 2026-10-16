from functools import lru_cache
from google import genai
from ..config import get_settings


@lru_cache
def get_genai_client() -> genai.Client:
    s = get_settings()
    return genai.Client(
        api_key=s.GEMINI_API_KEY or None,
        http_options={"api_version": "v1beta"},
    )
