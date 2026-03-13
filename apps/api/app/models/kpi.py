"""KPI snapshot model for periodic safety metrics."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class KPISnapshot(BaseModel):
    """Monthly KPI snapshot for safety and operational metrics.

    Pre-computed metrics stored per site/period for fast dashboard queries.
    Aligned with OSHA / ISO 45001 leading & lagging indicators.
    """

    __tablename__ = "kpi_snapshots"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True, index=True
    )

    period: Mapped[str] = mapped_column(
        String(7), nullable=False, index=True,
        doc="YYYY-MM format",
    )

    # ── Lagging indicators (OSHA rates) ───────────────────────
    trir: Mapped[float | None] = mapped_column(
        Float, nullable=True, doc="Total Recordable Incident Rate"
    )
    ltif: Mapped[float | None] = mapped_column(
        Float, nullable=True, doc="Lost Time Injury Frequency"
    )
    dart: Mapped[float | None] = mapped_column(
        Float, nullable=True, doc="Days Away, Restricted or Transferred"
    )
    far: Mapped[float | None] = mapped_column(
        Float, nullable=True, doc="Fatal Accident Rate"
    )
    severity_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── Exposure data ─────────────────────────────────────────
    total_hours_worked: Mapped[int] = mapped_column(Integer, default=0)
    total_incidents: Mapped[int] = mapped_column(Integer, default=0)
    lti_count: Mapped[int] = mapped_column(Integer, default=0)

    # ── Leading indicators ────────────────────────────────────
    inspections_completed: Mapped[int] = mapped_column(Integer, default=0)
    inspections_overdue: Mapped[int] = mapped_column(Integer, default=0)
    actions_open: Mapped[int] = mapped_column(Integer, default=0)
    actions_overdue: Mapped[int] = mapped_column(Integer, default=0)
    actions_closed: Mapped[int] = mapped_column(Integer, default=0)
    training_compliance_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    permit_compliance_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
