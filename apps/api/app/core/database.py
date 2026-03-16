"""Async database engine, session management.

Supports both PostgreSQL (production) and SQLite (local dev, no Docker needed).
Set DATABASE_URL=sqlite+aiosqlite:///./openqhse.db to use SQLite.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

settings = get_settings()

_db_url = settings.effective_database_url
_IS_SQLITE = _db_url.startswith("sqlite")

# ── Async engine (FastAPI) ────────────────────────────────────

if _IS_SQLITE:
    engine = create_async_engine(
        _db_url,
        echo=settings.debug,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        _db_url,
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

if _IS_SQLITE:
    _sync_url = _db_url.replace("sqlite+aiosqlite", "sqlite")
    sync_engine = create_engine(
        _sync_url,
        echo=settings.debug,
        connect_args={"check_same_thread": False},
    )
else:
    _sync_url = _db_url.replace("postgresql+asyncpg", "postgresql+psycopg2")
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

    For PostgreSQL: sets SET LOCAL app.current_org_id for RLS.
    For SQLite: skips the RLS command (not supported).
    """
    from app.core.context import current_org_id  # evitar import circular

    async with async_session_factory() as session:
        try:
            if not _IS_SQLITE:
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
    """Crea todas las tablas (desarrollo/tests/SQLite local)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager yielding a database session for Celery tasks."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
