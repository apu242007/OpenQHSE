"""Analytics / executive-dashboard API routes.

Provides aggregated KPIs, trend charts, compliance data, risk matrix,
and PDF export for the executive dashboard.
"""

from __future__ import annotations

import calendar
import io
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, case, cast, extract, func, or_, select, text, Integer, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, DBSession, ManagerUser
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.inspection import Inspection, InspectionStatus
from app.models.permit import WorkPermit, PermitStatus
from app.models.risk import RiskRegister
from app.models.training import TrainingEnrollment, EnrollmentStatus
from app.models.user import Site
from app.schemas.analytics import (
    ActionsSummaryResponse,
    ActivePermit,
    DashboardWidgets,
    IncidentsByType,
    IncidentsTrendResponse,
    IncidentTrendPoint,
    InspectionsComplianceResponse,
    KPIsSummary,
    KPIVariation,
    OverdueAction,
    RecentIncident,
    RiskMatrixCell,
    RiskMatrixResponse,
    SidebarBadges,
    TopFindingsArea,
    TrainingComplianceResponse,
    TrainingExpiring,
    UpcomingInspection,
    WeeklyCompliance,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ── Helpers ─────────────────────────────────────────────────


def _org_filter(user: CurrentUser):
    """Return org-level filter condition."""
    return True  # placeholder – expanded when models expose org_id


def _period_range(period: str) -> tuple[date, date]:
    """Convert period string to date range."""
    today = date.today()
    if period == "week":
        start = today - timedelta(days=today.weekday())
        return start, today
    if period == "month":
        return today.replace(day=1), today
    if period == "quarter":
        q = (today.month - 1) // 3
        start = today.replace(month=q * 3 + 1, day=1)
        return start, today
    # default: year
    return today.replace(month=1, day=1), today


def _variation(current: float, previous: float) -> KPIVariation:
    """Build a KPIVariation from two values."""
    if previous == 0:
        pct = 100.0 if current > 0 else 0.0
    else:
        pct = round(((current - previous) / previous) * 100, 1)
    trend = "stable" if pct == 0 else ("up" if pct > 0 else "down")
    return KPIVariation(
        value=round(current, 2),
        previous=round(previous, 2),
        variation_pct=pct,
        trend=trend,
    )


RISK_LEVEL_MAP = {
    (1, 1): "low", (1, 2): "low", (1, 3): "low", (1, 4): "medium", (1, 5): "medium",
    (2, 1): "low", (2, 2): "low", (2, 3): "medium", (2, 4): "medium", (2, 5): "high",
    (3, 1): "low", (3, 2): "medium", (3, 3): "medium", (3, 4): "high", (3, 5): "high",
    (4, 1): "medium", (4, 2): "medium", (4, 3): "high", (4, 4): "very_high", (4, 5): "very_high",
    (5, 1): "medium", (5, 2): "high", (5, 3): "high", (5, 4): "very_high", (5, 5): "extreme",
}

TYPE_COLORS = {
    "near_miss": "#FFAA00",
    "first_aid": "#0066FF",
    "medical_treatment": "#00C49F",
    "lost_time": "#FF6B35",
    "fatality": "#FF4444",
    "environmental": "#8B5CF6",
    "property_damage": "#EC4899",
    "other": "#6B7280",
}

MONTH_LABELS_ES = [
    "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]


# ── 1. KPIs Summary ────────────────────────────────────────


@router.get("/kpis", response_model=KPIsSummary)
async def get_kpis(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
    period: str = Query("year", regex="^(week|month|quarter|year)$"),
):
    """Return all executive KPIs for the dashboard top row."""
    org_id = current_user.organization_id
    start, end = _period_range(period)
    # Previous period of same length
    delta = end - start
    prev_start = start - delta - timedelta(days=1)
    prev_end = start - timedelta(days=1)

    # ── Incidents counts ────────────────────────────────
    def _incident_filter(s: date, e: date):
        filters = [
            Incident.organization_id == org_id,
            Incident.occurred_at >= datetime.combine(s, datetime.min.time()),
            Incident.occurred_at <= datetime.combine(e, datetime.max.time()),
        ]
        if site_id:
            filters.append(Incident.site_id == site_id)
        return filters

    # Current period recordable incidents (exclude near_miss)
    cur_q = select(func.count()).select_from(Incident).where(
        and_(*_incident_filter(start, end)),
        Incident.severity != "near_miss",
    )
    cur_recordable = (await db.execute(cur_q)).scalar() or 0

    # Current period lost-time incidents
    cur_lt = select(func.count()).select_from(Incident).where(
        and_(*_incident_filter(start, end)),
        Incident.severity == "lost_time",
    )
    cur_lost_time = (await db.execute(cur_lt)).scalar() or 0

    # Previous period
    prev_q = select(func.count()).select_from(Incident).where(
        and_(*_incident_filter(prev_start, prev_end)),
        Incident.severity != "near_miss",
    )
    prev_recordable = (await db.execute(prev_q)).scalar() or 0

    prev_lt = select(func.count()).select_from(Incident).where(
        and_(*_incident_filter(prev_start, prev_end)),
        Incident.severity == "lost_time",
    )
    prev_lost_time = (await db.execute(prev_lt)).scalar() or 0

    # TRIR & LTIF (per 200,000 work hours – use 200k as denominator base)
    HOURS_BASE = 200_000
    work_hours = 50_000  # placeholder – should come from site config
    trir_cur = (cur_recordable / work_hours * HOURS_BASE) if work_hours else 0
    trir_prev = (prev_recordable / work_hours * HOURS_BASE) if work_hours else 0
    ltif_cur = (cur_lost_time / work_hours * HOURS_BASE) if work_hours else 0
    ltif_prev = (prev_lost_time / work_hours * HOURS_BASE) if work_hours else 0

    # ── Inspections ─────────────────────────────────────
    insp_base = [Inspection.organization_id == org_id]
    if site_id:
        insp_base.append(Inspection.site_id == site_id)

    total_sched = (await db.execute(
        select(func.count()).select_from(Inspection).where(
            and_(*insp_base, Inspection.scheduled_date >= start, Inspection.scheduled_date <= end)
        )
    )).scalar() or 0

    total_done = (await db.execute(
        select(func.count()).select_from(Inspection).where(
            and_(*insp_base, Inspection.status == InspectionStatus.COMPLETED,
                 Inspection.completed_at >= datetime.combine(start, datetime.min.time()),
                 Inspection.completed_at <= datetime.combine(end, datetime.max.time()))
        )
    )).scalar() or 0

    compliance = round((total_done / total_sched * 100) if total_sched else 100, 1)

    # ── Overdue actions (from findings with action_due_date) ─
    overdue_count = 0  # placeholder until CorrectiveAction model is queried

    # Open incidents
    open_inc = (await db.execute(
        select(func.count()).select_from(Incident).where(
            Incident.organization_id == org_id,
            Incident.status.in_(["reported", "under_investigation"]),
            *([Incident.site_id == site_id] if site_id else []),
        )
    )).scalar() or 0

    # Active permits
    now = datetime.now(UTC)
    active_perms = (await db.execute(
        select(func.count()).select_from(WorkPermit).where(
            WorkPermit.organization_id == org_id,
            WorkPermit.status == PermitStatus.APPROVED,
            WorkPermit.valid_from <= now,
            WorkPermit.valid_until >= now,
            *([WorkPermit.site_id == site_id] if site_id else []),
        )
    )).scalar() or 0

    # Safety score (100 − TRIR normalized, floor 0)
    safety = max(0, round(100 - trir_cur * 5, 1))

    return KPIsSummary(
        trir=_variation(trir_cur, trir_prev),
        ltif=_variation(ltif_cur, ltif_prev),
        inspections_completed=total_done,
        inspections_scheduled=total_sched,
        inspections_compliance_pct=compliance,
        overdue_actions=overdue_count,
        open_incidents=open_inc,
        active_permits=active_perms,
        safety_score=safety,
    )


# ── 2. Incidents Trend ─────────────────────────────────────


@router.get("/incidents-trend", response_model=IncidentsTrendResponse)
async def get_incidents_trend(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
    months: int = Query(12, ge=1, le=24),
):
    """Return monthly incident trend for the last N months + pie by type."""
    org_id = current_user.organization_id
    today = date.today()
    start_date = (today.replace(day=1) - timedelta(days=months * 30)).replace(day=1)

    filters = [
        Incident.organization_id == org_id,
        Incident.occurred_at >= datetime.combine(start_date, datetime.min.time()),
    ]
    if site_id:
        filters.append(Incident.site_id == site_id)

    # Monthly aggregation
    rows = (await db.execute(
        select(
            extract("year", Incident.occurred_at).label("yr"),
            extract("month", Incident.occurred_at).label("mo"),
            Incident.severity,
            func.count().label("cnt"),
        )
        .where(and_(*filters))
        .group_by("yr", "mo", Incident.severity)
        .order_by("yr", "mo")
    )).all()

    # Build trend points
    monthly: dict[str, IncidentTrendPoint] = {}
    cursor = start_date
    while cursor <= today:
        key = cursor.strftime("%Y-%m")
        label = f"{MONTH_LABELS_ES[cursor.month]} {cursor.year}"
        monthly[key] = IncidentTrendPoint(
            month=key, label=label, total=0,
            near_miss=0, first_aid=0, lost_time=0, fatality=0,
        )
        # advance one month
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    for yr, mo, severity, cnt in rows:
        key = f"{int(yr)}-{int(mo):02d}"
        if key not in monthly:
            continue
        pt = monthly[key]
        pt.total += cnt
        if severity == "near_miss":
            pt.near_miss += cnt
        elif severity == "first_aid":
            pt.first_aid += cnt
        elif severity == "lost_time":
            pt.lost_time += cnt
        elif severity == "fatality":
            pt.fatality += cnt

    trend = list(monthly.values())

    # By type
    type_rows = (await db.execute(
        select(Incident.severity, func.count().label("cnt"))
        .where(and_(*filters))
        .group_by(Incident.severity)
    )).all()

    by_type = [
        IncidentsByType(
            type=str(sev), label=str(sev).replace("_", " ").title(),
            count=cnt, color=TYPE_COLORS.get(str(sev), "#6B7280"),
        )
        for sev, cnt in type_rows
    ]

    # TRIR monthly (current vs previous year)
    cur_year = today.year
    trir_cur = [{"month": MONTH_LABELS_ES[m], "value": 0} for m in range(1, 13)]
    trir_prev = [{"month": MONTH_LABELS_ES[m], "value": 0} for m in range(1, 13)]
    for pt in trend:
        yr, mo = pt.month.split("-")
        idx = int(mo) - 1
        recordable = pt.total - pt.near_miss
        val = round(recordable / 50_000 * 200_000, 2)
        if int(yr) == cur_year and 0 <= idx < 12:
            trir_cur[idx]["value"] = val
        elif int(yr) == cur_year - 1 and 0 <= idx < 12:
            trir_prev[idx]["value"] = val

    return IncidentsTrendResponse(
        trend=trend,
        by_type=by_type,
        trir_current_year=trir_cur,
        trir_previous_year=trir_prev,
    )


# ── 3. Inspections Compliance ───────────────────────────────


@router.get("/inspections-compliance", response_model=InspectionsComplianceResponse)
async def get_inspections_compliance(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
    period: str = Query("quarter", regex="^(month|quarter|year)$"),
):
    """Return weekly inspection compliance for bar chart."""
    org_id = current_user.organization_id
    start, end = _period_range(period)

    filters = [Inspection.organization_id == org_id]
    if site_id:
        filters.append(Inspection.site_id == site_id)

    # Get all inspections in period
    rows = (await db.execute(
        select(
            Inspection.scheduled_date,
            Inspection.status,
        ).where(
            and_(
                *filters,
                Inspection.scheduled_date >= start,
                Inspection.scheduled_date <= end,
            )
        )
    )).all()

    # Group by ISO week
    weekly_map: dict[str, WeeklyCompliance] = {}
    for sched_date, status in rows:
        if sched_date is None:
            continue
        d = sched_date if isinstance(sched_date, date) else sched_date.date()
        iso = d.isocalendar()
        key = f"{iso.year}-W{iso.week:02d}"
        if key not in weekly_map:
            weekly_map[key] = WeeklyCompliance(
                week=key, label=f"Sem {iso.week}", scheduled=0, completed=0, compliance_pct=0
            )
        weekly_map[key].scheduled += 1
        if status in (InspectionStatus.COMPLETED, "completed", "reviewed"):
            weekly_map[key].completed += 1

    for wc in weekly_map.values():
        wc.compliance_pct = round(
            (wc.completed / wc.scheduled * 100) if wc.scheduled else 0, 1
        )

    weekly = sorted(weekly_map.values(), key=lambda w: w.week)
    total_s = sum(w.scheduled for w in weekly)
    total_c = sum(w.completed for w in weekly)

    return InspectionsComplianceResponse(
        weekly=weekly,
        total_scheduled=total_s,
        total_completed=total_c,
        overall_pct=round((total_c / total_s * 100) if total_s else 0, 1),
    )


# ── 4. Actions Summary ─────────────────────────────────────


@router.get("/actions-summary", response_model=ActionsSummaryResponse)
async def get_actions_summary(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
):
    """Return overdue and open corrective actions."""
    # Placeholder — will query CorrectiveAction model when available.
    # For now return empty summary so the frontend can render.
    return ActionsSummaryResponse(
        total_open=0,
        total_overdue=0,
        overdue_actions=[],
        by_priority=[
            {"priority": "critical", "count": 0},
            {"priority": "high", "count": 0},
            {"priority": "medium", "count": 0},
            {"priority": "low", "count": 0},
        ],
        by_source=[
            {"source": "inspection", "count": 0},
            {"source": "incident", "count": 0},
            {"source": "audit", "count": 0},
        ],
    )


# ── 5. Risk Matrix ─────────────────────────────────────────


@router.get("/risk-matrix", response_model=RiskMatrixResponse)
async def get_risk_matrix(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
):
    """Return 5×5 risk matrix cell data."""
    org_id = current_user.organization_id

    filters = [RiskRegister.organization_id == org_id]
    if site_id:
        filters.append(RiskRegister.site_id == site_id)

    rows = (await db.execute(
        select(
            RiskRegister.residual_likelihood,
            RiskRegister.residual_severity,
            func.count().label("cnt"),
            func.array_agg(RiskRegister.id).label("ids"),
        )
        .where(and_(*filters))
        .group_by(RiskRegister.residual_likelihood, RiskRegister.residual_severity)
    )).all()

    cells: list[RiskMatrixCell] = []
    total = 0
    high_count = 0

    # Pre-fill all 25 cells
    for lik in range(1, 6):
        for con in range(1, 6):
            cells.append(RiskMatrixCell(
                likelihood=lik,
                consequence=con,
                count=0,
                level=RISK_LEVEL_MAP.get((lik, con), "medium"),
                risk_ids=[],
            ))

    for lik, con, cnt, ids in rows:
        for cell in cells:
            if cell.likelihood == lik and cell.consequence == con:
                cell.count = cnt
                cell.risk_ids = ids or []
                total += cnt
                if cell.level in ("high", "very_high", "extreme"):
                    high_count += cnt
                break

    return RiskMatrixResponse(cells=cells, total_risks=total, high_or_above=high_count)


# ── 6. Training Compliance ──────────────────────────────────


@router.get("/training-compliance", response_model=TrainingComplianceResponse)
async def get_training_compliance(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
):
    """Return training compliance + expiring-soon list."""
    org_id = current_user.organization_id

    from app.models.training import TrainingCourse

    filters = [TrainingCourse.organization_id == org_id]
    if site_id:
        filters.append(TrainingEnrollment.site_id == site_id)

    # Total enrollments by status
    rows = (await db.execute(
        select(TrainingEnrollment.status, func.count().label("cnt"))
        .join(TrainingCourse, TrainingEnrollment.course_id == TrainingCourse.id)
        .where(and_(*filters))
        .group_by(TrainingEnrollment.status)
    )).all()

    status_map = {str(s): c for s, c in rows}
    total = sum(status_map.values())
    completed = status_map.get("completed", 0)
    in_progress = status_map.get("in_progress", 0)
    overdue = status_map.get("overdue", 0)
    compliance = round((completed / total * 100) if total else 0, 1)

    # Expiring within 30 days
    cutoff = date.today() + timedelta(days=30)
    expiring = (await db.execute(
        select(TrainingEnrollment)
        .join(TrainingCourse, TrainingEnrollment.course_id == TrainingCourse.id)
        .where(
            and_(
                *filters,
                TrainingEnrollment.expiry_date <= cutoff,
                TrainingEnrollment.expiry_date >= date.today(),
                TrainingEnrollment.status == "completed",
            )
        )
        .order_by(TrainingEnrollment.expiry_date)
        .limit(10)
    )).scalars().all()

    expiring_list = [
        TrainingExpiring(
            id=e.id,
            course_name=getattr(e, "course_name", "N/A"),
            user_name=getattr(e, "user_name", "N/A"),
            expiry_date=e.expiry_date,
            days_remaining=(e.expiry_date - date.today()).days,
            status="expiring",
        )
        for e in expiring
    ]

    return TrainingComplianceResponse(
        total_enrollments=total,
        completed=completed,
        in_progress=in_progress,
        overdue=overdue,
        compliance_pct=compliance,
        expiring_soon=expiring_list,
    )


# ── 7. Dashboard Widgets ───────────────────────────────────


@router.get("/widgets", response_model=DashboardWidgets)
async def get_dashboard_widgets(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
):
    """Return secondary dashboard widget data (lists/tables)."""
    org_id = current_user.organization_id
    now = datetime.now(UTC)

    # Upcoming inspections (next 5 scheduled)
    insp_filters = [
        Inspection.organization_id == org_id,
        Inspection.scheduled_date >= now,
        Inspection.status.in_(["draft", "scheduled", "in_progress"]),
    ]
    if site_id:
        insp_filters.append(Inspection.site_id == site_id)

    upcoming_rows = (await db.execute(
        select(Inspection)
        .where(and_(*insp_filters))
        .order_by(Inspection.scheduled_date)
        .limit(5)
    )).scalars().all()

    upcoming = [
        UpcomingInspection(
            id=i.id,
            title=i.title,
            site_name=getattr(i, "site_name", "N/A"),
            scheduled_date=i.scheduled_date,
            inspector_name=getattr(i, "inspector_name", "N/A"),
        )
        for i in upcoming_rows
    ]

    # Recent incidents (last 3)
    inc_filters = [Incident.organization_id == org_id]
    if site_id:
        inc_filters.append(Incident.site_id == site_id)

    recent_rows = (await db.execute(
        select(Incident)
        .where(and_(*inc_filters))
        .order_by(Incident.occurred_at.desc())
        .limit(3)
    )).scalars().all()

    recent = [
        RecentIncident(
            id=i.id,
            title=i.title,
            reference_number=getattr(i, "reference_number", ""),
            severity=str(i.severity),
            status=str(i.status),
            occurred_at=i.occurred_at,
            site_name=getattr(i, "site_name", "N/A"),
        )
        for i in recent_rows
    ]

    # Active permits
    perm_filters = [
        WorkPermit.organization_id == org_id,
        WorkPermit.status == PermitStatus.APPROVED,
        WorkPermit.valid_from <= now,
        WorkPermit.valid_until >= now,
    ]
    if site_id:
        perm_filters.append(WorkPermit.site_id == site_id)

    perm_rows = (await db.execute(
        select(WorkPermit)
        .where(and_(*perm_filters))
        .order_by(WorkPermit.valid_until)
        .limit(5)
    )).scalars().all()

    permits = [
        ActivePermit(
            id=p.id,
            title=p.title,
            permit_type=str(getattr(p, "permit_type", "general")),
            site_name=getattr(p, "site_name", "N/A"),
            valid_until=p.valid_until,
            requestor_name=getattr(p, "requestor_name", "N/A"),
        )
        for p in perm_rows
    ]

    return DashboardWidgets(
        overdue_actions=[],  # populated when CorrectiveAction model is wired
        upcoming_inspections=upcoming,
        recent_incidents=recent,
        active_permits=permits,
        expiring_training=[],  # populated from training-compliance
        top_findings_areas=[],  # populated when findings model is wired
    )


# ── 8. Export PDF ───────────────────────────────────────────


@router.get("/export-pdf")
async def export_dashboard_pdf(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
    period: str = Query("year", regex="^(week|month|quarter|year)$"),
):
    """Generate a PDF summary of the executive dashboard."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm, mm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ImportError:
        return Response(
            content='{"detail":"reportlab not installed"}',
            status_code=500,
            media_type="application/json",
        )

    # Fetch KPIs for the PDF
    kpis = await get_kpis(db, current_user, site_id, period)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle", parent=styles["Title"],
        fontSize=20, spaceAfter=12, textColor=colors.HexColor("#0066FF"),
    )
    subtitle_style = ParagraphStyle(
        "CustomSubtitle", parent=styles["Normal"],
        fontSize=10, textColor=colors.grey, spaceAfter=20,
    )
    section_style = ParagraphStyle(
        "SectionTitle", parent=styles["Heading2"],
        fontSize=14, spaceAfter=8, spaceBefore=16,
        textColor=colors.HexColor("#1a1a2e"),
    )

    elements = []

    # Title
    elements.append(Paragraph("OpenQHSE — Reporte Ejecutivo", title_style))
    elements.append(Paragraph(
        f"Período: {period.title()} | Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')} | "
        f"Usuario: {current_user.full_name}",
        subtitle_style,
    ))
    elements.append(Spacer(1, 10))

    # KPI Table
    elements.append(Paragraph("Indicadores Clave (KPIs)", section_style))
    kpi_data = [
        ["Indicador", "Valor Actual", "Período Anterior", "Variación"],
        ["TRIR", f"{kpis.trir.value:.2f}", f"{kpis.trir.previous:.2f}", f"{kpis.trir.variation_pct:+.1f}%"],
        ["LTIF", f"{kpis.ltif.value:.2f}", f"{kpis.ltif.previous:.2f}", f"{kpis.ltif.variation_pct:+.1f}%"],
        ["Inspecciones", f"{kpis.inspections_completed}/{kpis.inspections_scheduled}", "", f"{kpis.inspections_compliance_pct:.1f}%"],
        ["Acciones vencidas", str(kpis.overdue_actions), "", ""],
        ["Incidentes abiertos", str(kpis.open_incidents), "", ""],
        ["Permisos activos", str(kpis.active_permits), "", ""],
        ["Índice de Seguridad", f"{kpis.safety_score:.1f}%", "", ""],
    ]

    kpi_table = Table(kpi_data, colWidths=[5 * cm, 3.5 * cm, 3.5 * cm, 3 * cm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0066FF")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 20))

    # Footer note
    elements.append(Paragraph(
        "Este reporte fue generado automáticamente por OpenQHSE Platform.",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey),
    ))

    doc.build(elements)
    buffer.seek(0)

    filename = f"openqhse_dashboard_{period}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ──────────────────── Sidebar Badges ────────────────────


@router.get("/badges", response_model=SidebarBadges)
async def get_sidebar_badges(
    db: DBSession,
    user: CurrentUser,
    site_id: UUID | None = Query(None),
) -> SidebarBadges:
    """Return pending/critical counts for sidebar navigation badges."""

    org = user.organization_id
    now = datetime.now(UTC)

    def org_site_filter(model_cls):  # type: ignore[no-untyped-def]
        clauses = [model_cls.organization_id == org]
        if site_id:
            clauses.append(model_cls.site_id == site_id)
        return and_(*clauses)

    # Inspections: scheduled or in progress
    insp_q = select(func.count()).select_from(Inspection).where(
        org_site_filter(Inspection),
        Inspection.status.in_([InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS]),
    )

    # Incidents: open (reported or under investigation)
    inc_q = select(func.count()).select_from(Incident).where(
        org_site_filter(Incident),
        Incident.status.in_([IncidentStatus.REPORTED, IncidentStatus.UNDER_INVESTIGATION]),
    )

    # Permits: active
    perm_q = select(func.count()).select_from(WorkPermit).where(
        org_site_filter(WorkPermit),
        WorkPermit.status == PermitStatus.ACTIVE,
    )

    # Risks: high or critical unmitigated (residual_score >= 15)
    risk_q = select(func.count()).select_from(RiskRegister).where(
        RiskRegister.organization_id == org,
        RiskRegister.residual_score >= 15,
    )

    # Training: enrollments expiring within 30 days
    thirty_days = now + timedelta(days=30)
    train_q = select(func.count()).select_from(TrainingEnrollment).where(
        TrainingEnrollment.status == EnrollmentStatus.COMPLETED,
        TrainingEnrollment.expiry_date.isnot(None),
        TrainingEnrollment.expiry_date <= thirty_days.date(),
        TrainingEnrollment.expiry_date >= now.date(),
    )

    # Execute all queries in parallel via asyncio.gather-style
    insp_count = (await db.execute(insp_q)).scalar() or 0
    inc_count = (await db.execute(inc_q)).scalar() or 0
    perm_count = (await db.execute(perm_q)).scalar() or 0
    risk_count = (await db.execute(risk_q)).scalar() or 0
    train_count = (await db.execute(train_q)).scalar() or 0

    return SidebarBadges(
        inspections=insp_count,
        incidents=inc_count,
        actions=0,       # TODO: wire when CorrectiveAction model is ready
        permits=perm_count,
        risks=risk_count,
        documents=0,     # TODO: wire when Document model is ready
        audits=0,        # TODO: wire when Audit model is ready
        training=train_count,
        equipment=0,     # TODO: wire when Equipment model is ready
        notifications=0, # TODO: wire when Notification model is ready
    )


# ── KPI Alert Rules ─────────────────────────────────────────


@router.get("/kpi-alert-rules", tags=["KPI Alerts"])
async def list_kpi_alert_rules(
    db: DBSession,
    current_user: CurrentUser,
    is_active: bool | None = Query(None),
) -> list[dict]:
    """List all KPI alert rules for the current organization."""
    from app.models.kpi_alert import KPIAlertRule

    filters = [KPIAlertRule.organization_id == current_user.organization_id]
    if is_active is not None:
        filters.append(KPIAlertRule.is_active == is_active)

    rows = (await db.execute(
        select(KPIAlertRule).where(and_(*filters)).order_by(KPIAlertRule.created_at.desc())
    )).scalars().all()

    return [
        {
            "id": str(r.id),
            "name": r.name,
            "description": r.description,
            "kpi_name": r.kpi_name,
            "condition": r.condition,
            "threshold": r.threshold,
            "period": r.period,
            "channels": r.channels,
            "recipients": r.recipients,
            "escalation_rules": r.escalation_rules,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/kpi-alert-rules", status_code=status.HTTP_201_CREATED, tags=["KPI Alerts"])
async def create_kpi_alert_rule(
    db: DBSession,
    current_user: AdminUser,
    body: dict = Body(...),
) -> dict:
    """Create a new KPI alert rule. Requires admin role."""
    from app.models.kpi_alert import AlertCondition, AlertPeriod, KPIAlertRule, KPIName

    rule = KPIAlertRule(
        organization_id=current_user.organization_id,
        site_id=body.get("site_id"),
        name=body["name"],
        description=body.get("description"),
        kpi_name=KPIName(body["kpi_name"]),
        condition=AlertCondition(body["condition"]),
        threshold=float(body["threshold"]),
        period=AlertPeriod(body.get("period", "MONTHLY")),
        channels=body.get("channels", {"email": True, "in_app": True}),
        recipients=body.get("recipients", {}),
        escalation_rules=body.get("escalation_rules", {}),
        is_active=body.get("is_active", True),
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)

    return {"id": str(rule.id), "name": rule.name, "kpi_name": rule.kpi_name, "is_active": rule.is_active}


@router.put("/kpi-alert-rules/{rule_id}", tags=["KPI Alerts"])
async def update_kpi_alert_rule(
    rule_id: UUID,
    db: DBSession,
    current_user: AdminUser,
    body: dict = Body(...),
) -> dict:
    """Update an existing KPI alert rule."""
    from app.models.kpi_alert import KPIAlertRule

    result = await db.execute(
        select(KPIAlertRule).where(
            KPIAlertRule.id == rule_id,
            KPIAlertRule.organization_id == current_user.organization_id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")

    allowed_fields = {"name", "description", "threshold", "channels", "recipients", "escalation_rules", "is_active"}
    for field, value in body.items():
        if field in allowed_fields:
            setattr(rule, field, value)

    await db.flush()
    return {"id": str(rule.id), "name": rule.name, "is_active": rule.is_active}


@router.delete("/kpi-alert-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["KPI Alerts"])
async def delete_kpi_alert_rule(
    rule_id: UUID,
    db: DBSession,
    current_user: AdminUser,
) -> None:
    """Soft-delete a KPI alert rule."""
    from app.models.kpi_alert import KPIAlertRule

    result = await db.execute(
        select(KPIAlertRule).where(
            KPIAlertRule.id == rule_id,
            KPIAlertRule.organization_id == current_user.organization_id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")

    rule.is_deleted = True
    await db.flush()


# ── KPI Alerts (triggered instances) ───────────────────────


@router.get("/kpi-alerts", tags=["KPI Alerts"])
async def list_kpi_alerts(
    db: DBSession,
    current_user: CurrentUser,
    alert_status: str | None = Query(None, alias="status"),
    kpi_name: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict]:
    """List triggered KPI alerts for the current organization."""
    from app.models.kpi_alert import AlertStatus, KPIAlert, KPIName

    filters = [KPIAlert.organization_id == current_user.organization_id]
    if alert_status:
        filters.append(KPIAlert.status == AlertStatus(alert_status))
    if kpi_name:
        filters.append(KPIAlert.kpi_name == KPIName(kpi_name))

    rows = (await db.execute(
        select(KPIAlert)
        .where(and_(*filters))
        .order_by(KPIAlert.triggered_at.desc())
        .limit(limit)
    )).scalars().all()

    return [
        {
            "id": str(a.id),
            "kpi_name": a.kpi_name,
            "condition": a.condition,
            "threshold_value": a.threshold_value,
            "current_value": a.current_value,
            "period": a.period,
            "status": a.status,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            "escalation_count": a.escalation_count,
            "notes": a.notes,
        }
        for a in rows
    ]


@router.post("/kpi-alerts/{alert_id}/acknowledge", tags=["KPI Alerts"])
async def acknowledge_kpi_alert(
    alert_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
    body: dict = Body(default={}),
) -> dict:
    """Acknowledge a triggered KPI alert."""
    from app.models.kpi_alert import AlertStatus, KPIAlert

    result = await db.execute(
        select(KPIAlert).where(
            KPIAlert.id == alert_id,
            KPIAlert.organization_id == current_user.organization_id,
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.now(UTC)
    if body.get("notes"):
        alert.notes = body["notes"]

    await db.flush()
    return {"id": str(alert.id), "status": alert.status}


@router.post("/kpi-alerts/{alert_id}/resolve", tags=["KPI Alerts"])
async def resolve_kpi_alert(
    alert_id: UUID,
    db: DBSession,
    current_user: ManagerUser,
) -> dict:
    """Mark a KPI alert as resolved."""
    from app.models.kpi_alert import AlertStatus, KPIAlert

    result = await db.execute(
        select(KPIAlert).where(
            KPIAlert.id == alert_id,
            KPIAlert.organization_id == current_user.organization_id,
        )
    )
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.now(UTC)
    await db.flush()
    return {"id": str(alert.id), "status": alert.status}
