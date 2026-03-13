"""KPI Alert Rule and KPI Alert Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.kpi_alert import AlertCondition, AlertPeriod, AlertStatus, KPIName
from app.schemas.common import BaseSchema, IDSchema, PaginatedResponse, TimestampSchema


# ── Alert Rule ─────────────────────────────────────────────────────────────


class KPIAlertRuleCreate(BaseSchema):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    kpi_name: KPIName
    condition: AlertCondition
    threshold: float
    period: AlertPeriod = AlertPeriod.MONTHLY
    site_id: UUID | None = None
    channels: dict = Field(default_factory=lambda: {"email": True, "in_app": True})
    recipients: dict = Field(default_factory=dict)
    escalation_rules: dict = Field(default_factory=dict)
    is_active: bool = True


class KPIAlertRuleUpdate(BaseSchema):
    name: str | None = None
    description: str | None = None
    threshold: float | None = None
    channels: dict | None = None
    recipients: dict | None = None
    escalation_rules: dict | None = None
    is_active: bool | None = None


class KPIAlertRuleResponse(IDSchema, TimestampSchema):
    organization_id: UUID
    site_id: UUID | None
    name: str
    description: str | None
    kpi_name: KPIName
    condition: AlertCondition
    threshold: float
    period: AlertPeriod
    channels: dict
    recipients: dict
    escalation_rules: dict
    is_active: bool


class KPIAlertRuleListResponse(PaginatedResponse):
    items: list[KPIAlertRuleResponse]  # type: ignore[assignment]


# ── Alert Instance ─────────────────────────────────────────────────────────


class KPIAlertAcknowledge(BaseSchema):
    notes: str | None = None


class KPIAlertResponse(IDSchema, TimestampSchema):
    organization_id: UUID
    site_id: UUID | None
    rule_id: UUID
    kpi_name: KPIName
    condition: AlertCondition
    threshold_value: float
    current_value: float
    period: AlertPeriod
    status: AlertStatus
    triggered_at: datetime
    acknowledged_at: datetime | None
    acknowledged_by: UUID | None
    resolved_at: datetime | None
    escalation_count: int
    notes: str | None
    # Derived display fields
    rule_name: str | None = None
    severity: str = "medium"  # "low" | "medium" | "high" | "critical"


class KPIAlertListResponse(PaginatedResponse):
    items: list[KPIAlertResponse]  # type: ignore[assignment]
