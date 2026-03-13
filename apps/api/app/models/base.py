"""Base model con campos de auditoría, soft-delete y eventos SQLAlchemy."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, String, event, false, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TimestampMixin:
    """Mixin con columnas created_at y updated_at timezone-aware."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """Mixin con soft-delete: is_deleted, deleted_at, deleted_by."""

    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), index=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    deleted_by: Mapped[str | None] = mapped_column(String(255), nullable=True)


class BaseModel(Base, TimestampMixin, SoftDeleteMixin):
    """Abstract base model con UUID primary key y auditoría completa.

    Campos heredados:
    - id: UUID primary key
    - created_at / updated_at: timestamps UTC auto-gestionados
    - is_deleted / deleted_at / deleted_by: soft-delete
    - created_by / updated_by: auto-poblados via ContextVar en eventos SQLAlchemy
    """

    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)


# ── SQLAlchemy events — auto-poblar created_by / updated_by ───

@event.listens_for(BaseModel, "before_insert", propagate=True)
def _set_created_by(mapper, connection, target):  # type: ignore[no-untyped-def]
    """Setea created_by desde el ContextVar current_user_id antes de insertar."""
    try:
        from app.core.context import current_user_id
        user_id = current_user_id.get()
        if user_id and target.created_by is None:
            target.created_by = user_id
    except Exception:
        pass  # Nunca bloquear la operación si el contexto no está disponible


@event.listens_for(BaseModel, "before_update", propagate=True)
def _set_updated_by(mapper, connection, target):  # type: ignore[no-untyped-def]
    """Setea updated_by desde el ContextVar current_user_id antes de actualizar."""
    try:
        from app.core.context import current_user_id
        user_id = current_user_id.get()
        if user_id:
            target.updated_by = user_id
    except Exception:
        pass
