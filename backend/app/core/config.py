"""Application configuration via environment variables."""

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


settings = Settings()
