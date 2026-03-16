"""Alembic environment configuration.

Supports both PostgreSQL (uses psycopg2 sync driver) and
SQLite (uses the stdlib sqlite3 driver) based on DATABASE_URL.
"""

from logging.config import fileConfig

from sqlalchemy import pool

import app.models  # noqa: F401  — registers all models with Base.metadata
from alembic import context
from app.core.config import get_settings
from app.core.database import Base

config = context.config
settings = get_settings()

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

_raw_url = settings.effective_database_url
_IS_SQLITE = _raw_url.startswith("sqlite")

if _IS_SQLITE:
    # Strip aiosqlite driver for sync Alembic usage
    _db_url = _raw_url.replace("sqlite+aiosqlite", "sqlite")
else:
    # Swap asyncpg → psycopg2 for sync Alembic usage
    _db_url = _raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

config.set_main_option("sqlalchemy.url", _db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=_IS_SQLITE,  # required for ALTER TABLE in SQLite
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    from sqlalchemy import create_engine

    if _IS_SQLITE:
        connectable = create_engine(
            _db_url,
            poolclass=pool.NullPool,
            connect_args={"check_same_thread": False},
        )
        connect_opts: dict = {}
    else:
        connectable = create_engine(
            _db_url,
            poolclass=pool.NullPool,
            connect_args={"client_encoding": "utf8"},
        )
        connect_opts = {}

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=_IS_SQLITE,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
