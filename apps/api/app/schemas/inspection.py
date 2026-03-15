"""Inspection & Finding schemas — expanded for FASE 4."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.models.inspection import FindingSeverity, FindingStatus, InspectionStatus
from app.schemas.common import BaseSchema, IDSchema, TimestampSchema

# ── Template ──────────────────────────────────────────────────


class TemplateQuestionSchema(BaseSchema):
    id: str
    text: str
    question_type: str = Field(description="text | number | yes_no | multiple_choice | photo | signature | date")
    required: bool = True
    options: list[str] | None = None
    weight: float = 1.0
    guidance: str | None = None


class TemplateSectionSchema(BaseSchema):
    id: str
    title: str
    order: int
    questions: list[TemplateQuestionSchema]


class TemplateSchemaDefinition(BaseSchema):
    sections: list[TemplateSectionSchema]


class InspectionTemplateCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: str = Field(min_length=1, max_length=50)
    tags: list[str] | None = None
    schema_definition: TemplateSchemaDefinition


class InspectionTemplateUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    is_published: bool | None = None
    schema_definition: TemplateSchemaDefinition | None = None


class InspectionTemplateResponse(IDSchema, TimestampSchema):
    title: str
    description: str | None
    category: str
    version: int
    is_published: bool
    is_global: bool
    tags: list[str] | None
    schema_definition: dict[str, Any]
    organization_id: UUID | None


# ── Inspection ────────────────────────────────────────────────


class InspectionCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=255)
    template_id: UUID
    site_id: UUID
    area_id: UUID | None = None
    inspector_id: UUID | None = None
    scheduled_date: datetime | None = None
    notes: str | None = None


class InspectionUpdate(BaseSchema):
    status: InspectionStatus | None = None
    notes: str | None = None
    score: float | None = None
    max_score: float | None = None
    responses: dict[str, Any] | None = None
    gps_latitude: float | None = None
    gps_longitude: float | None = None


class InspectionResponse(IDSchema, TimestampSchema):
    title: str
    reference_number: str
    status: InspectionStatus
    scheduled_date: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    score: float | None
    max_score: float | None
    notes: str | None
    gps_latitude: float | None
    gps_longitude: float | None
    responses: dict[str, Any]
    template_id: UUID
    organization_id: UUID
    site_id: UUID
    area_id: UUID | None
    inspector_id: UUID


class InspectionListResponse(BaseSchema):
    total: int
    page: int
    page_size: int
    items: list[InspectionResponse]


# ── Bulk Schedule ─────────────────────────────────────────────


class BulkScheduleRequest(BaseSchema):
    template_id: UUID
    site_id: UUID
    area_id: UUID | None = None
    inspector_id: UUID
    frequency: str = Field(description="once | daily | weekly | biweekly | monthly | quarterly | custom")
    start_date: datetime
    end_date: datetime | None = None
    custom_days: int | None = None
    title_prefix: str | None = "Inspección programada"


# ── Finding ───────────────────────────────────────────────────


class FindingCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    severity: FindingSeverity = FindingSeverity.MEDIUM
    due_date: datetime | None = None
    assigned_to_id: UUID | None = None
    evidence_urls: list[str] | None = None
    inspection_id: UUID


class FindingUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    severity: FindingSeverity | None = None
    status: FindingStatus | None = None
    due_date: datetime | None = None
    assigned_to_id: UUID | None = None
    corrective_action: str | None = None
    root_cause: str | None = None
    evidence_urls: list[str] | None = None


class FindingResponse(IDSchema, TimestampSchema):
    title: str
    description: str | None
    severity: FindingSeverity
    status: FindingStatus
    due_date: datetime | None
    resolved_at: datetime | None
    evidence_urls: list[str] | None
    corrective_action: str | None
    root_cause: str | None
    inspection_id: UUID
    assigned_to_id: UUID | None
    organization_id: UUID
