from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Quick Draw API"
    env: str = "local"
    version: str = "0.1.0"
    log_level: str = "INFO"
    rate_limit: str = "100/minute"
    cors_allow_origins: list[str] = Field(default_factory=lambda: ["*"])
    storage_uri: str = "memory://"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
