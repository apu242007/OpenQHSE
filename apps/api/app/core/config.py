"""Application configuration using pydantic-settings v2."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve .env: look for it in apps/api/, then walk up to the monorepo root
def _find_env_file() -> str:
    candidate = Path(__file__).parent
    for _ in range(5):
        env = candidate / ".env"
        if env.exists():
            return str(env)
        candidate = candidate.parent
    return ".env"  # fallback


class Settings(BaseSettings):
    """Central application configuration.

    Todos los valores pueden ser sobreescritos mediante variables de entorno.
    """

    model_config = SettingsConfigDict(
        env_file=_find_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── General ──────────────────────────────────────────────
    app_name: str = "OpenQHSE"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    log_level: str = "INFO"
    is_production: bool = False

    # ── API ──────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"
    api_cors_origins: str = "http://localhost:3000,http://localhost:8081"

    # ── Security (joserfc — reemplaza python-jose) ────────────
    api_secret_key: str = Field(
        default="change-this-to-a-random-secret-key-in-production-min-32",
        description="JWT signing secret — mínimo 32 caracteres en producción",
    )
    api_algorithm: str = "HS256"
    api_access_token_expire_minutes: int = 30
    api_refresh_token_expire_days: int = 7

    # NextAuth.js v5
    nextauth_secret: str = "change-me-in-production"
    nextauth_url: str = "http://localhost:3000"

    # ── Database ──────────────────────────────────────────────
    # Set DATABASE_URL=sqlite+aiosqlite:///./openqhse.db for local dev (no Docker)
    # Leave unset to build the PostgreSQL URL from individual components.
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "openqhse"
    postgres_password: str = "openqhse_dev_2026"
    postgres_db: str = "openqhse"
    database_url: str | None = None
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # ── Auth bypass (local demo mode) ─────────────────────────
    # When True, the API accepts all requests without a JWT token
    # and attaches the first org_admin user as the current user.
    disable_auth: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Redis 7.4 ────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    redis_password: str = ""

    # ── Celery + celery-redbeat ───────────────────────────────
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    redbeat_redis_url: str = "redis://localhost:6379/3"

    # ── Storage — MinIO dev / S3 prod ─────────────────────────
    minio_endpoint: str = "localhost:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "openqhse"
    minio_use_ssl: bool = False

    # AWS S3 (producción)
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "openqhse-prod"

    # ── Ollama AI ────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # ── Email ────────────────────────────────────────────────
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "noreply@openqhse.local"
    smtp_tls: bool = True

    # ── WhatsApp (Meta Cloud API) ────────────────────────────
    whatsapp_api_url: str = "https://graph.facebook.com/v18.0"
    whatsapp_phone_number_id: str = ""
    whatsapp_api_token: str = ""
    whatsapp_verify_token: str = ""

    # ── Telegram Bot ─────────────────────────────────────────
    telegram_bot_token: str = ""
    telegram_api_url: str = "https://api.telegram.org"

    # ── Slack ─────────────────────────────────────────────────
    slack_webhook: str = ""

    # ── Microsoft Teams ──────────────────────────────────────
    teams_webhook: str = ""

    # ── Push (Expo) ──────────────────────────────────────────
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    expo_access_token: str = ""

    # ── Integraciones ERP / BI ───────────────────────────────
    sap_api_url: str = ""
    sap_api_key: str = ""
    powerbi_tenant_id: str = ""
    powerbi_client_id: str = ""
    powerbi_client_secret: str = ""

    # ── Monitoreo ────────────────────────────────────────────
    sentry_dsn: str = ""
    prometheus_enabled: bool = True

    # ── Notification defaults ────────────────────────────────
    notification_max_retries: int = 3
    notification_retry_delay_seconds: int = 5
    notification_batch_size: int = 50
    notification_default_channels: str = "in_app,email"
    permit_expiry_warning_minutes: int = 60

    # ── Rate Limiting (slowapi) ───────────────────────────────
    rate_limit_auth_login: str = "10/minute"
    rate_limit_forgot_password: str = "3/minute"
    rate_limit_marketplace: str = "100/minute"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def storage_access_key(self) -> str:
        """Clave de acceso efectiva: AWS en prod, MinIO en dev."""
        return self.aws_access_key_id if self.is_production else self.minio_root_user

    @computed_field  # type: ignore[prop-decorator]
    @property
    def storage_secret_key(self) -> str:
        """Secret efectivo: AWS en prod, MinIO en dev."""
        return self.aws_secret_access_key if self.is_production else self.minio_root_password

    @computed_field  # type: ignore[prop-decorator]
    @property
    def effective_bucket(self) -> str:
        """Bucket efectivo según entorno."""
        return self.aws_s3_bucket if self.is_production else self.minio_bucket


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
