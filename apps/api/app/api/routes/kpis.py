"""KPI snapshot endpoints for OSHA / safety metrics."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.kpi import KPISnapshot
from app.schemas.kpi import KPISnapshotCreate, KPISnapshotList, KPISnapshotRead

router = APIRouter(prefix="/kpis", tags=["KPIs"])


@router.get(
    "",
    response_model=list[KPISnapshotList],
    summary="List KPI snapshots",
)
async def list_kpis(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    site_id: UUID | None = None,
    period: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
) -> list[KPISnapshotList]:
    query = select(KPISnapshot).where(
        KPISnapshot.organization_id == current_user.organization_id,
        KPISnapshot.is_deleted == False,  # noqa: E712
    )
    if site_id:
        query = query.where(KPISnapshot.site_id == site_id)
    if period:
        query = query.where(KPISnapshot.period == period)

    result = await db.execute(
        query.order_by(KPISnapshot.period.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    snapshots = result.scalars().all()
    return [KPISnapshotList.model_validate(s) for s in snapshots]


@router.get(
    "/{kpi_id}",
    response_model=KPISnapshotRead,
    summary="Get a KPI snapshot",
)
async def get_kpi(
    kpi_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> KPISnapshotRead:
    result = await db.execute(
        select(KPISnapshot).where(
            KPISnapshot.id == kpi_id,
            KPISnapshot.organization_id == current_user.organization_id,
        )
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI snapshot not found")
    return KPISnapshotRead.model_validate(snapshot)


@router.post(
    "",
    response_model=KPISnapshotRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a KPI snapshot (manual or from Celery)",
)
async def create_kpi(
    body: KPISnapshotCreate,
    db: DBSession,
    manager: ManagerUser,
) -> KPISnapshotRead:
    snapshot = KPISnapshot(
        organization_id=manager.organization_id,
        site_id=body.site_id,
        period=body.period,
        trir=body.trir,
        ltif=body.ltif,
        dart=body.dart,
        far=body.far,
        severity_rate=body.severity_rate,
        total_hours_worked=body.total_hours_worked,
        total_incidents=body.total_incidents,
        lti_count=body.lti_count,
        inspections_completed=body.inspections_completed,
        inspections_overdue=body.inspections_overdue,
        actions_open=body.actions_open,
        actions_overdue=body.actions_overdue,
        actions_closed=body.actions_closed,
        training_compliance_rate=body.training_compliance_rate,
        permit_compliance_rate=body.permit_compliance_rate,
        calculated_at=body.calculated_at,
        created_by=str(manager.id),
    )
    db.add(snapshot)
    await db.flush()
    await db.refresh(snapshot)
    return KPISnapshotRead.model_validate(snapshot)
