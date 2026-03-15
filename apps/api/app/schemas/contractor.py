"""Contractor and ContractorWorker Pydantic schemas."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema, IDSchema, PaginatedResponse, TimestampSchema

if TYPE_CHECKING:
    from datetime import datetime
    from uuid import UUID

    from app.models.contractor import ContractorStatus

# ── Contractor ──────────────────────────────────────────────────────────────


class ContractorCreate(BaseSchema):
    name: str = Field(min_length=2, max_length=255)
    rut_tax_id: str | None = Field(None, max_length=50)
    country: str = Field(default="CL", max_length=3)
    contact_name: str | None = Field(None, max_length=255)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(None, max_length=50)
    insurance_expiry: datetime | None = None
    insurance_url: str | None = Field(None, max_length=500)
    certifications: list[dict] = Field(default_factory=list)
    documents: list[dict] = Field(default_factory=list)


class ContractorUpdate(BaseSchema):
    name: str | None = Field(None, min_length=2, max_length=255)
    rut_tax_id: str | None = None
    country: str | None = Field(None, max_length=3)
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    insurance_expiry: datetime | None = None
    insurance_url: str | None = None
    certifications: list[dict] | None = None
    documents: list[dict] | None = None
    suspension_reason: str | None = None


class ContractorResponse(IDSchema, TimestampSchema):
    organization_id: UUID
    name: str
    rut_tax_id: str | None
    country: str
    contact_name: str | None
    contact_email: str | None
    contact_phone: str | None
    status: ContractorStatus
    insurance_expiry: datetime | None
    insurance_url: str | None
    certifications: list[dict]
    documents: list[dict]
    approved_by: UUID | None
    approved_at: datetime | None
    suspension_reason: str | None
    # computed / joined
    worker_count: int = 0
    active_worker_count: int = 0
    incident_count: int = 0
    compliance_pct: float = 100.0


class ContractorListResponse(PaginatedResponse):
    items: list[ContractorResponse]  # type: ignore[assignment]


# ── ContractorWorker ────────────────────────────────────────────────────────


class ContractorWorkerCreate(BaseSchema):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    id_number: str = Field(min_length=1, max_length=50)
    position: str | None = Field(None, max_length=150)
    photo_url: str | None = Field(None, max_length=500)
    certifications: list[dict] = Field(default_factory=list)
    access_sites: list[str] = Field(default_factory=list)
    induction_completed: bool = False
    induction_date: datetime | None = None


class ContractorWorkerUpdate(BaseSchema):
    first_name: str | None = None
    last_name: str | None = None
    position: str | None = None
    photo_url: str | None = None
    certifications: list[dict] | None = None
    access_sites: list[str] | None = None
    induction_completed: bool | None = None
    induction_date: datetime | None = None
    is_active: bool | None = None
    deactivation_reason: str | None = None


class ContractorWorkerResponse(IDSchema, TimestampSchema):
    contractor_id: UUID
    organization_id: UUID
    first_name: str
    last_name: str
    id_number: str
    position: str | None
    photo_url: str | None
    certifications: list[dict]
    induction_completed: bool
    induction_date: datetime | None
    access_sites: list[str]
    is_active: bool
    deactivation_reason: str | None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class ContractorComplianceReport(BaseSchema):
    contractor_id: UUID
    contractor_name: str
    status: ContractorStatus
    total_workers: int
    active_workers: int
    inducted_workers: int
    induction_pct: float
    certifications_valid: int
    certifications_expiring: int
    insurance_expiry: datetime | None
    insurance_status: str  # "valid" | "expiring_soon" | "expired" | "missing"
    incident_count_ytd: int
    compliance_score: float  # 0-100
