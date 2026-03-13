"""AI Engine configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────
    app_name: str = "OpenQHSE AI Engine"
    app_version: str = "0.7.0"
    debug: bool = False
    environment: str = "development"

    # ── Ollama (local LLM) ──────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_embedding_model: str = "nomic-embed-text"
    ollama_timeout: int = 120
    ollama_temperature: float = 0.1
    ollama_max_tokens: int = 4096

    # ── Redis (caching) ─────────────────────────────────────
    redis_url: str = "redis://localhost:6379/2"
    cache_ttl: int = 3600  # 1 hour default

    # ── Backend API ─────────────────────────────────────────
    api_base_url: str = "http://localhost:8000/api/v1"
    api_internal_key: str = "changeme-internal-key"

    # ── Rate limiting ───────────────────────────────────────
    rate_limit_requests: int = 30
    rate_limit_window: int = 60  # seconds

    # ── CORS ────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
