"""Inspection business logic — scheduling, compliance, PDF, alerts, CAPAs."""

from __future__ import annotations

import io
import math
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inspection import (
    Finding,
    FindingSeverity,
    FindingStatus,
    Inspection,
    InspectionStatus,
    InspectionTemplate,
)


# ── Scheduling ──────────────────────────────────────────────


async def schedule_recurring_inspections(
    db: AsyncSession,
    *,
    template_id: UUID,
    site_id: UUID,
    area_id: UUID | None,
    inspector_id: UUID,
    organization_id: UUID,
    frequency: str,
    start_date: datetime,
    end_date: datetime | None = None,
    custom_days: int | None = None,
    title_prefix: str = "Inspección programada",
) -> list[Inspection]:
    """Create recurring inspection entries based on frequency.

    Frequencies: once, daily, weekly, biweekly, monthly, quarterly, custom.
    Returns list of created Inspection objects.
    """
    if end_date is None:
        end_date = start_date + timedelta(days=365)

    delta_map: dict[str, timedelta | None] = {
        "once": None,
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "biweekly": timedelta(weeks=2),
        "monthly": timedelta(days=30),
        "quarterly": timedelta(days=90),
        "custom": timedelta(days=custom_days or 7),
    }

    delta = delta_map.get(frequency)
    dates: list[datetime] = [start_date]
    if delta:
        current = start_date + delta
        while current <= end_date:
            dates.append(current)
            current += delta

    created: list[Inspection] = []
    for i, scheduled_dt in enumerate(dates, 1):
        ref = _generate_ref()
        inspection = Inspection(
            title=f"{title_prefix} #{i}",
            reference_number=ref,
            status=InspectionStatus.DRAFT,
            scheduled_date=scheduled_dt,
            responses={},
            template_id=template_id,
            organization_id=organization_id,
            site_id=site_id,
            area_id=area_id,
            inspector_id=inspector_id,
            created_by=str(inspector_id),
        )
        db.add(inspection)
        created.append(inspection)

    await db.flush()
    for ins in created:
        await db.refresh(ins)
    return created


# ── Compliance ──────────────────────────────────────────────


