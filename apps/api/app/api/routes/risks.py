"""Risk management endpoints: Risk Register, HAZOP, Bow-Tie."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.risk import (
    BowTie,
    HazopNode,
    HazopStudy,
    HazopStatus,
    RiskRegister,
    RiskStatus,
    RiskType,
)
from app.schemas.risk import (
    BowTieCreate,
    BowTieRead,
    BowTieUpdate,
    HazopNodeCreate,
    HazopNodeRead,
    HazopStudyCreate,
    HazopStudyRead,
    HazopStudyUpdate,
    RiskRegisterCreate,
    RiskRegisterList,
    RiskRegisterRead,
    RiskRegisterUpdate,
)
from app.services import risk_service

router = APIRouter(prefix="/risks", tags=["Risk Management"])


# ── 5×5 Risk Matrix ──────────────────────────────────────────


@router.get(
    "/matrix",
    summary="Get 5×5 risk matrix data",
)
async def risk_matrix(
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    return await risk_service.get_risk_matrix(db, current_user.organization_id)


@router.get(
    "/statistics",
    summary="Get risk statistics",
)
async def risk_statistics(
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    return await risk_service.get_risk_statistics(db, current_user.organization_id)


# ── Risk Register ─────────────────────────────────────────────


@router.get(
    "",
    response_model=list[RiskRegisterList],
    summary="List risk register entries",
)
async def list_risks(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    risk_type: RiskType | None = None,
    site_id: UUID | None = None,
    risk_status: RiskStatus | None = Query(None, alias="status"),
) -> list[RiskRegisterList]:
    query = select(RiskRegister).where(
        RiskRegister.organization_id == current_user.organization_id,
        RiskRegister.is_deleted == False,  # noqa: E712
    )
    if risk_type:
        query = query.where(RiskRegister.risk_type == risk_type)
    if site_id:
        query = query.where(RiskRegister.site_id == site_id)
    if risk_status:
        query = query.where(RiskRegister.status == risk_status)

    result = await db.execute(
        query.order_by(RiskRegister.inherent_rating.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    risks = result.scalars().all()
    return [RiskRegisterList.model_validate(r) for r in risks]


@router.post(
    "",
    response_model=RiskRegisterRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a risk register entry",
)
async def create_risk(
    body: RiskRegisterCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> RiskRegisterRead:
    risk = RiskRegister(
        organization_id=current_user.organization_id,
        site_id=body.site_id,
        area=body.area,
        process=body.process,
        hazard_description=body.hazard_description,
        hazard_category=body.hazard_category,
        risk_type=body.risk_type,
        inherent_likelihood=body.inherent_likelihood,
        inherent_severity=body.inherent_severity,
        inherent_rating=body.inherent_likelihood * body.inherent_severity,
        controls=[c.model_dump() for c in body.controls],
        residual_likelihood=body.residual_likelihood,
        residual_severity=body.residual_severity,
        residual_rating=body.residual_likelihood * body.residual_severity,
        risk_owner=body.risk_owner,
        review_date=body.review_date,
        legal_requirement=body.legal_requirement,
        applicable_standard=body.applicable_standard,
        created_by=str(current_user.id),
    )
    db.add(risk)
    await db.flush()
    await db.refresh(risk)
    return RiskRegisterRead.model_validate(risk)


@router.get(
    "/{risk_id}",
    response_model=RiskRegisterRead,
    summary="Get risk register entry detail",
)
async def get_risk(
    risk_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> RiskRegisterRead:
    result = await db.execute(
        select(RiskRegister).where(
            RiskRegister.id == risk_id,
            RiskRegister.organization_id == current_user.organization_id,
        )
    )
    risk = result.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk entry not found")
    return RiskRegisterRead.model_validate(risk)


@router.patch(
    "/{risk_id}",
    response_model=RiskRegisterRead,
    summary="Update a risk register entry",
)
async def update_risk(
    risk_id: UUID,
    body: RiskRegisterUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> RiskRegisterRead:
    result = await db.execute(
        select(RiskRegister).where(
            RiskRegister.id == risk_id,
            RiskRegister.organization_id == manager.organization_id,
        )
    )
    risk = result.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk entry not found")

    update_data = body.model_dump(exclude_unset=True)
    if "controls" in update_data and update_data["controls"] is not None:
        update_data["controls"] = [c.model_dump() for c in body.controls]  # type: ignore[union-attr]

    # Recalculate ratings if likelihood/severity changed
    il = update_data.get("inherent_likelihood", risk.inherent_likelihood)
    is_ = update_data.get("inherent_severity", risk.inherent_severity)
    update_data["inherent_rating"] = il * is_

    rl = update_data.get("residual_likelihood", risk.residual_likelihood)
    rs = update_data.get("residual_severity", risk.residual_severity)
    update_data["residual_rating"] = rl * rs

    for field, value in update_data.items():
        setattr(risk, field, value)
    risk.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(risk)
    return RiskRegisterRead.model_validate(risk)


# ── HAZOP Studies ─────────────────────────────────────────────


@router.get(
    "/hazop",
    response_model=list[HazopStudyRead],
    summary="List HAZOP studies",
)
async def list_hazop_studies(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
) -> list[HazopStudyRead]:
    result = await db.execute(
        select(HazopStudy)
        .where(
            HazopStudy.organization_id == current_user.organization_id,
            HazopStudy.is_deleted == False,  # noqa: E712
        )
        .order_by(HazopStudy.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    studies = result.scalars().all()
    return [HazopStudyRead.model_validate(s) for s in studies]


@router.post(
    "/hazop",
    response_model=HazopStudyRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a HAZOP study",
)
async def create_hazop_study(
    body: HazopStudyCreate,
    db: DBSession,
    manager: ManagerUser,
) -> HazopStudyRead:
    study = HazopStudy(
        organization_id=manager.organization_id,
        site_id=body.site_id,
        name=body.name,
        system_description=body.system_description,
        p_and_id_url=body.p_and_id_url,
        team_members=body.team_members,
        facilitator_id=body.facilitator_id,
        created_by=str(manager.id),
    )
    db.add(study)
    await db.flush()
    await db.refresh(study)
    return HazopStudyRead.model_validate(study)


@router.patch(
    "/hazop/{study_id}",
    response_model=HazopStudyRead,
    summary="Update a HAZOP study",
)
async def update_hazop_study(
    study_id: UUID,
    body: HazopStudyUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> HazopStudyRead:
    result = await db.execute(
        select(HazopStudy).where(
            HazopStudy.id == study_id,
            HazopStudy.organization_id == manager.organization_id,
        )
    )
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HAZOP study not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(study, field, value)
    study.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(study)
    return HazopStudyRead.model_validate(study)


@router.get(
    "/hazop/{study_id}",
    response_model=HazopStudyRead,
    summary="Get HAZOP study detail with nodes",
)
async def get_hazop_study(
    study_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> HazopStudyRead:
    study = await risk_service.get_hazop_detail(db, study_id, current_user.organization_id)
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HAZOP study not found")
    return HazopStudyRead.model_validate(study)


@router.post(
    "/hazop/{study_id}/nodes",
    response_model=HazopNodeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a node to a HAZOP study",
)
async def create_hazop_node(
    study_id: UUID,
    body: HazopNodeCreate,
    db: DBSession,
    manager: ManagerUser,
) -> HazopNodeRead:
    node = HazopNode(
        study_id=study_id,
        node_name=body.node_name,
        design_intent=body.design_intent,
        guide_word=body.guide_word,
        deviation=body.deviation,
        causes=body.causes,
        consequences=body.consequences,
        safeguards=body.safeguards,
        risk_rating=body.risk_rating,
        recommendations=body.recommendations,
        created_by=str(manager.id),
    )
    db.add(node)
    await db.flush()
    await db.refresh(node)
    return HazopNodeRead.model_validate(node)


# ── Bow-Tie ───────────────────────────────────────────────────


@router.get(
    "/bowtie",
    response_model=list[BowTieRead],
    summary="List Bow-Tie analyses",
)
async def list_bowties(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
) -> list[BowTieRead]:
    result = await db.execute(
        select(BowTie)
        .where(
            BowTie.organization_id == current_user.organization_id,
            BowTie.is_deleted == False,  # noqa: E712
        )
        .order_by(BowTie.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    bowties = result.scalars().all()
    return [BowTieRead.model_validate(b) for b in bowties]


@router.get(
    "/bowtie/{bowtie_id}",
    response_model=BowTieRead,
    summary="Get Bow-Tie detail",
)
async def get_bowtie(
    bowtie_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> BowTieRead:
    bowtie = await risk_service.get_bowtie_detail(db, bowtie_id, current_user.organization_id)
    if not bowtie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow-Tie not found")
    return BowTieRead.model_validate(bowtie)


@router.post(
    "/bowtie",
    response_model=BowTieRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Bow-Tie analysis",
)
async def create_bowtie(
    body: BowTieCreate,
    db: DBSession,
    manager: ManagerUser,
) -> BowTieRead:
    bowtie = BowTie(
        organization_id=manager.organization_id,
        site_id=body.site_id,
        top_event=body.top_event,
        hazard=body.hazard,
        threats=body.threats,
        consequences=body.consequences,
        prevention_barriers=body.prevention_barriers,
        mitigation_barriers=body.mitigation_barriers,
        critical_controls=body.critical_controls,
        created_by=str(manager.id),
    )
    db.add(bowtie)
    await db.flush()
    await db.refresh(bowtie)
    return BowTieRead.model_validate(bowtie)


@router.patch(
    "/bowtie/{bowtie_id}",
    response_model=BowTieRead,
    summary="Update a Bow-Tie analysis",
)
async def update_bowtie(
    bowtie_id: UUID,
    body: BowTieUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> BowTieRead:
    result = await db.execute(
        select(BowTie).where(
            BowTie.id == bowtie_id,
            BowTie.organization_id == manager.organization_id,
        )
    )
    bowtie = result.scalar_one_or_none()
    if not bowtie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bow-Tie not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bowtie, field, value)
    bowtie.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(bowtie)
    return BowTieRead.model_validate(bowtie)
