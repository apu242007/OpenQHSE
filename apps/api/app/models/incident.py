"""Incident management models."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid
    from datetime import datetime


class IncidentType(StrEnum):
    NEAR_MISS = "near_miss"
    FIRST_AID = "first_aid"
    MEDICAL_TREATMENT = "medical_treatment"
    LOST_TIME = "lost_time"
    FATALITY = "fatality"
    PROPERTY_DAMAGE = "property_damage"
    ENVIRONMENTAL = "environmental"
    FIRE = "fire"
    SPILL = "spill"
    OTHER = "other"


class IncidentStatus(StrEnum):
    REPORTED = "reported"
    UNDER_INVESTIGATION = "under_investigation"
    CORRECTIVE_ACTIONS = "corrective_actions"
    REVIEW = "review"
    CLOSED = "closed"


class IncidentSeverity(StrEnum):
    CATASTROPHIC = "catastrophic"
    CRITICAL = "critical"
    SERIOUS = "serious"
    MODERATE = "moderate"
    MINOR = "minor"


class Incident(BaseModel):
    """Workplace incident report."""

    __tablename__ = "incidents"

    reference_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    incident_type: Mapped[IncidentType] = mapped_column(String(30), nullable=False, index=True)
    severity: Mapped[IncidentSeverity] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[IncidentStatus] = mapped_column(
        String(30),
        default=IncidentStatus.REPORTED,
        nullable=False,
        index=True,
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    gps_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    injuries_count: Mapped[int] = mapped_column(Integer, default=0)
    fatalities_count: Mapped[int] = mapped_column(Integer, default=0)
    immediate_actions: Mapped[str | None] = mapped_column(Text, nullable=True)
    root_cause_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_urls: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    witness_statements: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    # Foreign keys
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id"),
        nullable=False,
        index=True,
    )
    area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("areas.id"),
        nullable=True,
    )
    reported_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    assigned_investigator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    # Relationships
    corrective_actions: Mapped[list[CorrectiveAction]] = relationship(
        "CorrectiveAction", back_populates="incident", lazy="selectin"
    )
    witnesses: Mapped[list[IncidentWitness]] = relationship(
        "IncidentWitness", back_populates="incident", lazy="selectin"
    )
    incident_attachments: Mapped[list[IncidentAttachment]] = relationship(
        "IncidentAttachment", back_populates="incident", lazy="selectin"
    )


class CorrectiveAction(BaseModel):
    """Corrective / preventive action linked to an incident or finding."""

    __tablename__ = "corrective_actions"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    action_type: Mapped[str] = mapped_column(String(20), nullable=False, default="corrective")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open", index=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_urls: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Foreign keys
    incident_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id"),
        nullable=True,
        index=True,
    )
    finding_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("findings.id"),
        nullable=True,
        index=True,
    )
    assigned_to_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
        index=True,
    )

    # Relationships
    incident: Mapped[Incident | None] = relationship("Incident", back_populates="corrective_actions", lazy="selectin")
    updates: Mapped[list[ActionUpdate]] = relationship("ActionUpdate", back_populates="action", lazy="selectin")


class ActionUpdate(BaseModel):
    """Progress update / comment on a corrective action."""

    __tablename__ = "action_updates"

    action_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("corrective_actions.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    status_change: Mapped[str | None] = mapped_column(String(30), nullable=True)
    attachments: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]

    action: Mapped[CorrectiveAction] = relationship("CorrectiveAction", back_populates="updates", lazy="selectin")


class IncidentWitness(BaseModel):
    """Witness statement for an incident."""

    __tablename__ = "incident_witnesses"

    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)

    incident: Mapped[Incident] = relationship("Incident", back_populates="witnesses", lazy="selectin")


class IncidentAttachment(BaseModel):
    """File / photo / video attached to an incident."""

    __tablename__ = "incident_attachments"

    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False, index=True
    )
    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    incident: Mapped[Incident] = relationship("Incident", back_populates="incident_attachments", lazy="selectin")