async def calculate_compliance_rate(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> float:
    """Calculate inspection compliance rate = completed_on_time / total_scheduled * 100."""
    if not start_date:
        start_date = datetime.now(UTC) - timedelta(days=30)
    if not end_date:
        end_date = datetime.now(UTC)

    base = select(Inspection).where(
        Inspection.organization_id == organization_id,
        Inspection.is_deleted == False,  # noqa: E712
        Inspection.scheduled_date.isnot(None),
        Inspection.scheduled_date >= start_date,
        Inspection.scheduled_date <= end_date,
    )
    if site_id:
        base = base.where(Inspection.site_id == site_id)

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar() or 0
    if total == 0:
        return 100.0

    completed_base = base.where(
        Inspection.status.in_([InspectionStatus.COMPLETED, InspectionStatus.REVIEWED]),
    )
    completed_result = await db.execute(
        select(func.count()).select_from(completed_base.subquery())
    )
    completed = completed_result.scalar() or 0

    return round((completed / total) * 100, 1)


# ── Overdue ─────────────────────────────────────────────────


async def get_overdue_inspections(
    db: AsyncSession,
    organization_id: UUID,
) -> list[Inspection]:
    """Return inspections that are past their scheduled date and not completed."""
    result = await db.execute(
        select(Inspection).where(
            Inspection.organization_id == organization_id,
            Inspection.is_deleted == False,  # noqa: E712
            Inspection.status.in_([InspectionStatus.DRAFT, InspectionStatus.IN_PROGRESS]),
            Inspection.scheduled_date < datetime.now(UTC),
        ).order_by(Inspection.scheduled_date.asc())
    )
    return list(result.scalars().all())


# ── Calendar ────────────────────────────────────────────────


async def get_calendar_events(
    db: AsyncSession,
    organization_id: UUID,
    start: datetime,
    end: datetime,
    site_id: UUID | None = None,
) -> list[dict[str, Any]]:
    """Return inspection events for calendar view."""
    base = select(Inspection).where(
        Inspection.organization_id == organization_id,
        Inspection.is_deleted == False,  # noqa: E712
        Inspection.scheduled_date.isnot(None),
        Inspection.scheduled_date >= start,
        Inspection.scheduled_date <= end,
    )
    if site_id:
        base = base.where(Inspection.site_id == site_id)

    result = await db.execute(base.order_by(Inspection.scheduled_date.asc()))
    inspections = result.scalars().all()

    return [
        {
            "id": str(ins.id),
            "title": ins.title,
            "status": ins.status,
            "scheduled_date": ins.scheduled_date.isoformat() if ins.scheduled_date else None,
            "score": ins.score,
            "max_score": ins.max_score,
        }
        for ins in inspections
    ]


# ── Auto-create CAPAs from Findings ────────────────────────


async def auto_create_actions_from_findings(
    db: AsyncSession,
    inspection_id: UUID,
    organization_id: UUID,
) -> list[Finding]:
    """For each critical/high finding without corrective action, auto-create a CAPA placeholder."""
    from app.models.incident import CorrectiveAction

    result = await db.execute(
        select(Finding).where(
            Finding.inspection_id == inspection_id,
            Finding.severity.in_([FindingSeverity.CRITICAL, FindingSeverity.HIGH]),
            Finding.corrective_action.is_(None),
            Finding.is_deleted == False,  # noqa: E712
        )
    )
    findings = list(result.scalars().all())

    for finding in findings:
        action = CorrectiveAction(
            title=f"CAPA: {finding.title}",
            description=f"Acción correctiva generada automáticamente para hallazgo: {finding.description or finding.title}",
            action_type="corrective",
            priority="high" if finding.severity == FindingSeverity.CRITICAL else "medium",
            status="open",
            due_date=datetime.now(UTC) + timedelta(days=7 if finding.severity == FindingSeverity.CRITICAL else 14),
            finding_id=finding.id,
            assigned_to_id=finding.assigned_to_id or finding.inspection_id,  # fallback
            organization_id=organization_id,
            created_by="system",
        )
        db.add(action)
        finding.corrective_action = f"CAPA auto-generada: {action.title}"

    await db.flush()
    return findings


# ── PDF Report ──────────────────────────────────────────────


def generate_inspection_report(
    inspection: dict[str, Any],
    template: dict[str, Any],
    findings: list[dict[str, Any]],
) -> bytes:
    """Generate a PDF report for a completed inspection.

    Returns raw PDF bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InspTitle", parent=styles["Title"], fontSize=18, spaceAfter=12
    )
    heading_style = ParagraphStyle(
        "InspHeading", parent=styles["Heading2"], fontSize=13, spaceAfter=8,
        textColor=colors.HexColor("#0f172a"),
    )
    body_style = styles["BodyText"]
    small_style = ParagraphStyle("Small", parent=body_style, fontSize=8, textColor=colors.grey)

    elements: list[Any] = []

    # Title
    elements.append(Paragraph(f"Reporte de Inspección", title_style))
    elements.append(Paragraph(f"<b>{inspection.get('title', '')}</b>", heading_style))
    elements.append(Spacer(1, 6))

    # Info table
    score = inspection.get("score", 0) or 0
    max_score = inspection.get("max_score", 0) or 0
    pct = round((score / max_score * 100), 1) if max_score > 0 else 0

    info_data = [
        ["Referencia", inspection.get("reference_number", "—")],
        ["Estado", inspection.get("status", "—").replace("_", " ").title()],
        ["Fecha programada", str(inspection.get("scheduled_date", "—"))[:10]],
        ["Fecha inicio", str(inspection.get("started_at", "—"))[:19]],
        ["Fecha completada", str(inspection.get("completed_at", "—"))[:19]],
        ["Puntuación", f"{score} / {max_score} ({pct}%)"],
    ]
    info_table = Table(info_data, colWidths=[4 * cm, 12 * cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 14))

    # Sections & Responses
    sections = template.get("schema_definition", {}).get("sections", [])
    responses = inspection.get("responses", {})

    for section in sections:
        elements.append(Paragraph(section.get("title", "Sección"), heading_style))
        questions = section.get("questions", [])
        q_data = [["#", "Pregunta", "Respuesta", "Notas"]]
        for idx, q in enumerate(questions, 1):
            qid = q.get("id", "")
            resp = responses.get(qid, {})
            val = resp.get("value", "—") if isinstance(resp, dict) else (resp or "—")
            notes = resp.get("notes", "") if isinstance(resp, dict) else ""
            q_data.append([str(idx), q.get("text", ""), str(val), notes])

        if len(q_data) > 1:
            q_table = Table(q_data, colWidths=[1 * cm, 7 * cm, 4 * cm, 4 * cm])
            q_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]))
            elements.append(q_table)
        elements.append(Spacer(1, 10))

    # Findings
    if findings:
        elements.append(Paragraph("Hallazgos", heading_style))
        severity_colors = {
            "critical": colors.HexColor("#dc2626"),
            "high": colors.HexColor("#ea580c"),
            "medium": colors.HexColor("#f59e0b"),
            "low": colors.HexColor("#3b82f6"),
            "observation": colors.HexColor("#6b7280"),
        }
        f_data = [["Severidad", "Título", "Estado", "Fecha límite"]]
        for f in findings:
            f_data.append([
                f.get("severity", "—").upper(),
                f.get("title", "—"),
                f.get("status", "—").replace("_", " ").title(),
                str(f.get("due_date", "—"))[:10],
            ])
        f_table = Table(f_data, colWidths=[2.5 * cm, 7 * cm, 3 * cm, 3.5 * cm])
        f_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7f1d1d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(f_table)
        elements.append(Spacer(1, 10))

    # Footer
    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(
            f"Generado el {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')} — OpenQHSE Platform",
            small_style,
        )
    )

    doc.build(elements)
    return buf.getvalue()


# ── KPIs ────────────────────────────────────────────────────


async def get_inspection_kpis(
    db: AsyncSession,
    organization_id: UUID,
) -> dict[str, Any]:
    """Return dashboard KPI summary for inspections."""
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today_start + timedelta(days=7)

    base = select(Inspection).where(
        Inspection.organization_id == organization_id,
        Inspection.is_deleted == False,  # noqa: E712
    )

    # Completed today
    completed_today_q = base.where(
        Inspection.completed_at >= today_start,
        Inspection.status == InspectionStatus.COMPLETED,
    )
    ct = await db.execute(select(func.count()).select_from(completed_today_q.subquery()))
    completed_today = ct.scalar() or 0

    # In progress
    in_progress_q = base.where(Inspection.status == InspectionStatus.IN_PROGRESS)
    ip = await db.execute(select(func.count()).select_from(in_progress_q.subquery()))
    in_progress = ip.scalar() or 0

    # Overdue
    overdue_q = base.where(
        Inspection.status.in_([InspectionStatus.DRAFT, InspectionStatus.IN_PROGRESS]),
        Inspection.scheduled_date < now,
    )
    ov = await db.execute(select(func.count()).select_from(overdue_q.subquery()))
    overdue = ov.scalar() or 0

    # Avg score (last 30 days)
    scored_q = base.where(
        Inspection.status == InspectionStatus.COMPLETED,
        Inspection.score.isnot(None),
        Inspection.max_score > 0,
        Inspection.completed_at >= now - timedelta(days=30),
    )
    score_result = await db.execute(
        select(
            func.avg(Inspection.score / Inspection.max_score * 100)
        ).select_from(scored_q.subquery())
    )
    avg_score = round(score_result.scalar() or 0, 1)

    # Scheduled this week
    sched_q = base.where(
        Inspection.scheduled_date >= today_start,
        Inspection.scheduled_date < week_end,
    )
    sw = await db.execute(select(func.count()).select_from(sched_q.subquery()))
    scheduled_this_week = sw.scalar() or 0

    compliance_rate = await calculate_compliance_rate(db, organization_id)

    return {
        "completed_today": completed_today,
        "in_progress": in_progress,
        "overdue": overdue,
        "compliance_rate": compliance_rate,
        "avg_score": avg_score,
        "scheduled_this_week": scheduled_this_week,
    }


# ── Helpers ─────────────────────────────────────────────────


def _generate_ref() -> str:
    now = datetime.now(UTC)
    short = uuid4().hex[:6].upper()
    return f"INS-{now.strftime('%Y%m%d')}-{short}"
