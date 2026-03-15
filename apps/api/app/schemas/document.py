"""Pydantic schemas for document management."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    import uuid
    from datetime import datetime

# ── Document ──────────────────────────────────────────────────


class DocumentCreate(BaseModel):
    site_id: uuid.UUID | None = None
    doc_type: str
    code: str = Field(..., max_length=50)
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    file_url: str
    file_size: int = 0
    file_type: str
    approver_id: uuid.UUID | None = None
    effective_date: datetime | None = None
    review_date: datetime | None = None
    expiry_date: datetime | None = None
    distribution_list: list[dict] | None = None


class DocumentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    approver_id: uuid.UUID | None = None
    review_date: datetime | None = None
    expiry_date: datetime | None = None
    distribution_list: list[dict] | None = None


class DocumentRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID | None
    doc_type: str
    code: str
    title: str
    description: str | None
    version: int
    status: str
    category: str | None
    tags: list[str] | None
    file_url: str
    file_size: int
    file_type: str
    owner_id: uuid.UUID
    approver_id: uuid.UUID | None
    effective_date: datetime | None
    review_date: datetime | None
    expiry_date: datetime | None
    distribution_list: dict | None
    change_log: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentList(BaseModel):
    id: uuid.UUID
    doc_type: str
    code: str
    title: str
    version: int
    status: str
    category: str | None
    owner_id: uuid.UUID
    review_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Document Version ──────────────────────────────────────────


class DocumentVersionCreate(BaseModel):
    document_id: uuid.UUID
    file_url: str
    changes_summary: str | None = None


class DocumentVersionRead(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    version: int
    file_url: str
    changes_summary: str | None
    uploaded_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Document Acknowledgment ───────────────────────────────────


class DocumentAcknowledgmentCreate(BaseModel):
    document_id: uuid.UUID
    signature_url: str | None = None


class DocumentAcknowledgmentRead(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    user_id: uuid.UUID
    acknowledged_at: datetime
    signature_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
