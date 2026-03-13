"""CAPA (Corrective / Preventive Actions) endpoints — FASE 5."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.incident import ActionUpdate, CorrectiveAction
from app.schemas.action import (
    ActionCreate,
    ActionListItem,
    ActionResponse,
    ActionStatistics,
    ActionUpdate as ActionUpdateSchema,
    ActionUpdateCreate,
    ActionUpdateResponse,
    BulkAssignRequest,
    EffectivenessCheckRequest,
    EscalationRequest,
    KanbanBoard,
    VerificationRequest,
)
from app.services import action_service

router = APIRouter(prefix="/actions", tags=["CAPA – Corrective Actions"])


# ── Kanban Board ────────────────────────────────────────────


@router.get(
    "/kanban",
    response_model=KanbanBoard,
    summary="Get Kanban board data grouped by status",
)
async def kanban_board(
    db: DBSession,
    current_user: CurrentUser,
) -> KanbanBoard:
    data = await action_service.get_kanban_data(db, current_user.organization_id)
    return KanbanBoard.model_validate(data)


# ── Statistics ──────────────────────────────────────────────


@router.get(
    "/statistics",
    response_model=ActionStatistics,
    summary="Get action statistics",
)
async def statistics(
    db: DBSession,
    current_user: CurrentUser,
) -> ActionStatistics:
    data = await action_service.get_action_statistics(db, current_user.organization_id)
    return ActionStatistics.model_validate(data)


# ── My Actions ──────────────────────────────────────────────


@router.get(
    "/my-actions",
    response_model=list[ActionListItem],
    summary="Actions assigned to current user",
)
async def my_actions(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
) -> list[ActionListItem]:
    actions = await action_service.list_actions(
        db,
        current_user.organization_id,
        assigned_to=current_user.id,
        offset=pagination.offset,
        limit=pagination.page_size,
    )
    return [ActionListItem.model_validate(a) for a in actions]


# ── Overdue Actions ─────────────────────────────────────────


@router.get(
    "/overdue",
    response_model=list[ActionListItem],
    summary="List overdue actions",
)
async def overdue_actions(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
) -> list[ActionListItem]:
    actions = await action_service.list_actions(
        db,
        current_user.organization_id,
        overdue_only=True,
        offset=pagination.offset,
        limit=pagination.page_size,
    )
    return [ActionListItem.model_validate(a) for a in actions]


# ── CRUD ────────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[ActionListItem],
    summary="List corrective actions",
)
async def list_actions(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    action_status: str | None = Query(None, alias="status"),
    priority: str | None = None,
    action_type: str | None = Query(None, alias="type"),
    assigned_to: UUID | None = None,
) -> list[ActionListItem]:
    actions = await action_service.list_actions(
        db,
        current_user.organization_id,
        status=action_status,
        priority=priority,
        assigned_to=assigned_to,
        action_type=action_type,
        offset=pagination.offset,
        limit=pagination.page_size,
    )
    return [ActionListItem.model_validate(a) for a in actions]


@router.post(
    "",
    response_model=ActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a corrective action",
)
async def create_action(
    body: ActionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ActionResponse:
    action = await action_service.create_action(
        db,
        current_user.organization_id,
        current_user.id,
        title=body.title,
        description=body.description,
        action_type=body.action_type,
        priority=body.priority,
        due_date=body.due_date,
        assigned_to_id=body.assigned_to_id,
        incident_id=body.incident_id,
        finding_id=body.finding_id,
    )
    return ActionResponse.model_validate(action)


@router.get(
    "/{action_id}",
    response_model=ActionResponse,
    summary="Get action detail",
)
async def get_action(
    action_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ActionResponse:
    action = await action_service.get_action(
        db, action_id, current_user.organization_id
    )
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action not found"
        )
    return ActionResponse.model_validate(action)


@router.patch(
    "/{action_id}",
    response_model=ActionResponse,
    summary="Update an action",
)
async def update_action(
    action_id: UUID,
    body: ActionUpdateSchema,
    db: DBSession,
    current_user: CurrentUser,
) -> ActionResponse:
    action = await action_service.get_action(
        db, action_id, current_user.organization_id
    )
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Action not found"
        )
    update_data = body.model_dump(exclude_unset=True)
    updated = await action_service.update_action(
        db, action, current_user.id, update_data
    )
    return ActionResponse.model_validate(updated)


# ── Lifecycle Endpoints ─────────────────────────────────────


@router.post(
    "/{action_id}/assign",
    response_model=ActionResponse,
    summary="Assign action to a user",
)
async def assign_action(
    action_id: UUID,
    assigned_to_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> ActionResponse:
    action = await action_service.get_action(
        db, action_id, manager.organization_id
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    updated = await action_service.update_action(
        db, action, manager.id, {"assigned_to_id": assigned_to_id, "status": "in_progress"}
    )
    await action_service.add_action_update(
        db, action_id, manager.id,
        f"Action assigned. Status → in_progress",
        status_change="in_progress",
    )
    return ActionResponse.model_validate(updated)


@router.post(
    "/{action_id}/progress",
    response_model=ActionUpdateResponse,
    summary="Add a progress update",
)
async def add_progress(
    action_id: UUID,
    body: ActionUpdateCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ActionUpdateResponse:
    action = await action_service.get_action(
        db, action_id, current_user.organization_id
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    if body.status_change:
        await action_service.update_action(
            db, action, current_user.id, {"status": body.status_change}
        )
    entry = await action_service.add_action_update(
        db, action_id, current_user.id,
        body.comment, body.status_change, body.attachments,
    )
    return ActionUpdateResponse.model_validate(entry)


@router.post(
    "/{action_id}/request-verification",
    response_model=ActionResponse,
    summary="Mark action as completed, request verification",
)
async def request_verification(
    action_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ActionResponse:
    action = await action_service.get_action(
        db, action_id, current_user.organization_id
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    updated = await action_service.update_action(
        db, action, current_user.id,
        {"status": "completed", "completed_at": datetime.now(UTC)},
    )
    await action_service.add_action_update(
        db, action_id, current_user.id,
        "Action completed — verification requested",
        status_change="completed",
    )
    return ActionResponse.model_validate(updated)


@router.post(
    "/{action_id}/verify",
    response_model=ActionResponse,
    summary="Verify a completed action",
)
async def verify_action(
    action_id: UUID,
    body: VerificationRequest,
    db: DBSession,
    manager: ManagerUser,
) -> ActionResponse:
    action = await action_service.get_action(
        db, action_id, manager.organization_id
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    if action.status != "completed":
        raise HTTPException(
            status_code=400, detail="Action must be completed before verification"
        )
    new_status = "verified" if body.is_effective else "in_progress"
    updated = await action_service.update_action(
        db, action, manager.id,
        {
            "status": new_status,
            "verification_notes": body.notes,
            "evidence_urls": body.evidence_urls or action.evidence_urls,
        },
    )
    await action_service.add_action_update(
        db, action_id, manager.id,
        f"Verification: {'effective' if body.is_effective else 'not effective — reopened'}",
        status_change=new_status,
    )
    return ActionResponse.model_validate(updated)


@router.post(
    "/{action_id}/escalate",
    response_model=ActionResponse,
    summary="Escalate an overdue or stuck action",
)
async def escalate_action(
    action_id: UUID,
    body: EscalationRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> ActionResponse:
    action = await action_service.get_action(
        db, action_id, current_user.organization_id
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    update_data: dict[str, object] = {"priority": "critical"}
    if body.escalate_to_id:
        update_data["assigned_to_id"] = body.escalate_to_id
    updated = await action_service.update_action(
        db, action, current_user.id, update_data
    )
    await action_service.add_action_update(
        db, action_id, current_user.id,
        f"Escalated: {body.reason}",
        status_change=None,
    )
    return ActionResponse.model_validate(updated)


@router.post(
    "/{action_id}/effectiveness-check",
    response_model=ActionResponse,
    summary="Perform effectiveness check on verified action",
)
async def effectiveness_check(
    action_id: UUID,
    body: EffectivenessCheckRequest,
    db: DBSession,
    manager: ManagerUser,
) -> ActionResponse:
    action = await action_service.get_action(
        db, action_id, manager.organization_id
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    new_status = "verified" if body.is_effective else ("open" if body.re_open else "in_progress")
    updated = await action_service.update_action(
        db, action, manager.id, {"status": new_status}
    )
    await action_service.add_action_update(
        db, action_id, manager.id,
        f"Effectiveness check: {'effective' if body.is_effective else 'not effective'}. {body.notes}",
        status_change=new_status,
    )
    return ActionResponse.model_validate(updated)


# ── Timeline ────────────────────────────────────────────────


@router.get(
    "/{action_id}/timeline",
    response_model=list[ActionUpdateResponse],
    summary="Get action update timeline",
)
async def get_timeline(
    action_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[ActionUpdateResponse]:
    updates = await action_service.get_action_timeline(db, action_id)
    return [ActionUpdateResponse.model_validate(u) for u in updates]


# ── Bulk Operations ─────────────────────────────────────────


@router.post(
    "/bulk-assign",
    response_model=list[ActionResponse],
    summary="Bulk assign actions",
)
async def bulk_assign(
    body: BulkAssignRequest,
    db: DBSession,
    manager: ManagerUser,
) -> list[ActionResponse]:
    results = []
    for aid in body.action_ids:
        action = await action_service.get_action(
            db, aid, manager.organization_id
        )
        if action:
            updated = await action_service.update_action(
                db, action, manager.id,
                {"assigned_to_id": body.assigned_to_id},
            )
            results.append(ActionResponse.model_validate(updated))
    return results
