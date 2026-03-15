"""Notification event handlers.

Each handler maps a platform *event* to the list of recipients and
the data payload that the NotificationService needs to render templates
and dispatch across channels.

These handlers are called from Celery tasks or directly from
application services when an event occurs.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from app.core.logging import get_logger
from app.models.notification import (
    NotificationChannel,
    NotificationEvent,
    NotificationPriority,
)
from app.models.user import User, UserRole
from app.services.notification_service import NotificationService

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger("notification_handlers")


# ═══════════════════════════════════════════════════════════════
# Helper: role-based recipient lookup
# ═══════════════════════════════════════════════════════════════


async def _users_by_roles(
    db: AsyncSession,
    organization_id: str,
    roles: list[UserRole],
) -> list[str]:
    """Return user-id strings for all active users in the org with given roles."""
    result = await db.execute(
        select(User.id).where(
            User.organization_id == organization_id,
            User.role.in_(roles),
            User.status == "active",
            User.is_deleted == False,  # noqa: E712
        )
    )
    return [str(uid) for uid in result.scalars().all()]


async def _user_supervisor(
    db: AsyncSession,
    organization_id: str,
) -> list[str]:
    """Return supervisor + manager user-ids for the organization."""
    return await _users_by_roles(db, organization_id, [UserRole.SUPERVISOR, UserRole.MANAGER])


async def _hse_managers(
    db: AsyncSession,
    organization_id: str,
) -> list[str]:
    """Return HSE manager / org admin user-ids."""
    return await _users_by_roles(db, organization_id, [UserRole.MANAGER, UserRole.ORG_ADMIN])


async def _senior_management(
    db: AsyncSession,
    organization_id: str,
) -> list[str]:
    """Return senior management (org_admin + super_admin)."""
    return await _users_by_roles(db, organization_id, [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN])


# ═══════════════════════════════════════════════════════════════
# Event handlers
# ═══════════════════════════════════════════════════════════════


async def handle_incident_reported(
    db: AsyncSession,
    incident_data: dict[str, Any],
) -> None:
    """INCIDENT_REPORTED → supervisor + HSE manager."""
    org_id = incident_data["organization_id"]
    supervisors = await _user_supervisor(db, org_id)
    hse = await _hse_managers(db, org_id)
    recipients = list(set(supervisors + hse))

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.INCIDENT_REPORTED,
        entity_id=incident_data["id"],
        recipients=recipients,
        data=incident_data,
        priority=NotificationPriority.HIGH,
        entity_type="incident",
    )


async def handle_incident_critical(
    db: AsyncSession,
    incident_data: dict[str, Any],
) -> None:
    """INCIDENT_CRITICAL → gerencia inmediatamente."""
    org_id = incident_data["organization_id"]
    management = await _senior_management(db, org_id)
    hse = await _hse_managers(db, org_id)
    recipients = list(set(management + hse))

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.INCIDENT_CRITICAL,
        entity_id=incident_data["id"],
        recipients=recipients,
        channels=[
            NotificationChannel.IN_APP,
            NotificationChannel.EMAIL,
            NotificationChannel.WHATSAPP,
            NotificationChannel.PUSH,
        ],
        data=incident_data,
        priority=NotificationPriority.CRITICAL,
        entity_type="incident",
    )


async def handle_action_assigned(
    db: AsyncSession,
    action_data: dict[str, Any],
) -> None:
    """ACTION_ASSIGNED → responsible user."""
    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.ACTION_ASSIGNED,
        entity_id=action_data["id"],
        recipients=[action_data["assignee_id"]],
        data=action_data,
        priority=NotificationPriority.NORMAL,
        entity_type="corrective_action",
    )


async def handle_action_overdue(
    db: AsyncSession,
    action_data: dict[str, Any],
) -> None:
    """ACTION_OVERDUE → responsible + supervisor."""
    org_id = action_data["organization_id"]
    supervisors = await _user_supervisor(db, org_id)
    recipients = list(set([action_data["assignee_id"]] + supervisors))

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.ACTION_OVERDUE,
        entity_id=action_data["id"],
        recipients=recipients,
        data=action_data,
        priority=NotificationPriority.HIGH,
        entity_type="corrective_action",
    )


async def handle_action_escalated(
    db: AsyncSession,
    action_data: dict[str, Any],
) -> None:
    """ACTION_ESCALATED → next level up."""
    org_id = action_data["organization_id"]
    management = await _hse_managers(db, org_id)
    recipients = list(set(management))

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.ACTION_ESCALATED,
        entity_id=action_data["id"],
        recipients=recipients,
        channels=[
            NotificationChannel.IN_APP,
            NotificationChannel.EMAIL,
            NotificationChannel.PUSH,
        ],
        data=action_data,
        priority=NotificationPriority.HIGH,
        entity_type="corrective_action",
    )


async def handle_inspection_overdue(
    db: AsyncSession,
    inspection_data: dict[str, Any],
) -> None:
    """INSPECTION_OVERDUE → inspector + supervisor."""
    org_id = inspection_data["organization_id"]
    supervisors = await _user_supervisor(db, org_id)
    inspector_id = inspection_data.get("inspector_id", "")
    recipients = list(set([inspector_id] + supervisors)) if inspector_id else supervisors

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.INSPECTION_OVERDUE,
        entity_id=inspection_data["id"],
        recipients=recipients,
        data=inspection_data,
        priority=NotificationPriority.HIGH,
        entity_type="inspection",
    )


async def handle_permit_pending_approval(
    db: AsyncSession,
    permit_data: dict[str, Any],
) -> None:
    """PERMIT_PENDING_APPROVAL → approver."""
    approver_id = permit_data.get("approver_id")
    if not approver_id:
        logger.warning("No approver_id in permit data, skipping notification")
        return

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.PERMIT_PENDING_APPROVAL,
        entity_id=permit_data["id"],
        recipients=[approver_id],
        data=permit_data,
        priority=NotificationPriority.HIGH,
        entity_type="work_permit",
    )


async def handle_permit_expiring_soon(
    db: AsyncSession,
    permit_data: dict[str, Any],
) -> None:
    """PERMIT_EXPIRING_SOON → requester + supervisor (1h before)."""
    org_id = permit_data["organization_id"]
    supervisors = await _user_supervisor(db, org_id)
    requester = permit_data.get("requester_id", "")
    recipients = list(set([requester] + supervisors)) if requester else supervisors

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.PERMIT_EXPIRING_SOON,
        entity_id=permit_data["id"],
        recipients=recipients,
        channels=[
            NotificationChannel.IN_APP,
            NotificationChannel.EMAIL,
            NotificationChannel.PUSH,
            NotificationChannel.WHATSAPP,
        ],
        data=permit_data,
        priority=NotificationPriority.HIGH,
        entity_type="work_permit",
    )


async def handle_document_review_due(
    db: AsyncSession,
    document_data: dict[str, Any],
) -> None:
    """DOCUMENT_REVIEW_DUE → document owner."""
    owner_id = document_data.get("owner_id")
    if not owner_id:
        logger.warning("No owner_id in document data, skipping notification")
        return

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.DOCUMENT_REVIEW_DUE,
        entity_id=document_data["id"],
        recipients=[owner_id],
        data=document_data,
        priority=NotificationPriority.NORMAL,
        entity_type="document",
    )


async def handle_training_expiring(
    db: AsyncSession,
    training_data: dict[str, Any],
) -> None:
    """TRAINING_EXPIRING → employee + supervisor."""
    org_id = training_data["organization_id"]
    supervisors = await _user_supervisor(db, org_id)
    employee_id = training_data.get("employee_id", "")
    recipients = list(set([employee_id] + supervisors)) if employee_id else supervisors

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.TRAINING_EXPIRING,
        entity_id=training_data["id"],
        recipients=recipients,
        data=training_data,
        priority=NotificationPriority.NORMAL,
        entity_type="training",
    )


async def handle_high_risk_detected(
    db: AsyncSession,
    risk_data: dict[str, Any],
) -> None:
    """HIGH_RISK_DETECTED → HSE manager."""
    org_id = risk_data["organization_id"]
    hse = await _hse_managers(db, org_id)

    svc = NotificationService(db)
    await svc.notify(
        event_type=NotificationEvent.HIGH_RISK_DETECTED,
        entity_id=risk_data["id"],
        recipients=hse,
        channels=[
            NotificationChannel.IN_APP,
            NotificationChannel.EMAIL,
            NotificationChannel.PUSH,
        ],
        data=risk_data,
        priority=NotificationPriority.HIGH,
        entity_type="risk",
    )


# ═══════════════════════════════════════════════════════════════
# Handler registry (for dynamic dispatch from Celery)
# ═══════════════════════════════════════════════════════════════

EVENT_HANDLER_MAP: dict[str, Any] = {
    NotificationEvent.INCIDENT_REPORTED: handle_incident_reported,
    NotificationEvent.INCIDENT_CRITICAL: handle_incident_critical,
    NotificationEvent.ACTION_ASSIGNED: handle_action_assigned,
    NotificationEvent.ACTION_OVERDUE: handle_action_overdue,
    NotificationEvent.ACTION_ESCALATED: handle_action_escalated,
    NotificationEvent.INSPECTION_OVERDUE: handle_inspection_overdue,
    NotificationEvent.PERMIT_PENDING_APPROVAL: handle_permit_pending_approval,
    NotificationEvent.PERMIT_EXPIRING_SOON: handle_permit_expiring_soon,
    NotificationEvent.DOCUMENT_REVIEW_DUE: handle_document_review_due,
    NotificationEvent.TRAINING_EXPIRING: handle_training_expiring,
    NotificationEvent.HIGH_RISK_DETECTED: handle_high_risk_detected,
}
