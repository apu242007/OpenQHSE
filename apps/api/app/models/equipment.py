"""Equipment / asset management models."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
)
from app.models._compat import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid
    from datetime import datetime


class EquipmentStatus(StrEnum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    OUT_OF_SERVICE = "out_of_service"
    DECOMMISSIONED = "decommissioned"


class InspectionResult(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    CONDITIONAL = "conditional"


class Equipment(BaseModel):
    """Physical equipment / asset tracked in the platform."""

    __tablename__ = "equipment"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(100), nullable=False, index=True, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    qr_code_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[EquipmentStatus] = mapped_column(
        String(20), default=EquipmentStatus.ACTIVE, nullable=False, index=True
    )

    purchase_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_inspection_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_inspection_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    certifications: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="[{name, issuer, issued_date, expiry_date, file_url}]",
    )
    documents: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="[{title, type, file_url}]",
    )

    # Relationships
    inspections: Mapped[list[EquipmentInspection]] = relationship(
        "EquipmentInspection", back_populates="equipment", lazy="selectin"
    )


class EquipmentInspection(BaseModel):
    """Inspection record for a piece of equipment."""

    __tablename__ = "equipment_inspections"

    equipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment.id"), nullable=False, index=True
    )
    inspector_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    inspected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    result: Mapped[InspectionResult] = mapped_column(String(20), nullable=False, default=InspectionResult.PASS)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    findings: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="[{description, severity, photo_url, action_required}]",
    )
    next_inspection_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attachments: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="[{file_url, filename}]",
    )

    equipment: Mapped[Equipment] = relationship("Equipment", back_populates="inspections", lazy="selectin")
