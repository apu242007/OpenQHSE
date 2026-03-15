"""Celery tasks: KPI snapshot computation and threshold alerts.

Schedule (defined in celery_app.py):
- compute_monthly_snapshots: 1st of each month at 02:00 UTC
- check_kpi_alerts: every hour
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any

from celery import shared_task  # pyright: ignore[reportMissingTypeStubs]
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────


def _sync_session() -> Session:
    """Return a synchronous SQLAlchemy session for use in Celery tasks."""
    from sqlalchemy import create_engine

    from app.core.config import get_settings

    settings = get_settings()
    # Celery tasks run in a regular (sync) context — use psycopg2 driver.
    sync_url = settings.effective_database_url.replace("+asyncpg", "")
    engine = create_engine(sync_url, pool_pre_ping=True, pool_size=2, max_overflow=0)
    return Session(engine)


# ── Tasks ──────────────────────────────────────────────────────────────────


@shared_task(  # type: ignore[untyped-decorator]
    name="app.tasks.kpi_tasks.compute_monthly_snapshots",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def compute_monthly_snapshots(self: Any) -> dict[str, object]:
    """Pre-compute KPI snapshots for all active organizations for last month.

    Calculates TRIR, LTIF, DART, leading indicators (inspection compliance,
    action closure rate) and stores them in kpi_snapshots.

    Called on the 1st of each month at 02:00 UTC (covers the previous month).
    """

    today = date.today()
    # Compute for the previous month
    first_of_this_month = today.replace(day=1)
    last_month = first_of_this_month - timedelta(days=1)
    period = last_month.strftime("%Y-%m")

    computed = 0
    errors = 0

    with _sync_session() as session:
        # Get all active organization IDs
        orgs = session.execute(text("SELECT id FROM organizations WHERE is_deleted = false")).fetchall()

        for (org_id,) in orgs:
            try:
                _compute_org_kpi(session, str(org_id), period)
                computed += 1
            except Exception as exc:
                logger.exception("KPI compute failed for org %s period %s: %s", org_id, period, exc)
                errors += 1

        session.commit()

    logger.info("KPI snapshots: computed=%d errors=%d period=%s", computed, errors, period)
    return {"period": period, "computed": computed, "errors": errors}


def _compute_org_kpi(session: Session, org_id: str, period: str) -> None:
    """Compute and upsert KPI snapshot for one org + period."""

    year, month = map(int, period.split("-"))

    period_start = datetime(year, month, 1, tzinfo=UTC)
    period_end = datetime(year + 1, 1, 1, tzinfo=UTC) if month == 12 else datetime(year, month + 1, 1, tzinfo=UTC)

    # ── Exposure hours ─────────────────────────────────────────────────────
    hours_row = session.execute(
        text("""
            SELECT COALESCE(SUM(hours_worked), 0)
            FROM exposure_hours
            WHERE organization_id = :org_id
              AND period_start >= :start AND period_start < :end
        """),
        {"org_id": org_id, "start": period_start, "end": period_end},
    ).fetchone()
    total_hours = int(hours_row[0]) if hours_row else 0

    # ── Recordable incidents ───────────────────────────────────────────────
    incident_row = session.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE is_recordable = true)                        AS recordable,
                COUNT(*) FILTER (WHERE severity IN ('fatal','lti'))                 AS lti,
                COALESCE(SUM(days_lost) FILTER (WHERE days_lost IS NOT NULL), 0)   AS days_lost
            FROM incidents
            WHERE organization_id = :org_id
              AND occurred_at >= :start AND occurred_at < :end
              AND is_deleted = false
        """),
        {"org_id": org_id, "start": period_start, "end": period_end},
    ).fetchone()

    recordable = int(incident_row[0]) if incident_row else 0
    lti_count = int(incident_row[1]) if incident_row else 0
    days_lost = int(incident_row[2]) if incident_row else 0

    # ── OSHA rates (per 200,000 hours) ────────────────────────────────────
    base = total_hours / 200_000 if total_hours > 0 else None
    trir = round(recordable / base, 2) if base else None
    ltif = round(lti_count / base, 2) if base else None
    dart = round(days_lost / base, 2) if base else None

    # ── Leading indicators ─────────────────────────────────────────────────
    insp_row = session.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE status = 'completed')   AS completed,
                COUNT(*) FILTER (WHERE status = 'overdue')     AS overdue
            FROM inspections
            WHERE organization_id = :org_id
              AND scheduled_date >= :start AND scheduled_date < :end
              AND is_deleted = false
        """),
        {"org_id": org_id, "start": period_start, "end": period_end},
    ).fetchone()
    insp_completed = int(insp_row[0]) if insp_row else 0
    insp_overdue = int(insp_row[1]) if insp_row else 0

    action_row = session.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE status = 'open')                  AS open,
                COUNT(*) FILTER (WHERE status = 'closed')                AS closed,
                COUNT(*) FILTER (WHERE status = 'open' AND due_date < :end) AS overdue
            FROM corrective_actions
            WHERE organization_id = :org_id
              AND is_deleted = false
        """),
        {"org_id": org_id, "end": period_end},
    ).fetchone()
    actions_open = int(action_row[0]) if action_row else 0
    actions_closed = int(action_row[1]) if action_row else 0
    actions_overdue = int(action_row[2]) if action_row else 0

    # ── Upsert snapshot ────────────────────────────────────────────────────
    existing = session.execute(
        text("SELECT id FROM kpi_snapshots WHERE organization_id = :org AND period = :p AND site_id IS NULL"),
        {"org": org_id, "p": period},
    ).fetchone()

    now_utc = datetime.now(UTC)

    if existing:
        session.execute(
            text("""
                UPDATE kpi_snapshots SET
                    trir = :trir, ltif = :ltif, dart = :dart,
                    total_hours_worked = :hours, total_incidents = :incidents,
                    lti_count = :lti, inspections_completed = :insp_c,
                    inspections_overdue = :insp_o, actions_open = :act_o,
                    actions_closed = :act_c, actions_overdue = :act_ov,
                    calculated_at = :now, updated_at = :now
                WHERE id = :id
            """),
            {
                "id": str(existing[0]),
                "trir": trir,
                "ltif": ltif,
                "dart": dart,
                "hours": total_hours,
                "incidents": recordable,
                "lti": lti_count,
                "insp_c": insp_completed,
                "insp_o": insp_overdue,
                "act_o": actions_open,
                "act_c": actions_closed,
                "act_ov": actions_overdue,
                "now": now_utc,
            },
        )
    else:
        session.execute(
            text("""
                INSERT INTO kpi_snapshots (
                    id, organization_id, site_id, period,
                    trir, ltif, dart,
                    total_hours_worked, total_incidents, lti_count,
                    inspections_completed, inspections_overdue,
                    actions_open, actions_closed, actions_overdue,
                    calculated_at, created_at, updated_at,
                    is_deleted
                ) VALUES (
                    gen_random_uuid(), :org, NULL, :p,
                    :trir, :ltif, :dart,
                    :hours, :incidents, :lti,
                    :insp_c, :insp_o,
                    :act_o, :act_c, :act_ov,
                    :now, :now, :now,
                    false
                )
            """),
            {
                "org": org_id,
                "p": period,
                "trir": trir,
                "ltif": ltif,
                "dart": dart,
                "hours": total_hours,
                "incidents": recordable,
                "lti": lti_count,
                "insp_c": insp_completed,
                "insp_o": insp_overdue,
                "act_o": actions_open,
                "act_c": actions_closed,
                "act_ov": actions_overdue,
                "now": now_utc,
            },
        )


