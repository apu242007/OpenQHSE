"""CAPA service — business logic for corrective & preventive actions."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.models.incident import ActionUpdate, CorrectiveAction

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


async def list_actions(
    db: AsyncSession,
    organization_id: UUID,
    *,
    status: str | None = None,
    priority: str | None = None,
    assigned_to: UUID | None = None,
    action_type: str | None = None,
    overdue_only: bool = False,
    offset: int = 0,
    limit: int = 25,
) -> list[CorrectiveAction]:
    query = select(CorrectiveAction).where(
        CorrectiveAction.organization_id == organization_id,
        CorrectiveAction.is_deleted == False,  # noqa: E712
    )
    if status:
        query = query.where(CorrectiveAction.status == status)
    if priority:
        query = query.where(CorrectiveAction.priority == priority)
    if assigned_to:
        query = query.where(CorrectiveAction.assigned_to_id == assigned_to)
    if action_type:
        query = query.where(CorrectiveAction.action_type == action_type)
    if overdue_only:
        query = query.where(
            CorrectiveAction.due_date < datetime.now(UTC),
            CorrectiveAction.status.notin_(["completed", "verified"]),
        )

    result = await db.execute(query.order_by(CorrectiveAction.created_at.desc()).offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_action(db: AsyncSession, action_id: UUID, organization_id: UUID) -> CorrectiveAction | None:
    result = await db.execute(
        select(CorrectiveAction).where(
            CorrectiveAction.id == action_id,
            CorrectiveAction.organization_id == organization_id,
        )
    )
    return result.scalar_one_or_none()


async def create_action(
    db: AsyncSession,
    organization_id: UUID,
    user_id: UUID,
    **kwargs: object,
) -> CorrectiveAction:
    action = CorrectiveAction(
        organization_id=organization_id,
        created_by=str(user_id),
        **kwargs,
    )
    db.add(action)
    await db.flush()
    await db.refresh(action)
    return action


async def update_action(
    db: AsyncSession,
    action: CorrectiveAction,
    user_id: UUID,
    update_data: dict[str, object],
) -> CorrectiveAction:
    for field, value in update_data.items():
        setattr(action, field, value)
    action.updated_by = str(user_id)
    await db.flush()
    await db.refresh(action)
    return action


async def add_action_update(
    db: AsyncSession,
    action_id: UUID,
    user_id: UUID,
    comment: str,
    status_change: str | None = None,
    attachments: dict | None = None,
) -> ActionUpdate:
    entry = ActionUpdate(
        action_id=action_id,
        user_id=user_id,
        comment=comment,
        status_change=status_change,
        attachments=attachments,
        created_by=str(user_id),
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def get_action_timeline(db: AsyncSession, action_id: UUID) -> list[ActionUpdate]:
    result = await db.execute(
        select(ActionUpdate).where(ActionUpdate.action_id == action_id).order_by(ActionUpdate.created_at.asc())
    )
    return list(result.scalars().all())


async def get_kanban_data(db: AsyncSession, organization_id: UUID) -> dict[str, object]:
    """Build Kanban board data grouped by status."""
    statuses = [
        ("open", "Abierto"),
        ("in_progress", "En progreso"),
        ("completed", "Completado"),
        ("verified", "Verificado"),
        ("overdue", "Vencido"),
    ]
    columns = []
    total = 0

    for status_key, label in statuses:
        query = select(CorrectiveAction).where(
            CorrectiveAction.organization_id == organization_id,
            CorrectiveAction.is_deleted == False,  # noqa: E712
        )
        if status_key == "overdue":
            query = query.where(
                CorrectiveAction.due_date < datetime.now(UTC),
                CorrectiveAction.status.notin_(["completed", "verified"]),
            )
        else:
            query = query.where(CorrectiveAction.status == status_key)

        result = await db.execute(query.order_by(CorrectiveAction.due_date.asc().nulls_last()).limit(50))
        items = list(result.scalars().all())
        columns.append(
            {
                "status": status_key,
                "label": label,
                "count": len(items),
                "items": items,
            }
        )
        total += len(items)

    return {"columns": columns, "total": total}


async def get_action_statistics(db: AsyncSession, organization_id: UUID) -> dict[str, object]:
    """Compute action statistics for the organization."""
    base = select(CorrectiveAction).where(
        CorrectiveAction.organization_id == organization_id,
        CorrectiveAction.is_deleted == False,  # noqa: E712
    )
    result = await db.execute(base)
    actions = list(result.scalars().all())

    now = datetime.now(UTC)
    total = len(actions)
    open_count = sum(1 for a in actions if a.status == "open")
    in_progress = sum(1 for a in actions if a.status == "in_progress")
    completed = sum(1 for a in actions if a.status == "completed")
    verified = sum(1 for a in actions if a.status == "verified")
    overdue = sum(1 for a in actions if a.due_date and a.due_date < now and a.status not in ("completed", "verified"))

    by_priority: dict[str, int] = {}
    by_type: dict[str, int] = {}
    total_days = 0.0
    closed_count = 0

    for a in actions:
        by_priority[a.priority] = by_priority.get(a.priority, 0) + 1
        by_type[a.action_type] = by_type.get(a.action_type, 0) + 1
        if a.completed_at and a.created_at:
            delta = (a.completed_at - a.created_at).total_seconds() / 86400
            total_days += delta
            closed_count += 1

    avg_days = total_days / closed_count if closed_count else 0.0
    overdue_rate = (overdue / total * 100) if total else 0.0

    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "completed": completed,
        "verified": verified,
        "overdue": overdue,
        "by_priority": by_priority,
        "by_type": by_type,
        "avg_days_to_close": round(avg_days, 1),
        "overdue_rate": round(overdue_rate, 1),
    }
