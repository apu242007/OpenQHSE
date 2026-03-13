"""Notification templates for all channels.

WhatsApp templates follow Meta Business API format.
Email templates reuse the OpenQHSE brand palette.
Teams templates use Adaptive Card schema.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ═══════════════════════════════════════════════════════════════
# WhatsApp Business API Templates
# ═══════════════════════════════════════════════════════════════


@dataclass
class WhatsAppTemplate:
    """Meta WhatsApp Cloud API template definition."""

    name: str
    language: str = "es"
    components: list[dict[str, Any]] = field(default_factory=list)


WHATSAPP_TEMPLATES: dict[str, WhatsAppTemplate] = {
    # ── Incident Reported ─────────────────────────────────
    "incident_reported": WhatsAppTemplate(
        name="incident_reported",
        language="es",
        components=[
            {
                "type": "header",
                "parameters": [{"type": "text", "text": "{{incident_title}}"}],
            },
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{reporter_name}}"},
                    {"type": "text", "text": "{{severity}}"},
                    {"type": "text", "text": "{{site_name}}"},
                    {"type": "text", "text": "{{occurred_at}}"},
                    {"type": "text", "text": "{{reference_number}}"},
                ],
            },
        ],
    ),
    # ── Incident Critical ─────────────────────────────────
    "incident_critical": WhatsAppTemplate(
        name="incident_critical",
        language="es",
        components=[
            {
                "type": "header",
                "parameters": [{"type": "text", "text": "{{incident_title}}"}],
            },
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{severity}}"},
                    {"type": "text", "text": "{{site_name}}"},
                    {"type": "text", "text": "{{injuries_count}}"},
                    {"type": "text", "text": "{{fatalities_count}}"},
                    {"type": "text", "text": "{{reporter_name}}"},
                ],
            },
        ],
    ),
    # ── Action Assigned ───────────────────────────────────
    "action_assigned": WhatsAppTemplate(
        name="action_assigned",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{assignee_name}}"},
                    {"type": "text", "text": "{{action_title}}"},
                    {"type": "text", "text": "{{due_date}}"},
                    {"type": "text", "text": "{{priority}}"},
                ],
            },
        ],
    ),
    # ── Action Overdue ────────────────────────────────────
    "action_overdue": WhatsAppTemplate(
        name="action_overdue",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{assignee_name}}"},
                    {"type": "text", "text": "{{action_title}}"},
                    {"type": "text", "text": "{{due_date}}"},
                    {"type": "text", "text": "{{days_overdue}}"},
                ],
            },
        ],
    ),
    # ── Action Escalated ──────────────────────────────────
    "action_escalated": WhatsAppTemplate(
        name="action_escalated",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{manager_name}}"},
                    {"type": "text", "text": "{{action_title}}"},
                    {"type": "text", "text": "{{original_assignee}}"},
                    {"type": "text", "text": "{{days_overdue}}"},
                ],
            },
        ],
    ),
    # ── Inspection Overdue ────────────────────────────────
    "inspection_overdue": WhatsAppTemplate(
        name="inspection_overdue",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{inspector_name}}"},
                    {"type": "text", "text": "{{inspection_title}}"},
                    {"type": "text", "text": "{{scheduled_date}}"},
                    {"type": "text", "text": "{{site_name}}"},
                ],
            },
        ],
    ),
    # ── Permit Pending Approval ───────────────────────────
    "permit_pending_approval": WhatsAppTemplate(
        name="permit_pending_approval",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{approver_name}}"},
                    {"type": "text", "text": "{{permit_type}}"},
                    {"type": "text", "text": "{{requester_name}}"},
                    {"type": "text", "text": "{{site_name}}"},
                    {"type": "text", "text": "{{start_date}}"},
                ],
            },
        ],
    ),
    # ── Permit Expiring Soon ──────────────────────────────
    "permit_expiring_soon": WhatsAppTemplate(
        name="permit_expiring_soon",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{recipient_name}}"},
                    {"type": "text", "text": "{{permit_type}}"},
                    {"type": "text", "text": "{{expiry_time}}"},
                    {"type": "text", "text": "{{site_name}}"},
                ],
            },
        ],
    ),
    # ── Document Review Due ───────────────────────────────
    "document_review_due": WhatsAppTemplate(
        name="document_review_due",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{owner_name}}"},
                    {"type": "text", "text": "{{document_title}}"},
                    {"type": "text", "text": "{{review_due_date}}"},
                ],
            },
        ],
    ),
    # ── Training Expiring ─────────────────────────────────
    "training_expiring": WhatsAppTemplate(
        name="training_expiring",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{employee_name}}"},
                    {"type": "text", "text": "{{course_name}}"},
                    {"type": "text", "text": "{{expiry_date}}"},
                ],
            },
        ],
    ),
    # ── High Risk Detected ────────────────────────────────
    "high_risk_detected": WhatsAppTemplate(
        name="high_risk_detected",
        language="es",
        components=[
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": "{{risk_title}}"},
                    {"type": "text", "text": "{{risk_level}}"},
                    {"type": "text", "text": "{{site_name}}"},
                    {"type": "text", "text": "{{area_name}}"},
                ],
            },
        ],
    ),
}


# ═══════════════════════════════════════════════════════════════
# In-App / Push plain-text templates
# ═══════════════════════════════════════════════════════════════

NOTIFICATION_COPY: dict[str, dict[str, str]] = {
    "incident_reported": {
        "title": "🚨 Incidente reportado: {incident_title}",
        "body": (
            "Nuevo incidente ({severity}) reportado por {reporter_name} "
            "en {site_name}. Ref: {reference_number}."
        ),
    },
    "incident_critical": {
        "title": "🔴 INCIDENTE CRÍTICO: {incident_title}",
        "body": (
            "Severidad {severity} en {site_name}. "
            "Heridos: {injuries_count}, Fatalidades: {fatalities_count}. "
            "Requiere atención inmediata de gerencia."
        ),
    },
    "action_assigned": {
        "title": "📋 Acción asignada: {action_title}",
        "body": (
            "Se te ha asignado la acción correctiva «{action_title}». "
            "Prioridad: {priority}. Fecha límite: {due_date}."
        ),
    },
    "action_overdue": {
        "title": "⏰ Acción vencida: {action_title}",
        "body": (
            "La acción «{action_title}» está vencida por {days_overdue} día(s). "
            "Fecha límite original: {due_date}."
        ),
    },
    "action_escalated": {
        "title": "⬆️ Acción escalada: {action_title}",
        "body": (
            "La acción «{action_title}» asignada a {original_assignee} ha sido "
            "escalada. Vencida por {days_overdue} día(s)."
        ),
    },
    "inspection_overdue": {
        "title": "📅 Inspección vencida: {inspection_title}",
        "body": (
            "La inspección «{inspection_title}» programada para {scheduled_date} "
            "en {site_name} no se ha completado."
        ),
    },
    "permit_pending_approval": {
        "title": "📝 Permiso pendiente de aprobación",
        "body": (
            "Permiso de tipo {permit_type} solicitado por {requester_name} "
            "para {site_name} (inicio: {start_date}). Requiere tu aprobación."
        ),
    },
    "permit_expiring_soon": {
        "title": "⚠️ Permiso por expirar: {permit_type}",
        "body": (
            "El permiso de tipo {permit_type} en {site_name} expira en "
            "{expiry_time}. Toma acción antes del vencimiento."
        ),
    },
    "document_review_due": {
        "title": "📄 Documento requiere revisión: {document_title}",
        "body": (
            "El documento «{document_title}» requiere revisión antes del "
            "{review_due_date}."
        ),
    },
    "training_expiring": {
        "title": "🎓 Certificación por expirar: {course_name}",
        "body": (
            "La certificación del curso «{course_name}» expira el {expiry_date}. "
            "Programa la recertificación."
        ),
    },
    "high_risk_detected": {
        "title": "🔺 Riesgo alto detectado: {risk_title}",
        "body": (
            "Se identificó riesgo nivel {risk_level} en {site_name}/{area_name}. "
            "Revisión inmediata requerida por el responsable HSE."
        ),
    },
    "system_announcement": {
        "title": "📢 {title}",
        "body": "{body}",
    },
}


# ═══════════════════════════════════════════════════════════════
# Telegram HTML templates
# ═══════════════════════════════════════════════════════════════

TELEGRAM_TEMPLATES: dict[str, str] = {
    "incident_reported": (
        "🚨 <b>Incidente reportado</b>\n\n"
        "<b>{incident_title}</b>\n"
        "Severidad: <b>{severity}</b>\n"
        "Sitio: {site_name}\n"
        "Reportado por: {reporter_name}\n"
        "Ref: <code>{reference_number}</code>\n\n"
        "<a href='{action_url}'>Ver incidente →</a>"
    ),
    "incident_critical": (
        "🔴 <b>INCIDENTE CRÍTICO</b>\n\n"
        "<b>{incident_title}</b>\n"
        "Severidad: <b>{severity}</b>\n"
        "Heridos: {injuries_count} | Fatalidades: {fatalities_count}\n"
        "Sitio: {site_name}\n\n"
        "⚡ <b>Requiere atención inmediata</b>\n"
        "<a href='{action_url}'>Ver incidente →</a>"
    ),
    "action_assigned": (
        "📋 <b>Acción asignada</b>\n\n"
        "<b>{action_title}</b>\n"
        "Prioridad: {priority}\n"
        "Fecha límite: {due_date}\n\n"
        "<a href='{action_url}'>Ver acción →</a>"
    ),
    "action_overdue": (
        "⏰ <b>Acción vencida</b>\n\n"
        "<b>{action_title}</b>\n"
        "Vencida por: {days_overdue} día(s)\n"
        "Fecha límite: {due_date}\n\n"
        "<a href='{action_url}'>Ver acción →</a>"
    ),
    "action_escalated": (
        "⬆️ <b>Acción escalada</b>\n\n"
        "<b>{action_title}</b>\n"
        "Asignada originalmente a: {original_assignee}\n"
        "Vencida por: {days_overdue} día(s)\n\n"
        "<a href='{action_url}'>Ver acción →</a>"
    ),
    "inspection_overdue": (
        "📅 <b>Inspección vencida</b>\n\n"
        "<b>{inspection_title}</b>\n"
        "Fecha programada: {scheduled_date}\n"
        "Sitio: {site_name}\n\n"
        "<a href='{action_url}'>Ver inspección →</a>"
    ),
    "permit_pending_approval": (
        "📝 <b>Permiso pendiente</b>\n\n"
        "Tipo: <b>{permit_type}</b>\n"
        "Solicitante: {requester_name}\n"
        "Sitio: {site_name}\n"
        "Inicio: {start_date}\n\n"
        "<a href='{action_url}'>Revisar permiso →</a>"
    ),
    "permit_expiring_soon": (
        "⚠️ <b>Permiso por expirar</b>\n\n"
        "Tipo: <b>{permit_type}</b>\n"
        "Sitio: {site_name}\n"
        "Expira en: {expiry_time}\n\n"
        "<a href='{action_url}'>Ver permiso →</a>"
    ),
    "document_review_due": (
        "📄 <b>Revisión de documento pendiente</b>\n\n"
        "<b>{document_title}</b>\n"
        "Fecha de revisión: {review_due_date}\n\n"
        "<a href='{action_url}'>Ver documento →</a>"
    ),
    "training_expiring": (
        "🎓 <b>Certificación por expirar</b>\n\n"
        "Curso: <b>{course_name}</b>\n"
        "Fecha de expiración: {expiry_date}\n\n"
        "<a href='{action_url}'>Ver certificación →</a>"
    ),
    "high_risk_detected": (
        "🔺 <b>Riesgo alto detectado</b>\n\n"
        "<b>{risk_title}</b>\n"
        "Nivel: <b>{risk_level}</b>\n"
        "Ubicación: {site_name} / {area_name}\n\n"
        "<a href='{action_url}'>Ver evaluación →</a>"
    ),
}


# ═══════════════════════════════════════════════════════════════
# Microsoft Teams Adaptive Card builder
# ═══════════════════════════════════════════════════════════════


def build_teams_card(
    event_type: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Build a Microsoft Teams Adaptive Card for the given event.

    Returns a complete card payload ready for webhook POST.
    """
    copy = NOTIFICATION_COPY.get(event_type, NOTIFICATION_COPY["system_announcement"])
    try:
        title = copy["title"].format(**data)
        body = copy["body"].format(**data)
    except KeyError:
        title = data.get("title", "OpenQHSE Notification")
        body = data.get("body", "")

    # Colour mapping
    color_map: dict[str, str] = {
        "incident_critical": "attention",
        "incident_reported": "warning",
        "action_overdue": "warning",
        "action_escalated": "attention",
        "high_risk_detected": "attention",
    }
    style = color_map.get(event_type, "default")

    card: dict[str, Any] = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "contentUrl": None,
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {
                            "type": "TextBlock",
                            "size": "Medium",
                            "weight": "Bolder",
                            "text": title,
                            "style": "heading",
                            "color": style,
                        },
                        {
                            "type": "TextBlock",
                            "text": body,
                            "wrap": True,
                        },
                        {
                            "type": "FactSet",
                            "facts": [
                                {"title": "Evento", "value": event_type},
                                {"title": "Prioridad", "value": data.get("priority", "normal")},
                            ],
                        },
                    ],
                    "actions": [],
                },
            }
        ],
    }

    action_url = data.get("action_url")
    if action_url:
        card["attachments"][0]["content"]["actions"].append(
            {
                "type": "Action.OpenUrl",
                "title": "Ver en OpenQHSE",
                "url": action_url,
            }
        )

    return card


