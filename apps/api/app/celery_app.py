"""Celery application con celery-redbeat (Redis-backed beat scheduler).

IMPORTANTE:
- NO usar --schedule en celery beat (el schedule de filesystem se pierde en restart)
- celery-redbeat persiste el schedule en Redis (REDBEAT_REDIS_URL, DB 3)
- El comando correcto: celery -A app.celery_app beat -l info  (sin --schedule)
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "openqhse",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    # ── Serialización ─────────────────────────────────────
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # ── Tiempo ────────────────────────────────────────────
    timezone="UTC",
    enable_utc=True,
    # ── Comportamiento ────────────────────────────────────
    task_track_started=True,
    task_time_limit=600,          # 10 min hard limit
    task_soft_time_limit=540,     # 9 min soft limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,          # Acknowledge después de completar (más seguro)
    # ── Routing por queues ────────────────────────────────
    task_routes={
        "app.tasks.notifications.*": {"queue": "notifications"},
        "app.tasks.reports.*": {"queue": "reports"},
        "app.tasks.ai.*": {"queue": "ai"},
        "app.tasks.document_tasks.*": {"queue": "default"},
        "app.tasks.training_tasks.*": {"queue": "default"},
        "app.tasks.action_tasks.*": {"queue": "default"},
        "app.tasks.kpi_tasks.*": {"queue": "default"},
    },
    # ── celery-redbeat: Redis-backed beat scheduler ───────
    # NO filesystem schedule (/tmp se pierde en restart de container)
    beat_scheduler="redbeat.RedBeatScheduler",
    redbeat_redis_url=settings.redbeat_redis_url,
    redbeat_lock_timeout=150,  # 2.5 min — mayor que el interval más corto
    # ── Beat schedule (persistido en Redis via redbeat) ───
    beat_schedule={
        # Documentos que vencen
        "check-expiring-documents-weekly": {
            "task": "app.tasks.document_tasks.check_expiring_documents",
            "schedule": crontab(hour=7, minute=0, day_of_week=1),  # Lunes 07:00 UTC
        },
        # Certificaciones de capacitación
        "check-expiring-certifications-weekly": {
            "task": "app.tasks.training_tasks.check_expiring_certifications",
            "schedule": crontab(hour=7, minute=30, day_of_week=1),  # Lunes 07:30 UTC
        },
        "auto-expire-certifications-daily": {
            "task": "app.tasks.training_tasks.auto_expire_certifications",
            "schedule": crontab(hour=1, minute=0),  # Diario 01:00 UTC
        },
        # Permisos de trabajo
        "check-permit-expiry-every-30min": {
            "task": "app.tasks.notifications.check_permit_expiry",
            "schedule": crontab(minute="*/30"),  # Cada 30 minutos
        },
        # Acciones correctivas vencidas
        "check-overdue-actions-daily": {
            "task": "app.tasks.notifications.check_overdue_actions",
            "schedule": crontab(hour=8, minute=0),  # Diario 08:00 UTC
        },
        # Inspecciones vencidas
        "check-overdue-inspections-daily": {
            "task": "app.tasks.notifications.check_overdue_inspections",
            "schedule": crontab(hour=8, minute=15),  # Diario 08:15 UTC
        },
        # KPI snapshots mensuales
        "compute-monthly-kpi-snapshots": {
            "task": "app.tasks.kpi_tasks.compute_monthly_snapshots",
            "schedule": crontab(hour=2, minute=0, day_of_month=1),
        },
        # Verificar alertas KPI
        "check-kpi-alerts-hourly": {
            "task": "app.tasks.kpi_tasks.check_kpi_alerts",
            "schedule": crontab(minute=0),  # Cada hora
        },
        # Seguros de contratistas por vencer
        "check-contractor-insurance-weekly": {
            "task": "app.tasks.notifications.check_contractor_insurance",
            "schedule": crontab(hour=9, minute=0, day_of_week=1),  # Lunes 09:00 UTC
        },
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
