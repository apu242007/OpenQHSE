"""Modelos de Contratistas y Personal Contratista."""

from __future__ import annotations

import enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid
    from datetime import datetime


class ContractorStatus(enum.StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    SUSPENDED = "SUSPENDED"
    BLACKLISTED = "BLACKLISTED"


class Contractor(BaseModel):
    """Empresa contratista registrada en la plataforma.

    Representa compañías externas que prestan servicios dentro de las
    instalaciones de la organización (minería, construcción, oil & gas, etc.).
    """

    __tablename__ = "contractors"
    __table_args__ = (
        Index("ix_contractors_org_status", "organization_id", "status"),
        Index("ix_contractors_org_deleted", "organization_id", "is_deleted"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rut_tax_id: Mapped[str | None] = mapped_column(
        String(50), nullable=True, doc="RUT (Chile), CNPJ (Brasil), NIF, EIN, etc."
    )
    country: Mapped[str] = mapped_column(String(3), nullable=False, default="CL", doc="ISO 3166-1 alpha-3")

    # ── Contacto ──────────────────────────────────────────────
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Estado ───────────────────────────────────────────────
    status: Mapped[ContractorStatus] = mapped_column(
        Enum(ContractorStatus, name="contractor_status"),
        default=ContractorStatus.PENDING,
        nullable=False,
        index=True,
    )

    # ── Seguros ──────────────────────────────────────────────
    insurance_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    insurance_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Documentación y certificaciones (flexible JSONB) ─────
    certifications: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Lista de certificaciones ISO, OHSAS, etc. [{name, issuer, expiry, url}]",
    )
    documents: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Documentos requeridos: RUT, cédula jurídica, pólizas, etc.",
    )

    # ── Aprobación ───────────────────────────────────────────
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspension_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relaciones ───────────────────────────────────────────
    workers: Mapped[list[ContractorWorker]] = relationship(
        "ContractorWorker", back_populates="contractor", lazy="selectin"
    )


class ContractorWorker(BaseModel):
    """Personal individual de una empresa contratista.

    Registra los trabajadores que acceden a las instalaciones.
    La inducción (charla de seguridad) es obligatoria antes del primer acceso.
    """

    __tablename__ = "contractor_workers"
    __table_args__ = (
        Index("ix_cworkers_contractor_active", "contractor_id", "is_active"),
        Index("ix_cworkers_org_deleted", "organization_id", "is_deleted"),
    )

    contractor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contractors.id"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )

    # ── Datos personales ──────────────────────────────────────
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    id_number: Mapped[str] = mapped_column(String(50), nullable=False, doc="RUT, cédula, pasaporte, etc.")
    position: Mapped[str | None] = mapped_column(String(150), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Certificaciones del trabajador ────────────────────────
    certifications: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Licencias, cursos, vencimientos [{name, issuer, expiry, url}]",
    )

    # ── Control de acceso ────────────────────────────────────
    induction_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    induction_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_sites: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        doc="IDs de sitios donde está autorizado",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    deactivation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relaciones ───────────────────────────────────────────
    contractor: Mapped[Contractor] = relationship("Contractor", back_populates="workers")
