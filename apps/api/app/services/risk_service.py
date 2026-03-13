"""Risk management service — 5×5 matrix, HAZOP, BowTie analytics."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.risk import (
    BowTie,
    HazopNode,
    HazopStudy,
    RiskRegister,
    RiskStatus,
    RiskType,
)


async def get_risk_matrix(
    db: AsyncSession, organization_id: UUID
) -> dict[str, object]:
    """Build 5×5 risk matrix data with counts per cell."""
    result = await db.execute(
        select(
            RiskRegister.residual_likelihood,
            RiskRegister.residual_severity,
            func.count().label("count"),
        )
        .where(
            RiskRegister.organization_id == organization_id,
            RiskRegister.is_deleted == False,  # noqa: E712
        )
        .group_by(RiskRegister.residual_likelihood, RiskRegister.residual_severity)
    )
    rows = result.all()

    # Build 5x5 matrix: matrix[likelihood][severity] = count
    matrix: list[list[int]] = [[0] * 5 for _ in range(5)]
    for likelihood, severity, count in rows:
        if 1 <= likelihood <= 5 and 1 <= severity <= 5:
            matrix[likelihood - 1][severity - 1] = count

    # Risk level labels for each cell
    risk_levels: list[list[str]] = [
        ["low", "low", "moderate", "moderate", "high"],
        ["low", "moderate", "moderate", "high", "high"],
        ["moderate", "moderate", "high", "high", "extreme"],
        ["moderate", "high", "high", "extreme", "extreme"],
        ["high", "high", "extreme", "extreme", "extreme"],
    ]

    cells = []
    for li in range(5):
        for si in range(5):
            cells.append({
                "likelihood": li + 1,
                "severity": si + 1,
                "rating": (li + 1) * (si + 1),
                "count": matrix[li][si],
                "level": risk_levels[li][si],
            })

    return {"cells": cells, "total_risks": sum(c["count"] for c in cells)}


async def get_risk_statistics(
    db: AsyncSession, organization_id: UUID
) -> dict[str, object]:
    """Compute risk register statistics."""
    result = await db.execute(
        select(RiskRegister).where(
            RiskRegister.organization_id == organization_id,
            RiskRegister.is_deleted == False,  # noqa: E712
        )
    )
    risks = list(result.scalars().all())
    total = len(risks)

    by_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_level: dict[str, int] = {"low": 0, "moderate": 0, "high": 0, "extreme": 0}

    for r in risks:
        by_type[r.risk_type] = by_type.get(r.risk_type, 0) + 1
        by_status[r.status] = by_status.get(r.status, 0) + 1

        rating = r.residual_rating
        if rating <= 4:
            by_level["low"] += 1
        elif rating <= 9:
            by_level["moderate"] += 1
        elif rating <= 16:
            by_level["high"] += 1
        else:
            by_level["extreme"] += 1

    avg_inherent = (
        sum(r.inherent_rating for r in risks) / total if total else 0
    )
    avg_residual = (
        sum(r.residual_rating for r in risks) / total if total else 0
    )

    return {
        "total": total,
        "by_type": by_type,
        "by_status": by_status,
        "by_level": by_level,
        "avg_inherent_rating": round(avg_inherent, 1),
        "avg_residual_rating": round(avg_residual, 1),
    }


async def get_hazop_detail(
    db: AsyncSession, study_id: UUID, organization_id: UUID
) -> HazopStudy | None:
    """Get HAZOP study with nodes eagerly loaded."""
    result = await db.execute(
        select(HazopStudy).where(
            HazopStudy.id == study_id,
            HazopStudy.organization_id == organization_id,
        )
    )
    return result.scalar_one_or_none()


async def get_bowtie_detail(
    db: AsyncSession, bowtie_id: UUID, organization_id: UUID
) -> BowTie | None:
    """Get BowTie analysis by ID."""
    result = await db.execute(
        select(BowTie).where(
            BowTie.id == bowtie_id,
            BowTie.organization_id == organization_id,
        )
    )
    return result.scalar_one_or_none()
