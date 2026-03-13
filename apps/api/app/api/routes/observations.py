"""BBS — Behavior Based Safety Observations endpoints — Phase 9."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, func, select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.observation import BehaviorObservation, ObservationCategory, ObservationStatus, ObservationType
from app.schemas.observation import (
    ObservationCategoryCount,
    ObservationCreate,
    ObservationListResponse,
    ObservationMonthlyTrend,
    ObservationResponse,
    ObservationStats,
    ObservationTopArea,
    ObservationUpdate,
)

router = APIRouter(prefix="/observations", tags=["BBS Observations"])

MONTH_LABELS_ES = [
    "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]


# ── List / Create ────────────────────────────────────────────────────────────


@router.get("", response_model=ObservationListResponse, summary="List BBS observations")
async def list_observations(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    obs_type: ObservationType | None = Query(None, alias="type"),
    category: ObservationCategory | None = Query(None),
    obs_status: ObservationStatus | None = Query(None, alias="status"),
    site_id: UUID | None = Query(None),
    observer_id: UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
) -> ObservationListResponse:
    org_id = current_user.organization_id
    filters = [
        BehaviorObservation.organization_id == org_id,
        BehaviorObservation.is_deleted == False,  # noqa: E712
    ]

    if obs_type:
        filters.append(BehaviorObservation.type == obs_type)
    if category:
        filters.append(BehaviorObservation.category == category)
    if obs_status:
        filters.append(BehaviorObservation.status == obs_status)
    if site_id:
        filters.append(BehaviorObservation.site_id == site_id)
    if observer_id:
        filters.append(BehaviorObservation.observer_id == observer_id)
    if date_from:
        filters.append(BehaviorObservation.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        filters.append(BehaviorObservation.created_at <= datetime.combine(date_to, datetime.max.time()))

    total = (await db.execute(
        select(func.count()).select_from(BehaviorObservation).where(and_(*filters))
    )).scalar() or 0

    rows = (await db.execute(
        select(BehaviorObservation)
        .where(and_(*filters))
        .order_by(BehaviorObservation.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )).scalars().all()

    page_size = pagination.page_size
    page = pagination.page
    return ObservationListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
        items=[_to_response(o) for o in rows],
    )


@router.post("", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED, summary="Create BBS observation")
async def create_observation(
    body: ObservationCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ObservationResponse:
    """Submit a new behavior observation (anyone can submit)."""
    obs = BehaviorObservation(
        organization_id=current_user.organization_id,
        site_id=body.site_id,
        type=body.type,
        category=body.category,
        description=body.description,
        area=body.area,
        task_being_performed=body.task_being_performed,
        observer_id=current_user.id,
        is_anonymous=body.is_anonymous,
        observed_person_id=body.observed_person_id,
        observed_contractor_worker_id=body.observed_contractor_worker_id,
        positive_feedback=body.positive_feedback,
        improvement_feedback=body.improvement_feedback,
        photos=body.photos,
        status=ObservationStatus.OPEN,
        latitude=body.latitude,
        longitude=body.longitude,
    )
    db.add(obs)
    await db.flush()
    await db.refresh(obs)
    return _to_response(obs)


# ── Detail / Update / Delete ─────────────────────────────────────────────────


@router.get("/{observation_id}", response_model=ObservationResponse, summary="Get observation")
async def get_observation(
    observation_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> ObservationResponse:
    obs = await _get_or_404(db, observation_id, current_user.organization_id)
    return _to_response(obs)


@router.put("/{observation_id}", response_model=ObservationResponse, summary="Update observation")
async def update_observation(
    observation_id: UUID,
    body: ObservationUpdate,
    db: DBSession,
    current_user: ManagerUser,
) -> ObservationResponse:
    obs = await _get_or_404(db, observation_id, current_user.organization_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(obs, field, value)
    await db.flush()
    await db.refresh(obs)
    return _to_response(obs)


@router.delete("/{observation_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete observation")
async def delete_observation(
    observation_id: UUID,
    db: DBSession,
    current_user: ManagerUser,
) -> None:
    obs = await _get_or_404(db, observation_id, current_user.organization_id)
    obs.is_deleted = True
    await db.flush()


# ── Status transitions ───────────────────────────────────────────────────────


@router.post("/{observation_id}/review", response_model=ObservationResponse, summary="Start reviewing observation")
async def start_review(
    observation_id: UUID,
    db: DBSession,
    current_user: ManagerUser,
) -> ObservationResponse:
    obs = await _get_or_404(db, observation_id, current_user.organization_id)
    if obs.status != ObservationStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only OPEN observations can be moved to IN_REVIEW",
        )
    obs.status = ObservationStatus.IN_REVIEW
    await db.flush()
    await db.refresh(obs)
    return _to_response(obs)


@router.post("/{observation_id}/close", response_model=ObservationResponse, summary="Close observation")
async def close_observation(
    observation_id: UUID,
    db: DBSession,
    current_user: ManagerUser,
) -> ObservationResponse:
    obs = await _get_or_404(db, observation_id, current_user.organization_id)
    obs.status = ObservationStatus.CLOSED
    await db.flush()
    await db.refresh(obs)
    return _to_response(obs)


# ── Statistics ───────────────────────────────────────────────────────────────


@router.get("/statistics", response_model=ObservationStats, summary="BBS observation statistics")
async def observation_statistics(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
    months: int = Query(6, ge=1, le=24),
) -> ObservationStats:
    """Return BBS KPIs: safe/unsafe ratio, category breakdown, monthly trend."""
    org_id = current_user.organization_id
    today = date.today()
    start_date = (today.replace(day=1) - timedelta(days=months * 30)).replace(day=1)

    base_filters = [
        BehaviorObservation.organization_id == org_id,
        BehaviorObservation.is_deleted == False,  # noqa: E712
        BehaviorObservation.created_at >= datetime.combine(start_date, datetime.min.time()),
    ]
    if site_id:
        base_filters.append(BehaviorObservation.site_id == site_id)

    # All observations in period
    rows = (await db.execute(
        select(
            BehaviorObservation.type,
            BehaviorObservation.category,
            BehaviorObservation.area,
            BehaviorObservation.created_at,
        ).where(and_(*base_filters))
    )).all()

    total = len(rows)
    safe_count = sum(1 for r in rows if r.type == ObservationType.SAFE)
    unsafe_count = sum(1 for r in rows if r.type == ObservationType.UNSAFE)
    near_miss_count = sum(1 for r in rows if r.type == ObservationType.NEAR_MISS_BEHAVIOR)

    # Monthly trend
    monthly: dict[str, dict] = {}
    cursor = start_date
    while cursor <= today:
        key = cursor.strftime("%Y-%m")
        monthly[key] = {
            "month": key,
            "label": f"{MONTH_LABELS_ES[cursor.month]} {cursor.year}",
            "safe": 0, "unsafe": 0, "near_miss": 0, "total": 0,
        }
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    for r_type, _cat, _area, created_at in rows:
        if created_at is None:
            continue
        key = created_at.strftime("%Y-%m") if hasattr(created_at, "strftime") else str(created_at)[:7]
        if key not in monthly:
            continue
        monthly[key]["total"] += 1
        if r_type == ObservationType.SAFE:
            monthly[key]["safe"] += 1
        elif r_type == ObservationType.UNSAFE:
            monthly[key]["unsafe"] += 1
        elif r_type == ObservationType.NEAR_MISS_BEHAVIOR:
            monthly[key]["near_miss"] += 1

    monthly_trend = [
        ObservationMonthlyTrend(
            month=v["month"], label=v["label"],
            safe=v["safe"], unsafe=v["unsafe"], near_miss=v["near_miss"], total=v["total"],
            participation_rate=round(v["total"] / 100, 2),  # placeholder rate per 100 employees
        )
        for v in monthly.values()
    ]

    # By category
    cat_map: dict[str, dict] = {}
    for cat in ObservationCategory:
        cat_map[cat.value] = {"safe": 0, "unsafe": 0, "near_miss": 0}
    for r_type, r_cat, _area, _ts in rows:
        key = r_cat.value if hasattr(r_cat, "value") else str(r_cat)
        if key not in cat_map:
            continue
        if r_type == ObservationType.SAFE:
            cat_map[key]["safe"] += 1
        elif r_type == ObservationType.UNSAFE:
            cat_map[key]["unsafe"] += 1
        elif r_type == ObservationType.NEAR_MISS_BEHAVIOR:
            cat_map[key]["near_miss"] += 1

    by_category = [
        ObservationCategoryCount(
            category=ObservationCategory(cat_key),
            safe_count=v["safe"],
            unsafe_count=v["unsafe"],
            near_miss_count=v["near_miss"],
            total=v["safe"] + v["unsafe"] + v["near_miss"],
        )
        for cat_key, v in cat_map.items()
        if v["safe"] + v["unsafe"] + v["near_miss"] > 0
    ]

    # Top unsafe areas
    area_unsafe: dict[str, int] = defaultdict(int)
    area_total: dict[str, int] = defaultdict(int)
    for r_type, _cat, r_area, _ts in rows:
        if r_area:
            area_total[r_area] += 1
            if r_type == ObservationType.UNSAFE:
                area_unsafe[r_area] += 1

    top_unsafe_areas = sorted(
        [
            ObservationTopArea(
                area=area,
                total=area_total[area],
                unsafe_count=area_unsafe[area],
                unsafe_pct=round(area_unsafe[area] / area_total[area] * 100, 1) if area_total[area] else 0,
            )
            for area in area_unsafe
        ],
        key=lambda x: x.unsafe_count,
        reverse=True,
    )[:5]

    return ObservationStats(
        total=total,
        safe_count=safe_count,
        unsafe_count=unsafe_count,
        near_miss_count=near_miss_count,
        safe_pct=round(safe_count / total * 100, 1) if total else 0,
        unsafe_pct=round(unsafe_count / total * 100, 1) if total else 0,
        participation_index=round(total / 100, 2),  # placeholder
        monthly_trend=monthly_trend,
        by_category=by_category,
        top_unsafe_areas=top_unsafe_areas,
        period_start=start_date.isoformat(),
        period_end=today.isoformat(),
    )


@router.get("/unsafe-trends", response_model=list[dict], summary="Top unsafe behavior categories")
async def unsafe_trends(
    db: DBSession,
    current_user: CurrentUser,
    site_id: UUID | None = Query(None),
    days: int = Query(90, ge=7, le=365),
) -> list[dict]:
    """Return the top 5 categories driving unsafe observations."""
    org_id = current_user.organization_id
    since = datetime.now(UTC) - timedelta(days=days)

    filters = [
        BehaviorObservation.organization_id == org_id,
        BehaviorObservation.is_deleted == False,  # noqa: E712
        BehaviorObservation.type == ObservationType.UNSAFE,
        BehaviorObservation.created_at >= since,
    ]
    if site_id:
        filters.append(BehaviorObservation.site_id == site_id)

    rows = (await db.execute(
        select(BehaviorObservation.category, func.count().label("cnt"))
        .where(and_(*filters))
        .group_by(BehaviorObservation.category)
        .order_by(func.count().desc())
        .limit(5)
    )).all()

    return [{"category": str(cat), "count": cnt} for cat, cnt in rows]


# ── Private helpers ──────────────────────────────────────────────────────────


async def _get_or_404(db: DBSession, obs_id: UUID, org_id: UUID) -> BehaviorObservation:  # type: ignore[valid-type]
    result = await db.execute(
        select(BehaviorObservation).where(
            BehaviorObservation.id == obs_id,
            BehaviorObservation.organization_id == org_id,
            BehaviorObservation.is_deleted == False,  # noqa: E712
        )
    )
    obs = result.scalar_one_or_none()
    if obs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found")
    return obs


def _to_response(o: BehaviorObservation) -> ObservationResponse:
    return ObservationResponse(
        id=o.id, created_at=o.created_at, updated_at=o.updated_at,
        organization_id=o.organization_id, site_id=o.site_id,
        type=o.type, category=o.category, description=o.description,
        area=o.area, task_being_performed=o.task_being_performed,
        observer_id=o.observer_id, is_anonymous=o.is_anonymous,
        observed_person_id=o.observed_person_id,
        observed_contractor_worker_id=o.observed_contractor_worker_id,
        positive_feedback=o.positive_feedback, improvement_feedback=o.improvement_feedback,
        photos=o.photos if isinstance(o.photos, list) else [],
        status=o.status, action_id=o.action_id,
        latitude=o.latitude, longitude=o.longitude,
    )
