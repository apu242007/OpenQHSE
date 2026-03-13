"""Dashboard analytics endpoint."""

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.models.incident import Incident, IncidentStatus
from app.models.inspection import Finding, FindingStatus, Inspection, InspectionStatus
from app.models.permit import WorkPermit, PermitStatus
from app.schemas.common import BaseSchema

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardKPIs(BaseSchema):
    """Key Performance Indicators for the organization dashboard."""

    total_inspections: int
    completed_inspections: int
    inspections_in_progress: int
    inspection_completion_rate: float
    total_findings: int
    open_findings: int
    overdue_findings: int
    critical_findings: int
    total_incidents: int
    open_incidents: int
    incidents_this_month: int
    active_permits: int
    pending_permits: int
    safety_score: float


class RecentActivity(BaseSchema):
    """Recent activity item."""

    type: str
    title: str
    reference: str
    status: str
    timestamp: str
    user: str | None = None


class DashboardResponse(BaseSchema):
    """Full dashboard data."""

    kpis: DashboardKPIs
    recent_inspections: list[dict]  # type: ignore[type-arg]
    recent_incidents: list[dict]  # type: ignore[type-arg]


@router.get(
    "",
    response_model=DashboardResponse,
    summary="Get organization dashboard data",
)
async def get_dashboard(
    db: DBSession,
    current_user: CurrentUser,
) -> DashboardResponse:
    """Return KPIs and recent activity for the organization dashboard."""
    org_id = current_user.organization_id

    # ── Inspection KPIs ────────────────────────────────────
    total_inspections_q = await db.execute(
        select(func.count(Inspection.id)).where(
            Inspection.organization_id == org_id,
            Inspection.is_deleted == False,  # noqa: E712
        )
    )
    total_inspections = total_inspections_q.scalar() or 0

    completed_q = await db.execute(
        select(func.count(Inspection.id)).where(
            Inspection.organization_id == org_id,
            Inspection.status == InspectionStatus.COMPLETED,
            Inspection.is_deleted == False,  # noqa: E712
        )
    )
    completed_inspections = completed_q.scalar() or 0

    in_progress_q = await db.execute(
        select(func.count(Inspection.id)).where(
            Inspection.organization_id == org_id,
            Inspection.status == InspectionStatus.IN_PROGRESS,
            Inspection.is_deleted == False,  # noqa: E712
        )
    )
    inspections_in_progress = in_progress_q.scalar() or 0

    # ── Finding KPIs ───────────────────────────────────────
    total_findings_q = await db.execute(
        select(func.count(Finding.id)).where(
            Finding.organization_id == org_id,
            Finding.is_deleted == False,  # noqa: E712
        )
    )
    total_findings = total_findings_q.scalar() or 0

    open_findings_q = await db.execute(
        select(func.count(Finding.id)).where(
            Finding.organization_id == org_id,
            Finding.status == FindingStatus.OPEN,
            Finding.is_deleted == False,  # noqa: E712
        )
    )
    open_findings = open_findings_q.scalar() or 0

    overdue_q = await db.execute(
        select(func.count(Finding.id)).where(
            Finding.organization_id == org_id,
            Finding.status == FindingStatus.OVERDUE,
            Finding.is_deleted == False,  # noqa: E712
        )
    )
    overdue_findings = overdue_q.scalar() or 0

    critical_q = await db.execute(
        select(func.count(Finding.id)).where(
            Finding.organization_id == org_id,
            Finding.severity == "critical",
            Finding.status.in_(["open", "in_progress"]),
            Finding.is_deleted == False,  # noqa: E712
        )
    )
    critical_findings = critical_q.scalar() or 0

    # ── Incident KPIs ──────────────────────────────────────
    total_incidents_q = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.organization_id == org_id,
            Incident.is_deleted == False,  # noqa: E712
        )
    )
    total_incidents = total_incidents_q.scalar() or 0

    open_incidents_q = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.organization_id == org_id,
            Incident.status.in_([
                IncidentStatus.REPORTED,
                IncidentStatus.UNDER_INVESTIGATION,
            ]),
            Incident.is_deleted == False,  # noqa: E712
        )
    )
    open_incidents = open_incidents_q.scalar() or 0

    from datetime import UTC, datetime

    now = datetime.now(UTC)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    incidents_month_q = await db.execute(
        select(func.count(Incident.id)).where(
            Incident.organization_id == org_id,
            Incident.occurred_at >= first_of_month,
            Incident.is_deleted == False,  # noqa: E712
        )
    )
    incidents_this_month = incidents_month_q.scalar() or 0

    # ── Permit KPIs ────────────────────────────────────────
    active_permits_q = await db.execute(
        select(func.count(WorkPermit.id)).where(
            WorkPermit.organization_id == org_id,
            WorkPermit.status == PermitStatus.ACTIVE,
            WorkPermit.is_deleted == False,  # noqa: E712
        )
    )
    active_permits = active_permits_q.scalar() or 0

    pending_permits_q = await db.execute(
        select(func.count(WorkPermit.id)).where(
            WorkPermit.organization_id == org_id,
            WorkPermit.status == PermitStatus.PENDING_APPROVAL,
            WorkPermit.is_deleted == False,  # noqa: E712
        )
    )
    pending_permits = pending_permits_q.scalar() or 0

    # ── Computed ───────────────────────────────────────────
    completion_rate = (
        (completed_inspections / total_inspections * 100)
        if total_inspections > 0
        else 0.0
    )

    resolved_findings = total_findings - open_findings - overdue_findings
    safety_score = (
        (resolved_findings / total_findings * 100) if total_findings > 0 else 100.0
    )

    # ── Recent Activity ────────────────────────────────────
    recent_insp_q = await db.execute(
        select(Inspection)
        .where(
            Inspection.organization_id == org_id,
            Inspection.is_deleted == False,  # noqa: E712
        )
        .order_by(Inspection.created_at.desc())
        .limit(5)
    )
    recent_inspections = [
        {
            "id": str(i.id),
            "title": i.title,
            "reference_number": i.reference_number,
            "status": i.status,
            "created_at": i.created_at.isoformat(),
        }
        for i in recent_insp_q.scalars().all()
    ]

    recent_inc_q = await db.execute(
        select(Incident)
        .where(
            Incident.organization_id == org_id,
            Incident.is_deleted == False,  # noqa: E712
        )
        .order_by(Incident.occurred_at.desc())
        .limit(5)
    )
    recent_incidents = [
        {
            "id": str(i.id),
            "title": i.title,
            "reference_number": i.reference_number,
            "severity": i.severity,
            "status": i.status,
            "occurred_at": i.occurred_at.isoformat(),
        }
        for i in recent_inc_q.scalars().all()
    ]

    return DashboardResponse(
        kpis=DashboardKPIs(
            total_inspections=total_inspections,
            completed_inspections=completed_inspections,
            inspections_in_progress=inspections_in_progress,
            inspection_completion_rate=round(completion_rate, 1),
            total_findings=total_findings,
            open_findings=open_findings,
            overdue_findings=overdue_findings,
            critical_findings=critical_findings,
            total_incidents=total_incidents,
            open_incidents=open_incidents,
            incidents_this_month=incidents_this_month,
            active_permits=active_permits,
            pending_permits=pending_permits,
            safety_score=round(safety_score, 1),
        ),
        recent_inspections=recent_inspections,
        recent_incidents=recent_incidents,
    )
