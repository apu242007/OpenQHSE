"""Contractors management endpoints — Phase 9."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import Integer, and_, func, select

from app.models.contractor import Contractor, ContractorStatus, ContractorWorker
from app.schemas.contractor import (
    ContractorComplianceReport,
    ContractorCreate,
    ContractorListResponse,
    ContractorResponse,
    ContractorUpdate,
    ContractorWorkerCreate,
    ContractorWorkerResponse,
    ContractorWorkerUpdate,
)

if TYPE_CHECKING:
    from uuid import UUID

    from app.api.deps import AdminUser, CurrentUser, DBSession, ManagerUser, Pagination

router = APIRouter(prefix="/contractors", tags=["Contractors"])


# ── Helpers ─────────────────────────────────────────────────────────────────


def _insurance_status(expiry: datetime | None) -> str:
    if expiry is None:
        return "missing"
    now = datetime.now(UTC)
    expiry_aware = expiry if expiry.tzinfo else expiry.replace(tzinfo=UTC)
    days_left = (expiry_aware - now).days
    if days_left < 0:
        return "expired"
    if days_left <= 30:
        return "expiring_soon"
    return "valid"


def _compute_compliance_score(
    insurance_status: str,
    induction_pct: float,
    certs_expiring: int,
    incident_count: int,
) -> float:
    """Return a 0-100 compliance score for the contractor."""
    score = 100.0
    if insurance_status == "expired":
        score -= 40
    elif insurance_status == "expiring_soon":
        score -= 15
    elif insurance_status == "missing":
        score -= 25
    score -= max(0.0, (100 - induction_pct) * 0.3)
    score -= min(20.0, certs_expiring * 5)
    score -= min(15.0, incident_count * 3)
    return round(max(0.0, score), 1)


# ── Contractors CRUD ─────────────────────────────────────────────────────────


@router.get("", response_model=ContractorListResponse, summary="List contractors")
async def list_contractors(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    status_filter: ContractorStatus | None = Query(None, alias="status"),
    search: str | None = Query(None),
) -> ContractorListResponse:
    """Return paginated contractors for the current organization."""
    org_id = current_user.organization_id
    filters = [Contractor.organization_id == org_id, Contractor.is_deleted == False]  # noqa: E712

    if status_filter:
        filters.append(Contractor.status == status_filter)
    if search:
        filters.append(Contractor.name.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(Contractor).where(and_(*filters)))).scalar() or 0

    rows = (
        (
            await db.execute(
                select(Contractor)
                .where(and_(*filters))
                .order_by(Contractor.name)
                .offset(pagination.offset)
                .limit(pagination.page_size)
            )
        )
        .scalars()
        .all()
    )

    # Count workers per contractor
    contractor_ids = [c.id for c in rows]
    worker_counts: dict[UUID, dict] = {}
    if contractor_ids:
        wc_rows = (
            await db.execute(
                select(
                    ContractorWorker.contractor_id,
                    func.count().label("total"),
                    func.sum(func.cast(ContractorWorker.is_active, Integer)).label("active"),
                )
                .where(
                    ContractorWorker.contractor_id.in_(contractor_ids),
                    ContractorWorker.is_deleted == False,  # noqa: E712
                )
                .group_by(ContractorWorker.contractor_id)
            )
        ).all()
        for contractor_id, total_w, active_w in wc_rows:
            worker_counts[contractor_id] = {
                "total": total_w or 0,
                "active": int(active_w or 0),
            }

    items = []
    for c in rows:
        wc = worker_counts.get(c.id, {"total": 0, "active": 0})
        ins_status = _insurance_status(c.insurance_expiry)
        items.append(
            ContractorResponse(
                id=c.id,
                created_at=c.created_at,
                updated_at=c.updated_at,
                organization_id=c.organization_id,
                name=c.name,
                rut_tax_id=c.rut_tax_id,
                country=c.country,
                contact_name=c.contact_name,
                contact_email=c.contact_email,
                contact_phone=c.contact_phone,
                status=c.status,
                insurance_expiry=c.insurance_expiry,
                insurance_url=c.insurance_url,
                certifications=c.certifications if isinstance(c.certifications, list) else [],
                documents=c.documents if isinstance(c.documents, list) else [],
                approved_by=c.approved_by,
                approved_at=c.approved_at,
                suspension_reason=c.suspension_reason,
                worker_count=wc["total"],
                active_worker_count=wc["active"],
                compliance_pct=100.0 if ins_status == "valid" else (50.0 if ins_status == "expiring_soon" else 0.0),
            )
        )

    page_size = pagination.page_size
    page = pagination.page
    return ContractorListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
        items=items,
    )


@router.post("", response_model=ContractorResponse, status_code=status.HTTP_201_CREATED, summary="Create contractor")
async def create_contractor(
    body: ContractorCreate,
    db: DBSession,
    current_user: ManagerUser,
) -> ContractorResponse:
    """Register a new contractor company."""
    c = Contractor(
        organization_id=current_user.organization_id,
        name=body.name,
        rut_tax_id=body.rut_tax_id,
        country=body.country,
        contact_name=body.contact_name,
        contact_email=str(body.contact_email) if body.contact_email else None,
        contact_phone=body.contact_phone,
        insurance_expiry=body.insurance_expiry,
        insurance_url=body.insurance_url,
        certifications=body.certifications,
        documents=body.documents,
        status=ContractorStatus.PENDING,
    )
    db.add(c)
    await db.flush()
    await db.refresh(c)
    return ContractorResponse(
        id=c.id,
        created_at=c.created_at,
        updated_at=c.updated_at,
        organization_id=c.organization_id,
        name=c.name,
        rut_tax_id=c.rut_tax_id,
        country=c.country,
        contact_name=c.contact_name,
        contact_email=c.contact_email,
        contact_phone=c.contact_phone,
        status=c.status,
        insurance_expiry=c.insurance_expiry,
        insurance_url=c.insurance_url,
        certifications=c.certifications if isinstance(c.certifications, list) else [],
        documents=c.documents if isinstance(c.documents, list) else [],
        approved_by=c.approved_by,
        approved_at=c.approved_at,
        suspension_reason=c.suspension_reason,
    )


@router.get("/{contractor_id}", response_model=ContractorResponse, summary="Get contractor")
async def get_contractor(
    contractor_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ContractorResponse:
    c = await _get_or_404(db, contractor_id, current_user.organization_id)
    return _to_response(c)


@router.put("/{contractor_id}", response_model=ContractorResponse, summary="Update contractor")
async def update_contractor(
    contractor_id: UUID,
    body: ContractorUpdate,
    db: DBSession,
    current_user: ManagerUser,
) -> ContractorResponse:
    c = await _get_or_404(db, contractor_id, current_user.organization_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    await db.flush()
    await db.refresh(c)
    return _to_response(c)


@router.delete("/{contractor_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete contractor")
async def delete_contractor(
    contractor_id: UUID,
    db: DBSession,
    current_user: AdminUser,
) -> None:
    c = await _get_or_404(db, contractor_id, current_user.organization_id)
    c.is_deleted = True
    await db.flush()


# ── Approval / Suspension ────────────────────────────────────────────────────


@router.post("/{contractor_id}/approve", response_model=ContractorResponse, summary="Approve contractor")
async def approve_contractor(
    contractor_id: UUID,
    db: DBSession,
    current_user: ManagerUser,
) -> ContractorResponse:
    """Approve a PENDING contractor for work on site."""
    c = await _get_or_404(db, contractor_id, current_user.organization_id)
    if c.status != ContractorStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contractor is already {c.status.value}",
        )
    c.status = ContractorStatus.APPROVED
    c.approved_by = current_user.id
    c.approved_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(c)
    return _to_response(c)


@router.post("/{contractor_id}/suspend", response_model=ContractorResponse, summary="Suspend contractor")
async def suspend_contractor(
    contractor_id: UUID,
    db: DBSession,
    current_user: ManagerUser,
    reason: str = Query(..., min_length=10, description="Reason for suspension"),
) -> ContractorResponse:
    """Suspend an approved contractor."""
    c = await _get_or_404(db, contractor_id, current_user.organization_id)
    c.status = ContractorStatus.SUSPENDED
    c.suspension_reason = reason
    await db.flush()
    await db.refresh(c)
    return _to_response(c)


@router.post("/{contractor_id}/reactivate", response_model=ContractorResponse, summary="Reactivate contractor")
async def reactivate_contractor(
    contractor_id: UUID,
    db: DBSession,
    current_user: AdminUser,
) -> ContractorResponse:
    """Reactivate a SUSPENDED contractor."""
    c = await _get_or_404(db, contractor_id, current_user.organization_id)
    if c.status not in (ContractorStatus.SUSPENDED, ContractorStatus.PENDING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only SUSPENDED or PENDING contractors can be reactivated",
        )
    c.status = ContractorStatus.APPROVED
    c.suspension_reason = None
    await db.flush()
    await db.refresh(c)
    return _to_response(c)


# ── Workers sub-resource ─────────────────────────────────────────────────────


@router.get("/{contractor_id}/workers", response_model=list[ContractorWorkerResponse], summary="List workers")
async def list_workers(
    contractor_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
    is_active: bool | None = Query(None),
) -> list[ContractorWorkerResponse]:
    await _get_or_404(db, contractor_id, current_user.organization_id)

    filters = [
        ContractorWorker.contractor_id == contractor_id,
        ContractorWorker.is_deleted == False,  # noqa: E712
    ]
    if is_active is not None:
        filters.append(ContractorWorker.is_active == is_active)

    rows = (
        (await db.execute(select(ContractorWorker).where(and_(*filters)).order_by(ContractorWorker.last_name)))
        .scalars()
        .all()
    )

    return [_worker_to_response(w) for w in rows]


@router.post(
    "/{contractor_id}/workers",
    response_model=ContractorWorkerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add worker",
)
async def add_worker(
    contractor_id: UUID,
    body: ContractorWorkerCreate,
    db: DBSession,
    current_user: ManagerUser,
) -> ContractorWorkerResponse:
    c = await _get_or_404(db, contractor_id, current_user.organization_id)
    w = ContractorWorker(
        contractor_id=c.id,
        organization_id=current_user.organization_id,
        first_name=body.first_name,
        last_name=body.last_name,
        id_number=body.id_number,
        position=body.position,
        photo_url=body.photo_url,
        certifications=body.certifications,
        access_sites=body.access_sites,
        induction_completed=body.induction_completed,
        induction_date=body.induction_date,
    )
    db.add(w)
    await db.flush()
    await db.refresh(w)
    return _worker_to_response(w)


@router.put("/{contractor_id}/workers/{worker_id}", response_model=ContractorWorkerResponse, summary="Update worker")
async def update_worker(
    contractor_id: UUID,
    worker_id: UUID,
    body: ContractorWorkerUpdate,
    db: DBSession,
    current_user: ManagerUser,
) -> ContractorWorkerResponse:
    await _get_or_404(db, contractor_id, current_user.organization_id)
    w = await _get_worker_or_404(db, worker_id, contractor_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(w, field, value)
    await db.flush()
    await db.refresh(w)
    return _worker_to_response(w)


@router.post(
    "/{contractor_id}/workers/{worker_id}/induction",
    response_model=ContractorWorkerResponse,
    summary="Record worker induction",
)
async def record_induction(
    contractor_id: UUID,
    worker_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ContractorWorkerResponse:
    """Mark a contractor worker as inducted (safety induction completed)."""
    await _get_or_404(db, contractor_id, current_user.organization_id)
    w = await _get_worker_or_404(db, worker_id, contractor_id)
    w.induction_completed = True
    w.induction_date = datetime.now(UTC)
    await db.flush()
    await db.refresh(w)
    return _worker_to_response(w)


# ── Compliance Report ────────────────────────────────────────────────────────


@router.get(
    "/{contractor_id}/compliance-report",
    response_model=ContractorComplianceReport,
    summary="Contractor compliance report",
)
async def contractor_compliance_report(
    contractor_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ContractorComplianceReport:
    """Return a full compliance report for a contractor."""
    c = await _get_or_404(db, contractor_id, current_user.organization_id)

    workers = (
        (
            await db.execute(
                select(ContractorWorker).where(
                    ContractorWorker.contractor_id == contractor_id,
                    ContractorWorker.is_deleted == False,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )

    total_workers = len(workers)
    active_workers = sum(1 for w in workers if w.is_active)
    inducted = sum(1 for w in workers if w.induction_completed)
    induction_pct = round((inducted / total_workers * 100) if total_workers else 0, 1)

    now = datetime.now(UTC)
    cutoff_expiring = now + timedelta(days=30)
    certs_expiring = 0
    certs_valid = 0
    for w in workers:
        certs = w.certifications if isinstance(w.certifications, list) else []
        for cert in certs:
            expiry_str = cert.get("expiry")
            if expiry_str:
                try:
                    exp = datetime.fromisoformat(expiry_str)
                    if not exp.tzinfo:
                        exp = exp.replace(tzinfo=UTC)
                    if exp < now or exp <= cutoff_expiring:
                        certs_expiring += 1
                    else:
                        certs_valid += 1
                except ValueError:
                    pass

    ins_status = _insurance_status(c.insurance_expiry)
    score = _compute_compliance_score(ins_status, induction_pct, certs_expiring, 0)

    return ContractorComplianceReport(
        contractor_id=c.id,
        contractor_name=c.name,
        status=c.status,
        total_workers=total_workers,
        active_workers=active_workers,
        inducted_workers=inducted,
        induction_pct=induction_pct,
        certifications_valid=certs_valid,
        certifications_expiring=certs_expiring,
        insurance_expiry=c.insurance_expiry,
        insurance_status=ins_status,
        incident_count_ytd=0,  # TODO: wire when Contractor FK added to Incident model
        compliance_score=score,
    )


@router.get("/expiring-documents", response_model=list[dict], summary="Contractors with expiring documents")
async def expiring_documents(
    db: DBSession,
    current_user: ManagerUser,
    days: int = Query(30, ge=1, le=90),
) -> list[dict]:
    """List contractors whose insurance expires within `days` days."""
    org_id = current_user.organization_id
    cutoff = datetime.now(UTC) + timedelta(days=days)

    rows = (
        (
            await db.execute(
                select(Contractor)
                .where(
                    Contractor.organization_id == org_id,
                    Contractor.is_deleted == False,  # noqa: E712
                    Contractor.status == ContractorStatus.APPROVED,
                    Contractor.insurance_expiry.isnot(None),
                    Contractor.insurance_expiry <= cutoff,
                )
                .order_by(Contractor.insurance_expiry)
            )
        )
        .scalars()
        .all()
    )

    now = datetime.now(UTC)
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "insurance_expiry": c.insurance_expiry.isoformat() if c.insurance_expiry else None,
            "days_remaining": (
                (c.insurance_expiry.replace(tzinfo=UTC) if not c.insurance_expiry.tzinfo else c.insurance_expiry) - now
            ).days
            if c.insurance_expiry
            else None,
            "contact_email": c.contact_email,
        }
        for c in rows
    ]


# ── Private helpers ──────────────────────────────────────────────────────────


async def _get_or_404(db: DBSession, contractor_id: UUID, org_id: UUID) -> Contractor:  # type: ignore[valid-type]
    result = await db.execute(
        select(Contractor).where(
            Contractor.id == contractor_id,
            Contractor.organization_id == org_id,
            Contractor.is_deleted == False,  # noqa: E712
        )
    )
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contractor not found")
    return c


async def _get_worker_or_404(db: DBSession, worker_id: UUID, contractor_id: UUID) -> ContractorWorker:  # type: ignore[valid-type]
    result = await db.execute(
        select(ContractorWorker).where(
            ContractorWorker.id == worker_id,
            ContractorWorker.contractor_id == contractor_id,
            ContractorWorker.is_deleted == False,  # noqa: E712
        )
    )
    w = result.scalar_one_or_none()
    if w is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    return w


def _to_response(c: Contractor) -> ContractorResponse:
    return ContractorResponse(
        id=c.id,
        created_at=c.created_at,
        updated_at=c.updated_at,
        organization_id=c.organization_id,
        name=c.name,
        rut_tax_id=c.rut_tax_id,
        country=c.country,
        contact_name=c.contact_name,
        contact_email=c.contact_email,
        contact_phone=c.contact_phone,
        status=c.status,
        insurance_expiry=c.insurance_expiry,
        insurance_url=c.insurance_url,
        certifications=c.certifications if isinstance(c.certifications, list) else [],
        documents=c.documents if isinstance(c.documents, list) else [],
        approved_by=c.approved_by,
        approved_at=c.approved_at,
        suspension_reason=c.suspension_reason,
    )


def _worker_to_response(w: ContractorWorker) -> ContractorWorkerResponse:
    return ContractorWorkerResponse(
        id=w.id,
        created_at=w.created_at,
        updated_at=w.updated_at,
        contractor_id=w.contractor_id,
        organization_id=w.organization_id,
        first_name=w.first_name,
        last_name=w.last_name,
        id_number=w.id_number,
        position=w.position,
        photo_url=w.photo_url,
        certifications=w.certifications if isinstance(w.certifications, list) else [],
        induction_completed=w.induction_completed,
        induction_date=w.induction_date,
        access_sites=w.access_sites if isinstance(w.access_sites, list) else [],
        is_active=w.is_active,
        deactivation_reason=w.deactivation_reason,
    )
