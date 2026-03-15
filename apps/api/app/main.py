"""FastAPI application factory — OpenQHSE Platform API."""

from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from pydantic import ValidationError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes import (
    actions,
    analytics,
    auth,
    contractors,
    dashboard,
    documents,
    equipment,
    forms,
    incidents,
    inspections,
    kpis,
    marketplace,
    notifications,
    observations,
    permits,
    risks,
    training,
    users,
)
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.rate_limit import limiter

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

settings = get_settings()
logger = structlog.get_logger("openqhse.api")

# limiter is defined in app.core.rate_limit to avoid circular imports.
# Per-endpoint limits are applied via @limiter.limit() in each router:
# - /auth/login:            @limiter.limit("10/minute")
# - /auth/forgot-password:  @limiter.limit("3/minute")
# - /marketplace (público): @limiter.limit("100/minute")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup y shutdown del servidor."""
    setup_logging()
    logger.info(
        "Starting OpenQHSE API",
        version=settings.app_version,
        environment=settings.environment,
        debug=settings.debug,
    )

    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
        )
        logger.info("Sentry initialized")

    yield

    logger.info("Shutting down OpenQHSE API")


def create_app() -> FastAPI:
    """Crea y configura la aplicación FastAPI con todos los middlewares."""
    app = FastAPI(
        title="OpenQHSE API",
        description=(
            "Enterprise QHSE (Quality, Health, Safety & Environment) Management Platform. "
            "Open-source alternative to SafetyCulture/iAuditor for heavy industry.\n\n"
            "**Auth**: JWT via httpOnly cookies (NextAuth v5). "
            "NUNCA usar localStorage para tokens."
        ),
        version=settings.app_version,
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        swagger_ui_parameters={"persistAuthorization": True},
    )

    # ── Rate Limiting (slowapi) ────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
    app.add_middleware(SlowAPIMiddleware)

    # ── CORS ──────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )

    # ── Security Headers + Request ID + Structured Logging ────
    @app.middleware("http")
    async def security_and_tracing_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(
                "Unhandled middleware error",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                error=str(exc),
            )
            raise

        duration_ms = (time.perf_counter() - start_time) * 1000

        # Cabeceras de trazabilidad
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

        # Security headers (OWASP)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Log estructurado JSON de cada request
        logger.info(
            "http_request",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
            client_ip=request.client.host if request.client else "unknown",
        )
        return response

    # ── Prometheus Metrics ────────────────────────────────────
    if settings.prometheus_enabled:
        try:
            from prometheus_fastapi_instrumentator import Instrumentator

            Instrumentator().instrument(app).expose(app, endpoint="/metrics")
        except ImportError:
            logger.warning("prometheus_fastapi_instrumentator not installed, /metrics disabled")

    # ── Health Check ──────────────────────────────────────────
    @app.get(
        f"{settings.api_prefix}/health",
        tags=["System"],
        summary="Health check",
        response_model=None,
    )
    async def health_check() -> dict[str, Any]:
        """Retorna el estado de salud del servicio y sus dependencias."""
        db_status = "ok"
        redis_status = "ok"

        try:
            from sqlalchemy import text as sa_text

            from app.core.database import engine

            async with engine.connect() as conn:
                await conn.execute(sa_text("SELECT 1"))
        except Exception as exc:
            db_status = f"error: {type(exc).__name__}"

        try:
            from app.core.redis import redis_client

            await redis_client.ping()
        except Exception as exc:
            redis_status = f"error: {type(exc).__name__}"

        overall = "healthy" if db_status == "ok" and redis_status == "ok" else "degraded"
        return {
            "status": overall,
            "version": settings.app_version,
            "environment": settings.environment,
            "database": db_status,
            "redis": redis_status,
        }

    # ── Routers con prefix /api/v1 ────────────────────────────
    prefix = settings.api_prefix
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(inspections.router, prefix=prefix)
    app.include_router(incidents.router, prefix=prefix)
    app.include_router(actions.router, prefix=prefix)
    app.include_router(permits.router, prefix=prefix)
    app.include_router(forms.router, prefix=prefix)
    app.include_router(risks.router, prefix=prefix)
    app.include_router(documents.router, prefix=prefix)
    app.include_router(training.router, prefix=prefix)
    app.include_router(equipment.router, prefix=prefix)
    app.include_router(notifications.router, prefix=prefix)
    app.include_router(kpis.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(contractors.router, prefix=prefix)
    app.include_router(observations.router, prefix=prefix)
    app.include_router(marketplace.router, prefix=prefix)

    # ── Manejadores de Excepciones ────────────────────────────

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError) -> ORJSONResponse:
        logger.warning(
            "pydantic_validation_error",
            request_id=getattr(request.state, "request_id", "unknown"),
            path=str(request.url),
            errors=exc.errors(),
        )
        return ORJSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            "unhandled_exception",
            request_id=request_id,
            path=str(request.url),
            method=request.method,
            error_type=type(exc).__name__,
            error=str(exc),
            exc_info=True,
        )
        return ORJSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "request_id": request_id,
            },
        )

    return app


app = create_app()
