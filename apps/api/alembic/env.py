"""Alembic environment configuration for PostgreSQL.

Uses psycopg2 (sync) for migrations to avoid asyncpg/Python 3.13 Windows
compatibility issues. The application runtime still uses asyncpg via SQLAlchemy.
"""

from logging.config import fileConfig

from sqlalchemy import pool

# Import the models package so every model is registered with Base.metadata.
# The __init__.py re-exports all models across all domains.
import app.models  # noqa: F401
from alembic import context
from app.core.config import get_settings
from app.core.database import Base

config = context.config
settings = get_settings()

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Use psycopg2 (sync) URL for Alembic — swap asyncpg driver
_db_url = settings.effective_database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
config.set_main_option("sqlalchemy.url", _db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (sync psycopg2)."""
    from sqlalchemy import create_engine

    connectable = create_engine(
        _db_url,
        poolclass=pool.NullPool,
        connect_args={"client_encoding": "utf8"},
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
