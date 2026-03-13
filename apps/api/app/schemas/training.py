"""Pydantic schemas for training / LMS models."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Training Course ───────────────────────────────────────────


class TrainingCourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    category: str | None = None
    course_type: str
    duration_hours: float = 1.0
    content: list[dict] | None = None
    passing_score: float = 70.0
    validity_months: int | None = None
    certificate_template_url: str | None = None
    is_mandatory: bool = False
    applicable_roles: list[str] | None = None


class TrainingCourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    course_type: str | None = None
    duration_hours: float | None = None
    content: list[dict] | None = None
    passing_score: float | None = None
    validity_months: int | None = None
    is_mandatory: bool | None = None
    applicable_roles: list[str] | None = None


class TrainingCourseRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    title: str
    description: str | None
    category: str | None
    course_type: str
    duration_hours: float
    content: dict | None
    passing_score: float
    validity_months: int | None
    certificate_template_url: str | None
    is_mandatory: bool
    applicable_roles: list[str] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TrainingCourseList(BaseModel):
    id: uuid.UUID
    title: str
    category: str | None
    course_type: str
    duration_hours: float
    is_mandatory: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Training Enrollment ───────────────────────────────────────


class TrainingEnrollmentCreate(BaseModel):
    course_id: uuid.UUID
    user_id: uuid.UUID
    site_id: uuid.UUID | None = None
    enrolled_at: datetime


class TrainingEnrollmentUpdate(BaseModel):
    status: str | None = None
    score: float | None = None
    completed_at: datetime | None = None


class TrainingEnrollmentRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    user_id: uuid.UUID
    site_id: uuid.UUID | None
    status: str
    enrolled_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    expiry_date: datetime | None
    score: float | None
    attempts: int
    certificate_url: str | None
    assigned_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TrainingEnrollmentList(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    score: float | None
    enrolled_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


# ── Training Assessment ───────────────────────────────────────


class TrainingAssessmentCreate(BaseModel):
    course_id: uuid.UUID
    questions: list[dict]


class TrainingAssessmentRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    questions: dict
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Competency Matrix ────────────────────────────────────────


class CompetencyMatrixCreate(BaseModel):
    role: str
    required_courses: list[dict] | None = None
    required_certifications: list[dict] | None = None
    review_cycle_months: int = 12


class CompetencyMatrixUpdate(BaseModel):
    role: str | None = None
    required_courses: list[dict] | None = None
    required_certifications: list[dict] | None = None
    review_cycle_months: int | None = None


class CompetencyMatrixRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    role: str
    required_courses: dict | None
    required_certifications: dict | None
    review_cycle_months: int
    created_at: datetime

    model_config = {"from_attributes": True}
