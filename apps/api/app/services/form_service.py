"""Form business logic — scoring, validation, PDF generation."""

from __future__ import annotations

import io
from typing import Any

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

# ── Scoring ─────────────────────────────────────────────────


def calculate_score(
    schema: dict[str, Any],
    data: dict[str, Any],
    scoring_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Calculate the score of a submission against a template schema.

    Returns:
        {score, max_score, percentage, passed, failed_items}
    """
    if not scoring_config or not scoring_config.get("enabled", False):
        return {"score": 0, "max_score": 0, "percentage": 0, "passed": True, "failed_items": []}

    total_score: float = 0
    max_score: float = 0
    failed_items: list[dict[str, Any]] = []

    sections: list[dict[str, Any]] = schema.get("sections", [])
    for section in sections:
        fields: list[dict[str, Any]] = section.get("fields", section.get("questions", []))
        for field in fields:
            fid = field.get("id", "")
            scoring = field.get("scoring")
            if not scoring:
                continue

            weight = float(scoring.get("weight", 1.0))
            answer = data.get(fid)
            answer_value = answer.get("value") if isinstance(answer, dict) else answer

            scoring_type = scoring.get("type", "option_score")

            if scoring_type == "option_score":
                options = field.get("options", [])
                field_max = max((float(o.get("score", 0)) for o in options), default=0) * weight
                max_score += field_max

                if answer_value is not None:
                    matched = next((o for o in options if o.get("value") == answer_value), None)
                    if matched:
                        earned = float(matched.get("score", 0)) * weight
                        total_score += earned
                        if earned < field_max:
                            failed_items.append(
                                {
                                    "field_id": fid,
                                    "label": field.get("label", field.get("text", "")),
                                    "expected_score": field_max,
                                    "actual_score": earned,
                                    "answer": answer_value,
                                }
                            )

            elif scoring_type == "boolean":
                max_score += 10 * weight
                if answer_value is True:
                    total_score += 10 * weight
                else:
                    failed_items.append(
                        {
                            "field_id": fid,
                            "label": field.get("label", field.get("text", "")),
                            "expected_score": 10 * weight,
                            "actual_score": 0,
                            "answer": answer_value,
                        }
                    )

            elif scoring_type == "risk_matrix":
                max_score += 25 * weight  # 5×5 matrix, best = 1×1 = 1
                if isinstance(answer_value, dict):
                    lik = int(answer_value.get("likelihood", 5))
                    con = int(answer_value.get("consequence", 5))
                    risk_score = lik * con
                    # Invert: lower risk = higher earned score
                    earned = max(0, (25 - risk_score + 1)) * weight
                    total_score += earned
                    if risk_score >= 15:
                        failed_items.append(
                            {
                                "field_id": fid,
                                "label": field.get("label", field.get("text", "")),
                                "risk_score": risk_score,
                                "answer": answer_value,
                            }
                        )

            elif scoring_type == "checklist":
                items_list: list[Any] = field.get("items", [])
                field_max = len(items_list) * weight
                max_score += field_max
                if isinstance(answer_value, list):
                    checked = sum(1 for v in answer_value if v)
                    total_score += checked * weight

            elif scoring_type == "rating":
                max_val = float(field.get("max", 5))
                max_score += max_val * weight
                if answer_value is not None:
                    total_score += min(float(answer_value), max_val) * weight

    percentage = (total_score / max_score * 100) if max_score > 0 else 100
    pass_threshold = float(scoring_config.get("pass_threshold", 80))
    fail_threshold = float(scoring_config.get("fail_threshold", 60))

    return {
        "score": round(total_score, 2),
        "max_score": round(max_score, 2),
        "percentage": round(percentage, 2),
        "passed": percentage >= pass_threshold,
        "grade": ("pass" if percentage >= pass_threshold else "warning" if percentage >= fail_threshold else "fail"),
        "failed_items": failed_items,
    }


# ── Validation ──────────────────────────────────────────────


def validate_submission(
    schema: dict[str, Any],
    data: dict[str, Any],
) -> list[dict[str, str]]:
    """Validate submission data against the template schema.

    Returns list of errors: [{field_id, message}]
    """
    errors: list[dict[str, str]] = []
    sections = schema.get("sections", [])

    for section in sections:
        # Check section-level conditional
        cond = section.get("conditional")
        if cond and not _evaluate_condition(cond, data):
            continue

        fields = section.get("fields", section.get("questions", []))
        for field in fields:
            fid = field.get("id", "")
            ftype = field.get("type", "text")
            required = field.get("required", False)
            label = field.get("label", field.get("text", fid))

            # Check field-level conditional
            fcond = field.get("conditional")
            if fcond and not _evaluate_condition(fcond, data):
                continue

            answer = data.get(fid)
            answer_value = answer.get("value") if isinstance(answer, dict) else answer

            # Required check
            if required and _is_empty(answer_value):
                errors.append({"field_id": fid, "message": f"'{label}' es obligatorio"})
                continue

            if _is_empty(answer_value):
                continue

            # Type-specific validations
            if ftype == "number":
                try:
                    num = float(answer_value) if answer_value is not None else 0.0
                    min_val = field.get("min")
                    max_val = field.get("max")
                    if min_val is not None and num < float(min_val):
                        errors.append({"field_id": fid, "message": f"'{label}' debe ser ≥ {min_val}"})
                    if max_val is not None and num > float(max_val):
                        errors.append({"field_id": fid, "message": f"'{label}' debe ser ≤ {max_val}"})
                except (ValueError, TypeError):
                    errors.append({"field_id": fid, "message": f"'{label}' debe ser numérico"})

            elif ftype == "text":
                min_len = field.get("min_length")
                max_len = field.get("max_length")
                val_str = str(answer_value)
                if min_len and len(val_str) < int(min_len):
                    errors.append({"field_id": fid, "message": f"'{label}' mín. {min_len} caracteres"})
                if max_len and len(val_str) > int(max_len):
                    errors.append({"field_id": fid, "message": f"'{label}' máx. {max_len} caracteres"})

            elif ftype == "photo":
                min_photos = field.get("min_photos", 0)
                if isinstance(answer_value, list) and len(answer_value) < int(min_photos):
                    errors.append({"field_id": fid, "message": f"'{label}' requiere mín. {min_photos} foto(s)"})

            elif ftype in ("select", "multi_select"):
                options = field.get("options", [])
                valid_vals = {o.get("value") for o in options}
                if ftype == "select" and answer_value not in valid_vals:
                    errors.append({"field_id": fid, "message": f"'{label}' opción no válida"})
                elif ftype == "multi_select" and isinstance(answer_value, list):
                    for v in answer_value:
                        if v not in valid_vals:
                            errors.append({"field_id": fid, "message": f"'{label}' opción '{v}' no válida"})

    return errors


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return bool(isinstance(value, dict) and len(value) == 0)


def _evaluate_condition(condition: dict[str, Any], data: dict[str, Any]) -> bool:
    """Evaluate a conditional visibility rule."""
    field_id = condition.get("field_id", "")
    operator = condition.get("operator", "eq")
    expected = condition.get("value")

    answer = data.get(field_id)
    actual = answer.get("value") if isinstance(answer, dict) else answer

    if operator == "eq":
        return actual == expected
    if operator == "neq":
        return actual != expected
    if operator == "gt":
        return float(actual or 0) > float(expected or 0)
    if operator == "lt":
        return float(actual or 0) < float(expected or 0)
    if operator == "gte":
        return float(actual or 0) >= float(expected or 0)
    if operator == "lte":
        return float(actual or 0) <= float(expected or 0)
    if operator == "contains":
        return expected in (actual or "")
    if operator == "not_empty":
        return not _is_empty(actual)
    if operator == "empty":
        return _is_empty(actual)
    return True


# ── PDF Report ──────────────────────────────────────────────


def generate_pdf_report(
    template_data: dict[str, Any],
    submission_data: dict[str, Any],
    answers: dict[str, Any],
    score_result: dict[str, Any] | None = None,
) -> bytes:
    """Generate a PDF inspection/form report.

    Args:
        template_data: template dict with name, schema, scoring_config
        submission_data: submission dict with submitted_by, submitted_at, site info
        answers: the data dict {field_id: {value, notes, flagged, photos}}
        score_result: the result of calculate_score
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements: list[Any] = []

    # Title
    title_style = ParagraphStyle(
        "FormTitle",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=colors.HexColor("#0066FF"),
        spaceAfter=8,
    )
    elements.append(Paragraph(template_data.get("name", "Formulario"), title_style))

    # Metadata table
    submitted_at = submission_data.get("submitted_at", "")
    meta = [
        [
            "Enviado por",
            submission_data.get("submitted_by_name", "N/A"),
            "Fecha",
            str(submitted_at)[:16] if submitted_at else "N/A",
        ],
        ["Sitio", submission_data.get("site_name", "N/A"), "Estado", submission_data.get("status", "N/A").upper()],
    ]
    meta_table = Table(meta, colWidths=[3.5 * cm, 5.5 * cm, 3 * cm, 5.5 * cm])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#F3F4F6")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(meta_table)
    elements.append(Spacer(1, 15))

    # Score summary if available
    if score_result and score_result.get("max_score", 0) > 0:
        pct = score_result.get("percentage", 0)
        grade = score_result.get("grade", "unknown")
        grade_color = (
            colors.HexColor("#00E5A0")
            if grade == "pass"
            else colors.HexColor("#FFAA00")
            if grade == "warning"
            else colors.HexColor("#FF4444")
        )
        score_text = (
            f"<b>Puntuación:</b> {score_result['score']}/{score_result['max_score']} "
            f"({pct:.1f}%) — <font color='{grade_color}'>{grade.upper()}</font>"
        )
        elements.append(Paragraph(score_text, styles["Normal"]))
        elements.append(Spacer(1, 10))

    # Sections & answers
    schema = template_data.get("schema", template_data.get("schema_def", {}))
    sections = schema.get("sections", [])

    for section in sections:
        sec_title = section.get("title", "Sección")
        elements.append(
            Paragraph(
                sec_title,
                ParagraphStyle(
                    "SectionTitle",
                    parent=styles["Heading2"],
                    fontSize=13,
                    textColor=colors.HexColor("#1F2937"),
                    spaceBefore=12,
                    spaceAfter=6,
                ),
            )
        )

        fields = section.get("fields", section.get("questions", []))
        for field in fields:
            fid = field.get("id", "")
            ftype = field.get("type", "text")
            label = field.get("label", field.get("text", fid))
            answer = answers.get(fid, {})
            value = answer.get("value") if isinstance(answer, dict) else answer
            notes = answer.get("notes", "") if isinstance(answer, dict) else ""
            flagged = answer.get("flagged", False) if isinstance(answer, dict) else False

            if ftype in ("section", "instruction"):
                elements.append(Paragraph(f"<i>{label}</i>", styles["Normal"]))
                continue

            display_value = _format_answer(value, field)
            flag_marker = " ⚠️" if flagged else ""

            row_data = [[label + flag_marker, display_value]]
            row_table = Table(row_data, colWidths=[7 * cm, 10 * cm])
            row_table.setStyle(
                TableStyle(
                    [
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                        ("LINEBELOW", (0, 0), (-1, 0), 0.3, colors.HexColor("#E5E7EB")),
                    ]
                )
            )
            if flagged:
                row_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
                        ]
                    )
                )
            elements.append(row_table)

            if notes:
                elements.append(
                    Paragraph(
                        f"<i>Notas: {notes}</i>",
                        ParagraphStyle("Notes", parent=styles["Normal"], fontSize=8, textColor=colors.grey),
                    )
                )

    # Failed items summary
    if score_result and score_result.get("failed_items"):
        elements.append(Spacer(1, 15))
        elements.append(
            Paragraph(
                "Ítems con desvío",
                ParagraphStyle(
                    "FailedTitle",
                    parent=styles["Heading3"],
                    textColor=colors.HexColor("#FF4444"),
                ),
            )
        )
        for item in score_result["failed_items"]:
            elements.append(
                Paragraph(
                    f"• {item.get('label', 'N/A')} — Respuesta: {item.get('answer', 'N/A')}",
                    styles["Normal"],
                )
            )

    # Footer
    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(
            "Generado por OpenQHSE Platform",
            ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey),
        )
    )

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def _format_answer(value: Any, field: dict[str, Any]) -> str:
    """Format an answer value for display in the PDF report."""
    if value is None:
        return "—"

    ftype = field.get("type", "text")

    if ftype == "boolean":
        return "Sí" if value else "No"

    if ftype in ("select", "multi_select"):
        options = {o["value"]: o.get("label", o["value"]) for o in field.get("options", [])}
        if isinstance(value, list):
            return ", ".join(options.get(v, str(v)) for v in value)
        return str(options.get(value, str(value)))

    if ftype == "risk_matrix" and isinstance(value, dict):
        lik = value.get("likelihood", "?")
        con = value.get("consequence", "?")
        return f"Probabilidad: {lik}, Consecuencia: {con} (Riesgo: {int(lik) * int(con)})"

    if ftype == "photo" and isinstance(value, list):
        return f"{len(value)} foto(s) adjuntada(s)"

    if ftype == "signature":
        return "Firma capturada" if value else "Sin firma"

    if ftype == "geolocation" and isinstance(value, dict):
        return f"Lat: {value.get('lat', '?')}, Lng: {value.get('lng', '?')}"

    if ftype == "rating":
        max_val = field.get("max", 5)
        return f"{value}/{max_val}"

    if ftype == "checklist" and isinstance(value, list):
        total = len(field.get("items", []))
        checked = sum(1 for v in value if v)
        return f"{checked}/{total} completados"

    if ftype == "temperature" and isinstance(value, dict):
        return f"{value.get('value', '?')}°{value.get('unit', 'C')}"

    if ftype == "weather":
        return str(value)

    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    if isinstance(value, dict):
        return str(value)

    return str(value)
