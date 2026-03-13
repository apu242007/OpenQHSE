"""Async database engine, session management y soporte para PostgreSQL RLS."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# ── Async engine (FastAPI) ────────────────────────────────────
engine = create_async_engine(
    settings.effective_database_url,
    echo=settings.debug,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ── Sync engine (Celery tasks) ────────────────────────────────
_sync_url = settings.effective_database_url.replace(
    "postgresql+asyncpg", "postgresql+psycopg2"
)
sync_engine = create_engine(
    _sync_url,
    echo=settings.debug,
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,
)
sync_session_factory = sessionmaker(bind=sync_engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base para todos los modelos."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency que yields una sesión de base de datos.

    Setea SET LOCAL app.current_org_id para activar las políticas RLS
    de PostgreSQL. Este valor es seteado por deps.get_current_user() via
    ContextVar antes de que get_db() sea invocado por la request.
    """
    from app.core.context import current_org_id  # evitar import circular

    async with async_session_factory() as session:
        try:
            org_id = current_org_id.get()
            if org_id:
                await session.execute(
                    text("SET LOCAL app.current_org_id = :org_id"),
                    {"org_id": org_id},
                )
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Crea todas las tablas (solo para desarrollo/tests)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
