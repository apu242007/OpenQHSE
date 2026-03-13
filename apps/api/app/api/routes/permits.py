"""Work permit management endpoints — FASE 5 enhanced."""

import uuid as uuid_mod
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.permit import PermitExtension, PermitStatus, PermitType, WorkPermit
from app.schemas.permit import (
    PermitExtensionCreate,
    PermitExtensionRead,
    WorkPermitCreate,
    WorkPermitList,
    WorkPermitRead,
    WorkPermitUpdate,
)
from app.services import permit_service

router = APIRouter(prefix="/permits", tags=["Permits"])


def _generate_permit_ref() -> str:
    now = datetime.now(UTC)
    short = uuid_mod.uuid4().hex[:6].upper()
    return f"PTW-{now.strftime('%Y%m%d')}-{short}"


# ── Checklist / Gas Limits ────────────────────────────────────


@router.get(
    "/checklists/{permit_type}",
    summary="Get safety checklist for a permit type",
)
async def get_checklist(
    permit_type: str,
    current_user: CurrentUser,
) -> list[dict]:
    return await permit_service.get_checklist_for_type(permit_type)


@router.get(
    "/gas-limits",
    summary="Get gas test safe limits",
)
async def gas_limits(
    current_user: CurrentUser,
) -> dict:
    return permit_service.GAS_LIMITS


@router.post(
    "/validate-gas-readings",
    summary="Validate gas readings against safe limits",
)
async def validate_gas_readings(
    readings: list[dict],
    current_user: CurrentUser,
) -> list[dict]:
    return permit_service.validate_gas_readings(readings)


# ── Statistics ────────────────────────────────────────────────


