"""Pydantic schemas for KPI snapshots."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class KPISnapshotCreate(BaseModel):
    site_id: uuid.UUID | None = None
    period: str = Field(..., pattern=r"^\d{4}-\d{2}$")
    trir: float | None = None
    ltif: float | None = None
    dart: float | None = None
    far: float | None = None
    severity_rate: float | None = None
    total_hours_worked: int = 0
    total_incidents: int = 0
    lti_count: int = 0
    inspections_completed: int = 0
    inspections_overdue: int = 0
    actions_open: int = 0
    actions_overdue: int = 0
    actions_closed: int = 0
    training_compliance_rate: float | None = None
    permit_compliance_rate: float | None = None
    calculated_at: datetime


class KPISnapshotRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID | None
    period: str
    trir: float | None
    ltif: float | None
    dart: float | None
    far: float | None
    severity_rate: float | None
    total_hours_worked: int
    total_incidents: int
    lti_count: int
    inspections_completed: int
    inspections_overdue: int
    actions_open: int
    actions_overdue: int
    actions_closed: int
    training_compliance_rate: float | None
    permit_compliance_rate: float | None
    calculated_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class KPISnapshotList(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID | None
    period: str
    trir: float | None
    ltif: float | None
    total_incidents: int
    inspections_completed: int
    calculated_at: datetime

    model_config = {"from_attributes": True}
