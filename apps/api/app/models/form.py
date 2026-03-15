"""Dynamic form template and submission models."""

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


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SubmissionStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    SYNCED = "synced"


class FormTemplate(BaseModel):
    """Reusable form/checklist template with JSON-schema definition."""

    __tablename__ = "form_templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[FormStatus] = mapped_column(String(20), default=FormStatus.DRAFT, nullable=False, index=True)
    is_global: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Full form definition as JSON
    schema: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        default=dict,
        doc=("Form definition: {sections: [{title, order, questions: [{id, text, type, required, options, weight}]}]}"),
    )

    # Scoring
    scoring_config: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="Scoring rules: {method: 'weighted'|'binary', max_score, pass_threshold}",
    )

    # Multi-tenancy
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True)

    # Relationships
    submissions: Mapped[list[FormSubmission]] = relationship(
        "FormSubmission", back_populates="template", lazy="selectin"
    )


class FormSubmission(BaseModel):
    """Completed form submission with answers stored as JSONB."""

    __tablename__ = "form_submissions"

    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("form_templates.id"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False, index=True)

    submitted_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Answers
    data: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        default=dict,
        doc="Flat map: {question_id: {value, notes, photos[], flagged}}",
    )

    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[SubmissionStatus] = mapped_column(
        String(20), default=SubmissionStatus.DRAFT, nullable=False, index=True
    )

    # Location & device
    gps_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    device_info: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    offline_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True,
        doc="Client-generated UUID for offline sync dedup",
    )

    # Relationships
    template: Mapped[FormTemplate] = relationship("FormTemplate", back_populates="submissions", lazy="selectin")
    attachments: Mapped[list[FormAttachment]] = relationship(
        "FormAttachment", back_populates="submission", lazy="selectin"
    )


class FormAttachment(BaseModel):
    """File attached to a specific form submission field."""

    __tablename__ = "form_attachments"

    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("form_submissions.id"), nullable=False, index=True
    )
    field_key: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # AI processing results
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]

    # Relationships
    submission: Mapped[FormSubmission] = relationship("FormSubmission", back_populates="attachments", lazy="selectin")
