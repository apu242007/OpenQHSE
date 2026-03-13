"""Incident business logic — safety metrics, PDF, alerts, AI classification."""

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
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import (
    CorrectiveAction,
    Incident,
    IncidentAttachment,
    IncidentStatus,
    IncidentType,
    IncidentWitness,
)


# ── Safety Metrics ──────────────────────────────────────────

STANDARD_HOURS = 200_000  # OSHA standard for rate calculation


async def calculate_trir(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    total_hours_worked: float = 500_000,
) -> float:
    """Total Recordable Incident Rate.

    TRIR = (recordable incidents × 200,000) / total hours worked
    """
    recordable = await _count_incidents(
        db, organization_id, site_id, start_date, end_date,
        types=[
            IncidentType.FIRST_AID,
            IncidentType.MEDICAL_TREATMENT,
            IncidentType.LOST_TIME,
            IncidentType.FATALITY,
        ],
    )
    if total_hours_worked == 0:
        return 0.0
    return round((recordable * STANDARD_HOURS) / total_hours_worked, 2)


async def calculate_ltif(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    total_hours_worked: float = 500_000,
) -> float:
    """Lost Time Injury Frequency.

    LTIF = (LTI count × 1,000,000) / total hours worked
    """
    lti = await _count_incidents(
        db, organization_id, site_id, start_date, end_date,
        types=[IncidentType.LOST_TIME, IncidentType.FATALITY],
    )
    if total_hours_worked == 0:
        return 0.0
    return round((lti * 1_000_000) / total_hours_worked, 2)


async def calculate_dart(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    total_hours_worked: float = 500_000,
) -> float:
    """Days Away, Restricted or Transferred rate.

    DART = (DART cases × 200,000) / total hours worked
    """
    dart_count = await _count_incidents(
        db, organization_id, site_id, start_date, end_date,
        types=[IncidentType.LOST_TIME, IncidentType.MEDICAL_TREATMENT],
    )
    if total_hours_worked == 0:
        return 0.0
    return round((dart_count * STANDARD_HOURS) / total_hours_worked, 2)


async def calculate_far(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    total_hours_worked: float = 500_000,
) -> float:
    """Fatal Accident Rate = (fatalities × 100,000,000) / hours worked."""
    fatal = await _count_incidents(
        db, organization_id, site_id, start_date, end_date,
        types=[IncidentType.FATALITY],
    )
    if total_hours_worked == 0:
        return 0.0
    return round((fatal * 100_000_000) / total_hours_worked, 2)


async def get_days_without_accident(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None = None,
) -> int:
    """Calculate consecutive days without a recordable incident."""
    base = select(Incident.occurred_at).where(
        Incident.organization_id == organization_id,
        Incident.is_deleted == False,  # noqa: E712
        Incident.incident_type.in_([
            IncidentType.FIRST_AID,
            IncidentType.MEDICAL_TREATMENT,
            IncidentType.LOST_TIME,
            IncidentType.FATALITY,
        ]),
    )
    if site_id:
        base = base.where(Incident.site_id == site_id)

    result = await db.execute(base.order_by(Incident.occurred_at.desc()).limit(1))
    last = result.scalar_one_or_none()

    if not last:
        return 365  # Default: no incidents recorded

    return (datetime.now(UTC) - last).days


# ── Bird Pyramid ────────────────────────────────────────────


