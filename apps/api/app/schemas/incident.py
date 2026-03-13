"""Incident schemas — expanded for FASE 4."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.models.incident import IncidentSeverity, IncidentStatus, IncidentType
from app.schemas.common import BaseSchema, IDSchema, TimestampSchema


class IncidentCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=10)
    incident_type: IncidentType
    severity: IncidentSeverity
    occurred_at: datetime
    site_id: UUID
    area_id: UUID | None = None
    location_description: str | None = None
    gps_latitude: float | None = None
    gps_longitude: float | None = None
    injuries_count: int = 0
    fatalities_count: int = 0
    immediate_actions: str | None = None
    evidence_urls: list[str] | None = None


class IncidentUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None
    root_cause_analysis: str | None = None
    assigned_investigator_id: UUID | None = None
    evidence_urls: list[str] | None = None
    witness_statements: dict[str, Any] | None = None
    investigation: dict[str, Any] | None = None
    lessons_learned: str | None = None


class IncidentResponse(IDSchema, TimestampSchema):
    reference_number: str
    title: str
    description: str
    incident_type: IncidentType
    severity: IncidentSeverity
    status: IncidentStatus
    occurred_at: datetime
    reported_at: datetime
    location_description: str | None
    gps_latitude: float | None
    gps_longitude: float | None
    injuries_count: int
    fatalities_count: int
    immediate_actions: str | None
    root_cause_analysis: str | None
    evidence_urls: list[str] | None
    organization_id: UUID
    site_id: UUID
    area_id: UUID | None
    reported_by_id: UUID
    assigned_investigator_id: UUID | None


class IncidentListResponse(BaseSchema):
    total: int
    page: int
    page_size: int
    items: list[IncidentResponse]


# ── Corrective Actions ────────────────────────────────────────

class CorrectiveActionCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=255)
    description: str
    action_type: str = "corrective"
    priority: str = "medium"
    due_date: datetime | None = None
    assigned_to_id: UUID
    incident_id: UUID | None = None
    finding_id: UUID | None = None


class CorrectiveActionUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    due_date: datetime | None = None
    verification_notes: str | None = None
    evidence_urls: list[str] | None = None


class CorrectiveActionResponse(IDSchema, TimestampSchema):
    title: str
    description: str
    action_type: str
    priority: str
    status: str
    due_date: datetime | None
    completed_at: datetime | None
    verification_notes: str | None
    evidence_urls: list[str] | None
    incident_id: UUID | None
    finding_id: UUID | None
    assigned_to_id: UUID
    organization_id: UUID


# ── Witness ───────────────────────────────────────────────────

class WitnessCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    statement: str | None = None
    contact: str | None = None


class WitnessResponse(IDSchema, TimestampSchema):
    incident_id: UUID
    name: str
    statement: str | None
    contact: str | None


# ── Attachment ────────────────────────────────────────────────

class AttachmentCreate(BaseSchema):
    file_url: str
    file_type: str
    description: str | None = None


class AttachmentResponse(IDSchema, TimestampSchema):
    incident_id: UUID
    file_url: str
    file_type: str
    description: str | None
    uploaded_by: UUID


# ── Timeline ──────────────────────────────────────────────────

class TimelineEventCreate(BaseSchema):
    event_type: str = "comment"
    title: str
    description: str | None = None


class TimelineEventResponse(IDSchema, TimestampSchema):
    event_type: str
    title: str
    description: str | None
