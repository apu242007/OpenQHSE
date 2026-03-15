"""CAPA (Corrective / Preventive Actions) schemas — FASE 5."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema, IDSchema, TimestampSchema

# ── Corrective Action ───────────────────────────────────────


class ActionCreate(BaseSchema):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=5)
    action_type: str = Field(default="corrective", pattern=r"^(corrective|preventive)$")
    priority: str = Field(default="medium", pattern=r"^(critical|high|medium|low)$")
    due_date: datetime | None = None
    assigned_to_id: UUID | None = None
    incident_id: UUID | None = None
    finding_id: UUID | None = None


class ActionUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    due_date: datetime | None = None
    assigned_to_id: UUID | None = None
    verification_notes: str | None = None
    evidence_urls: list[str] | None = None


class ActionResponse(IDSchema, TimestampSchema):
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
    assigned_to_id: UUID | None
    organization_id: UUID


class ActionListItem(IDSchema, TimestampSchema):
    title: str
    action_type: str
    priority: str
    status: str
    due_date: datetime | None
    assigned_to_id: UUID | None
    incident_id: UUID | None
    finding_id: UUID | None


# ── Action Updates (timeline) ───────────────────────────────


class ActionUpdateCreate(BaseSchema):
    comment: str = Field(min_length=1)
    status_change: str | None = None
    attachments: dict[str, Any] | None = None


class ActionUpdateResponse(IDSchema, TimestampSchema):
    action_id: UUID
    user_id: UUID
    comment: str
    status_change: str | None
    attachments: dict[str, Any] | None


# ── Escalation ──────────────────────────────────────────────


class EscalationRequest(BaseSchema):
    reason: str = Field(min_length=5, max_length=1000)
    escalate_to_id: UUID | None = None


# ── Verification ────────────────────────────────────────────


class VerificationRequest(BaseSchema):
    notes: str = Field(min_length=5, max_length=2000)
    evidence_urls: list[str] | None = None
    is_effective: bool = True


# ── Effectiveness Check ─────────────────────────────────────


class EffectivenessCheckRequest(BaseSchema):
    notes: str = Field(min_length=5, max_length=2000)
    is_effective: bool
    re_open: bool = False


# ── Bulk Assign ─────────────────────────────────────────────


class BulkAssignRequest(BaseSchema):
    action_ids: list[UUID]
    assigned_to_id: UUID


# ── Kanban board summary ────────────────────────────────────


class KanbanColumn(BaseSchema):
    status: str
    label: str
    count: int
    items: list[ActionListItem]


class KanbanBoard(BaseSchema):
    columns: list[KanbanColumn]
    total: int


# ── Statistics ──────────────────────────────────────────────


class ActionStatistics(BaseSchema):
    total: int
    open: int
    in_progress: int
    completed: int
    verified: int
    overdue: int
    by_priority: dict[str, int]
    by_type: dict[str, int]
    avg_days_to_close: float
    overdue_rate: float
