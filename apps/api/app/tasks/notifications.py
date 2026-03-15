"""Notification background tasks.

Celery tasks that wrap the async notification service so events
can be dispatched reliably from any part of the application.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Coroutine
from typing import Any, TypeVar

_T = TypeVar("_T")

from app.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger("tasks.notifications")

# ── Helper: run async code inside sync Celery workers ─────────


def _run_async(coro: Coroutine[Any, Any, _T]) -> _T:
    """Run an async coroutine from a sync Celery task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


async def _get_db_session() -> AsyncGenerator[Any, None]:
    """Create a standalone async DB session for use inside Celery."""
    from app.core.database import async_session_factory

    async with async_session_factory() as session:
        yield session


# ═══════════════════════════════════════════════════════════════
# Generic event dispatcher
# ═══════════════════════════════════════════════════════════════


@celery_app.task(  # type: ignore[untyped-decorator]
    name="app.tasks.notifications.dispatch_notification_event",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def dispatch_notification_event(
    self: Any,  # noqa: ANN001
    event_type: str,
    event_data: dict[str, Any],
) -> dict[str, str]:
    """Generic Celery task that dispatches a notification event.

    Args:
        event_type: One of NotificationEvent values (e.g. "incident_reported")
        event_data: Dict with all data needed by the handler + templates
    """
    logger.info(
        "Dispatching notification event",
        event_type=event_type,
        entity_id=event_data.get("id"),
    )

    async def _dispatch() -> dict[str, str]:
        from app.core.database import async_session_factory
        from app.services.notification_handlers import EVENT_HANDLER_MAP

        handler = EVENT_HANDLER_MAP.get(event_type)
        if handler is None:
            logger.warning("No handler for event", event_type=event_type)
            return {"status": "skipped", "reason": "no_handler"}

        async with async_session_factory() as session:
            try:
                await handler(session, event_data)
                await session.commit()
                return {"status": "dispatched", "event_type": event_type}
            except Exception as exc:
                await session.rollback()
                raise exc

    try:
        return _run_async(_dispatch())
    except Exception as exc:
        logger.error(
            "Notification dispatch failed",
            event_type=event_type,
            error=str(exc),
            retry=self.request.retries,
        )
        raise self.retry(exc=exc) from exc


# ═══════════════════════════════════════════════════════════════
# Direct channel tasks (for isolated sends)
# ═══════════════════════════════════════════════════════════════


@celery_app.task(name="app.tasks.notifications.send_email")  # type: ignore[untyped-decorator]
def send_email_task(
    to: str,
    subject: str,
    template: str,
    context: dict[str, Any],
) -> dict[str, str]:
    """Send an email notification asynchronously.

    Args:
        to: Recipient email address
        subject: Email subject
        template: Template name (e.g., "incident_reported")
        context: Template rendering context

    Returns:
        Dictionary with send status
    """
    from app.core.config import get_settings

    settings = get_settings()

    logger.info("Sending email", to=to, subject=subject, template=template)

    try:
        import emails
        from jinja2 import Environment, FileSystemLoader

        env = Environment(loader=FileSystemLoader("app/templates/email"))
        html_template = env.get_template(f"{template}.html")
        html_content = html_template.render(**context)

        message = emails.Message(
            subject=subject,
            html=html_content,
            mail_from=(settings.app_name, settings.smtp_from),
        )

        smtp_options: dict[str, str | int] = {
            "host": settings.smtp_host,
            "port": settings.smtp_port,
        }
        if settings.smtp_user:
            smtp_options["user"] = settings.smtp_user
            smtp_options["password"] = settings.smtp_pass

        response = message.send(to=to, smtp=smtp_options)

        if response.status_code in (250, 200):
            logger.info("Email sent successfully", to=to)
            return {"status": "sent", "to": to}

        logger.warning("Email send failed", to=to, status=response.status_code)
        return {"status": "failed", "to": to, "error": str(response.status_code)}

    except FileNotFoundError:
        logger.warning(
            "Email template not found, using plain text fallback",
            template=template,
        )
        return {"status": "template_missing", "to": to}
    except Exception as e:
        logger.error("Email send error", to=to, error=str(e))
        return {"status": "error", "to": to, "error": str(e)}


@celery_app.task(name="app.tasks.notifications.send_push_notification")  # type: ignore[untyped-decorator]
def send_push_notification_task(
    user_id: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> dict[str, str]:
    """Send a push notification to a mobile device.

    Placeholder for Expo Push Notifications integration.
    """
    logger.info("Push notification", user_id=user_id, title=title)
    return {"status": "sent", "user_id": user_id, "title": title}


@celery_app.task(  # type: ignore[untyped-decorator]
    name="app.tasks.notifications.send_whatsapp_message",
    bind=True,
    max_retries=3,
    default_retry_delay=15,
)
def send_whatsapp_message_task(
    self: Any,  # noqa: ANN001
    phone: str,
    template: str,
    params: dict[str, Any],
) -> dict[str, str]:
    """Send a WhatsApp message via Meta Cloud API asynchronously."""
    logger.info("WhatsApp task", phone=phone, template=template)

    async def _send() -> dict[str, str]:
        from app.core.database import async_session_factory
        from app.services.notification_service import NotificationService

        async with async_session_factory() as session:
            svc = NotificationService(session)
            result = await svc.send_whatsapp(phone, "", template, params)
            return {"status": result.get("status", "failed")}

    try:
        return _run_async(_send())
    except Exception as exc:
        logger.error("WhatsApp task failed", phone=phone, error=str(exc))
        raise self.retry(exc=exc) from exc


@celery_app.task(  # type: ignore[untyped-decorator]
    name="app.tasks.notifications.send_telegram_message",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def send_telegram_message_task(
    self: Any,  # noqa: ANN001
    chat_id: str,
    message: str,
    parse_mode: str = "HTML",
) -> dict[str, str]:
    """Send a Telegram message asynchronously."""
    logger.info("Telegram task", chat_id=chat_id)

    async def _send() -> dict[str, str]:
        from app.core.database import async_session_factory
        from app.services.notification_service import NotificationService

        async with async_session_factory() as session:
            svc = NotificationService(session)
            result = await svc.send_telegram(chat_id, message, parse_mode)
            return {"status": result.get("status", "failed")}

    try:
        return _run_async(_send())
    except Exception as exc:
        logger.error("Telegram task failed", chat_id=chat_id, error=str(exc))
        raise self.retry(exc=exc) from exc


@celery_app.task(  # type: ignore[untyped-decorator]
    name="app.tasks.notifications.send_teams_message",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def send_teams_message_task(
    self: Any,  # noqa: ANN001
    webhook_url: str,
    card: dict[str, Any],
) -> dict[str, str]:
    """Post an Adaptive Card to Microsoft Teams."""
    logger.info("Teams task")

    async def _send() -> dict[str, str]:
        from app.core.database import async_session_factory
        from app.services.notification_service import NotificationService

        async with async_session_factory() as session:
            svc = NotificationService(session)
            result = await svc.send_teams(webhook_url, card)
            return {"status": result.get("status", "failed")}

    try:
        return _run_async(_send())
    except Exception as exc:
        logger.error("Teams task failed", error=str(exc))
        raise self.retry(exc=exc) from exc


# ═══════════════════════════════════════════════════════════════
# Periodic / scheduled tasks
# ═══════════════════════════════════════════════════════════════


@celery_app.task(name="app.tasks.notifications.check_permit_expiry")  # type: ignore[untyped-decorator]
def check_permit_expiry_task() -> dict[str, str]:
    """Check for permits expiring within the configured window and notify."""
    logger.info("Checking permits about to expire")

    async def _check() -> dict[str, str]:
        from datetime import UTC, datetime, timedelta

        from sqlalchemy import select

        from app.core.config import get_settings
        from app.core.database import async_session_factory
        from app.models.permit import PermitStatus, WorkPermit
        from app.services.notification_handlers import handle_permit_expiring_soon

        settings = get_settings()
        window = timedelta(minutes=settings.permit_expiry_warning_minutes)
        now = datetime.now(UTC)
        threshold = now + window

        async with async_session_factory() as session:
            result = await session.execute(
                select(WorkPermit).where(
                    WorkPermit.status == PermitStatus.APPROVED,
                    WorkPermit.is_deleted == False,  # noqa: E712
                    WorkPermit.valid_until <= threshold,
                    WorkPermit.valid_until > now,
                )
            )
            permits = result.scalars().all()
            count = 0
            for permit in permits:
                remaining = permit.valid_until - now
                data = {
                    "id": str(permit.id),
                    "organization_id": str(permit.organization_id),
                    "permit_type": permit.permit_type,
                    "requester_id": str(permit.requested_by) if hasattr(permit, "requested_by") else "",
                    "site_name": getattr(permit, "site_name", ""),
                    "expiry_time": f"{int(remaining.total_seconds() // 60)} minutos",
                    "action_url": f"/permits/{permit.id}",
                }
                await handle_permit_expiring_soon(session, data)
                count += 1
            await session.commit()
            return {"status": "ok", "permits_notified": str(count)}

    return _run_async(_check())


@celery_app.task(name="app.tasks.notifications.check_overdue_actions")  # type: ignore[untyped-decorator]
def check_overdue_actions_task() -> dict[str, str]:
    """Check for overdue corrective actions and send notifications."""
    logger.info("Checking overdue corrective actions")

    async def _check() -> dict[str, str]:
        from datetime import UTC, datetime

        from sqlalchemy import select

        from app.core.database import async_session_factory
        from app.models.incident import CorrectiveAction
        from app.services.notification_handlers import handle_action_overdue

        now = datetime.now(UTC)

        async with async_session_factory() as session:
            result = await session.execute(
                select(CorrectiveAction).where(
                    CorrectiveAction.due_date < now,
                    CorrectiveAction.status.in_(["open", "in_progress"]),
                    CorrectiveAction.is_deleted == False,  # noqa: E712
                )
            )
            actions = result.scalars().all()
            count = 0
            for action in actions:
                days_overdue = (now - action.due_date).days if action.due_date else 0
                data = {
                    "id": str(action.id),
                    "organization_id": str(action.organization_id) if hasattr(action, "organization_id") else "",
                    "assignee_id": str(action.assigned_to) if hasattr(action, "assigned_to") else "",
                    "action_title": action.title if hasattr(action, "title") else str(action.id),
                    "due_date": str(action.due_date),
                    "days_overdue": str(days_overdue),
                    "action_url": f"/actions/{action.id}",
                }
                await handle_action_overdue(session, data)
                count += 1
            await session.commit()
            return {"status": "ok", "actions_notified": str(count)}

    return _run_async(_check())


@celery_app.task(name="app.tasks.notifications.check_overdue_inspections")  # type: ignore[untyped-decorator]
def check_overdue_inspections_task() -> dict[str, str]:
    """Check for overdue inspections and send notifications."""
    logger.info("Checking overdue inspections")

    async def _check() -> dict[str, str]:
        from datetime import UTC, datetime

        from sqlalchemy import select

        from app.core.database import async_session_factory
        from app.models.inspection import Inspection, InspectionStatus
        from app.services.notification_handlers import handle_inspection_overdue

        now = datetime.now(UTC)

        async with async_session_factory() as session:
            result = await session.execute(
                select(Inspection).where(
                    Inspection.scheduled_date < now,
                    Inspection.status == InspectionStatus.DRAFT,
                    Inspection.is_deleted == False,  # noqa: E712
                )
            )
            inspections = result.scalars().all()
            count = 0
            for inspection in inspections:
                data = {
                    "id": str(inspection.id),
                    "organization_id": str(inspection.organization_id),
                    "inspector_id": str(inspection.inspector_id) if hasattr(inspection, "inspector_id") else "",
                    "inspection_title": inspection.title if hasattr(inspection, "title") else str(inspection.id),
                    "scheduled_date": str(inspection.scheduled_date),
                    "site_name": getattr(inspection, "site_name", ""),
                    "action_url": f"/inspections/{inspection.id}",
                }
                await handle_inspection_overdue(session, data)
                count += 1
            await session.commit()
            return {"status": "ok", "inspections_notified": str(count)}

    return _run_async(_check())


# ═══════════════════════════════════════════════════════════════
# KPI Alert notification
# ═══════════════════════════════════════════════════════════════


@celery_app.task(  # type: ignore[untyped-decorator]
    name="app.tasks.notifications.send_kpi_alert_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def send_kpi_alert_notification(
    self: Any,  # noqa: ANN001
    org_id: str,
    kpi_name: str,
    current_value: float,
    condition: str,
    threshold: float,
    recipients: dict[str, Any],
    channels: dict[str, Any],
) -> dict[str, str]:
    """Send KPI threshold breach notifications via configured channels.

    Args:
        org_id: Organization UUID string.
        kpi_name: KPI identifier (e.g. 'TRIR', 'LTIF').
        current_value: The value that breached the threshold.
        condition: AlertCondition enum value string (e.g. 'GREATER_THAN').
        threshold: The configured threshold value.
        recipients: Dict with keys user_ids, emails, roles.
        channels: Dict with keys email, slack, whatsapp, in_app (bool values).
    """
    condition_labels = {
        "GREATER_THAN": ">",
        "GREATER_THAN_OR_EQUAL": "≥",
        "LESS_THAN": "<",
        "LESS_THAN_OR_EQUAL": "≤",
        "EQUALS": "=",
    }
    cond_label = condition_labels.get(condition, condition)
    subject = f"⚠️ Alerta KPI — {kpi_name} {cond_label} {threshold}"
    body = (
        f"El indicador **{kpi_name}** ha alcanzado el valor **{current_value:.2f}**, "
        f"superando el umbral configurado de {cond_label} {threshold}.\n\n"
        f"Acceda al dashboard de KPIs para más detalles y tome las acciones correctivas necesarias."
    )

    # In-app notification via dispatch_notification_event
    if channels.get("in_app", True):
        for user_id in recipients.get("user_ids", []):
            dispatch_notification_event.delay(
                "kpi_threshold_breached",
                {
                    "organization_id": org_id,
                    "user_id": user_id,
                    "kpi_name": kpi_name,
                    "current_value": current_value,
                    "condition": condition,
                    "threshold": threshold,
                    "message": body,
                },
            )

    # Email notification
    if channels.get("email", True):
        for email in recipients.get("emails", []):
            send_email_task.delay(
                to=email,
                subject=subject,
                body=body,
                html_body=f"<p>{body.replace(chr(10), '<br>')}</p>",
            )

    return {"status": "queued", "kpi": kpi_name, "value": str(current_value)}
