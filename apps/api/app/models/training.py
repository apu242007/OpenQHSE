"""Training / LMS and competency models."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid
    from datetime import datetime


class CourseType(StrEnum):
    INDUCTION = "induction"
    REFRESHER = "refresher"
    COMPETENCY = "competency"
    REGULATORY = "regulatory"
    TECHNICAL = "technical"


class EnrollmentStatus(StrEnum):
    ENROLLED = "enrolled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class TrainingCourse(BaseModel):
    """Training course definition."""

    __tablename__ = "training_courses"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    course_type: Mapped[CourseType] = mapped_column(String(20), nullable=False, index=True)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    content: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="[{module_title, slides: [{title, content_type, content_url}]}]",
    )
    passing_score: Mapped[float] = mapped_column(Float, nullable=False, default=70.0)
    validity_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    certificate_template_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False)
    applicable_roles: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Relationships
    enrollments: Mapped[list[TrainingEnrollment]] = relationship(
        "TrainingEnrollment", back_populates="course", lazy="selectin"
    )
    assessments: Mapped[list[TrainingAssessment]] = relationship(
        "TrainingAssessment", back_populates="course", lazy="selectin"
    )


class TrainingEnrollment(BaseModel):
    """User enrollment in a training course."""

    __tablename__ = "training_enrollments"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("training_courses.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    site_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True)

    status: Mapped[EnrollmentStatus] = mapped_column(
        String(20), default=EnrollmentStatus.ENROLLED, nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    certificate_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    course: Mapped[TrainingCourse] = relationship("TrainingCourse", back_populates="enrollments", lazy="selectin")


class TrainingAssessment(BaseModel):
    """Assessment / quiz for a training course."""

    __tablename__ = "training_assessments"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("training_courses.id"), nullable=False, index=True
    )

    questions: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        default=list,
        doc=("[{id, text, type: 'multiple_choice'|'true_false'|'open', options: [{text, is_correct}], points}]"),
    )

    course: Mapped[TrainingCourse] = relationship("TrainingCourse", back_populates="assessments", lazy="selectin")


class CompetencyMatrix(BaseModel):
    """Competency requirements matrix per role."""

    __tablename__ = "competency_matrices"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )

    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    required_courses: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=True, doc="[{course_id, mandatory}]"
    )
    required_certifications: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=True, doc="[{name, issuer, validity_months}]"
    )
    review_cycle_months: Mapped[int] = mapped_column(Integer, default=12)
