"""Pydantic schemas for form templates and submissions."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    import uuid
    from datetime import datetime

# ── Form Template ─────────────────────────────────────────────


class QuestionSchema(BaseModel):
    """Single question within a form section."""

    id: str
    text: str
    type: str = Field(
        ...,
        description="text | number | boolean | single_choice | multi_choice | photo | signature | date | gps",
    )
    required: bool = True
    options: list[str] | None = None
    weight: float = 1.0
    help_text: str | None = None


class SectionSchema(BaseModel):
    """Section grouping related questions."""

    title: str
    order: int = 0
    questions: list[QuestionSchema]


class ScoringConfigSchema(BaseModel):
    method: str = "weighted"
    max_score: float = 100.0
    pass_threshold: float = 70.0


class FormTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: str
    site_id: uuid.UUID | None = None
    is_global: bool = False
    tags: list[str] | None = None
    schema_def: dict  # Full JSON schema
    scoring_config: ScoringConfigSchema | None = None


class FormTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    schema_def: dict | None = None
    scoring_config: ScoringConfigSchema | None = None


class FormTemplateRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    category: str
    version: int
    status: str
    is_global: bool
    tags: list[str] | None
    schema_def: dict
    scoring_config: dict | None
    organization_id: uuid.UUID
    site_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FormTemplateList(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    version: int
    status: str
    is_global: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Form Submission ───────────────────────────────────────────


class FormSubmissionCreate(BaseModel):
    template_id: uuid.UUID
    site_id: uuid.UUID
    data: dict
    gps_latitude: float | None = None
    gps_longitude: float | None = None
    device_info: dict | None = None
    offline_id: str | None = None


class FormSubmissionUpdate(BaseModel):
    data: dict | None = None
    status: str | None = None


class FormSubmissionRead(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID
    submitted_by: uuid.UUID
    submitted_at: datetime | None
    data: dict
    score: float | None
    max_score: float | None
    percentage: float | None
    status: str
    gps_latitude: float | None
    gps_longitude: float | None
    offline_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FormSubmissionList(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    status: str
    score: float | None
    percentage: float | None
    submitted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Form Attachment ───────────────────────────────────────────


class FormAttachmentCreate(BaseModel):
    submission_id: uuid.UUID
    field_key: str
    file_url: str
    file_type: str
    file_size: int = 0


class FormAttachmentRead(BaseModel):
    id: uuid.UUID
    submission_id: uuid.UUID
    field_key: str
    file_url: str
    file_type: str
    file_size: int
    ocr_text: str | None
    ai_analysis: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
