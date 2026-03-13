"""BehaviorObservation (BBS) Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.models.observation import ObservationCategory, ObservationStatus, ObservationType
from app.schemas.common import BaseSchema, IDSchema, PaginatedResponse, TimestampSchema


# ── Create / Update ────────────────────────────────────────────────────────


class ObservationCreate(BaseSchema):
    type: ObservationType
    category: ObservationCategory
    description: str
    area: str | None = None
    task_being_performed: str | None = None
    site_id: UUID | None = None
    is_anonymous: bool = False
    observed_person_id: UUID | None = None
    observed_contractor_worker_id: UUID | None = None
    positive_feedback: str | None = None
    improvement_feedback: str | None = None
    photos: list[str] = []
    latitude: float | None = None
    longitude: float | None = None


class ObservationUpdate(BaseSchema):
    category: ObservationCategory | None = None
    description: str | None = None
    area: str | None = None
    task_being_performed: str | None = None
    positive_feedback: str | None = None
    improvement_feedback: str | None = None
    status: ObservationStatus | None = None
    action_id: UUID | None = None
    photos: list[str] | None = None


# ── Response ───────────────────────────────────────────────────────────────


class ObservationResponse(IDSchema, TimestampSchema):
    organization_id: UUID
    site_id: UUID | None
    type: ObservationType
    category: ObservationCategory
    description: str
    area: str | None
    task_being_performed: str | None
    observer_id: UUID
    is_anonymous: bool
    observed_person_id: UUID | None
    observed_contractor_worker_id: UUID | None
    positive_feedback: str | None
    improvement_feedback: str | None
    photos: list[str]
    status: ObservationStatus
    action_id: UUID | None
    latitude: float | None
    longitude: float | None


class ObservationListResponse(PaginatedResponse):
    items: list[ObservationResponse]  # type: ignore[assignment]


# ── Statistics ─────────────────────────────────────────────────────────────


class ObservationCategoryCount(BaseSchema):
    category: ObservationCategory
    safe_count: int
    unsafe_count: int
    near_miss_count: int
    total: int


class ObservationMonthlyTrend(BaseSchema):
    month: str          # "YYYY-MM"
    label: str          # "Ene 2025"
    safe: int
    unsafe: int
    near_miss: int
    total: int
    participation_rate: float  # observations per 100 employees


class ObservationTopArea(BaseSchema):
    area: str
    total: int
    unsafe_count: int
    unsafe_pct: float


class ObservationStats(BaseSchema):
    total: int
    safe_count: int
    unsafe_count: int
    near_miss_count: int
    safe_pct: float
    unsafe_pct: float
    # BBS participation index (observations / workers)
    participation_index: float
    # Monthly trend (last 6 months)
    monthly_trend: list[ObservationMonthlyTrend]
    # By category
    by_category: list[ObservationCategoryCount]
    # Top unsafe areas (up to 5)
    top_unsafe_areas: list[ObservationTopArea]
    # Period
    period_start: str
    period_end: str
