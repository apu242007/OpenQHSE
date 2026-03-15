"""Modelo de Observaciones de Comportamiento (BBS — Behavior Based Safety)."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid


class ObservationType(enum.StrEnum):
    SAFE = "SAFE"  # Comportamiento seguro — reforzar positivamente
    UNSAFE = "UNSAFE"  # Comportamiento inseguro — requiere intervención
    NEAR_MISS_BEHAVIOR = "NEAR_MISS_BEHAVIOR"  # Cuasi-accidente de comportamiento


class ObservationCategory(enum.StrEnum):
    PPE = "PPE"  # Equipo de Protección Personal
    PROCEDURE = "PROCEDURE"  # Cumplimiento de procedimientos
    HOUSEKEEPING = "HOUSEKEEPING"  # Orden y limpieza
    TOOL_USE = "TOOL_USE"  # Uso correcto de herramientas/equipos
    COMMUNICATION = "COMMUNICATION"  # Comunicación de riesgos
    ERGONOMICS = "ERGONOMICS"  # Ergonomía y posturas
    ENERGY_ISOLATION = "ENERGY_ISOLATION"  # Aislamiento de energías (LOTO)
    OTHER = "OTHER"


class ObservationStatus(enum.StrEnum):
    OPEN = "OPEN"
    IN_REVIEW = "IN_REVIEW"
    ACTION_ASSIGNED = "ACTION_ASSIGNED"
    CLOSED = "CLOSED"


class BehaviorObservation(BaseModel):
    """Observación de Comportamiento (BBS — Behavior Based Safety).

    Herramienta fundamental de seguridad proactiva. Permite a cualquier
    trabajador reportar comportamientos seguros e inseguros. Las observaciones
    anónimas protegen al observado pero permiten análisis de tendencias.
    """

    __tablename__ = "behavior_observations"
    __table_args__ = (
        Index("ix_obs_org_type", "organization_id", "type"),
        Index("ix_obs_org_status", "organization_id", "status"),
        Index("ix_obs_org_created", "organization_id", "created_at"),
        Index("ix_obs_org_deleted", "organization_id", "is_deleted"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True, index=True
    )

    # ── Clasificación ────────────────────────────────────────
    type: Mapped[ObservationType] = mapped_column(
        Enum(ObservationType, name="observation_type"),
        nullable=False,
        index=True,
    )
    category: Mapped[ObservationCategory] = mapped_column(
        Enum(ObservationCategory, name="observation_category"),
        nullable=False,
    )

    # ── Descripción ──────────────────────────────────────────
    description: Mapped[str] = mapped_column(Text, nullable=False)
    area: Mapped[str | None] = mapped_column(String(255), nullable=True, doc="Área o zona específica")
    task_being_performed: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Observador ───────────────────────────────────────────
    observer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    is_anonymous: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        doc="Si True, no se muestra el nombre del observado en reportes públicos",
    )

    # ── Persona observada (opcional, puede ser anónima) ───────
    observed_person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    observed_contractor_worker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contractor_workers.id"),
        nullable=True,
        doc="Si el observado es personal contratista, no usuario interno",
    )

    # ── Retroalimentación ────────────────────────────────────
    positive_feedback: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Para observaciones SAFE: qué hizo bien el trabajador",
    )
    improvement_feedback: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Para observaciones UNSAFE: qué debe mejorar",
    )

    # ── Evidencia ────────────────────────────────────────────
    photos: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        doc="Paths de fotos en MinIO/S3",
    )

    # ── Estado y acciones ────────────────────────────────────
    status: Mapped[ObservationStatus] = mapped_column(
        Enum(ObservationStatus, name="observation_status"),
        default=ObservationStatus.OPEN,
        nullable=False,
        index=True,
    )
    action_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("corrective_actions.id"),
        nullable=True,
        doc="Acción correctiva generada a partir de esta observación",
    )

    # ── Coordenadas GPS (opcional) ────────────────────────────
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
