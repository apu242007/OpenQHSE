"""Training / LMS service — certificate generation, compliance, and notifications."""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.training import (
    CompetencyMatrix,
    EnrollmentStatus,
    TrainingCourse,
    TrainingEnrollment,
)

logger = get_logger("services.training")


async def generate_certificate(
    enrollment_id: UUID,
    db: AsyncSession,
) -> bytes:
    """Generate a PDF certificate for a completed enrollment.

    Uses ReportLab to produce a styled certificate with a QR code for
    public verification.

    Returns:
        PDF bytes, or empty bytes if dependencies are unavailable.
    """
    try:
        import qrcode
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError:
        logger.error("reportlab or qrcode not installed — cannot generate certificate")
        return b""

    # Fetch enrollment + course
    result = await db.execute(
        select(TrainingEnrollment).where(TrainingEnrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment or enrollment.status != EnrollmentStatus.COMPLETED:
        logger.warning(
            "Certificate requested for non-completed enrollment",
            enrollment_id=str(enrollment_id),
        )
        return b""

    course_result = await db.execute(
        select(TrainingCourse).where(TrainingCourse.id == enrollment.course_id)
    )
    course = course_result.scalar_one_or_none()
    if not course:
        return b""

    # Generate QR code pointing to a verification URL
    verification_url = f"https://app.openqhse.com/verify/cert/{enrollment_id}"
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(verification_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = styles["Title"]
    title_style.fontSize = 32
    title_style.textColor = colors.HexColor("#1E3A5F")
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph("CERTIFICADO DE CAPACITACIÓN", title_style))
    story.append(Spacer(1, 0.5 * cm))

    # Subtitle
    subtitle_style = styles["Normal"]
    subtitle_style.fontSize = 14
    subtitle_style.textColor = colors.HexColor("#555555")
    story.append(Paragraph("OpenQHSE — Plataforma de Gestión QHSE", subtitle_style))
    story.append(Spacer(1, 1.5 * cm))

    # Body text
    body_style = styles["Normal"]
    body_style.fontSize = 16
    body_style.leading = 24
    body_style.textColor = colors.black

    completed_str = (
        enrollment.completed_at.strftime("%d de %B de %Y")
        if enrollment.completed_at
        else datetime.now(UTC).strftime("%d de %B de %Y")
    )

    story.append(Paragraph(
        f"Se certifica que el participante con ID <b>{enrollment.user_id}</b>",
        body_style,
    ))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f"ha completado satisfactoriamente el curso:",
        body_style,
    ))
    story.append(Spacer(1, 0.5 * cm))

    course_style = styles["Heading2"]
    course_style.fontSize = 22
    course_style.textColor = colors.HexColor("#1E3A5F")
    story.append(Paragraph(f"<b>{course.title}</b>", course_style))
    story.append(Spacer(1, 0.5 * cm))

    score_text = f"Calificación: {enrollment.score:.1f}%" if enrollment.score else ""
    story.append(Paragraph(
        f"Fecha de aprobación: <b>{completed_str}</b>    {score_text}",
        body_style,
    ))

    if enrollment.expiry_date:
        story.append(Paragraph(
            f"Válido hasta: <b>{enrollment.expiry_date.strftime('%d/%m/%Y')}</b>",
            body_style,
        ))

    story.append(Spacer(1, 1 * cm))

    # QR code + table layout
    qr_image = Image(qr_buffer, width=3 * cm, height=3 * cm)
    table_data = [
        [qr_image, Paragraph(
            f"ID verificación: {enrollment_id}\n{verification_url}",
            styles["Small"],
        )],
    ]
    table = Table(table_data, colWidths=[3.5 * cm, 14 * cm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTSIZE", (1, 0), (1, 0), 8),
        ("TEXTCOLOR", (1, 0), (1, 0), colors.grey),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)

    logger.info(
        "Certificate generated",
        enrollment_id=str(enrollment_id),
        course_id=str(enrollment.course_id),
    )
    return buffer.read()


async def calculate_compliance_matrix(
    org_id: UUID,
    db: AsyncSession,
) -> dict:  # type: ignore[type-arg]
    """Calculate training compliance matrix: role × course → % completion.

    Returns a dict with:
        - roles: list of role names
        - courses: list of {id, title}
        - matrix: {role: {course_id: {enrolled, completed, pct}}}
        - overall_pct: float
    """
    # Get all competency matrices for org
    cm_result = await db.execute(
        select(CompetencyMatrix).where(
            CompetencyMatrix.organization_id == org_id,
            CompetencyMatrix.is_deleted == False,  # noqa: E712
        )
    )
    matrices = cm_result.scalars().all()

    if not matrices:
        return {"roles": [], "courses": [], "matrix": {}, "overall_pct": 0.0}

    # Collect all required course IDs
    course_ids: set[UUID] = set()
    role_courses: dict[str, list[UUID]] = {}
    for m in matrices:
        required = m.required_courses or []
        ids = [UUID(str(rc["course_id"])) for rc in required if "course_id" in rc]
        role_courses[m.role] = ids
        course_ids.update(ids)

    if not course_ids:
        return {"roles": [m.role for m in matrices], "courses": [], "matrix": {}, "overall_pct": 0.0}

    # Fetch course titles
    courses_result = await db.execute(
        select(TrainingCourse).where(TrainingCourse.id.in_(list(course_ids)))
    )
    courses_map = {c.id: c.title for c in courses_result.scalars().all()}

    # Fetch all enrollments for these courses
    enrollments_result = await db.execute(
        select(TrainingEnrollment).where(
            TrainingEnrollment.course_id.in_(list(course_ids)),
            TrainingEnrollment.is_deleted == False,  # noqa: E712
        )
    )
    all_enrollments = enrollments_result.scalars().all()

    # Group enrollments by course
    enrolled_by_course: dict[UUID, list[TrainingEnrollment]] = {}
    for e in all_enrollments:
        enrolled_by_course.setdefault(e.course_id, []).append(e)

    matrix: dict[str, dict[str, dict]] = {}  # type: ignore[type-arg]
    total_cells = 0
    total_compliant = 0

    for role, c_ids in role_courses.items():
        matrix[role] = {}
        for cid in c_ids:
            enrollments = enrolled_by_course.get(cid, [])
            enrolled_count = len(enrollments)
            completed_count = sum(
                1 for e in enrollments
                if e.status == EnrollmentStatus.COMPLETED
                and (e.expiry_date is None or e.expiry_date > datetime.now(UTC))
            )
            expired_count = sum(
                1 for e in enrollments
                if e.status == EnrollmentStatus.COMPLETED
                and e.expiry_date is not None
                and e.expiry_date <= datetime.now(UTC)
            )
            pct = (completed_count / enrolled_count * 100) if enrolled_count else 0.0
            matrix[role][str(cid)] = {
                "enrolled": enrolled_count,
                "completed": completed_count,
                "expired": expired_count,
                "pct": round(pct, 1),
            }
            total_cells += 1
            if pct >= 80:
                total_compliant += 1

    overall_pct = (total_compliant / total_cells * 100) if total_cells else 0.0

    return {
        "roles": list(role_courses.keys()),
        "courses": [{"id": str(cid), "title": courses_map.get(cid, str(cid))} for cid in course_ids],
        "matrix": matrix,
        "overall_pct": round(overall_pct, 1),
    }


async def get_expiring_certifications(
    org_id: UUID,
    db: AsyncSession,
    days: int = 30,
) -> list[dict]:  # type: ignore[type-arg]
    """Return enrollments expiring within N days for the organization."""
    cutoff = datetime.now(UTC) + timedelta(days=days)
    result = await db.execute(
        select(TrainingEnrollment)
        .join(TrainingCourse)
        .where(
            TrainingCourse.organization_id == org_id,
            TrainingEnrollment.status == EnrollmentStatus.COMPLETED,
            TrainingEnrollment.expiry_date.is_not(None),
            TrainingEnrollment.expiry_date <= cutoff,
            TrainingEnrollment.expiry_date >= datetime.now(UTC),
            TrainingEnrollment.is_deleted == False,  # noqa: E712
        )
        .order_by(TrainingEnrollment.expiry_date.asc())
    )
    enrollments = result.scalars().all()
    return [
        {
            "enrollment_id": str(e.id),
            "user_id": str(e.user_id),
            "course_id": str(e.course_id),
            "expiry_date": e.expiry_date.isoformat() if e.expiry_date else None,
            "days_remaining": (e.expiry_date - datetime.now(UTC)).days if e.expiry_date else None,
        }
        for e in enrollments
    ]
