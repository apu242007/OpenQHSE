"""Celery tasks for document management — expiry checks and notifications."""

from app.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger("tasks.documents")


@celery_app.task(name="app.tasks.document_tasks.check_expiring_documents")
def check_expiring_documents() -> dict:  # type: ignore[type-arg]
    """Weekly task: find documents expiring within 30/60/90 days and notify owners.

    Schedule: run every Monday at 08:00 via Celery Beat.

    Returns:
        Summary dict with counts of notified documents.
    """
    import asyncio

    from sqlalchemy import select

    from app.core.database import get_db_context
    from app.models.document import Document, DocumentStatus
    from app.tasks.notifications import send_email_task

    from datetime import UTC, datetime, timedelta

    async def _check() -> dict:  # type: ignore[type-arg]
        async with get_db_context() as db:
            now = datetime.now(UTC)
            # Notify at 30, 60, and 90-day thresholds
            thresholds = [30, 60, 90]
            notified_total = 0

            for days in thresholds:
                cutoff = now + timedelta(days=days)
                lower = now + timedelta(days=days - 1)

                result = await db.execute(
                    select(Document).where(
                        Document.is_deleted == False,  # noqa: E712
                        Document.status == DocumentStatus.APPROVED,
                        Document.expiry_date.is_not(None),
                        Document.expiry_date <= cutoff,
                        Document.expiry_date > lower,
                    )
                )
                expiring = result.scalars().all()

                for doc in expiring:
                    logger.info(
                        "Document expiring soon",
                        document_id=str(doc.id),
                        code=doc.code,
                        days=days,
                    )
                    send_email_task.delay(
                        to=f"owner-{doc.owner_id}@company.local",
                        subject=f"[OpenQHSE] Documento por vencer en {days} días: {doc.code}",
                        template="document_expiry_warning",
                        context={
                            "document_code": doc.code,
                            "document_title": doc.title,
                            "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else "",
                            "days_remaining": days,
                            "owner_id": str(doc.owner_id),
                        },
                    )
                    notified_total += 1

            return {"notified": notified_total, "checked_at": now.isoformat()}

    return asyncio.get_event_loop().run_until_complete(_check())
