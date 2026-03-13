"""OpenQHSE AI Engine — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import get_settings
from app.core.llm import close_redis, get_ollama_client, get_redis
from app.routes import router
from app.schemas import HealthResponse

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logger.info("ai_engine_starting", model=settings.ollama_model, environment=settings.environment)
    yield
    await close_redis()
    logger.info("ai_engine_shutdown")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Prometheus
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    # Routes
    app.include_router(router)

    # Health check
    @app.get("/health", response_model=HealthResponse, tags=["Health"])
    async def health() -> HealthResponse:
        client = get_ollama_client()
        ollama_ok = await client.health_check()

        redis_ok = False
        try:
            redis = await get_redis()
            await redis.ping()
            redis_ok = True
        except Exception:
            pass

        status = "healthy" if (ollama_ok and redis_ok) else "degraded"
        return HealthResponse(
            status=status,
            ollama_connected=ollama_ok,
            redis_connected=redis_ok,
            model_loaded=settings.ollama_model,
        )

    return app


app = create_app()
