"""Pydantic schemas for risk management models."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    import uuid
    from datetime import datetime

# ── Risk Register ─────────────────────────────────────────────


class ControlSchema(BaseModel):
    type: str = Field(..., description="elimination | substitution | engineering | administrative | ppe")
    description: str
    effectiveness: str | None = None
    responsible: str | None = None


class RiskRegisterCreate(BaseModel):
    site_id: uuid.UUID
    area: str | None = None
    process: str | None = None
    hazard_description: str
    hazard_category: str
    risk_type: str
    inherent_likelihood: int = Field(..., ge=1, le=5)
    inherent_severity: int = Field(..., ge=1, le=5)
    controls: list[ControlSchema] = []
    residual_likelihood: int = Field(..., ge=1, le=5)
    residual_severity: int = Field(..., ge=1, le=5)
    risk_owner: uuid.UUID | None = None
    review_date: datetime | None = None
    legal_requirement: str | None = None
    applicable_standard: str | None = None


class RiskRegisterUpdate(BaseModel):
    area: str | None = None
    process: str | None = None
    hazard_description: str | None = None
    hazard_category: str | None = None
    risk_type: str | None = None
    inherent_likelihood: int | None = Field(None, ge=1, le=5)
    inherent_severity: int | None = Field(None, ge=1, le=5)
    controls: list[ControlSchema] | None = None
    residual_likelihood: int | None = Field(None, ge=1, le=5)
    residual_severity: int | None = Field(None, ge=1, le=5)
    risk_owner: uuid.UUID | None = None
    review_date: datetime | None = None
    status: str | None = None
    legal_requirement: str | None = None
    applicable_standard: str | None = None


class RiskRegisterRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID
    area: str | None
    process: str | None
    hazard_description: str
    hazard_category: str
    risk_type: str
    inherent_likelihood: int
    inherent_severity: int
    inherent_rating: int
    controls: dict[str, Any]
    residual_likelihood: int
    residual_severity: int
    residual_rating: int
    risk_owner: uuid.UUID | None
    review_date: datetime | None
    status: str
    legal_requirement: str | None
    applicable_standard: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskRegisterList(BaseModel):
    id: uuid.UUID
    hazard_description: str
    hazard_category: str
    risk_type: str
    inherent_rating: int
    residual_rating: int
    status: str
    review_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── HAZOP ─────────────────────────────────────────────────────


class HazopStudyCreate(BaseModel):
    site_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=255)
    system_description: str
    p_and_id_url: str | None = None
    team_members: list[dict[str, Any]] | None = None
    facilitator_id: uuid.UUID | None = None


class HazopStudyUpdate(BaseModel):
    name: str | None = None
    system_description: str | None = None
    status: str | None = None
    team_members: list[dict[str, Any]] | None = None
    facilitator_id: uuid.UUID | None = None


class HazopStudyRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID
    name: str
    system_description: str
    p_and_id_url: str | None
    status: str
    team_members: dict[str, Any] | None
    facilitator_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class HazopNodeCreate(BaseModel):
    study_id: uuid.UUID
    node_name: str
    design_intent: str
    guide_word: str
    deviation: str
    causes: list[dict[str, Any]] | None = None
    consequences: list[dict[str, Any]] | None = None
    safeguards: list[dict[str, Any]] | None = None
    risk_rating: int | None = None
    recommendations: list[dict[str, Any]] | None = None


class HazopNodeRead(BaseModel):
    id: uuid.UUID
    study_id: uuid.UUID
    node_name: str
    design_intent: str
    guide_word: str
    deviation: str
    causes: dict[str, Any] | None
    consequences: dict[str, Any] | None
    safeguards: dict[str, Any] | None
    risk_rating: int | None
    recommendations: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Bow-Tie ───────────────────────────────────────────────────


class BowTieCreate(BaseModel):
    site_id: uuid.UUID
    top_event: str
    hazard: str
    threats: list[dict[str, Any]] = []
    consequences: list[dict[str, Any]] = []
    prevention_barriers: list[dict[str, Any]] = []
    mitigation_barriers: list[dict[str, Any]] = []
    critical_controls: list[dict[str, Any]] | None = None


class BowTieUpdate(BaseModel):
    top_event: str | None = None
    hazard: str | None = None
    threats: list[dict[str, Any]] | None = None
    consequences: list[dict[str, Any]] | None = None
    prevention_barriers: list[dict[str, Any]] | None = None
    mitigation_barriers: list[dict[str, Any]] | None = None
    critical_controls: list[dict[str, Any]] | None = None


class BowTieRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID
    top_event: str
    hazard: str
    threats: dict[str, Any]
    consequences: dict[str, Any]
    prevention_barriers: dict[str, Any]
    mitigation_barriers: dict[str, Any]
    critical_controls: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}
