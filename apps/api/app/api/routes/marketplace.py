"""Marketplace endpoints — public template library.

Most endpoints are public (no auth required) to encourage viral adoption.
Import and submit require authentication.
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DBSession
from app.core.rate_limit import limiter
from app.models.form import FormTemplate
from app.models.marketplace import (
    MarketplaceRating,
    MarketplaceTemplate,
    TemplateStatus,
)
from app.schemas.marketplace import (
    CategoryInfo,
    MarketplaceTemplateImport,
    MarketplaceTemplateList,
    MarketplaceTemplateRead,
    MarketplaceTemplateSubmit,
    RatingCreate,
    RatingRead,
)

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ── Helper: public DB session (no auth) ──────────────────────

PublicDB = DBSession  # alias — same session, no auth dependency


def _slugify(text: str) -> str:
    """Create a URL-safe slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


# ═══════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS (no auth)
# ═══════════════════════════════════════════════════════════════


@router.get(
    "/templates",
    response_model=list[MarketplaceTemplateList],
    summary="List / search marketplace templates (public)",
)
@limiter.limit("120/minute")
async def list_templates(
    request: Request,
    db: PublicDB,
    q: str | None = Query(None, description="Free text search"),
    category: str | None = Query(None),
    industry: str | None = Query(None),
    standard: str | None = Query(None),
    language: str | None = Query(None),
    min_rating: float | None = Query(None, ge=0, le=5),
    sort_by: str = Query("popular", regex="^(popular|recent|rating|name)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[MarketplaceTemplateList]:
    query = select(MarketplaceTemplate).where(
        MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
        MarketplaceTemplate.is_deleted == False,  # noqa: E712
    )

    if q:
        like = f"%{q}%"
        query = query.where(
            or_(
                MarketplaceTemplate.name.ilike(like),
                MarketplaceTemplate.description.ilike(like),
                MarketplaceTemplate.tags.any(q.lower()),
            )
        )
    if category:
        query = query.where(MarketplaceTemplate.category == category)
    if industry:
        query = query.where(MarketplaceTemplate.industry.ilike(f"%{industry}%"))
    if standard:
        query = query.where(MarketplaceTemplate.standards.any(standard))
    if language:
        query = query.where(MarketplaceTemplate.language == language)
    if min_rating is not None:
        query = query.where(MarketplaceTemplate.rating_average >= min_rating)

    # Sorting
    order_map = {
        "popular": MarketplaceTemplate.download_count.desc(),
        "recent": MarketplaceTemplate.created_at.desc(),
        "rating": MarketplaceTemplate.rating_average.desc(),
        "name": MarketplaceTemplate.name.asc(),
    }
    query = query.order_by(order_map.get(sort_by, MarketplaceTemplate.download_count.desc()))

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    rows = result.scalars().all()
    return [MarketplaceTemplateList.model_validate(r) for r in rows]


@router.get(
    "/templates/search",
    response_model=list[MarketplaceTemplateList],
    summary="Search marketplace templates",
)
async def search_templates(
    db: PublicDB,
    q: str = Query("", description="Search query"),
    industry: str | None = Query(None),
    standard: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[MarketplaceTemplateList]:
    """Alias for /templates with search-specific defaults."""
    query = select(MarketplaceTemplate).where(
        MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
        MarketplaceTemplate.is_deleted == False,  # noqa: E712
    )

    if q:
        like = f"%{q}%"
        query = query.where(
            or_(
                MarketplaceTemplate.name.ilike(like),
                MarketplaceTemplate.description.ilike(like),
                MarketplaceTemplate.short_description.ilike(like),
            )
        )
    if industry:
        query = query.where(MarketplaceTemplate.industry.ilike(f"%{industry}%"))
    if standard:
        query = query.where(MarketplaceTemplate.standards.any(standard))

    offset = (page - 1) * page_size
    result = await db.execute(query.order_by(MarketplaceTemplate.rating_average.desc()).offset(offset).limit(page_size))
    rows = result.scalars().all()
    return [MarketplaceTemplateList.model_validate(r) for r in rows]


@router.get(
    "/categories",
    response_model=list[CategoryInfo],
    summary="List marketplace categories with counts",
)
async def list_categories(db: PublicDB) -> list[CategoryInfo]:
    result = await db.execute(
        select(
            MarketplaceTemplate.category,
            func.count(MarketplaceTemplate.id).label("cnt"),
        )
        .where(
            MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
            MarketplaceTemplate.is_deleted == False,  # noqa: E712
        )
        .group_by(MarketplaceTemplate.category)
    )
    icons = {
        "safety": "🛡️",
        "oil_and_gas": "🛢️",
        "mining": "⛏️",
        "construction": "🏗️",
        "environment": "🌿",
        "quality": "✅",
        "health": "🏥",
        "electrical": "⚡",
        "manufacturing": "🏭",
        "transportation": "🚛",
        "food_safety": "🍽️",
        "general": "📋",
    }
    return [
        CategoryInfo(
            value=row.category,
            label=row.category.replace("_", " ").title(),
            template_count=row.cnt,
            icon=icons.get(row.category, "📋"),
        )
        for row in result.all()
    ]


@router.get(
    "/featured",
    response_model=list[MarketplaceTemplateList],
    summary="Featured templates (hand-picked)",
)
async def featured_templates(db: PublicDB) -> list[MarketplaceTemplateList]:
    result = await db.execute(
        select(MarketplaceTemplate)
        .where(
            MarketplaceTemplate.is_featured == True,  # noqa: E712
            MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
            MarketplaceTemplate.is_deleted == False,  # noqa: E712
        )
        .order_by(MarketplaceTemplate.rating_average.desc())
        .limit(12)
    )
    return [MarketplaceTemplateList.model_validate(r) for r in result.scalars().all()]


@router.get(
    "/popular",
    response_model=list[MarketplaceTemplateList],
    summary="Most popular templates by downloads",
)
async def popular_templates(db: PublicDB) -> list[MarketplaceTemplateList]:
    result = await db.execute(
        select(MarketplaceTemplate)
        .where(
            MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
            MarketplaceTemplate.is_deleted == False,  # noqa: E712
        )
        .order_by(MarketplaceTemplate.download_count.desc())
        .limit(20)
    )
    return [MarketplaceTemplateList.model_validate(r) for r in result.scalars().all()]


@router.get(
    "/templates/{template_id}",
    response_model=MarketplaceTemplateRead,
    summary="Get full template detail (public)",
)
async def get_template(
    template_id: uuid.UUID,
    db: PublicDB,
) -> MarketplaceTemplateRead:
    result = await db.execute(
        select(MarketplaceTemplate).where(
            MarketplaceTemplate.id == template_id,
            MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
        )
    )
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    # Bump download count (view = download in public context)
    tpl.download_count += 1
    await db.flush()

    return MarketplaceTemplateRead.model_validate(tpl)


# ═══════════════════════════════════════════════════════════════
# AUTHENTICATED ENDPOINTS
# ═══════════════════════════════════════════════════════════════


@router.post(
    "/templates/{template_id}/import",
    response_model=MarketplaceTemplateImport,
    status_code=status.HTTP_201_CREATED,
    summary="Import a marketplace template into your organization",
)
async def import_template(
    template_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> MarketplaceTemplateImport:
    result = await db.execute(
        select(MarketplaceTemplate).where(
            MarketplaceTemplate.id == template_id,
            MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
        )
    )
    tpl = result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    # Create a FormTemplate in the user's organization
    form = FormTemplate(
        name=tpl.name,
        description=tpl.description,
        category=tpl.category,
        version=1,
        status="published",
        is_global=False,
        tags=tpl.tags,
        schema=tpl.schema_json,
        scoring_config=tpl.scoring_config,
        organization_id=current_user.organization_id,
        created_by=str(current_user.id),
    )
    db.add(form)
    await db.flush()
    await db.refresh(form)

    # Bump import count
    tpl.import_count += 1
    await db.flush()

    return MarketplaceTemplateImport(
        form_template_id=form.id,
        marketplace_template_id=tpl.id,
        name=tpl.name,
        message=f"Template '{tpl.name}' imported successfully",
    )


@router.post(
    "/submit",
    response_model=MarketplaceTemplateList,
    status_code=status.HTTP_201_CREATED,
    summary="Contribute a new template to the marketplace",
)
async def submit_template(
    body: MarketplaceTemplateSubmit,
    db: DBSession,
    current_user: CurrentUser,
) -> MarketplaceTemplateList:
    slug = _slugify(body.name)
    # Ensure unique slug
    existing = await db.execute(select(MarketplaceTemplate.id).where(MarketplaceTemplate.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    # Count questions & sections from schema
    sections = body.schema_json.get("sections", [])
    section_count = len(sections)
    question_count = sum(len(s.get("questions", [])) for s in sections)

    tpl = MarketplaceTemplate(
        name=body.name,
        slug=slug,
        description=body.description,
        short_description=body.short_description or body.description[:200],
        category=body.category,
        industry=body.industry,
        standards=body.standards,
        tags=body.tags,
        language=body.language,
        schema_json=body.schema_json,
        scoring_config=body.scoring_config,
        estimated_duration_minutes=body.estimated_duration_minutes,
        question_count=question_count,
        section_count=section_count,
        status=TemplateStatus.PENDING_REVIEW,
        contributor_name=body.contributor_name or current_user.full_name,
        contributor_org=body.contributor_org,
        contributor_user_id=current_user.id,
        created_by=str(current_user.id),
    )
    db.add(tpl)
    await db.flush()
    await db.refresh(tpl)
    return MarketplaceTemplateList.model_validate(tpl)


@router.post(
    "/templates/{template_id}/rate",
    response_model=RatingRead,
    status_code=status.HTTP_201_CREATED,
    summary="Rate a marketplace template (1-5 stars)",
)
async def rate_template(
    template_id: uuid.UUID,
    body: RatingCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> RatingRead:
    # Verify template exists
    tpl_result = await db.execute(
        select(MarketplaceTemplate).where(
            MarketplaceTemplate.id == template_id,
            MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
        )
    )
    tpl = tpl_result.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    # Upsert rating
    existing_result = await db.execute(
        select(MarketplaceRating).where(
            MarketplaceRating.template_id == template_id,
            MarketplaceRating.user_id == current_user.id,
        )
    )
    rating = existing_result.scalar_one_or_none()
    if rating:
        rating.score = body.score
        rating.review = body.review
    else:
        rating = MarketplaceRating(
            template_id=template_id,
            user_id=current_user.id,
            score=body.score,
            review=body.review,
            created_by=str(current_user.id),
        )
        db.add(rating)

    await db.flush()
    await db.refresh(rating)

    # Recalculate template average
    avg_result = await db.execute(
        select(
            func.avg(MarketplaceRating.score),
            func.count(MarketplaceRating.id),
        ).where(MarketplaceRating.template_id == template_id)
    )
    row = avg_result.one()
    tpl.rating_average = round(float(row[0] or 0), 2)
    tpl.rating_count = int(row[1] or 0)
    await db.flush()

    return RatingRead.model_validate(rating)
