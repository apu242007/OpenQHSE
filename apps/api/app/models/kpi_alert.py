"""Modelos de Alertas y Reglas de KPI configurable por umbral."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid
    from datetime import datetime


class KPIName(enum.StrEnum):
    """KPIs monitoreables — lagging y leading indicators."""

    # Lagging (OSHA)
    TRIR = "TRIR"  # Total Recordable Incident Rate
    LTIF = "LTIF"  # Lost Time Injury Frequency
    DART = "DART"  # Days Away, Restricted or Transferred
    FAR = "FAR"  # Fatal Accident Rate
    SEVERITY_RATE = "SEVERITY_RATE"
    # Leading
    ACTIONS_OVERDUE = "ACTIONS_OVERDUE"
    ACTIONS_OPEN = "ACTIONS_OPEN"
    INSPECTIONS_OVERDUE = "INSPECTIONS_OVERDUE"
    TRAINING_COMPLIANCE = "TRAINING_COMPLIANCE"
    PERMIT_COMPLIANCE = "PERMIT_COMPLIANCE"
    NEAR_MISS_RATE = "NEAR_MISS_RATE"
    OBSERVATION_RATE = "OBSERVATION_RATE"  # BBS observations / month
    CONTRACTOR_INCIDENTS = "CONTRACTOR_INCIDENTS"


class AlertCondition(enum.StrEnum):
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    EQUALS = "EQUALS"
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL"
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL"


class AlertStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"  # Regla activa, no disparada
    TRIGGERED = "TRIGGERED"  # Umbral superado, alerta enviada
    ACKNOWLEDGED = "ACKNOWLEDGED"  # Reconocida por un responsable
    RESOLVED = "RESOLVED"  # KPI volvió a nivel normal


class AlertPeriod(enum.StrEnum):
    REAL_TIME = "REAL_TIME"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class KPIAlertRule(BaseModel):
    """Regla configurable de alerta por umbral de KPI.

    Define cuándo se debe disparar una alerta, a quién notificar
    y por qué canales. Una regla puede generar múltiples KPIAlert instances.
    """

    __tablename__ = "kpi_alert_rules"
    __table_args__ = (
        Index("ix_kpi_rules_org_active", "organization_id", "is_active"),
        Index("ix_kpi_rules_org_kpi", "organization_id", "kpi_name"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    kpi_name: Mapped[KPIName] = mapped_column(Enum(KPIName, name="kpi_name_enum"), nullable=False, index=True)
    condition: Mapped[AlertCondition] = mapped_column(Enum(AlertCondition, name="alert_condition"), nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    period: Mapped[AlertPeriod] = mapped_column(
        Enum(AlertPeriod, name="alert_period"),
        default=AlertPeriod.MONTHLY,
        nullable=False,
    )

    # Canales de notificación y destinatarios
    channels: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc='{"email": true, "slack": false, "whatsapp": true, "in_app": true}',
    )
    recipients: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc='{"user_ids": [...], "emails": [...], "roles": ["manager", "org_admin"]}',
    )

    # Reglas de escalamiento
    escalation_rules: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc='{"after_hours": 4, "escalate_to_roles": ["org_admin"], "repeat_every_hours": 8}',
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class KPIAlert(BaseModel):
    """Alerta disparada cuando un KPI supera el umbral configurado.

    Cada instancia representa un evento de alerta puntual. Se crea
    automáticamente por el Celery task check_kpi_alerts.
    """

    __tablename__ = "kpi_alerts"
    __table_args__ = (
        Index("ix_kpi_alerts_org_status", "organization_id", "status"),
        Index("ix_kpi_alerts_org_kpi", "organization_id", "kpi_name"),
        Index("ix_kpi_alerts_org_created", "organization_id", "created_at"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True, index=True
    )
    rule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kpi_alert_rules.id"),
        nullable=True,
        doc="Regla que originó esta alerta (null si fue manual)",
    )

    kpi_name: Mapped[KPIName] = mapped_column(Enum(KPIName, name="kpi_name_enum"), nullable=False, index=True)
    condition: Mapped[AlertCondition] = mapped_column(Enum(AlertCondition, name="alert_condition"), nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float, nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False)
    period: Mapped[str] = mapped_column(String(7), nullable=False, doc="YYYY-MM o YYYY-WXX según el período")

    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status"),
        default=AlertStatus.TRIGGERED,
        nullable=False,
        index=True,
    )

    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Canales por los que se notificó
    notification_channels: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc='{"email": true, "slack": false, "whatsapp": true}',
    )
    # Reglas de escalamiento heredadas de la regla
    escalation_rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    escalation_count: Mapped[int] = mapped_column(default=0)
    last_escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