async def get_bird_pyramid(
    db: AsyncSession,
    organization_id: UUID,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> dict[str, int]:
    """Return Bird/Heinrich pyramid breakdown counts."""
    if not start_date:
        start_date = datetime.now(UTC) - timedelta(days=365)
    if not end_date:
        end_date = datetime.now(UTC)

    base = select(Incident).where(
        Incident.organization_id == organization_id,
        Incident.is_deleted == False,  # noqa: E712
        Incident.occurred_at >= start_date,
        Incident.occurred_at <= end_date,
    )

    type_map = {
        "fatalities": [IncidentType.FATALITY],
        "serious_injuries": [IncidentType.LOST_TIME],
        "minor_injuries": [IncidentType.MEDICAL_TREATMENT, IncidentType.FIRST_AID],
        "near_misses": [IncidentType.NEAR_MISS],
        "unsafe_behaviors": [IncidentType.PROPERTY_DAMAGE, IncidentType.OTHER],
    }

    result: dict[str, int] = {}
    for key, types in type_map.items():
        q = base.where(Incident.incident_type.in_(types))
        count = await db.execute(select(func.count()).select_from(q.subquery()))
        result[key] = count.scalar() or 0

    return result


# ── Statistics ──────────────────────────────────────────────


async def get_incident_statistics(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None = None,
    year: int | None = None,
    total_hours_worked: float = 500_000,
) -> dict[str, Any]:
    """Comprehensive incident statistics for dashboard."""
    if not year:
        year = datetime.now(UTC).year

    start = datetime(year, 1, 1, tzinfo=UTC)
    end = datetime(year, 12, 31, 23, 59, 59, tzinfo=UTC)

    base = select(Incident).where(
        Incident.organization_id == organization_id,
        Incident.is_deleted == False,  # noqa: E712
        Incident.occurred_at >= start,
        Incident.occurred_at <= end,
    )
    if site_id:
        base = base.where(Incident.site_id == site_id)

    # Total
    total_q = await db.execute(select(func.count()).select_from(base.subquery()))
    total_year = total_q.scalar() or 0

    # LTI count
    lti_q = base.where(Incident.incident_type.in_([IncidentType.LOST_TIME, IncidentType.FATALITY]))
    lti_count_r = await db.execute(select(func.count()).select_from(lti_q.subquery()))
    lti_count = lti_count_r.scalar() or 0

    # Near miss count
    nm_q = base.where(Incident.incident_type == IncidentType.NEAR_MISS)
    nm_count_r = await db.execute(select(func.count()).select_from(nm_q.subquery()))
    near_miss_count = nm_count_r.scalar() or 0

    days_no_acc = await get_days_without_accident(db, organization_id, site_id)

    trir = await calculate_trir(db, organization_id, site_id, start, end, total_hours_worked)
    ltif = await calculate_ltif(db, organization_id, site_id, start, end, total_hours_worked)
    dart = await calculate_dart(db, organization_id, site_id, start, end, total_hours_worked)
    far = await calculate_far(db, organization_id, site_id, start, end, total_hours_worked)

    bird_pyramid = await get_bird_pyramid(db, organization_id, start, end)

    # Monthly trend
    monthly_trend: list[dict[str, Any]] = []
    for month in range(1, 13):
        m_start = datetime(year, month, 1, tzinfo=UTC)
        m_end = datetime(year, month + 1, 1, tzinfo=UTC) if month < 12 else end

        m_base = base.where(Incident.occurred_at >= m_start, Incident.occurred_at < m_end)
        mc = await db.execute(select(func.count()).select_from(m_base.subquery()))

        m_lti = m_base.where(Incident.incident_type.in_([IncidentType.LOST_TIME, IncidentType.FATALITY]))
        ml = await db.execute(select(func.count()).select_from(m_lti.subquery()))

        monthly_trend.append({
            "month": m_start.strftime("%b"),
            "count": mc.scalar() or 0,
            "lti": ml.scalar() or 0,
        })

    # By type
    result_all = await db.execute(base)
    all_incidents = result_all.scalars().all()
    by_type_map: dict[str, int] = {}
    by_severity_map: dict[str, int] = {}
    for inc in all_incidents:
        by_type_map[inc.incident_type] = by_type_map.get(inc.incident_type, 0) + 1
        by_severity_map[inc.severity] = by_severity_map.get(inc.severity, 0) + 1

    return {
        "total_year": total_year,
        "lti_count": lti_count,
        "near_miss_count": near_miss_count,
        "days_without_accident": days_no_acc,
        "trir": trir,
        "ltif": ltif,
        "dart": dart,
        "far": far,
        "bird_pyramid": bird_pyramid,
        "monthly_trend": monthly_trend,
        "by_type": [{"type": k, "count": v} for k, v in by_type_map.items()],
        "by_severity": [{"severity": k, "count": v} for k, v in by_severity_map.items()],
    }


# ── PDF Report ──────────────────────────────────────────────


def generate_incident_report(
    incident: dict[str, Any],
    actions: list[dict[str, Any]] | None = None,
    witnesses: list[dict[str, Any]] | None = None,
) -> bytes:
    """Generate comprehensive incident investigation PDF report."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("IncTitle", parent=styles["Title"], fontSize=18, spaceAfter=12)
    heading_style = ParagraphStyle(
        "IncHeading", parent=styles["Heading2"], fontSize=13, spaceAfter=8,
        textColor=colors.HexColor("#0f172a"),
    )
    body_style = styles["BodyText"]
    small_style = ParagraphStyle("Small", parent=body_style, fontSize=8, textColor=colors.grey)

    elements: list[Any] = []

    # Title
    severity = incident.get("severity", "").upper()
    elements.append(Paragraph("Reporte de Incidente", title_style))
    elements.append(Paragraph(f"<b>{incident.get('title', '')}</b> — {severity}", heading_style))
    elements.append(Spacer(1, 6))

    # Info table
    info_data = [
        ["Referencia", incident.get("reference_number", "—")],
        ["Tipo", incident.get("incident_type", "—").replace("_", " ").title()],
        ["Severidad", severity],
        ["Estado", incident.get("status", "—").replace("_", " ").title()],
        ["Fecha ocurrencia", str(incident.get("occurred_at", "—"))[:19]],
        ["Fecha reporte", str(incident.get("reported_at", "—"))[:19]],
        ["Ubicación", incident.get("location_description", "—") or "—"],
        ["Lesiones", str(incident.get("injuries_count", 0))],
        ["Fatalidades", str(incident.get("fatalities_count", 0))],
    ]
    info_table = Table(info_data, colWidths=[4 * cm, 12 * cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#fef2f2")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fecaca")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 14))

    # Description
    elements.append(Paragraph("Descripción", heading_style))
    elements.append(Paragraph(incident.get("description", "—"), body_style))
    elements.append(Spacer(1, 8))

    # Immediate actions
    if incident.get("immediate_actions"):
        elements.append(Paragraph("Acciones Inmediatas", heading_style))
        elements.append(Paragraph(incident["immediate_actions"], body_style))
        elements.append(Spacer(1, 8))

    # Root cause analysis
    if incident.get("root_cause_analysis"):
        elements.append(Paragraph("Análisis de Causa Raíz", heading_style))
        elements.append(Paragraph(incident["root_cause_analysis"], body_style))
        elements.append(Spacer(1, 8))

    # Witnesses
    if witnesses:
        elements.append(Paragraph("Testigos", heading_style))
        w_data = [["Nombre", "Contacto", "Declaración"]]
        for w in witnesses:
            w_data.append([
                w.get("name", "—"),
                w.get("contact", "—") or "—",
                (w.get("statement", "—") or "—")[:100],
            ])
        w_table = Table(w_data, colWidths=[4 * cm, 3 * cm, 9 * cm])
        w_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(w_table)
        elements.append(Spacer(1, 10))

    # Corrective Actions
    if actions:
        elements.append(Paragraph("Acciones Correctivas / Preventivas", heading_style))
        a_data = [["Título", "Tipo", "Prioridad", "Estado", "Fecha límite"]]
        for a in actions:
            a_data.append([
                a.get("title", "—"),
                a.get("action_type", "—").title(),
                a.get("priority", "—").title(),
                a.get("status", "—").replace("_", " ").title(),
                str(a.get("due_date", "—"))[:10],
            ])
        a_table = Table(a_data, colWidths=[5 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm, 3.5 * cm])
        a_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(a_table)

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


# ── Severity Classification (simple rule-based, AI-ready) ──


def classify_incident_severity(incident_data: dict[str, Any]) -> str:
    """Classify incident severity based on rules. Returns severity string.

    In production this could call an ML model.
    """
    fatalities = incident_data.get("fatalities_count", 0) or 0
    injuries = incident_data.get("injuries_count", 0) or 0
    inc_type = incident_data.get("incident_type", "other")

    if fatalities > 0 or inc_type == "fatality":
        return "catastrophic"
    if inc_type == "lost_time" or injuries >= 3:
        return "critical"
    if inc_type == "medical_treatment" or injuries >= 1:
        return "serious"
    if inc_type in ("first_aid", "property_damage", "fire", "spill"):
        return "moderate"
    return "minor"


# ── Helpers ─────────────────────────────────────────────────


async def _count_incidents(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID | None,
    start_date: datetime | None,
    end_date: datetime | None,
    types: list[IncidentType] | None = None,
) -> int:
    """Count incidents with optional filters."""
    if not start_date:
        start_date = datetime(datetime.now(UTC).year, 1, 1, tzinfo=UTC)
    if not end_date:
        end_date = datetime.now(UTC)

    base = select(func.count()).select_from(Incident).where(
        Incident.organization_id == organization_id,
        Incident.is_deleted == False,  # noqa: E712
        Incident.occurred_at >= start_date,
        Incident.occurred_at <= end_date,
    )
    if site_id:
        base = base.where(Incident.site_id == site_id)
    if types:
        base = base.where(Incident.incident_type.in_(types))

    result = await db.execute(base)
    return result.scalar() or 0
