"""Permit-to-work service — workflow, QR, conflict detection, checklists."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.models.permit import PermitStatus, PermitType, WorkPermit

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

# ── Type-specific safety checklists ─────────────────────────

SAFETY_CHECKLISTS: dict[str, list[dict[str, str | bool]]] = {
    PermitType.HOT_WORK: [
        {"item": "Área libre de materiales combustibles en 11m", "required": True},
        {"item": "Extintores disponibles y ubicados", "required": True},
        {"item": "Detectores de gas calibrados", "required": True},
        {"item": "Vigía de fuego designado", "required": True},
        {"item": "Ventilación adecuada verificada", "required": True},
        {"item": "Equipos de soldadura inspeccionados", "required": True},
        {"item": "Monitoreo de gases continuo", "required": True},
        {"item": "Vías de evacuación despejadas", "required": False},
    ],
    PermitType.CONFINED_SPACE: [
        {"item": "Prueba atmosférica realizada (O₂, LEL, H₂S, CO)", "required": True},
        {"item": "Ventilación forzada instalada", "required": True},
        {"item": "Vigía de espacio confinado designado", "required": True},
        {"item": "Equipo de rescate disponible", "required": True},
        {"item": "Arnés y línea de vida instalados", "required": True},
        {"item": "Comunicación entre vigía y entrante verificada", "required": True},
        {"item": "Iluminación antiexplosiva disponible", "required": True},
        {"item": "Aislamiento de energía (LOTO) completado", "required": True},
    ],
    PermitType.WORKING_AT_HEIGHT: [
        {"item": "Arnés de seguridad inspeccionado", "required": True},
        {"item": "Puntos de anclaje verificados", "required": True},
        {"item": "Andamios/plataformas inspeccionados", "required": True},
        {"item": "Área inferior acordonada", "required": True},
        {"item": "Condiciones climáticas evaluadas", "required": True},
        {"item": "Red de protección instalada", "required": False},
        {"item": "Herramientas amarradas", "required": True},
        {"item": "Personal certificado para trabajo en alturas", "required": True},
    ],
    PermitType.ELECTRICAL: [
        {"item": "Equipo des-energizado y verificado", "required": True},
        {"item": "Procedimiento LOTO completado", "required": True},
        {"item": "Candados y etiquetas colocados", "required": True},
        {"item": "Tensión cero verificada con multímetro", "required": True},
        {"item": "Tierras temporales instaladas", "required": True},
        {"item": "Guantes dieléctricos inspeccionados", "required": True},
        {"item": "Tapetes aislantes en posición", "required": True},
        {"item": "Señalización de peligro eléctrico", "required": True},
    ],
    PermitType.EXCAVATION: [
        {"item": "Planos de servicios subterráneos revisados", "required": True},
        {"item": "Detección de servicios con equipo", "required": True},
        {"item": "Talud adecuado o entibación", "required": True},
        {"item": "Barreras perimetrales instaladas", "required": True},
        {"item": "Escaleras de acceso cada 7.5m", "required": True},
        {"item": "Monitoreo de gases (si >1.2m)", "required": True},
    ],
    PermitType.LIFTING: [
        {"item": "Plan de izaje aprobado", "required": True},
        {"item": "Grúa/equipo inspeccionado y certificado", "required": True},
        {"item": "Eslingas y accesorios inspeccionados", "required": True},
        {"item": "Área de izaje acordonada", "required": True},
        {"item": "Señalero designado y capacitado", "required": True},
        {"item": "Condiciones de viento verificadas (<30 km/h)", "required": True},
    ],
}


async def get_checklist_for_type(permit_type: str) -> list[dict[str, str | bool]]:
    """Return the safety checklist for a permit type."""
    return SAFETY_CHECKLISTS.get(permit_type, [])


async def generate_qr_data(permit: WorkPermit) -> dict[str, str]:
    """Generate QR code data for a permit."""
    payload = f"{permit.id}|{permit.reference_number}|{permit.status}"
    token = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return {
        "permit_id": str(permit.id),
        "reference_number": permit.reference_number,
        "validation_token": token,
        "qr_content": f"OPENQHSE-PTW:{permit.reference_number}:{token}",
    }


async def validate_qr_token(db: AsyncSession, reference_number: str, token: str) -> WorkPermit | None:
    """Validate a QR token and return the permit if valid."""
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.reference_number == reference_number,
        )
    )
    permit = result.scalar_one_or_none()
    if not permit:
        return None

    payload = f"{permit.id}|{permit.reference_number}|{permit.status}"
    expected = hashlib.sha256(payload.encode()).hexdigest()[:16]
    if token != expected:
        return None
    return permit


async def check_conflicts(
    db: AsyncSession,
    organization_id: UUID,
    site_id: UUID,
    area_id: UUID | None,
    valid_from: datetime,
    valid_until: datetime,
    exclude_id: UUID | None = None,
) -> list[WorkPermit]:
    """Check for overlapping active permits in the same area."""
    query = select(WorkPermit).where(
        WorkPermit.organization_id == organization_id,
        WorkPermit.site_id == site_id,
        WorkPermit.status.in_(
            [
                PermitStatus.APPROVED,
                PermitStatus.ACTIVE,
            ]
        ),
        WorkPermit.valid_from < valid_until,
        WorkPermit.valid_until > valid_from,
        WorkPermit.is_deleted == False,  # noqa: E712
    )
    if area_id:
        query = query.where(WorkPermit.area_id == area_id)
    if exclude_id:
        query = query.where(WorkPermit.id != exclude_id)

    result = await db.execute(query)
    return list(result.scalars().all())


async def transition_status(
    db: AsyncSession,
    permit: WorkPermit,
    new_status: PermitStatus,
    user_id: UUID,
) -> WorkPermit:
    """Transition permit status with validation."""
    valid_transitions: dict[str, list[str]] = {
        PermitStatus.DRAFT: [PermitStatus.PENDING_APPROVAL],
        PermitStatus.PENDING_APPROVAL: [PermitStatus.APPROVED, PermitStatus.REJECTED],
        PermitStatus.APPROVED: [PermitStatus.ACTIVE, PermitStatus.REJECTED],
        PermitStatus.ACTIVE: [PermitStatus.SUSPENDED, PermitStatus.CLOSED],
        PermitStatus.SUSPENDED: [PermitStatus.ACTIVE, PermitStatus.CLOSED],
        PermitStatus.REJECTED: [PermitStatus.DRAFT],
        PermitStatus.EXPIRED: [],
    }

    allowed = valid_transitions.get(permit.status, [])
    if new_status not in allowed:
        raise ValueError(f"Cannot transition from {permit.status} to {new_status}. Allowed: {allowed}")

    now = datetime.now(UTC)
    permit.status = new_status
    permit.updated_by = str(user_id)

    if new_status == PermitStatus.APPROVED:
        permit.approved_at = now
        permit.approved_by_id = user_id
    elif new_status == PermitStatus.CLOSED:
        permit.closed_at = now

    await db.flush()
    await db.refresh(permit)
    return permit


async def get_permit_statistics(db: AsyncSession, organization_id: UUID) -> dict[str, object]:
    """Compute permit statistics."""
    result = await db.execute(
        select(WorkPermit).where(
            WorkPermit.organization_id == organization_id,
            WorkPermit.is_deleted == False,  # noqa: E712
        )
    )
    permits = list(result.scalars().all())
    total = len(permits)
    now = datetime.now(UTC)

    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    active_count = 0
    expired_count = 0

    for p in permits:
        by_status[p.status] = by_status.get(p.status, 0) + 1
        by_type[p.permit_type] = by_type.get(p.permit_type, 0) + 1
        if p.status in (PermitStatus.ACTIVE, PermitStatus.APPROVED):
            active_count += 1
        if p.valid_until < now and p.status not in (PermitStatus.CLOSED, PermitStatus.EXPIRED):
            expired_count += 1

    return {
        "total": total,
        "active": active_count,
        "expired": expired_count,
        "by_status": by_status,
        "by_type": by_type,
    }


# ── Gas Test Readings ───────────────────────────────────────


GAS_LIMITS: dict[str, dict[str, float | str]] = {
    "O2": {"min": 19.5, "max": 23.5, "unit": "%"},
    "LEL": {"min": 0.0, "max": 10.0, "unit": "%"},
    "H2S": {"min": 0.0, "max": 10.0, "unit": "ppm"},
    "CO": {"min": 0.0, "max": 25.0, "unit": "ppm"},
    "SO2": {"min": 0.0, "max": 2.0, "unit": "ppm"},
    "NO2": {"min": 0.0, "max": 3.0, "unit": "ppm"},
}


def validate_gas_readings(
    readings: list[dict[str, object]],
) -> list[dict[str, object]]:
    """Validate gas readings against safe limits. Returns annotated readings."""
    results = []
    for reading in readings:
        gas = str(reading.get("gas", ""))
        value = float(str(reading.get("value", 0)))
        limits = GAS_LIMITS.get(gas)
        if limits:
            is_safe = float(limits["min"]) <= value <= float(limits["max"])
            results.append(
                {
                    **reading,
                    "is_safe": is_safe,
                    "limit_min": limits["min"],
                    "limit_max": limits["max"],
                    "unit": limits["unit"],
                }
            )
        else:
            results.append({**reading, "is_safe": True})
    return results
