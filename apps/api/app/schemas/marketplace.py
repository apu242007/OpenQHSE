"""Pydantic schemas for the Marketplace module."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    import uuid
    from datetime import datetime

# ── Template schemas ──────────────────────────────────────────


class MarketplaceTemplateList(BaseModel):
    """Lightweight representation for listing / search results."""

    id: uuid.UUID
    name: str
    slug: str
    short_description: str
    category: str
    industry: str
    standards: list[str]
    tags: list[str]
    language: str
    version: str
    question_count: int
    section_count: int
    estimated_duration_minutes: int
    download_count: int
    import_count: int
    rating_average: float
    rating_count: int
    is_featured: bool
    contributor_name: str
    preview_image_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MarketplaceTemplateRead(MarketplaceTemplateList):
    """Full template detail including the JSON schema."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    description: str
    schema_data: dict[str, Any] = Field(alias="schema_json")
    scoring_config: dict[str, Any] | None
    contributor_org: str | None
    updated_at: datetime


class MarketplaceTemplateSubmit(BaseModel):
    """Payload for contributing a new template."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=20)
    short_description: str = Field("", max_length=500)
    category: str
    industry: str
    standards: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    language: str = "es"
    schema_data: dict[str, Any] = Field(alias="schema_json")
    scoring_config: dict[str, Any] | None = None
    estimated_duration_minutes: int = 15
    contributor_name: str = ""
    contributor_org: str | None = None


class MarketplaceTemplateImport(BaseModel):
    """Result of importing a marketplace template into an org."""

    form_template_id: uuid.UUID
    marketplace_template_id: uuid.UUID
    name: str
    message: str = "Template imported successfully"


# ── Rating schemas ────────────────────────────────────────────


class RatingCreate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    review: str | None = None


class RatingRead(BaseModel):
    id: uuid.UUID
    template_id: uuid.UUID
    user_id: uuid.UUID
    score: int
    review: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Category schema ───────────────────────────────────────────


class CategoryInfo(BaseModel):
    value: str
    label: str
    template_count: int = 0
    icon: str = "📋"


# ── Search ────────────────────────────────────────────────────


class MarketplaceSearchParams(BaseModel):
    q: str | None = None
    category: str | None = None
    industry: str | None = None
    standard: str | None = None
    language: str | None = None
    min_rating: float | None = None
    sort_by: str = "popular"  # popular | recent | rating | name
    page: int = 1
    page_size: int = 20
