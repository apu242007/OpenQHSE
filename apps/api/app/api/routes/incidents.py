"""Incident management endpoints — complete FASE 4 implementation."""

from __future__ import annotations

import uuid as uuid_mod
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.incident import (
    CorrectiveAction,
    Incident,
    IncidentAttachment,
    IncidentStatus,
    IncidentType,
    IncidentWitness,
)
from app.schemas.incident import (
    AttachmentCreate,
    AttachmentResponse,
    CorrectiveActionCreate,
    CorrectiveActionResponse,
    CorrectiveActionUpdate,
    IncidentCreate,
    IncidentListResponse,
    IncidentResponse,
    IncidentUpdate,
    TimelineEventCreate,
    WitnessCreate,
    WitnessResponse,
)
from app.services.incident_service import (
    classify_incident_severity,
    generate_incident_report,
    get_incident_statistics,
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


def _generate_incident_ref() -> str:
    now = datetime.now(UTC)
    short = uuid_mod.uuid4().hex[:6].upper()
    return f"INC-{now.strftime('%Y%m%d')}-{short}"


# ── Statistics ────────────────────────────────────────────────


@router.get("/statistics", summary="Get incident statistics (TRIR, LTIF, Bird pyramid, etc.)")
async def incident_statistics(
    db: DBSession, current_user: CurrentUser,
    site_id: UUID | None = None, year: int | None = None,
    total_hours_worked: float = Query(500_000, description="Total hours worked for rate calculations"),
) -> dict:
    return await get_incident_statistics(db, current_user.organization_id, site_id, year, total_hours_worked)


# ── CRUD ──────────────────────────────────────────────────────


@router.get("", response_model=IncidentListResponse, summary="List incidents")
async def list_incidents(
    db: DBSession, current_user: CurrentUser, pagination: Pagination,
    status_filter: IncidentStatus | None = Query(None, alias="status"),
    site_id: UUID | None = None, incident_type: IncidentType | None = None,
    severity: str | None = None, date_from: datetime | None = None, date_to: datetime | None = None,
) -> IncidentListResponse:
    base = select(Incident).where(Incident.organization_id == current_user.organization_id, Incident.is_deleted == False)  # noqa: E712
    if status_filter:
        base = base.where(Incident.status == status_filter)
    if site_id:
        base = base.where(Incident.site_id == site_id)
    if incident_type:
        base = base.where(Incident.incident_type == incident_type)
    if severity:
        base = base.where(Incident.severity == severity)
    if date_from:
        base = base.where(Incident.occurred_at >= date_from)
    if date_to:
        base = base.where(Incident.occurred_at <= date_to)
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar() or 0
    result = await db.execute(base.order_by(Incident.occurred_at.desc()).offset(pagination.offset).limit(pagination.page_size))
    return IncidentListResponse(total=total, page=pagination.page, page_size=pagination.page_size, items=[IncidentResponse.model_validate(i) for i in result.scalars().all()])


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED, summary="Report a new incident")
async def create_incident(body: IncidentCreate, db: DBSession, current_user: CurrentUser) -> IncidentResponse:
    # Auto-classify severity if needed
    auto_severity = classify_incident_severity(body.model_dump())
    incident = Incident(
        reference_number=_generate_incident_ref(),
        title=body.title, description=body.description,
        incident_type=body.incident_type, severity=body.severity,
        status=IncidentStatus.REPORTED,
        occurred_at=body.occurred_at, reported_at=datetime.now(UTC),
        location_description=body.location_description,
        gps_latitude=body.gps_latitude, gps_longitude=body.gps_longitude,
        injuries_count=body.injuries_count, fatalities_count=body.fatalities_count,
        immediate_actions=body.immediate_actions, evidence_urls=body.evidence_urls,
        organization_id=current_user.organization_id,
        site_id=body.site_id, area_id=body.area_id,
        reported_by_id=current_user.id, created_by=str(current_user.id),
    )
    db.add(incident)
    await db.flush()
    await db.refresh(incident)
    return IncidentResponse.model_validate(incident)


@router.get("/{incident_id}", response_model=IncidentResponse, summary="Get incident detail")
async def get_incident(incident_id: UUID, db: DBSession, current_user: CurrentUser) -> IncidentResponse:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == current_user.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return IncidentResponse.model_validate(inc)


@router.patch("/{incident_id}", response_model=IncidentResponse, summary="Update an incident")
async def update_incident(incident_id: UUID, body: IncidentUpdate, db: DBSession, manager: ManagerUser) -> IncidentResponse:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == manager.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(inc, field, value)
    inc.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(inc)
    return IncidentResponse.model_validate(inc)


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(incident_id: UUID, db: DBSession, manager: ManagerUser) -> None:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == manager.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.is_deleted = True
    inc.deleted_at = datetime.now(UTC)
    await db.flush()


# ── Lifecycle ─────────────────────────────────────────────────


@router.post("/{incident_id}/assign-investigator", response_model=IncidentResponse)
async def assign_investigator(incident_id: UUID, investigator_id: UUID, db: DBSession, manager: ManagerUser) -> IncidentResponse:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == manager.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.assigned_investigator_id = investigator_id
    inc.status = IncidentStatus.UNDER_INVESTIGATION
    inc.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(inc)
    return IncidentResponse.model_validate(inc)


@router.post("/{incident_id}/submit-investigation", response_model=IncidentResponse)
async def submit_investigation(incident_id: UUID, body: IncidentUpdate, db: DBSession, current_user: CurrentUser) -> IncidentResponse:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == current_user.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inc, field, value)
    inc.status = IncidentStatus.CORRECTIVE_ACTIONS
    inc.updated_by = str(current_user.id)
    await db.flush()
    await db.refresh(inc)
    return IncidentResponse.model_validate(inc)