# ═══════════════════════════════════════════════════════════════
# Email HTML templates  (extending existing email_service)
# ═══════════════════════════════════════════════════════════════

_EMAIL_WRAPPER = """
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:12px;overflow:hidden;">
  <tr>
    <td style="background:linear-gradient(135deg,{header_bg_start},{header_bg_end});padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">{header_icon} {header_title}</h1>
      <p style="color:{header_subtitle_color};margin:8px 0 0;font-size:14px;">{header_subtitle}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;color:#e2e8f0;">
      {inner_html}
      <hr style="border:none;border-top:1px solid #334155;margin:24px 0;" />
      <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
        © {year} OpenQHSE Contributors · AGPL-3.0
      </p>
    </td>
  </tr>
</table>
</body>
</html>
"""


def build_notification_email(
    event_type: str,
    data: dict[str, Any],
) -> tuple[str, str]:
    """Build HTML email for the event.

    Returns (subject, html_body).
    """
    from datetime import datetime

    copy = NOTIFICATION_COPY.get(event_type, NOTIFICATION_COPY["system_announcement"])
    try:
        title = copy["title"].format(**data)
        body_text = copy["body"].format(**data)
    except KeyError:
        title = data.get("title", "OpenQHSE Notification")
        body_text = data.get("body", "")

    # Determine header style
    if "critical" in event_type or "high_risk" in event_type:
        hdr = {
            "header_bg_start": "#dc2626",
            "header_bg_end": "#991b1b",
            "header_icon": "⚠️",
            "header_title": "Alerta Urgente",
            "header_subtitle": "OpenQHSE — Notificación urgente",
            "header_subtitle_color": "#fecaca",
        }
    elif "overdue" in event_type or "escalated" in event_type:
        hdr = {
            "header_bg_start": "#f59e0b",
            "header_bg_end": "#d97706",
            "header_icon": "⏰",
            "header_title": "Atención Requerida",
            "header_subtitle": "OpenQHSE — Seguimiento pendiente",
            "header_subtitle_color": "#fef3c7",
        }
    else:
        hdr = {
            "header_bg_start": "#0066FF",
            "header_bg_end": "#0044CC",
            "header_icon": "🛡️",
            "header_title": "OpenQHSE",
            "header_subtitle": "Plataforma QHSE Empresarial",
            "header_subtitle_color": "#93c5fd",
        }

    action_url = data.get("action_url", "")
    button_html = ""
    if action_url:
        button_html = (
            '<table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">'
            f'<a href="{action_url}" style="display:inline-block;background:#0066FF;'
            'color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;'
            'font-weight:600;font-size:16px;">Ver en OpenQHSE</a>'
            "</td></tr></table>"
        )

    recipient_name = data.get("recipient_name", data.get("assignee_name", ""))
    greeting = ""
    if recipient_name:
        greeting = (
            f'<p style="line-height:1.6;margin:0 0 16px;">'
            f'Hola <strong style="color:#60a5fa;">{recipient_name}</strong>,</p>'
        )

    inner_html = (
        f'<h2 style="color:#fff;margin:0 0 16px;font-size:22px;">{title}</h2>'
        f"{greeting}"
        f'<p style="line-height:1.6;margin:0 0 24px;color:#cbd5e1;font-size:14px;">{body_text}</p>'
        f"{button_html}"
    )

    html = _EMAIL_WRAPPER.format(
        **hdr,
        inner_html=inner_html,
        year=datetime.now().year,
    )
    subject = f"{title} — OpenQHSE"
    return subject, html
