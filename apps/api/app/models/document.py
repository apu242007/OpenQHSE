"""Document management / control models."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
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


class DocumentType(StrEnum):
    PROCEDURE = "procedure"
    INSTRUCTION = "instruction"
    FORM = "form"
    RECORD = "record"
    STANDARD = "standard"
    REGULATION = "regulation"
    PLAN = "plan"
    OTHER = "other"


class DocumentStatus(StrEnum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    OBSOLETE = "obsolete"


class Document(BaseModel):
    """Controlled document in the document management system."""

    __tablename__ = "documents"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True)

    doc_type: Mapped[DocumentType] = mapped_column(String(30), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[DocumentStatus] = mapped_column(String(20), default=DocumentStatus.DRAFT, nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)

    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approver_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    effective_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    distribution_list: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=True, doc="[{user_id, role, required}]"
    )
    change_log: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB, nullable=True, doc="[{version, date, author, summary}]"
    )

    # Relationships
    versions: Mapped[list[DocumentVersion]] = relationship(
        "DocumentVersion", back_populates="document", lazy="selectin"
    )
    acknowledgments: Mapped[list[DocumentAcknowledgment]] = relationship(
        "DocumentAcknowledgment", back_populates="document", lazy="selectin"
    )


class DocumentVersion(BaseModel):
    """Versioned snapshot of a document file."""

    __tablename__ = "document_versions"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    changes_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    document: Mapped[Document] = relationship("Document", back_populates="versions", lazy="selectin")


class DocumentAcknowledgment(BaseModel):
    """User acknowledgment that they have read a document."""

    __tablename__ = "document_acknowledgments"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    signature_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    document: Mapped[Document] = relationship("Document", back_populates="acknowledgments", lazy="selectin")
