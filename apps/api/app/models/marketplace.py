"""Marketplace models for the community checklist/template library.

Public marketplace where organizations can discover, import, rate and
contribute checklist templates across industries and standards.
"""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid

# ── Enums ─────────────────────────────────────────────────────


class MarketplaceCategory(StrEnum):
    SAFETY = "safety"
    OIL_AND_GAS = "oil_and_gas"
    MINING = "mining"
    CONSTRUCTION = "construction"
    ENVIRONMENT = "environment"
    QUALITY = "quality"
    HEALTH = "health"
    ELECTRICAL = "electrical"
    MANUFACTURING = "manufacturing"
    TRANSPORTATION = "transportation"
    FOOD_SAFETY = "food_safety"
    GENERAL = "general"


class TemplateStatus(StrEnum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"


# ── Models ────────────────────────────────────────────────────


class MarketplaceTemplate(BaseModel):
    """Community-contributed checklist/form template."""

    __tablename__ = "marketplace_templates"

    # ── Meta ──────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    short_description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0.0")
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="es", index=True)
    status: Mapped[TemplateStatus] = mapped_column(
        String(20),
        default=TemplateStatus.PUBLISHED,
        nullable=False,
        index=True,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # ── Classification ────────────────────────────────────
    category: Mapped[MarketplaceCategory] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    industry: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    standards: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        doc="Applicable standards: ISO 45001, OSHA 1926, API RP 75 …",
    )
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)

    # ── Template data (full JSON form schema) ─────────────
    schema_json: Mapped[dict] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=False,
        default=dict,
        doc=(
            "{sections: [{title, order, questions: "
            "[{id, text, type, required, options, weight, "
            "conditional_logic}]}], scoring_config}"
        ),
    )
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    section_count: Mapped[int] = mapped_column(Integer, default=0)
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, default=15)

    # ── Scoring ───────────────────────────────────────────
    scoring_config: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="Scoring rules: {method, max_score, pass_threshold, weights}",
    )

    # ── Stats ─────────────────────────────────────────────
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    import_count: Mapped[int] = mapped_column(Integer, default=0)
    rating_average: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)

    # ── Contributor info ──────────────────────────────────
    contributor_name: Mapped[str] = mapped_column(String(255), nullable=False, default="OpenQHSE Team")
    contributor_org: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contributor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    # ── Preview image ─────────────────────────────────────
    preview_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Relationships
    ratings: Mapped[list[MarketplaceRating]] = relationship(
        "MarketplaceRating",
        back_populates="template",
        lazy="selectin",
    )


class MarketplaceRating(BaseModel):
    """User rating and optional review for a marketplace template."""

    __tablename__ = "marketplace_ratings"
    __table_args__ = (UniqueConstraint("template_id", "user_id", name="uq_marketplace_rating_template_user"),)

    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("marketplace_templates.id"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False, doc="1-5 stars")
    review: Mapped[str | None] = mapped_column(Text, nullable=True)

    template: Mapped[MarketplaceTemplate] = relationship(
        "MarketplaceTemplate",
        back_populates="ratings",
    )