@shared_task(  # type: ignore[untyped-decorator]
    name="app.tasks.kpi_tasks.check_kpi_alerts",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def check_kpi_alerts(self: Any) -> dict[str, object]:
    """Evaluate KPI threshold alert rules and fire alerts when thresholds are breached.

    Reads KPIAlertRule configurations and compares against the latest KPISnapshot.
    Creates KPIAlert instances and queues notification tasks for recipients.
    """
    alerts_fired = 0
    with _sync_session() as session:
        today = date.today()
        current_period = today.strftime("%Y-%m")
        previous_period = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")

        # Load all active alert rules
        rules = session.execute(
            text("""
                SELECT r.id, r.organization_id, r.site_id, r.kpi_name,
                       r.condition, r.threshold, r.channels, r.recipients,
                       r.escalation_rules
                FROM kpi_alert_rules r
                WHERE r.is_active = true AND r.is_deleted = false
            """)
        ).fetchall()

        for rule in rules:
            rule_id, org_id, site_id, kpi_name, condition, threshold, channels, recipients, escalation = rule

            # Map KPI name to snapshot column (lowercase)
            kpi_col = kpi_name.lower()
            allowed_cols = {
                "trir",
                "ltif",
                "dart",
                "far",
                "severity_rate",
                "actions_overdue",
                "actions_open",
                "inspections_overdue",
                "training_compliance_rate",
                "permit_compliance_rate",
            }
            if kpi_col not in allowed_cols:
                logger.warning("Unknown KPI column: %s — skipping rule %s", kpi_col, rule_id)
                continue

            site_filter = "AND site_id = :site_id" if site_id else "AND site_id IS NULL"
            row = session.execute(
                text(f"""
                    SELECT {kpi_col}
                    FROM kpi_snapshots
                    WHERE organization_id = :org AND period IN (:cur, :prev)
                      {site_filter} AND {kpi_col} IS NOT NULL
                    ORDER BY period DESC
                    LIMIT 1
                """),
                {
                    "org": str(org_id),
                    "cur": current_period,
                    "prev": previous_period,
                    **({"site_id": str(site_id)} if site_id else {}),
                },
            ).fetchone()

            if not row or row[0] is None:
                continue

            current_value = float(row[0])

            # Evaluate condition (using AlertCondition enum values)
            cond = condition.upper()
            breached = (
                (cond == "GREATER_THAN" and current_value > threshold)
                or (cond == "GREATER_THAN_OR_EQUAL" and current_value >= threshold)
                or (cond == "LESS_THAN" and current_value < threshold)
                or (cond == "LESS_THAN_OR_EQUAL" and current_value <= threshold)
                or (cond == "EQUALS" and abs(current_value - threshold) < 0.0001)
            )

            if not breached:
                continue

            # Deduplication: don't create a duplicate alert for the same rule+period
            existing_alert = session.execute(
                text("""
                    SELECT id FROM kpi_alerts
                    WHERE rule_id = :rule AND period = :p AND status IN ('TRIGGERED', 'ACKNOWLEDGED')
                """),
                {"rule": str(rule_id), "p": current_period},
            ).fetchone()

            if existing_alert:
                continue

            now_utc = datetime.now(UTC)
            logger.warning(
                "KPI alert rule fired: org=%s kpi=%s value=%.2f %s %.2f",
                org_id,
                kpi_name,
                current_value,
                condition,
                threshold,
            )
            alerts_fired += 1

            # Insert KPIAlert record
            session.execute(
                text("""
                    INSERT INTO kpi_alerts (
                        id, organization_id, site_id, rule_id,
                        kpi_name, condition, threshold_value, current_value, period,
                        status, triggered_at, notification_channels, escalation_rules,
                        escalation_count, created_at, updated_at, is_deleted
                    ) VALUES (
                        gen_random_uuid(), :org, :site, :rule,
                        :kpi, :cond, :thresh, :val, :period,
                        'TRIGGERED', :now, :channels, :escalation,
                        0, :now, :now, false
                    )
                """),
                {
                    "org": str(org_id),
                    "site": str(site_id) if site_id else None,
                    "rule": str(rule_id),
                    "kpi": kpi_name,
                    "cond": condition,
                    "thresh": threshold,
                    "val": current_value,
                    "period": current_period,
                    "now": now_utc,
                    "channels": channels or {},
                    "escalation": escalation or {},
                },
            )

            # Queue notification task (fire-and-forget)
            from app.tasks.notifications import send_kpi_alert_notification

            send_kpi_alert_notification.delay(  # pyright: ignore[reportFunctionMemberAccess]
                str(org_id),
                kpi_name,
                current_value,
                condition,
                threshold,
                recipients or {},
                channels or {},
            )

        session.commit()

    logger.info("KPI alert check complete — alerts_fired=%d", alerts_fired)
    return {"alerts_fired": alerts_fired}
