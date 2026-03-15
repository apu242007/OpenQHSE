"""Analytics / executive dashboard schemas."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from pydantic import Field

from app.schemas.common import BaseSchema

if TYPE_CHECKING:
    from datetime import date, datetime
    from uuid import UUID

# ── KPI Response ────────────────────────────────────────────


class KPIVariation(BaseSchema):
    """Value with trend vs previous period."""

    value: float
    previous: float
    variation_pct: float = Field(..., description="Percentage change vs previous period")
    trend: str = Field(..., description="'up', 'down', or 'stable'")


class KPIsSummary(BaseSchema):
    """All executive KPIs for a given site/period."""

    trir: KPIVariation = Field(..., description="Total Recordable Incident Rate")
    ltif: KPIVariation = Field(..., description="Lost Time Injury Frequency")
    inspections_completed: int
    inspections_scheduled: int
    inspections_compliance_pct: float
    overdue_actions: int
    open_incidents: int
    active_permits: int
    safety_score: float


# ── Incidents Trend ─────────────────────────────────────────


class IncidentTrendPoint(BaseSchema):
    """Single month in the incidents trend chart."""

    month: str = Field(..., description="YYYY-MM")
    label: str = Field(..., description="Human-readable month label")
    total: int
    near_miss: int
    first_aid: int
    lost_time: int
    fatality: int


class IncidentsByType(BaseSchema):
    """PieChart data for incidents by type."""

    type: str
    label: str
    count: int
    color: str


class IncidentsTrendResponse(BaseSchema):
    """Full incidents trend payload."""

    trend: list[IncidentTrendPoint]
    by_type: list[IncidentsByType]
    trir_current_year: list[dict[str, Any]]
    trir_previous_year: list[dict[str, Any]]


# ── Inspections Compliance ──────────────────────────────────


class WeeklyCompliance(BaseSchema):
    """Single week of inspection compliance."""

    week: str
    label: str
    scheduled: int
    completed: int
    compliance_pct: float


class InspectionsComplianceResponse(BaseSchema):
    """Inspections compliance payload."""

    weekly: list[WeeklyCompliance]
    total_scheduled: int
    total_completed: int
    overall_pct: float


# ── Actions Summary ─────────────────────────────────────────


class OverdueAction(BaseSchema):
    """Single overdue action item."""

    id: UUID
    title: str
    responsible: str
    due_date: date
    days_overdue: int
    priority: str
    source_type: str
    source_ref: str


class ActionsSummaryResponse(BaseSchema):
    """Actions / CAPA summary payload."""

    total_open: int
    total_overdue: int
    overdue_actions: list[OverdueAction]
    by_priority: list[dict[str, Any]]
    by_source: list[dict[str, Any]]


# ── Risk Matrix ─────────────────────────────────────────────


class RiskMatrixCell(BaseSchema):
    """Single cell in the 5×5 risk matrix."""

    likelihood: int = Field(..., ge=1, le=5)
    consequence: int = Field(..., ge=1, le=5)
    count: int
    level: str = Field(..., description="low/medium/high/very_high/extreme")
    risk_ids: list[UUID]


class RiskMatrixResponse(BaseSchema):
    """Full 5×5 risk matrix payload."""

    cells: list[RiskMatrixCell]
    total_risks: int
    high_or_above: int


# ── Training Compliance ─────────────────────────────────────


class TrainingExpiring(BaseSchema):
    """Training about to expire within 30 days."""

    id: UUID
    course_name: str
    user_name: str
    expiry_date: date
    days_remaining: int
    status: str


class TrainingComplianceResponse(BaseSchema):
    """Training compliance payload."""

    total_enrollments: int
    completed: int
    in_progress: int
    overdue: int
    compliance_pct: float
    expiring_soon: list[TrainingExpiring]


# ── Top Findings Areas ──────────────────────────────────────


class TopFindingsArea(BaseSchema):
    """Area with most findings for horizontal bar chart."""

    area_id: UUID
    area_name: str
    count: int


# ── Upcoming Inspections ────────────────────────────────────


class UpcomingInspection(BaseSchema):
    """Scheduled inspection coming up."""

    id: UUID
    title: str
    site_name: str
    scheduled_date: datetime
    inspector_name: str


# ── Recent Incidents ────────────────────────────────────────


class RecentIncident(BaseSchema):
    """Latest reported incident card."""

    id: UUID
    title: str
    reference_number: str
    severity: str
    status: str
    occurred_at: datetime
    site_name: str


# ── Active Permits ──────────────────────────────────────────


class ActivePermit(BaseSchema):
    """Currently active work permit."""

    id: UUID
    title: str
    permit_type: str
    site_name: str
    valid_until: datetime
    requestor_name: str


# ── Aggregated Dashboard Response ───────────────────────────


class DashboardWidgets(BaseSchema):
    """Secondary widgets payload (lists/tables)."""

    overdue_actions: list[OverdueAction]
    upcoming_inspections: list[UpcomingInspection]
    recent_incidents: list[RecentIncident]
    active_permits: list[ActivePermit]
    expiring_training: list[TrainingExpiring]
    top_findings_areas: list[TopFindingsArea]


# ── Sidebar Badge Counts ────────────────────────────────────


class SidebarBadges(BaseSchema):
    """Counts for sidebar navigation badge indicators."""

    inspections: int = Field(0, description="Pending/scheduled inspections")
    incidents: int = Field(0, description="Open incidents")
    actions: int = Field(0, description="Overdue corrective actions")
    permits: int = Field(0, description="Active work permits")
    risks: int = Field(0, description="High+ unmitigated risks")
    documents: int = Field(0, description="Documents pending review")
    audits: int = Field(0, description="Open audit findings")
    training: int = Field(0, description="Expiring within 30 days")
    equipment: int = Field(0, description="Equipment overdue for calibration")
    notifications: int = Field(0, description="Unread notifications")