@router.get(
    "/statistics",
    summary="Get permit statistics",
)
async def permit_statistics(
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    return await permit_service.get_permit_statistics(db, current_user.organization_id)


# ── Conflict Check ────────────────────────────────────────────


@router.get(
    "/check-conflicts",
    summary="Check for overlapping active permits",
)
async def check_conflicts(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID = Query(...),
    valid_from: datetime = Query(...),
    valid_until: datetime = Query(...),
    area_id: UUID | None = None,
    exclude_id: UUID | None = None,
) -> list[WorkPermitList]:
    conflicts = await permit_service.check_conflicts(
        db, current_user.organization_id, site_id, area_id,
        valid_from, valid_until, exclude_id,
    )
    return [WorkPermitList.model_validate(p) for p in conflicts]


# ── QR Code ───────────────────────────────────────────────────


@router.get(
    "/{permit_id}/qr",
    summary="Generate QR code data for a permit",
)
async def generate_qr(
    permit_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == current_user.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    return await permit_service.generate_qr_data(permit)


@router.get(
    "/validate-qr/{reference_number}/{token}",
    summary="Validate a permit QR code",
)
async def validate_qr(
    reference_number: str,
    token: str,
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    permit = await permit_service.validate_qr_token(db, reference_number, token)
    if not permit:
        raise HTTPException(status_code=404, detail="Invalid QR code or permit not found")
    return {
        "valid": True,
        "permit": WorkPermitRead.model_validate(permit).model_dump(),
    }


# ── Workflow Transitions ──────────────────────────────────────


@router.post(
    "/{permit_id}/submit",
    response_model=WorkPermitRead,
    summary="Submit permit for approval",
)
async def submit_permit(
    permit_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == current_user.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    try:
        permit = await permit_service.transition_status(
            db, permit, PermitStatus.PENDING_APPROVAL, current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return WorkPermitRead.model_validate(permit)


@router.post(
    "/{permit_id}/approve",
    response_model=WorkPermitRead,
    summary="Approve a pending permit",
)
async def approve_permit(
    permit_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == manager.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    try:
        permit = await permit_service.transition_status(
            db, permit, PermitStatus.APPROVED, manager.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return WorkPermitRead.model_validate(permit)


@router.post(
    "/{permit_id}/reject",
    response_model=WorkPermitRead,
    summary="Reject a pending permit",
)
async def reject_permit(
    permit_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == manager.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    try:
        permit = await permit_service.transition_status(
            db, permit, PermitStatus.REJECTED, manager.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return WorkPermitRead.model_validate(permit)


@router.post(
    "/{permit_id}/activate",
    response_model=WorkPermitRead,
    summary="Activate an approved permit",
)
async def activate_permit(
    permit_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == manager.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    try:
        permit = await permit_service.transition_status(
            db, permit, PermitStatus.ACTIVE, manager.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return WorkPermitRead.model_validate(permit)


@router.post(
    "/{permit_id}/suspend",
    response_model=WorkPermitRead,
    summary="Suspend an active permit",
)
async def suspend_permit(
    permit_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == manager.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    try:
        permit = await permit_service.transition_status(
            db, permit, PermitStatus.SUSPENDED, manager.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return WorkPermitRead.model_validate(permit)


@router.post(
    "/{permit_id}/close",
    response_model=WorkPermitRead,
    summary="Close a permit",
)
async def close_permit(
    permit_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == manager.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    try:
        permit = await permit_service.transition_status(
            db, permit, PermitStatus.CLOSED, manager.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return WorkPermitRead.model_validate(permit)


# ── CRUD ──────────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[WorkPermitList],
    summary="List work permits",
)
async def list_permits(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    status_filter: PermitStatus | None = Query(None, alias="status"),
    site_id: UUID | None = None,
) -> list[WorkPermitList]:
    base = select(WorkPermit).where(
        WorkPermit.organization_id == current_user.organization_id,
        WorkPermit.is_deleted == False,  # noqa: E712
    )
    if status_filter:
        base = base.where(WorkPermit.status == status_filter)
    if site_id:
        base = base.where(WorkPermit.site_id == site_id)

    result = await db.execute(
        base.order_by(WorkPermit.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    permits = result.scalars().all()
    return [WorkPermitList.model_validate(p) for p in permits]


@router.post(
    "",
    response_model=WorkPermitRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a work permit",
)
async def create_permit(
    body: WorkPermitCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> WorkPermitRead:
    permit = WorkPermit(
        reference_number=_generate_permit_ref(),
        title=body.title,
        permit_type=body.permit_type,
        status=PermitStatus.DRAFT,
        description=body.description,
        hazards_identified=body.hazards_identified,
        precautions=body.precautions,
        ppe_required=body.ppe_required,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        checklist_data=body.checklist_data,
        organization_id=current_user.organization_id,
        site_id=body.site_id,
        area_id=body.area_id,
        requested_by_id=current_user.id,
        created_by=str(current_user.id),
    )
    db.add(permit)
    await db.flush()
    await db.refresh(permit)
    return WorkPermitRead.model_validate(permit)


@router.get(
    "/{permit_id}",
    response_model=WorkPermitRead,
    summary="Get permit detail",
)
async def get_permit(
    permit_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == current_user.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permit not found")
    return WorkPermitRead.model_validate(permit)


@router.patch(
    "/{permit_id}",
    response_model=WorkPermitRead,
    summary="Update a work permit",
)
async def update_permit(
    permit_id: UUID,
    body: WorkPermitUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> WorkPermitRead:
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.id == permit_id,
            WorkPermit.organization_id == manager.organization_id,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permit not found")

    update_data = body.model_dump(exclude_unset=True)
    new_status = update_data.get("status")
    if new_status == PermitStatus.APPROVED:
        permit.approved_at = datetime.now(UTC)
        permit.approved_by_id = manager.id
    elif new_status == PermitStatus.CLOSED:
        permit.closed_at = datetime.now(UTC)

    for field, value in update_data.items():
        setattr(permit, field, value)
    permit.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(permit)
    return WorkPermitRead.model_validate(permit)


# ── Extensions ────────────────────────────────────────────────


@router.post(
    "/{permit_id}/extensions",
    response_model=PermitExtensionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Request a permit time extension",
)
async def create_extension(
    permit_id: UUID,
    body: PermitExtensionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> PermitExtensionRead:
    ext = PermitExtension(
        permit_id=permit_id,
        new_end_datetime=body.new_end_datetime,
        reason=body.reason,
        created_by=str(current_user.id),
    )
    db.add(ext)
    await db.flush()
    await db.refresh(ext)
    return PermitExtensionRead.model_validate(ext)


@router.get(
    "/{permit_id}/extensions",
    response_model=list[PermitExtensionRead],
    summary="List permit extensions",
)
async def list_extensions(
    permit_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[PermitExtensionRead]:
    result = await db.execute(
        select(PermitExtension).where(PermitExtension.permit_id == permit_id)
    )
    extensions = result.scalars().all()
    return [PermitExtensionRead.model_validate(e) for e in extensions]
