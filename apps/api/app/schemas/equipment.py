"""Pydantic schemas for equipment / asset management."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EquipmentCreate(BaseModel):
    site_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    category: str
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    photo_url: str | None = None
    location: str | None = None
    purchase_date: datetime | None = None
    next_inspection_date: datetime | None = None
    certifications: list[dict] | None = None
    documents: list[dict] | None = None


class EquipmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    photo_url: str | None = None
    location: str | None = None
    status: str | None = None
    last_inspection_date: datetime | None = None
    next_inspection_date: datetime | None = None
    certifications: list[dict] | None = None
    documents: list[dict] | None = None


class EquipmentRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID
    name: str
    code: str
    description: str | None
    category: str
    manufacturer: str | None
    model: str | None
    serial_number: str | None
    photo_url: str | None
    qr_code_url: str | None
    location: str | None
    status: str
    purchase_date: datetime | None
    last_inspection_date: datetime | None
    next_inspection_date: datetime | None
    certifications: dict | None
    documents: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class EquipmentList(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    category: str
    status: str
    photo_url: str | None
    location: str | None
    next_inspection_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Equipment Inspection ──────────────────────────────────────


class EquipmentInspectionCreate(BaseModel):
    inspected_at: datetime
    result: str
    notes: str | None = None
    findings: list[dict] | None = None
    next_inspection_date: datetime | None = None
    attachments: list[dict] | None = None


class EquipmentInspectionRead(BaseModel):
    id: uuid.UUID
    equipment_id: uuid.UUID
    inspector_id: uuid.UUID
    inspected_at: datetime
    result: str
    notes: str | None
    findings: dict | None
    next_inspection_date: datetime | None
    attachments: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
