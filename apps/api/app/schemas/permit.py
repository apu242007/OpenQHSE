"""Pydantic schemas for work permits."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    import uuid
    from datetime import datetime


class WorkPermitCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    permit_type: str
    description: str
    site_id: uuid.UUID
    area_id: uuid.UUID | None = None
    hazards_identified: list[str] | None = None
    precautions: list[str] | None = None
    ppe_required: list[str] | None = None
    valid_from: datetime
    valid_until: datetime
    checklist_data: dict[str, Any] | None = None


class WorkPermitUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    hazards_identified: list[str] | None = None
    precautions: list[str] | None = None
    ppe_required: list[str] | None = None
    valid_until: datetime | None = None
    checklist_data: dict[str, Any] | None = None
    signatures: dict[str, Any] | None = None


class WorkPermitRead(BaseModel):
    id: uuid.UUID
    reference_number: str
    title: str
    permit_type: str
    status: str
    description: str
    hazards_identified: list[str] | None
    precautions: list[str] | None
    ppe_required: list[str] | None
    valid_from: datetime
    valid_until: datetime
    approved_at: datetime | None
    closed_at: datetime | None
    checklist_data: dict[str, Any] | None
    signatures: dict[str, Any] | None
    organization_id: uuid.UUID
    site_id: uuid.UUID
    area_id: uuid.UUID | None
    requested_by_id: uuid.UUID
    approved_by_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkPermitList(BaseModel):
    id: uuid.UUID
    reference_number: str
    title: str
    permit_type: str
    status: str
    valid_from: datetime
    valid_until: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Permit Extension ─────────────────────────────────────────


class PermitExtensionCreate(BaseModel):
    permit_id: uuid.UUID
    new_end_datetime: datetime
    reason: str


class PermitExtensionRead(BaseModel):
    id: uuid.UUID
    permit_id: uuid.UUID
    new_end_datetime: datetime
    reason: str
    approved_by: uuid.UUID | None
    approved_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
