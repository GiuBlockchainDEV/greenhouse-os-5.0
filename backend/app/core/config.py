"""Application configuration via environment variables."""

import os

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "GreenhouseOS"
    app_version: str = "5.0.0"
    debug: bool = False
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    cors_origin_regex: str = r"https://.*\.vercel\.app"

    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com"
    gemini_model: str = "gemini-3.5-flash"

    @model_validator(mode="after")
    def resolve_gemini_credentials(self) -> "Settings":
        key = self.gemini_api_key.strip().strip('"').strip("'")
        if not key:
            for name in ("GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"):
                candidate = os.getenv(name, "").strip().strip('"').strip("'")
                if candidate:
                    key = candidate
                    break
        self.gemini_api_key = key
        model = os.getenv("GEMINI_MODEL", "").strip() or self.gemini_model
        self.gemini_model = model
        return self

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)


settings = Settings()
