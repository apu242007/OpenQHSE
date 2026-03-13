"""Risk management models: Risk Register, HAZOP, Bow-Tie."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class RiskType(StrEnum):
    SAFETY = "safety"
    HEALTH = "health"
    ENVIRONMENT = "environment"
    QUALITY = "quality"
    SECURITY = "security"


class RiskStatus(StrEnum):
    IDENTIFIED = "identified"
    ASSESSED = "assessed"
    MITIGATED = "mitigated"
    ACCEPTED = "accepted"
    CLOSED = "closed"
    MONITORING = "monitoring"


class HazopStatus(StrEnum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    APPROVED = "approved"


class RiskRegister(BaseModel):
    """Enterprise risk register entry."""

    __tablename__ = "risk_registers"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True
    )

    area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    process: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hazard_description: Mapped[str] = mapped_column(Text, nullable=False)
    hazard_category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    risk_type: Mapped[RiskType] = mapped_column(
        String(20), nullable=False, index=True
    )

    # Inherent risk (before controls)
    inherent_likelihood: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="1-5 scale"
    )
    inherent_severity: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="1-5 scale"
    )
    inherent_rating: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="likelihood × severity"
    )

    # Controls (hierarchical: elimination → PPE)
    controls: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        default=list,
        doc=(
            "List of controls: [{type: 'elimination'|'substitution'|'engineering'"
            "|'administrative'|'ppe', description, effectiveness, responsible}]"
        ),
    )

    # Residual risk (after controls)
    residual_likelihood: Mapped[int] = mapped_column(Integer, nullable=False)
    residual_severity: Mapped[int] = mapped_column(Integer, nullable=False)
    residual_rating: Mapped[int] = mapped_column(Integer, nullable=False)

    risk_owner: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    review_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[RiskStatus] = mapped_column(
        String(20), default=RiskStatus.IDENTIFIED, nullable=False, index=True
    )

    legal_requirement: Mapped[str | None] = mapped_column(Text, nullable=True)
    applicable_standard: Mapped[str | None] = mapped_column(String(255), nullable=True)


class HazopStudy(BaseModel):
    """HAZOP (Hazard and Operability) study."""

    __tablename__ = "hazop_studies"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    system_description: Mapped[str] = mapped_column(Text, nullable=False)
    p_and_id_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[HazopStatus] = mapped_column(
        String(20), default=HazopStatus.DRAFT, nullable=False, index=True
    )
    team_members: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=True, doc="[{user_id, name, role_in_study}]"
    )
    facilitator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    nodes: Mapped[list[HazopNode]] = relationship(
        "HazopNode", back_populates="study", lazy="selectin"
    )


class HazopNode(BaseModel):
    """Individual node within a HAZOP study."""

    __tablename__ = "hazop_nodes"

    study_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hazop_studies.id"), nullable=False, index=True
    )

    node_name: Mapped[str] = mapped_column(String(255), nullable=False)
    design_intent: Mapped[str] = mapped_column(Text, nullable=False)
    guide_word: Mapped[str] = mapped_column(String(50), nullable=False)
    deviation: Mapped[str] = mapped_column(String(255), nullable=False)

    causes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    consequences: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    safeguards: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    risk_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recommendations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]

    # Relationships
    study: Mapped[HazopStudy] = relationship(
        "HazopStudy", back_populates="nodes", lazy="selectin"
    )


class BowTie(BaseModel):
    """Bow-Tie risk analysis diagram data."""

    __tablename__ = "bow_ties"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True
    )

    top_event: Mapped[str] = mapped_column(String(500), nullable=False)
    hazard: Mapped[str] = mapped_column(String(500), nullable=False)

    threats: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, default=list,
        doc="[{id, description, likelihood}]",
    )
    consequences: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, default=list,
        doc="[{id, description, severity}]",
    )
    prevention_barriers: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, default=list,
        doc="[{id, description, type, threat_id, effectiveness}]",
    )
    mitigation_barriers: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=False, default=list,
        doc="[{id, description, type, consequence_id, effectiveness}]",
    )
    critical_controls: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=True,
        doc="[{id, barrier_id, description, verification_method, frequency}]",
    )
