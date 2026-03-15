"""Inspection management endpoints — complete FASE 4 implementation."""

from __future__ import annotations

import uuid as uuid_mod
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, select

from app.models.inspection import (
    Finding,
    FindingStatus,
    Inspection,
    InspectionStatus,
    InspectionTemplate,
)
from app.schemas.inspection import (
    BulkScheduleRequest,
    FindingCreate,
    FindingResponse,
    FindingUpdate,
    InspectionCreate,
    InspectionListResponse,
    InspectionResponse,
    InspectionTemplateCreate,
    InspectionTemplateResponse,
    InspectionTemplateUpdate,
    InspectionUpdate,
)
from app.services.inspection_service import (
    auto_create_actions_from_findings,
    generate_inspection_report,
    get_calendar_events,
    get_inspection_kpis,
    get_overdue_inspections,
    schedule_recurring_inspections,
)

if TYPE_CHECKING:
    from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination

router = APIRouter(prefix="/inspections", tags=["Inspections"])


def _generate_ref() -> str:
    now = datetime.now(UTC)
    short = uuid_mod.uuid4().hex[:6].upper()
    return f"INS-{now.strftime('%Y%m%d')}-{short}"


# ── Templates ─────────────────────────────────────────────────


@router.get("/templates", response_model=list[InspectionTemplateResponse], summary="List inspection templates")
async def list_templates(
    db: DBSession,
    current_user: CurrentUser,
    category: str | None = None,
) -> list[InspectionTemplateResponse]:
    query = select(InspectionTemplate).where(
        (InspectionTemplate.organization_id == current_user.organization_id) | (InspectionTemplate.is_global == True),  # noqa: E712
        InspectionTemplate.is_deleted == False,  # noqa: E712
    )
    if category:
        query = query.where(InspectionTemplate.category == category)
    result = await db.execute(query)
    return [InspectionTemplateResponse.model_validate(t) for t in result.scalars().all()]


