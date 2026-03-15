"""Celery tasks for training LMS — certification expiry checks."""

from app.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger("tasks.training")


@celery_app.task(name="app.tasks.training_tasks.check_expiring_certifications")  # type: ignore[untyped-decorator]
def check_expiring_certifications() -> dict[str, object]:
    """Weekly task: notify users whose training certifications are expiring soon.

    Schedule: run every Monday at 09:00 via Celery Beat.

    Returns:
        Summary dict with count of notified enrollments.
    """
    import asyncio
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.core.database import get_db_context
    from app.models.training import EnrollmentStatus, TrainingCourse, TrainingEnrollment
    from app.tasks.notifications import send_email_task

    async def _check() -> dict[str, object]:
        async with get_db_context() as db:
            now = datetime.now(UTC)
            thresholds = [14, 30]
            notified_total = 0

            for days in thresholds:
                cutoff = now + timedelta(days=days)
                lower = now + timedelta(days=days - 1)

                result = await db.execute(
                    select(TrainingEnrollment)
                    .join(TrainingCourse)
                    .where(
                        TrainingEnrollment.is_deleted == False,  # noqa: E712
                        TrainingEnrollment.status == EnrollmentStatus.COMPLETED,
                        TrainingEnrollment.expiry_date.is_not(None),
                        TrainingEnrollment.expiry_date <= cutoff,
                        TrainingEnrollment.expiry_date > lower,
                    )
                )
                expiring = result.scalars().all()

                for enrollment in expiring:
                    logger.info(
                        "Certification expiring soon",
                        enrollment_id=str(enrollment.id),
                        user_id=str(enrollment.user_id),
                        days=days,
                    )
                    send_email_task.delay(
                        to=f"user-{enrollment.user_id}@company.local",
                        subject=f"[OpenQHSE] Tu certificación vence en {days} días",
                        template="certification_expiry_warning",
                        context={
                            "enrollment_id": str(enrollment.id),
                            "user_id": str(enrollment.user_id),
                            "course_id": str(enrollment.course_id),
                            "expiry_date": enrollment.expiry_date.isoformat() if enrollment.expiry_date else "",
                            "days_remaining": days,
                        },
                    )
                    notified_total += 1

            return {"notified": notified_total, "checked_at": now.isoformat()}

    return asyncio.get_event_loop().run_until_complete(_check())


@celery_app.task(name="app.tasks.training_tasks.auto_expire_certifications")  # type: ignore[untyped-decorator]
def auto_expire_certifications() -> dict[str, object]:
    """Daily task: mark expired enrollments as EXPIRED status.

    Returns:
        Count of updated enrollments.
    """
    import asyncio
    from datetime import UTC, datetime

    from sqlalchemy import select

    from app.core.database import get_db_context
    from app.models.training import EnrollmentStatus, TrainingEnrollment

    async def _expire() -> dict[str, object]:
        async with get_db_context() as db:
            now = datetime.now(UTC)
            result = await db.execute(
                select(TrainingEnrollment).where(
                    TrainingEnrollment.is_deleted == False,  # noqa: E712
                    TrainingEnrollment.status == EnrollmentStatus.COMPLETED,
                    TrainingEnrollment.expiry_date.is_not(None),
                    TrainingEnrollment.expiry_date < now,
                )
            )
            expired_enrollments = result.scalars().all()
            count = 0
            for enrollment in expired_enrollments:
                enrollment.status = EnrollmentStatus.EXPIRED
                enrollment.updated_by = "system"
                count += 1

            if count:
                await db.commit()
            logger.info("Auto-expired certifications", count=count)
            return {"expired": count, "checked_at": now.isoformat()}

    return asyncio.get_event_loop().run_until_complete(_expire())
