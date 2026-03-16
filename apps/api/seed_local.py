#!/usr/bin/env python3
"""Seed the local SQLite database with a demo organization, user, and sample QHSE data.

Usage:
    cd apps/api
    python seed_local.py

This creates:
- 1 organization: "Minera Demo S.A."
- 1 org_admin user:  admin@openqhse.local / admin123
- Sample inspections, incidents, permits, risks, equipment, etc.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── Set env before importing app modules ────────────────────────────────────
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./openqhse.db")
os.environ.setdefault("DISABLE_AUTH", "true")

from app.core.database import Base, engine, async_session_factory
from app.models.user import Organization, User, UserRole, UserStatus, Site


# ─────────────────────────────────────────────────────────────────────────────
# IDs (fixed so re-runs are idempotent)
# ─────────────────────────────────────────────────────────────────────────────

ORG_ID   = uuid.UUID("00000000-0000-0000-0000-000000000010")
SITE_ID  = uuid.UUID("00000000-0000-0000-0000-000000000020")
USER_ID  = uuid.UUID("00000000-0000-0000-0000-000000000001")
NOW      = datetime.now(timezone.utc)


def _ts() -> datetime:
    return datetime.now(timezone.utc)


async def ensure_org(session: AsyncSession) -> None:
    result = await session.execute(select(Organization).where(Organization.id == ORG_ID))
    if result.scalar_one_or_none():
        return
    org = Organization(
        id=ORG_ID,
        name="Minera Demo S.A.",
        slug="minera-demo",
        industry="Mining",
        country="CL",
        timezone="America/Santiago",
        is_active=True,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(org)
    print("  ✓ Organization created")


async def ensure_site(session: AsyncSession) -> None:
    result = await session.execute(select(Site).where(Site.id == SITE_ID))
    if result.scalar_one_or_none():
        return
    site = Site(
        id=SITE_ID,
        organization_id=ORG_ID,
        name="Planta Principal",
        code="SITE-01",
        address="Av. Minera 1234, Antofagasta",
        country="CL",
        timezone="America/Santiago",
        is_active=True,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(site)
    print("  ✓ Site created")


async def ensure_user(session: AsyncSession) -> None:
    result = await session.execute(select(User).where(User.id == USER_ID))
    if result.scalar_one_or_none():
        return
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = User(
        id=USER_ID,
        organization_id=ORG_ID,
        email="admin@openqhse.local",
        hashed_password=ctx.hash("admin123"),
        first_name="Admin",
        last_name="Demo",
        role=UserRole.ORG_ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        created_at=NOW,
        updated_at=NOW,
    )
    session.add(user)
    print("  ✓ User created: admin@openqhse.local / admin123")


async def seed_inspections(session: AsyncSession) -> None:
    from app.models.inspection import Inspection, InspectionStatus, InspectionTemplate

    # Template
    tmpl_id = uuid.UUID("00000000-0000-0000-0001-000000000001")
    result = await session.execute(select(InspectionTemplate).where(InspectionTemplate.id == tmpl_id))
    if not result.scalar_one_or_none():
        tmpl = InspectionTemplate(
            id=tmpl_id,
            organization_id=ORG_ID,
            name="Inspección Pre-Operacional Equipos Pesados",
            description="Checklist diario de pre-operación de maquinaria",
            category="EQUIPMENT",
            frequency="DAILY",
            scoring_enabled=True,
            passing_score=80,
            schema={
                "sections": [
                    {
                        "id": "s1",
                        "title": "Estado General",
                        "questions": [
                            {"id": "q1", "text": "¿Cabina limpia y en orden?", "type": "yes_no", "weight": 10},
                            {"id": "q2", "text": "¿Espejos y luces en buen estado?", "type": "yes_no", "weight": 15},
                            {"id": "q3", "text": "¿Nivel de aceite correcto?", "type": "yes_no", "weight": 20},
                            {"id": "q4", "text": "¿Presión de neumáticos?", "type": "number", "weight": 10, "min": 80, "max": 120},
                            {"id": "q5", "text": "Observaciones", "type": "text", "weight": 0},
                        ]
                    },
                    {
                        "id": "s2",
                        "title": "Seguridad",
                        "questions": [
                            {"id": "q6", "text": "¿Cinturón de seguridad operativo?", "type": "yes_no", "weight": 20},
                            {"id": "q7", "text": "¿Extintor vigente a bordo?", "type": "yes_no", "weight": 15},
                            {"id": "q8", "text": "¿Alarma de retroceso funciona?", "type": "yes_no", "weight": 10},
                        ]
                    }
                ]
            },
            is_active=True,
            created_at=NOW,
            updated_at=NOW,
        )
        session.add(tmpl)

    # 3 sample inspections
    for i, (status, score) in enumerate([
        (InspectionStatus.COMPLETED, 94),
        (InspectionStatus.COMPLETED, 88),
        (InspectionStatus.PENDING, None),
    ]):
        insp_id = uuid.UUID(f"00000000-0000-0000-0001-{i+1:012d}")
        result = await session.execute(select(Inspection).where(Inspection.id == insp_id))
        if not result.scalar_one_or_none():
            session.add(Inspection(
                id=insp_id,
                organization_id=ORG_ID,
                site_id=SITE_ID,
                template_id=tmpl_id,
                code=f"INSP-{1000+i:04d}",
                status=status,
                score=score,
                inspector_id=USER_ID,
                location="Mina Nivel 3",
                scheduled_date=NOW,
                completed_at=NOW if status == InspectionStatus.COMPLETED else None,
                responses={"q1": "yes", "q2": "yes", "q3": "yes", "q6": "yes", "q7": "yes"} if status == InspectionStatus.COMPLETED else {},
                created_at=NOW,
                updated_at=NOW,
            ))
    print("  ✓ Inspections seeded (1 template + 3 records)")


async def seed_incidents(session: AsyncSession) -> None:
    from app.models.incident import Incident, IncidentSeverity, IncidentStatus, IncidentType

    for i, (title, severity, inc_status, inc_type) in enumerate([
        ("Caída a mismo nivel — Área de Proceso", IncidentSeverity.MINOR, IncidentStatus.UNDER_INVESTIGATION, IncidentType.ACCIDENT),
        ("Cuasi accidente — carro puente sin freno", IncidentSeverity.NEAR_MISS, IncidentStatus.OPEN, IncidentType.NEAR_MISS),
        ("Derrame menor aceite hidráulico", IncidentSeverity.ENVIRONMENTAL, IncidentStatus.UNDER_INVESTIGATION, IncidentType.ENVIRONMENTAL),
    ]):
        inc_id = uuid.UUID(f"00000000-0000-0000-0002-{i+1:012d}")
        result = await session.execute(select(Incident).where(Incident.id == inc_id))
        if not result.scalar_one_or_none():
            session.add(Incident(
                id=inc_id,
                organization_id=ORG_ID,
                site_id=SITE_ID,
                code=f"INC-{9000+i:04d}",
                title=title,
                description=f"Descripción detallada del incidente: {title}",
                incident_type=inc_type,
                severity=severity,
                status=inc_status,
                location="Planta Principal",
                area="Proceso",
                occurred_at=NOW,
                reported_at=NOW,
                reported_by_id=USER_ID,
                days_lost=0,
                workers_involved=1,
                immediate_actions="Se aisló el área y se notificó a supervisión",
                created_at=NOW,
                updated_at=NOW,
            ))
    print("  ✓ Incidents seeded (3 records)")


async def seed_permits(session: AsyncSession) -> None:
    from app.models.permit import WorkPermit, PermitStatus, PermitType

    for i, (title, ptype, pstatus) in enumerate([
        ("Trabajo en altura — Torre de Refrigeración", PermitType.WORK_AT_HEIGHT, PermitStatus.ACTIVE),
        ("Trabajo en caliente — Soldadura Ducto 12\"", PermitType.HOT_WORK, PermitStatus.ACTIVE),
        ("Ingreso espacio confinado — Estanque TK-04", PermitType.CONFINED_SPACE, PermitStatus.PENDING_APPROVAL),
    ]):
        perm_id = uuid.UUID(f"00000000-0000-0000-0003-{i+1:012d}")
        result = await session.execute(select(WorkPermit).where(WorkPermit.id == perm_id))
        if not result.scalar_one_or_none():
            session.add(WorkPermit(
                id=perm_id,
                organization_id=ORG_ID,
                site_id=SITE_ID,
                code=f"PTW-{100+i:04d}",
                title=title,
                description=f"Permiso para: {title}",
                permit_type=ptype,
                status=pstatus,
                requester_id=USER_ID,
                work_location="Área de trabajo",
                valid_from=NOW,
                valid_until=NOW,
                risk_level="HIGH",
                worker_count=3,
                safety_checklist=[],
                gas_readings=[],
                created_at=NOW,
                updated_at=NOW,
            ))
    print("  ✓ Permits seeded (3 records)")


async def seed_risks(session: AsyncSession) -> None:
    from app.models.risk import RiskRegister, RiskLevel, RiskStatus

    hazards = [
        ("Trabajo en altura sin doble protección", 4, 4, RiskLevel.HIGH),
        ("Contacto con partes energizadas HV", 3, 5, RiskLevel.HIGH),
        ("Atmósfera deficiente de oxígeno en espacio confinado", 3, 5, RiskLevel.HIGH),
    ]
    for i, (hazard, likelihood, consequence, level) in enumerate(hazards):
        risk_id = uuid.UUID(f"00000000-0000-0000-0004-{i+1:012d}")
        result = await session.execute(select(RiskRegister).where(RiskRegister.id == risk_id))
        if not result.scalar_one_or_none():
            session.add(RiskRegister(
                id=risk_id,
                organization_id=ORG_ID,
                site_id=SITE_ID,
                code=f"RIS-{100+i:04d}",
                hazard=hazard,
                activity="Mantenimiento y operaciones generales",
                likelihood=likelihood,
                consequence=consequence,
                risk_score=likelihood * consequence,
                risk_level=level,
                residual_likelihood=2,
                residual_consequence=2,
                residual_risk_score=4,
                residual_risk_level=RiskLevel.LOW,
                status=RiskStatus.OPEN,
                owner_id=USER_ID,
                controls={"administrative": ["Permiso de trabajo", "ART"], "ppe": ["Arnés", "EPP completo"]},
                created_at=NOW,
                updated_at=NOW,
            ))
    print("  ✓ Risks seeded (3 records)")


async def seed_equipment(session: AsyncSession) -> None:
    from app.models.equipment import Equipment, EquipmentStatus

    items = [
        ("EQ-CAT-001", "Excavadora CAT 336 GC", "HEAVY_EQUIPMENT", "Caterpillar", "336 GC", EquipmentStatus.OPERATIONAL),
        ("EQ-KOM-002", "Camión Minero Komatsu HD785", "HAUL_TRUCK", "Komatsu", "HD785-7", EquipmentStatus.OPERATIONAL),
        ("EQ-LIE-003", "Grúa Torre Liebherr 200 EC-H", "CRANE", "Liebherr", "200 EC-H", EquipmentStatus.MAINTENANCE),
    ]
    for i, (code, name, etype, brand, model, estatus) in enumerate(items):
        eq_id = uuid.UUID(f"00000000-0000-0000-0005-{i+1:012d}")
        result = await session.execute(select(Equipment).where(Equipment.id == eq_id))
        if not result.scalar_one_or_none():
            session.add(Equipment(
                id=eq_id,
                organization_id=ORG_ID,
                site_id=SITE_ID,
                code=code,
                name=name,
                equipment_type=etype,
                brand=brand,
                model=model,
                year=2021,
                status=estatus,
                location="Mina Nivel 3",
                hours_operated=4520 + i * 100,
                last_inspection_date=NOW,
                next_inspection_date=NOW,
                created_at=NOW,
                updated_at=NOW,
            ))
    print("  ✓ Equipment seeded (3 records)")


async def seed_actions(session: AsyncSession) -> None:
    from app.models.incident import CorrectiveAction, ActionStatus, ActionPriority

    actions = [
        ("Reparar baranda pasarela N°3", ActionPriority.HIGH, ActionStatus.OPEN),
        ("Actualizar procedimiento LOTO", ActionPriority.HIGH, ActionStatus.IN_PROGRESS),
        ("Instalar duchas de emergencia", ActionPriority.MEDIUM, ActionStatus.OPEN),
    ]
    for i, (title, priority, astatus) in enumerate(actions):
        act_id = uuid.UUID(f"00000000-0000-0000-0006-{i+1:012d}")
        result = await session.execute(select(CorrectiveAction).where(CorrectiveAction.id == act_id))
        if not result.scalar_one_or_none():
            session.add(CorrectiveAction(
                id=act_id,
                organization_id=ORG_ID,
                code=f"ACC-{100+i:04d}",
                title=title,
                description=f"Descripción: {title}",
                category="CORRECTIVE",
                priority=priority,
                status=astatus,
                assigned_to_id=USER_ID,
                due_date=NOW,
                completion_pct=0,
                created_at=NOW,
                updated_at=NOW,
            ))
    print("  ✓ Actions seeded (3 records)")


async def main() -> None:
    print("\n🌱 Seeding local SQLite database...\n")

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  ✓ Tables created")

    async with async_session_factory() as session:
        await ensure_org(session)
        await ensure_site(session)
        await ensure_user(session)

        # Seed QHSE data (each function is idempotent)
        for seeder in [seed_inspections, seed_incidents, seed_permits, seed_risks, seed_equipment, seed_actions]:
            try:
                await seeder(session)
            except Exception as e:
                print(f"  ⚠ Skipped {seeder.__name__}: {e}")

        await session.commit()

    print("\n✅ Seed complete!\n")
    print("   API:      http://localhost:8000/api/v1/docs")
    print("   Frontend: http://localhost:3000")
    print()


if __name__ == "__main__":
    asyncio.run(main())