@router.post("/{incident_id}/close", response_model=IncidentResponse)
async def close_incident(incident_id: UUID, db: DBSession, manager: ManagerUser) -> IncidentResponse:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == manager.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.status = IncidentStatus.CLOSED
    inc.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(inc)
    return IncidentResponse.model_validate(inc)


@router.post("/{incident_id}/reopen", response_model=IncidentResponse)
async def reopen_incident(incident_id: UUID, db: DBSession, manager: ManagerUser) -> IncidentResponse:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == manager.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.status = IncidentStatus.UNDER_INVESTIGATION
    inc.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(inc)
    return IncidentResponse.model_validate(inc)


# ── PDF Report ────────────────────────────────────────────────


@router.get("/{incident_id}/report", summary="Download incident PDF report")
async def download_report(incident_id: UUID, db: DBSession, current_user: CurrentUser) -> Response:
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == current_user.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    actions_r = await db.execute(select(CorrectiveAction).where(CorrectiveAction.incident_id == incident_id, CorrectiveAction.is_deleted == False))  # noqa: E712
    witnesses_r = await db.execute(select(IncidentWitness).where(IncidentWitness.incident_id == incident_id))
    pdf_bytes = generate_incident_report(
        IncidentResponse.model_validate(inc).model_dump(),
        [CorrectiveActionResponse.model_validate(a).model_dump() for a in actions_r.scalars().all()],
        [WitnessResponse.model_validate(w).model_dump() for w in witnesses_r.scalars().all()],
    )
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="incident-{inc.reference_number}.pdf"'})


# ── Witnesses ─────────────────────────────────────────────────


@router.post("/{incident_id}/witnesses", response_model=WitnessResponse, status_code=status.HTTP_201_CREATED)
async def add_witness(incident_id: UUID, body: WitnessCreate, db: DBSession, current_user: CurrentUser) -> WitnessResponse:
    witness = IncidentWitness(incident_id=incident_id, name=body.name, statement=body.statement, contact=body.contact, created_by=str(current_user.id))
    db.add(witness)
    await db.flush()
    await db.refresh(witness)
    return WitnessResponse.model_validate(witness)


# ── Attachments ───────────────────────────────────────────────


@router.post("/{incident_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def add_attachment(incident_id: UUID, body: AttachmentCreate, db: DBSession, current_user: CurrentUser) -> AttachmentResponse:
    attachment = IncidentAttachment(incident_id=incident_id, file_url=body.file_url, file_type=body.file_type, description=body.description, uploaded_by=current_user.id, created_by=str(current_user.id))
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return AttachmentResponse.model_validate(attachment)


# ── Timeline Events ──────────────────────────────────────────


@router.post("/{incident_id}/timeline-event", summary="Add a timeline event")
async def add_timeline_event(incident_id: UUID, body: TimelineEventCreate, db: DBSession, current_user: CurrentUser) -> dict:
    """Add a timeline event (stored as JSONB on the incident)."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == current_user.organization_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    # Store timeline events in witness_statements JSONB for now
    events = inc.witness_statements or {}
    timeline = events.get("_timeline", [])
    timeline.append({
        "id": uuid_mod.uuid4().hex[:8],
        "event_type": body.event_type,
        "title": body.title,
        "description": body.description,
        "user_id": str(current_user.id),
        "created_at": datetime.now(UTC).isoformat(),
    })
    events["_timeline"] = timeline
    inc.witness_statements = events
    await db.flush()
    return {"message": "Timeline event added", "event_count": len(timeline)}


# ── Corrective Actions ────────────────────────────────────────


@router.get("/{incident_id}/actions", response_model=list[CorrectiveActionResponse])
async def list_corrective_actions(incident_id: UUID, db: DBSession, current_user: CurrentUser) -> list[CorrectiveActionResponse]:
    result = await db.execute(select(CorrectiveAction).where(CorrectiveAction.incident_id == incident_id, CorrectiveAction.organization_id == current_user.organization_id, CorrectiveAction.is_deleted == False))  # noqa: E712
    return [CorrectiveActionResponse.model_validate(a) for a in result.scalars().all()]


@router.post("/{incident_id}/actions", response_model=CorrectiveActionResponse, status_code=status.HTTP_201_CREATED)
async def create_corrective_action(incident_id: UUID, body: CorrectiveActionCreate, db: DBSession, manager: ManagerUser) -> CorrectiveActionResponse:
    action = CorrectiveAction(title=body.title, description=body.description, action_type=body.action_type, priority=body.priority, due_date=body.due_date, assigned_to_id=body.assigned_to_id, incident_id=incident_id, organization_id=manager.organization_id, created_by=str(manager.id))
    db.add(action)
    await db.flush()
    await db.refresh(action)
    return CorrectiveActionResponse.model_validate(action)


@router.patch("/actions/{action_id}", response_model=CorrectiveActionResponse)
async def update_corrective_action(action_id: UUID, body: CorrectiveActionUpdate, db: DBSession, current_user: CurrentUser) -> CorrectiveActionResponse:
    result = await db.execute(select(CorrectiveAction).where(CorrectiveAction.id == action_id, CorrectiveAction.organization_id == current_user.organization_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Corrective action not found")
    update_data = body.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == "completed":
        action.completed_at = datetime.now(UTC)
    for field, value in update_data.items():
        setattr(action, field, value)
    action.updated_by = str(current_user.id)
    await db.flush()
    await db.refresh(action)
    return CorrectiveActionResponse.model_validate(action)
