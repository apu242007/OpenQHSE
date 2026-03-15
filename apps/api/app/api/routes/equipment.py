"""Equipment / asset management endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.equipment import Equipment, EquipmentInspection, EquipmentStatus
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentInspectionCreate,
    EquipmentInspectionRead,
    EquipmentList,
    EquipmentRead,
    EquipmentUpdate,
)

router = APIRouter(prefix="/equipment", tags=["Equipment"])


@router.get(
    "",
    response_model=list[EquipmentList],
    summary="List equipment / assets",
)
async def list_equipment(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    category: str | None = None,
    site_id: UUID | None = None,
    equip_status: str | None = None,
    search: str | None = None,
) -> list[EquipmentList]:
    query = select(Equipment).where(
        Equipment.organization_id == current_user.organization_id,
        Equipment.is_deleted == False,  # noqa: E712
    )
    if category:
        query = query.where(Equipment.category == category)
    if site_id:
        query = query.where(Equipment.site_id == site_id)
    if equip_status:
        query = query.where(Equipment.status == equip_status)
    if search:
        query = query.where(Equipment.name.ilike(f"%{search}%") | Equipment.code.ilike(f"%{search}%"))

    result = await db.execute(
        query.order_by(Equipment.created_at.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    items = result.scalars().all()
    return [EquipmentList.model_validate(e) for e in items]


@router.post(
    "",
    response_model=EquipmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register new equipment",
)
async def create_equipment(
    body: EquipmentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> EquipmentRead:
    equip = Equipment(
        organization_id=current_user.organization_id,
        site_id=body.site_id,
        name=body.name,
        code=body.code,
        description=body.description,
        category=body.category,
        manufacturer=body.manufacturer,
        model=body.model,
        serial_number=body.serial_number,
        photo_url=body.photo_url,
        location=body.location,
        purchase_date=body.purchase_date,
        next_inspection_date=body.next_inspection_date,
        certifications=body.certifications,
        documents=body.documents,
        created_by=str(current_user.id),
    )
    db.add(equip)
    await db.flush()
    await db.refresh(equip)
    return EquipmentRead.model_validate(equip)


@router.get(
    "/by-code/{code}",
    response_model=EquipmentRead,
    summary="Find equipment by QR code / asset code",
)
async def get_equipment_by_code(
    code: str,
    db: DBSession,
    current_user: CurrentUser,
) -> EquipmentRead:
    result = await db.execute(
        select(Equipment).where(
            Equipment.code == code,
            Equipment.organization_id == current_user.organization_id,
            Equipment.is_deleted == False,  # noqa: E712
        )
    )
    equip = result.scalar_one_or_none()
    if not equip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    return EquipmentRead.model_validate(equip)


@router.get(
    "/{equipment_id}",
    response_model=EquipmentRead,
    summary="Get equipment detail",
)
async def get_equipment(
    equipment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> EquipmentRead:
    result = await db.execute(
        select(Equipment).where(
            Equipment.id == equipment_id,
            Equipment.organization_id == current_user.organization_id,
        )
    )
    equip = result.scalar_one_or_none()
    if not equip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    return EquipmentRead.model_validate(equip)


@router.patch(
    "/{equipment_id}",
    response_model=EquipmentRead,
    summary="Update equipment",
)
async def update_equipment(
    equipment_id: UUID,
    body: EquipmentUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> EquipmentRead:
    result = await db.execute(
        select(Equipment).where(
            Equipment.id == equipment_id,
            Equipment.organization_id == manager.organization_id,
        )
    )
    equip = result.scalar_one_or_none()
    if not equip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(equip, field, value)
    equip.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(equip)
    return EquipmentRead.model_validate(equip)


@router.delete(
    "/{equipment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete equipment",
)
async def delete_equipment(
    equipment_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> None:
    result = await db.execute(
        select(Equipment).where(
            Equipment.id == equipment_id,
            Equipment.organization_id == manager.organization_id,
        )
    )
    equip = result.scalar_one_or_none()
    if not equip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

    equip.is_deleted = True
    equip.status = EquipmentStatus.DECOMMISSIONED
    equip.updated_by = str(manager.id)
    await db.flush()


# ── Equipment Inspections ─────────────────────────────────────


@router.get(
    "/{equipment_id}/inspections",
    response_model=list[EquipmentInspectionRead],
    summary="List inspection history for equipment",
)
async def list_inspections(
    equipment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
) -> list[EquipmentInspectionRead]:
    # Verify equipment belongs to org
    equip_result = await db.execute(
        select(Equipment).where(
            Equipment.id == equipment_id,
            Equipment.organization_id == current_user.organization_id,
        )
    )
    if not equip_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

    result = await db.execute(
        select(EquipmentInspection)
        .where(
            EquipmentInspection.equipment_id == equipment_id,
            EquipmentInspection.is_deleted == False,  # noqa: E712
        )
        .order_by(EquipmentInspection.inspected_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    inspections = result.scalars().all()
    return [EquipmentInspectionRead.model_validate(i) for i in inspections]


@router.post(
    "/{equipment_id}/inspections",
    response_model=EquipmentInspectionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an inspection record for equipment",
)
async def create_inspection(
    equipment_id: UUID,
    body: EquipmentInspectionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> EquipmentInspectionRead:
    equip_result = await db.execute(
        select(Equipment).where(
            Equipment.id == equipment_id,
            Equipment.organization_id == current_user.organization_id,
        )
    )
    equip = equip_result.scalar_one_or_none()
    if not equip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

    inspection = EquipmentInspection(
        equipment_id=equipment_id,
        inspector_id=current_user.id,
        inspected_at=body.inspected_at,
        result=body.result,
        notes=body.notes,
        findings=body.findings,
        next_inspection_date=body.next_inspection_date,
        attachments=body.attachments,
        created_by=str(current_user.id),
    )
    db.add(inspection)

    # Update equipment last/next inspection dates
    equip.last_inspection_date = body.inspected_at
    if body.next_inspection_date:
        equip.next_inspection_date = body.next_inspection_date

    # Auto-update status based on result
    from app.models.equipment import InspectionResult

    if body.result == InspectionResult.FAIL:
        equip.status = EquipmentStatus.OUT_OF_SERVICE
    elif body.result == InspectionResult.PASS and equip.status == EquipmentStatus.OUT_OF_SERVICE:
        equip.status = EquipmentStatus.ACTIVE

    equip.updated_by = str(current_user.id)

    await db.flush()
    await db.refresh(inspection)
    return EquipmentInspectionRead.model_validate(inspection)


@router.get(
    "/{equipment_id}/inspections/{inspection_id}",
    response_model=EquipmentInspectionRead,
    summary="Get a specific inspection record",
)
async def get_inspection(
    equipment_id: UUID,
    inspection_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> EquipmentInspectionRead:
    result = await db.execute(
        select(EquipmentInspection).where(
            EquipmentInspection.id == inspection_id,
            EquipmentInspection.equipment_id == equipment_id,
        )
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    return EquipmentInspectionRead.model_validate(inspection)
