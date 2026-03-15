"""Celery tasks for CAPA module — overdue checks, escalation, reminders."""

from datetime import UTC, datetime, timedelta

from celery import shared_task


@shared_task(name="actions.check_overdue", queue="notifications")  # type: ignore[misc, untyped-decorator]
def check_overdue_actions() -> dict[str, int]:
    """
    Periodic task: find actions past due_date that aren't completed/verified.
    Sends notifications to assignees and managers.
    Runs every hour via Celery Beat.
    """
    from app.core.database import sync_session_factory
    from app.models.incident import CorrectiveAction
    from app.models.notification import Notification

    now = datetime.now(UTC)
    count = 0

    with sync_session_factory() as db:
        from sqlalchemy import select

        result = db.execute(
            select(CorrectiveAction).where(
                CorrectiveAction.due_date < now,
                CorrectiveAction.status.notin_(["completed", "verified"]),
                CorrectiveAction.is_deleted == False,  # noqa: E712
            )
        )
        overdue = result.scalars().all()

        for action in overdue:
            if action.assigned_to_id:
                notif = Notification(
                    user_id=action.assigned_to_id,
                    title="Acción correctiva vencida",
                    message=f'La acción "{action.title}" ha vencido. Fecha límite: {action.due_date}',
                    notification_type="action_overdue",
                    reference_id=str(action.id),
                    reference_type="corrective_action",
                    created_by="system",
                )
                db.add(notif)
                count += 1

        db.commit()

    return {"overdue_notifications_sent": count}


@shared_task(name="actions.send_reminders", queue="notifications")  # type: ignore[misc, untyped-decorator]
def send_due_date_reminders() -> dict[str, int]:
    """
    Periodic task: remind assignees 48h before due date.
    Runs daily via Celery Beat.
    """
    from app.core.database import sync_session_factory
    from app.models.incident import CorrectiveAction
    from app.models.notification import Notification

    now = datetime.now(UTC)
    reminder_window = now + timedelta(hours=48)
    count = 0

    with sync_session_factory() as db:
        from sqlalchemy import select

        result = db.execute(
            select(CorrectiveAction).where(
                CorrectiveAction.due_date.between(now, reminder_window),
                CorrectiveAction.status.notin_(["completed", "verified"]),
                CorrectiveAction.is_deleted == False,  # noqa: E712
            )
        )
        upcoming = result.scalars().all()

        for action in upcoming:
            if action.assigned_to_id:
                notif = Notification(
                    user_id=action.assigned_to_id,
                    title="Recordatorio: acción próxima a vencer",
                    message=f'La acción "{action.title}" vence en menos de 48h.',
                    notification_type="action_reminder",
                    reference_id=str(action.id),
                    reference_type="corrective_action",
                    created_by="system",
                )
                db.add(notif)
                count += 1

        db.commit()

    return {"reminder_notifications_sent": count}


@shared_task(name="actions.auto_escalate", queue="notifications")  # type: ignore[misc, untyped-decorator]
def auto_escalate_overdue() -> dict[str, int]:
    """
    Periodic task: auto-escalate actions overdue > 7 days.
    Bumps priority to critical.
    Runs daily via Celery Beat.
    """
    from app.core.database import sync_session_factory
    from app.models.incident import CorrectiveAction

    now = datetime.now(UTC)
    threshold = now - timedelta(days=7)
    count = 0

    with sync_session_factory() as db:
        from sqlalchemy import select

        result = db.execute(
            select(CorrectiveAction).where(
                CorrectiveAction.due_date < threshold,
                CorrectiveAction.status.notin_(["completed", "verified"]),
                CorrectiveAction.priority != "critical",
                CorrectiveAction.is_deleted == False,  # noqa: E712
            )
        )
        actions = result.scalars().all()

        for action in actions:
            action.priority = "critical"
            action.updated_by = "system"
            count += 1

        db.commit()

    return {"auto_escalated": count}
