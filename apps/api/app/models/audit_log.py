"""Immutable audit log for compliance tracking."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AuditLog(BaseModel):
    """Immutable record of every significant action in the platform.

    Used for regulatory compliance, forensic analysis, and traceability.
    This model intentionally does NOT use SoftDeleteMixin — logs are permanent.
    """

    __tablename__ = "audit_logs"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    action: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
        doc="create | update | delete | approve | login | export | etc.",
    )
    module: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
        doc="inspections | incidents | permits | users | documents | etc.",
    )
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    changes: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=True,
        doc="{field: {old: ..., new: ...}}",
    )

    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
