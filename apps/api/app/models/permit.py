"""Permit-to-work model."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid
    from datetime import datetime


class PermitStatus(StrEnum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"
    REJECTED = "rejected"
    EXPIRED = "expired"


class PermitType(StrEnum):
    HOT_WORK = "hot_work"
    CONFINED_SPACE = "confined_space"
    WORKING_AT_HEIGHT = "working_at_height"
    ELECTRICAL = "electrical"
    EXCAVATION = "excavation"
    LIFTING = "lifting"
    CHEMICAL_HANDLING = "chemical_handling"
    GENERAL = "general"


class WorkPermit(BaseModel):
    """Permit-to-work for hazardous activities."""

    __tablename__ = "work_permits"

    reference_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    permit_type: Mapped[PermitType] = mapped_column(String(30), nullable=False, index=True)
    status: Mapped[PermitStatus] = mapped_column(
        String(20),
        default=PermitStatus.DRAFT,
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    hazards_identified: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    precautions: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    ppe_required: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checklist_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    signatures: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        doc="JSON: {requester_sig, approver_sig, closer_sig}",
    )

    # Foreign keys
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True)
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("areas.id"), nullable=True)
    requested_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    extensions: Mapped[list[PermitExtension]] = relationship(
        "PermitExtension", back_populates="permit", lazy="selectin"
    )


class PermitExtension(BaseModel):
    """Time extension request for a work permit."""

    __tablename__ = "permit_extensions"

    permit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("work_permits.id"), nullable=False, index=True
    )
    new_end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    permit: Mapped[WorkPermit] = relationship("WorkPermit", back_populates="extensions", lazy="selectin")
