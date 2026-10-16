from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_APP_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = _APP_ROOT.parent
_ENV_FILES = [
    str(p)
    for p in (_APP_ROOT / ".env", _REPO_ROOT / ".env", Path(".env"))
    if p.exists()
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES if _ENV_FILES else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    GEMINI_PLANNER_MODEL: str = "gemini-4-argon"
    GEMINI_LIVE_MODEL: str = "gemini-3.8-live"
    GEMINI_TTS_MODEL: str = "gemini-3.8-flash-tts"
    GOOGLE_CLOUD_PROJECT: str = "h2gdm-hack26icn-2679"
    DEMO_VIDEO_ID: str = "V1b8VxrkbZU"
    BACKEND_PUBLIC_URL: str = "http://localhost:8080"
    PORT: int = 8080

    @property
    def app_root(self) -> Path:
        return _APP_ROOT

    @property
    def assets_dir(self) -> Path:
        return _APP_ROOT / "assets"

    @property
    def web_dist_dir(self) -> Path:
        return _APP_ROOT / "web" / "dist"


@lru_cache
def get_settings() -> Settings:
    return Settings()