@router.post("/templates", response_model=InspectionTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: InspectionTemplateCreate, db: DBSession, manager: ManagerUser
) -> InspectionTemplateResponse:
    template = InspectionTemplate(
        title=body.title,
        description=body.description,
        category=body.category,
        tags=body.tags,
        schema_definition=body.schema_definition.model_dump(),
        organization_id=manager.organization_id,
        created_by=str(manager.id),
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return InspectionTemplateResponse.model_validate(template)


@router.patch("/templates/{template_id}", response_model=InspectionTemplateResponse)
async def update_template(
    template_id: UUID, body: InspectionTemplateUpdate, db: DBSession, manager: ManagerUser
) -> InspectionTemplateResponse:
    result = await db.execute(
        select(InspectionTemplate).where(
            InspectionTemplate.id == template_id,
            InspectionTemplate.organization_id == manager.organization_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    update_data = body.model_dump(exclude_unset=True)
    if "schema_definition" in update_data and update_data["schema_definition"]:
        update_data["schema_definition"] = body.schema_definition.model_dump()  # type: ignore[union-attr]
        template.version += 1
    for field, value in update_data.items():
        setattr(template, field, value)
    template.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(template)
    return InspectionTemplateResponse.model_validate(template)


# ── KPIs & Dashboard ─────────────────────────────────────────


@router.get("/kpis", summary="Get inspection KPI summary")
async def inspection_kpis(db: DBSession, current_user: CurrentUser) -> dict:
    return await get_inspection_kpis(db, current_user.organization_id)


# ── Calendar ──────────────────────────────────────────────────


@router.get("/calendar", summary="Get inspections for calendar view")
async def inspection_calendar(
    db: DBSession,
    current_user: CurrentUser,
    start: datetime = Query(...),
    end: datetime = Query(...),
    site_id: UUID | None = None,
) -> list[dict]:
    return await get_calendar_events(db, current_user.organization_id, start, end, site_id)


# ── Overdue ───────────────────────────────────────────────────


@router.get("/overdue", response_model=list[InspectionResponse], summary="List overdue inspections")
async def overdue_inspections(db: DBSession, current_user: CurrentUser) -> list[InspectionResponse]:
    inspections = await get_overdue_inspections(db, current_user.organization_id)
    return [InspectionResponse.model_validate(i) for i in inspections]


# ── Bulk Schedule ─────────────────────────────────────────────


@router.post("/schedule-bulk", response_model=list[InspectionResponse], status_code=status.HTTP_201_CREATED)
async def schedule_bulk(body: BulkScheduleRequest, db: DBSession, manager: ManagerUser) -> list[InspectionResponse]:
    inspections = await schedule_recurring_inspections(
        db,
        template_id=body.template_id,
        site_id=body.site_id,
        area_id=body.area_id,
        inspector_id=body.inspector_id,
        organization_id=manager.organization_id,
        frequency=body.frequency,
        start_date=body.start_date,
        end_date=body.end_date,
        custom_days=body.custom_days,
        title_prefix=body.title_prefix or "Inspección programada",
    )
    return [InspectionResponse.model_validate(i) for i in inspections]


# ── QR ────────────────────────────────────────────────────────


@router.get("/by-qr/{equipment_qr}", summary="Find inspection by equipment QR")
async def by_qr(equipment_qr: str, db: DBSession, current_user: CurrentUser) -> InspectionResponse | None:
    result = await db.execute(
        select(Inspection)
        .where(
            Inspection.organization_id == current_user.organization_id,
            Inspection.is_deleted == False,  # noqa: E712
            Inspection.status.in_([InspectionStatus.DRAFT, InspectionStatus.IN_PROGRESS]),
            Inspection.notes.ilike(f"%{equipment_qr}%"),
        )
        .order_by(Inspection.scheduled_date.asc())
        .limit(1)
    )
    ins = result.scalar_one_or_none()
    return InspectionResponse.model_validate(ins) if ins else None


# ── CRUD ──────────────────────────────────────────────────────


@router.get("", response_model=InspectionListResponse, summary="List inspections")
async def list_inspections(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    status_filter: InspectionStatus | None = Query(None, alias="status"),
    site_id: UUID | None = None,
    inspector_id: UUID | None = None,
    template_id: UUID | None = None,
    score_min: float | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> InspectionListResponse:
    base = select(Inspection).where(
        Inspection.organization_id == current_user.organization_id,
        Inspection.is_deleted == False,  # noqa: E712
    )
    if status_filter:
        base = base.where(Inspection.status == status_filter)
    if site_id:
        base = base.where(Inspection.site_id == site_id)
    if inspector_id:
        base = base.where(Inspection.inspector_id == inspector_id)
    if template_id:
        base = base.where(Inspection.template_id == template_id)
    if score_min is not None:
        base = base.where(Inspection.score >= score_min)
    if date_from:
        base = base.where(Inspection.scheduled_date >= date_from)
    if date_to:
        base = base.where(Inspection.scheduled_date <= date_to)
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar() or 0
    result = await db.execute(
        base.order_by(Inspection.created_at.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    return InspectionListResponse(
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        items=[InspectionResponse.model_validate(i) for i in result.scalars().all()],
    )


@router.post("", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_inspection(body: InspectionCreate, db: DBSession, current_user: CurrentUser) -> InspectionResponse:
    inspection = Inspection(
        title=body.title,
        reference_number=_generate_ref(),
        status=InspectionStatus.DRAFT,
        scheduled_date=body.scheduled_date,
        notes=body.notes,
        responses={},
        template_id=body.template_id,
        organization_id=current_user.organization_id,
        site_id=body.site_id,
        area_id=body.area_id,
        inspector_id=body.inspector_id or current_user.id,
        created_by=str(current_user.id),
    )
    db.add(inspection)
    await db.flush()
    await db.refresh(inspection)
    return InspectionResponse.model_validate(inspection)


@router.get("/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(inspection_id: UUID, db: DBSession, current_user: CurrentUser) -> InspectionResponse:
    result = await db.execute(
        select(Inspection).where(
            Inspection.id == inspection_id, Inspection.organization_id == current_user.organization_id
        )
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return InspectionResponse.model_validate(ins)


@router.patch("/{inspection_id}", response_model=InspectionResponse)
async def update_inspection(
    inspection_id: UUID, body: InspectionUpdate, db: DBSession, current_user: CurrentUser
) -> InspectionResponse:
    result = await db.execute(
        select(Inspection).where(
            Inspection.id == inspection_id, Inspection.organization_id == current_user.organization_id
        )
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inspection not found")
    update_data = body.model_dump(exclude_unset=True)
    if "status" in update_data:
        if update_data["status"] == InspectionStatus.IN_PROGRESS and not ins.started_at:
            ins.started_at = datetime.now(UTC)
        elif update_data["status"] == InspectionStatus.COMPLETED:
            ins.completed_at = datetime.now(UTC)
    for field, value in update_data.items():
        setattr(ins, field, value)
    ins.updated_by = str(current_user.id)
    await db.flush()
    await db.refresh(ins)
    return InspectionResponse.model_validate(ins)


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspection(inspection_id: UUID, db: DBSession, manager: ManagerUser) -> None:
    result = await db.execute(
        select(Inspection).where(Inspection.id == inspection_id, Inspection.organization_id == manager.organization_id)
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inspection not found")
    ins.is_deleted = True
    ins.deleted_at = datetime.now(UTC)
    await db.flush()


# ── Lifecycle Actions ─────────────────────────────────────────


@router.post("/{inspection_id}/start", response_model=InspectionResponse, summary="Start an inspection")
async def start_inspection(inspection_id: UUID, db: DBSession, current_user: CurrentUser) -> InspectionResponse:
    result = await db.execute(
        select(Inspection).where(
            Inspection.id == inspection_id, Inspection.organization_id == current_user.organization_id
        )
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if ins.status != InspectionStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Cannot start inspection in status '{ins.status}'")
    ins.status = InspectionStatus.IN_PROGRESS
    ins.started_at = datetime.now(UTC)
    ins.updated_by = str(current_user.id)
    await db.flush()
    await db.refresh(ins)
    return InspectionResponse.model_validate(ins)


@router.post("/{inspection_id}/complete", response_model=InspectionResponse, summary="Complete an inspection")
async def complete_inspection(inspection_id: UUID, db: DBSession, current_user: CurrentUser) -> InspectionResponse:
    result = await db.execute(
        select(Inspection).where(
            Inspection.id == inspection_id, Inspection.organization_id == current_user.organization_id
        )
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inspection not found")
    if ins.status != InspectionStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Inspection must be in progress to complete")
    ins.status = InspectionStatus.COMPLETED
    ins.completed_at = datetime.now(UTC)
    ins.updated_by = str(current_user.id)
    await auto_create_actions_from_findings(db, inspection_id, current_user.organization_id)
    await db.flush()
    await db.refresh(ins)
    return InspectionResponse.model_validate(ins)


@router.post("/{inspection_id}/cancel", response_model=InspectionResponse, summary="Cancel an inspection")
async def cancel_inspection(inspection_id: UUID, db: DBSession, manager: ManagerUser) -> InspectionResponse:
    result = await db.execute(
        select(Inspection).where(Inspection.id == inspection_id, Inspection.organization_id == manager.organization_id)
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inspection not found")
    ins.status = InspectionStatus.ARCHIVED
    ins.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(ins)
    return InspectionResponse.model_validate(ins)


# ── PDF Report ────────────────────────────────────────────────


@router.get("/{inspection_id}/report", summary="Download inspection PDF report")
async def download_report(inspection_id: UUID, db: DBSession, current_user: CurrentUser) -> Response:
    result = await db.execute(
        select(Inspection).where(
            Inspection.id == inspection_id, Inspection.organization_id == current_user.organization_id
        )
    )
    ins = result.scalar_one_or_none()
    if not ins:
        raise HTTPException(status_code=404, detail="Inspection not found")
    tmpl_r = await db.execute(select(InspectionTemplate).where(InspectionTemplate.id == ins.template_id))
    template = tmpl_r.scalar_one_or_none()
    findings_r = await db.execute(
        select(Finding).where(
            Finding.inspection_id == inspection_id,
            Finding.is_deleted == False,  # noqa: E712
        )
    )
    findings = findings_r.scalars().all()
    pdf_bytes = generate_inspection_report(
        InspectionResponse.model_validate(ins).model_dump(),
        InspectionTemplateResponse.model_validate(template).model_dump() if template else {},
        [FindingResponse.model_validate(f).model_dump() for f in findings],
    )
    filename = f"inspection-{ins.reference_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Findings ──────────────────────────────────────────────────


@router.get("/{inspection_id}/findings", response_model=list[FindingResponse])
async def list_findings(inspection_id: UUID, db: DBSession, current_user: CurrentUser) -> list[FindingResponse]:
    result = await db.execute(
        select(Finding).where(
            Finding.inspection_id == inspection_id,
            Finding.organization_id == current_user.organization_id,
            Finding.is_deleted == False,  # noqa: E712
        )
    )
    return [FindingResponse.model_validate(f) for f in result.scalars().all()]


@router.post("/{inspection_id}/findings", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
async def create_finding(
    inspection_id: UUID, body: FindingCreate, db: DBSession, current_user: CurrentUser
) -> FindingResponse:
    finding = Finding(
        title=body.title,
        description=body.description,
        severity=body.severity,
        status=FindingStatus.OPEN,
        due_date=body.due_date,
        assigned_to_id=body.assigned_to_id,
        evidence_urls=body.evidence_urls,
        inspection_id=inspection_id,
        organization_id=current_user.organization_id,
        created_by=str(current_user.id),
    )
    db.add(finding)
    await db.flush()
    await db.refresh(finding)
    return FindingResponse.model_validate(finding)


@router.patch("/findings/{finding_id}", response_model=FindingResponse)
async def update_finding(
    finding_id: UUID, body: FindingUpdate, db: DBSession, current_user: CurrentUser
) -> FindingResponse:
    result = await db.execute(
        select(Finding).where(Finding.id == finding_id, Finding.organization_id == current_user.organization_id)
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    update_data = body.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == FindingStatus.RESOLVED:
        finding.resolved_at = datetime.now(UTC)
    for field, value in update_data.items():
        setattr(finding, field, value)
    finding.updated_by = str(current_user.id)
    await db.flush()
    await db.refresh(finding)
    return FindingResponse.model_validate(finding)
