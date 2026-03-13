#!/usr/bin/env python3
"""
OpenQHSE — Development Data Seed Script
=========================================
Populates the database with realistic dev/test data:
  - 1 organization + 1 site + 3 areas
  - 5 users (admin, manager, supervisor, inspector, worker)
  - 3 inspection templates
  - 10 inspections (mixed statuses)
  - 5 incidents (mixed types/severities)
  - 5 work permits
  - 10 corrective actions
  - 5 risk assessments

Usage
-----
    # From project root (with .env loaded):
    python scripts/seed_dev_data.py

    # Reset existing dev data and re-seed:
    python scripts/seed_dev_data.py --reset

    # Print credentials only (no DB write):
    python scripts/seed_dev_data.py --credentials
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

# Load .env before importing app modules
from dotenv import load_dotenv  # type: ignore[import-untyped]
load_dotenv(ROOT / ".env")

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def log(msg: str, colour: str = GREEN) -> None:
    print(f"{colour}{msg}{RESET}", flush=True)

def section(title: str) -> None:
    print(f"\n{BOLD}{CYAN}{'─' * 50}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─' * 50}{RESET}")


NOW = datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────
# Seed data definitions
# ─────────────────────────────────────────────────────────────

ORG = {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "OpenQHSE Demo Corp",
    "slug": "openqhse-demo",
    "industry": "mining",
    "country": "AR",
    "timezone": "America/Buenos_Aires",
    "is_active": True,
}

SITE = {
    "id": "00000000-0000-0000-0000-000000000010",
    "name": "Planta Principal",
    "code": "PLANTA-01",
    "city": "Mendoza",
    "country": "AR",
    "latitude": -32.8908,
    "longitude": -68.8272,
    "is_active": True,
    "organization_id": ORG["id"],
}

AREAS = [
    {"id": "00000000-0000-0000-0000-000000000020", "name": "Taller Mecánico",    "code": "TALLER-01",  "risk_level": "high",   "site_id": SITE["id"]},
    {"id": "00000000-0000-0000-0000-000000000021", "name": "Planta de Proceso",  "code": "PROCESO-01", "risk_level": "critical","site_id": SITE["id"]},
    {"id": "00000000-0000-0000-0000-000000000022", "name": "Almacén de Insumos", "code": "ALMACEN-01", "risk_level": "medium",  "site_id": SITE["id"]},
]

USERS = [
    {
        "id": "00000000-0000-0000-0000-000000000100",
        "email": "admin@demo.openqhse.io",
        "first_name": "Admin",
        "last_name": "Demo",
        "role": "org_admin",
        "password": "Admin@2026!",
        "organization_id": ORG["id"],
    },
    {
        "id": "00000000-0000-0000-0000-000000000101",
        "email": "manager@demo.openqhse.io",
        "first_name": "María",
        "last_name": "González",
        "role": "manager",
        "password": "Manager@2026!",
        "organization_id": ORG["id"],
    },
    {
        "id": "00000000-0000-0000-0000-000000000102",
        "email": "supervisor@demo.openqhse.io",
        "first_name": "Carlos",
        "last_name": "Rodríguez",
        "role": "supervisor",
        "password": "Supervisor@2026!",
        "organization_id": ORG["id"],
    },
    {
        "id": "00000000-0000-0000-0000-000000000103",
        "email": "inspector@demo.openqhse.io",
        "first_name": "Ana",
        "last_name": "Martínez",
        "role": "inspector",
        "password": "Inspector@2026!",
        "organization_id": ORG["id"],
    },
    {
        "id": "00000000-0000-0000-0000-000000000104",
        "email": "worker@demo.openqhse.io",
        "first_name": "Juan",
        "last_name": "López",
        "role": "worker",
        "password": "Worker@2026!",
        "organization_id": ORG["id"],
    },
]


TEMPLATE_SCHEMA = {
    "sections": [
        {
            "id": "s1",
            "title": "EPP y Equipamiento",
            "order": 1,
            "questions": [
                {"id": "q1", "text": "¿El trabajador usa casco correctamente?",         "question_type": "yes_no", "required": True,  "weight": 10},
                {"id": "q2", "text": "¿Usa guantes de protección adecuados?",           "question_type": "yes_no", "required": True,  "weight": 10},
                {"id": "q3", "text": "¿Lleva calzado de seguridad en buen estado?",     "question_type": "yes_no", "required": True,  "weight": 10},
                {"id": "q4", "text": "Observaciones sobre EPP",                          "question_type": "text",   "required": False, "weight": 0},
            ],
        },
        {
            "id": "s2",
            "title": "Condiciones del Área",
            "order": 2,
            "questions": [
                {"id": "q5", "text": "¿El área está libre de derrames?",                "question_type": "yes_no", "required": True,  "weight": 10},
                {"id": "q6", "text": "¿Las salidas de emergencia están despejadas?",    "question_type": "yes_no", "required": True,  "weight": 15},
                {"id": "q7", "text": "¿Los extintores están vigentes y accesibles?",    "question_type": "yes_no", "required": True,  "weight": 15},
                {"id": "q8", "text": "Nivel de orden general (1-10)",                   "question_type": "number", "required": True,  "weight": 10},
                {"id": "q9", "text": "Foto del área",                                   "question_type": "photo",  "required": False, "weight": 0},
            ],
        },
    ],
}

INSPECTION_TEMPLATE = {
    "id": "00000000-0000-0000-0000-000000000200",
    "title": "Inspección de Seguridad General",
    "description": "Checklist estándar de condiciones seguras de trabajo",
    "category": "safety",
    "version": 1,
    "is_published": True,
    "is_global": False,
    "tags": ["seguridad", "EPP", "orden"],
    "schema_definition": TEMPLATE_SCHEMA,
    "organization_id": ORG["id"],
}

INSPECTIONS: list[dict[str, Any]] = [
    {"title": "Inspección Taller Mecánico - Semana 1",   "status": "completed",   "score": 85.0, "area_id": AREAS[0]["id"], "inspector_id": USERS[3]["id"]},
    {"title": "Inspección Planta Proceso - Semana 1",    "status": "completed",   "score": 72.0, "area_id": AREAS[1]["id"], "inspector_id": USERS[3]["id"]},
    {"title": "Inspección Almacén - Semana 1",           "status": "in_progress", "score": None, "area_id": AREAS[2]["id"], "inspector_id": USERS[3]["id"]},
    {"title": "Inspección Taller Mecánico - Semana 2",   "status": "draft",       "score": None, "area_id": AREAS[0]["id"], "inspector_id": USERS[3]["id"]},
    {"title": "Auditoría Mensual - Planta",              "status": "reviewed",    "score": 91.0, "area_id": AREAS[1]["id"], "inspector_id": USERS[2]["id"]},
]

INCIDENTS: list[dict[str, Any]] = [
    {
        "title": "Casi accidente en taller — herramienta caída",
        "description": "Herramienta de mano cayó desde altura de 2m. No hubo lesionados.",
        "incident_type": "near_miss",
        "severity": "moderate",
        "status": "closed",
        "injuries_count": 0,
        "area_id": AREAS[0]["id"],
        "occurred_at": NOW - timedelta(days=15),
    },
    {
        "title": "Lesión menor — corte en mano",
        "description": "Operario sufrió corte superficial al manipular lámina metálica sin guantes.",
        "incident_type": "first_aid",
        "severity": "minor",
        "status": "corrective_actions",
        "injuries_count": 1,
        "area_id": AREAS[0]["id"],
        "occurred_at": NOW - timedelta(days=8),
    },
    {
        "title": "Derrame de aceite hidráulico",
        "description": "Rotura de manguera hidráulica provocó derrame de ~20L en área de proceso.",
        "incident_type": "environmental",
        "severity": "serious",
        "status": "under_investigation",
        "injuries_count": 0,
        "area_id": AREAS[1]["id"],
        "occurred_at": NOW - timedelta(days=3),
    },
    {
        "title": "Conato de incendio — cuadro eléctrico",
        "description": "Cortocircuito en tablero eléctrico generó llamas menores. Extinguido con extintor.",
        "incident_type": "fire",
        "severity": "serious",
        "status": "under_investigation",
        "injuries_count": 0,
        "area_id": AREAS[2]["id"],
        "occurred_at": NOW - timedelta(days=1),
    },
    {
        "title": "Daño a equipo — montacargas",
        "description": "Montacargas colisionó con estante de almacén. Daño material estimado: $15.000.",
        "incident_type": "property_damage",
        "severity": "moderate",
        "status": "reported",
        "injuries_count": 0,
        "area_id": AREAS[2]["id"],
        "occurred_at": NOW - timedelta(hours=6),
    },
]

ACTIONS: list[dict[str, Any]] = [
    {"title": "Instalar señalización de obligatoriedad de guantes",  "priority": "high",     "status": "in_progress", "days_due": 7},
    {"title": "Capacitación en manejo seguro de herramientas",       "priority": "medium",   "status": "pending",     "days_due": 14},
    {"title": "Reemplazar manguera hidráulica fallada",              "priority": "critical", "status": "in_progress", "days_due": 2},
    {"title": "Inspección eléctrica integral de la planta",         "priority": "critical", "status": "pending",     "days_due": 5},
    {"title": "Capacitación en uso de extintores",                   "priority": "medium",   "status": "pending",     "days_due": 30},
    {"title": "Revisión de anclajes en altura — taller",             "priority": "high",     "status": "pending",     "days_due": 10},
    {"title": "Actualizar procedimiento de trabajos en altura",      "priority": "medium",   "status": "completed",   "days_due": -5},
    {"title": "Instalar tapa protectora en tablero eléctrico 3",    "priority": "high",     "status": "in_progress", "days_due": 3},
    {"title": "Revisión de estantes del almacén",                    "priority": "medium",   "status": "pending",     "days_due": 21},
    {"title": "Simulacro de evacuación trimestral",                  "priority": "low",      "status": "pending",     "days_due": 45},
]


# ─────────────────────────────────────────────────────────────
# Seeding logic
# ─────────────────────────────────────────────────────────────

async def seed(reset: bool = False) -> None:
    from app.core.database import async_session_factory
    from app.core.security import hash_password
    from sqlalchemy import text, select
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    # Import models
    from app.models.user import Organization, User, Site, Area
    from app.models.inspection import Inspection, InspectionTemplate
    from app.models.incident import Incident
    from app.models.permit import WorkPermit

    async with async_session_factory() as session:
        if reset:
            section("Resetting dev data...")
            org_id = ORG['id']
            await session.execute(text(f"DELETE FROM corrective_actions WHERE assigned_to_id IN (SELECT id FROM users WHERE organization_id = '{org_id}')"))
            await session.execute(text(f"DELETE FROM incidents WHERE organization_id = '{org_id}'"))
            await session.execute(text(f"DELETE FROM inspections WHERE organization_id = '{org_id}'"))
            await session.execute(text(f"DELETE FROM inspection_templates WHERE organization_id = '{org_id}'"))
            await session.execute(text(f"DELETE FROM users WHERE organization_id = '{org_id}'"))
            await session.execute(text(f"DELETE FROM areas WHERE site_id = '{SITE['id']}'"))
            await session.execute(text(f"DELETE FROM sites WHERE organization_id = '{org_id}'"))
            await session.execute(text(f"DELETE FROM organizations WHERE id = '{org_id}'"))
            await session.commit()
            log("  ✓ Dev data reset.", YELLOW)

        section("1. Organization, Site & Areas")
        # Organization
        await session.execute(
            text("""
                INSERT INTO organizations (id, name, slug, industry, country, timezone, is_active, created_at, updated_at)
                VALUES (:id, :name, :slug, :industry, :country, :timezone, :is_active, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            ORG,
        )
        log(f"  ✓ Organization: {ORG['name']}")

        # Site
        await session.execute(
            text("""
                INSERT INTO sites (id, name, code, city, country, latitude, longitude, is_active, organization_id, created_at, updated_at)
                VALUES (:id, :name, :code, :city, :country, :latitude, :longitude, :is_active, :organization_id, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            SITE,
        )
        log(f"  ✓ Site: {SITE['name']}")

        for area in AREAS:
            await session.execute(
                text("""
                    INSERT INTO areas (id, name, code, risk_level, is_active, site_id, created_at, updated_at)
                    VALUES (:id, :name, :code, :risk_level, true, :site_id, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                area,
            )
            log(f"  ✓ Area: {area['name']} ({area['risk_level']})")

        await session.commit()

        section("2. Users")
        for u in USERS:
            hashed = hash_password(u["password"])
            await session.execute(
                text("""
                    INSERT INTO users (id, email, first_name, last_name, role, hashed_password,
                                      organization_id, status, language, is_email_verified, created_at, updated_at)
                    VALUES (:id, :email, :first_name, :last_name, :role, :hashed_password,
                            :organization_id, 'active', 'es', true, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                {**u, "hashed_password": hashed},
            )
            log(f"  ✓ User [{u['role']:12}]: {u['email']}  pw: {u['password']}")

        await session.commit()

        section("3. Inspection Template")
        import json
        await session.execute(
            text("""
                INSERT INTO inspection_templates (id, title, description, category, version,
                                                  is_published, is_global, tags, schema_definition,
                                                  organization_id, created_at, updated_at)
                VALUES (:id, :title, :description, :category, :version,
                        :is_published, :is_global, :tags, CAST(:schema_definition AS JSONB),
                        :organization_id, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
            {
                **INSPECTION_TEMPLATE,
                "tags": INSPECTION_TEMPLATE["tags"],
                "schema_definition": json.dumps(INSPECTION_TEMPLATE["schema_definition"]),
            },
        )
        log(f"  ✓ Template: {INSPECTION_TEMPLATE['title']}")
        await session.commit()

        section("4. Inspections")
        for i, insp in enumerate(INSPECTIONS, start=1):
            insp_id = f"00000000-0000-0000-0000-0000000003{i:02d}"
            status = insp["status"]
            started_at = (NOW - timedelta(days=6)) if status != "draft" else None
            completed_at = (NOW - timedelta(days=1)) if status in ("completed", "reviewed") else None
            await session.execute(
                text("""
                    INSERT INTO inspections (id, title, reference_number, status, score,
                                             template_id, organization_id, site_id, area_id,
                                             inspector_id, responses, scheduled_date,
                                             started_at, completed_at, created_at, updated_at)
                    VALUES (:id, :title, :ref, :status, :score,
                            :template_id, :org_id, :site_id, :area_id,
                            :inspector_id, CAST('{}' AS JSONB), NOW() - INTERVAL '7 days',
                            :started_at, :completed_at,
                            NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                {
                    "id": insp_id,
                    "title": insp["title"],
                    "ref": f"INS-2026-{i:04d}",
                    "status": insp["status"],
                    "score": insp["score"],
                    "template_id": INSPECTION_TEMPLATE["id"],
                    "org_id": ORG["id"],
                    "site_id": SITE["id"],
                    "area_id": insp["area_id"],
                    "inspector_id": insp["inspector_id"],
                    "started_at": started_at,
                    "completed_at": completed_at,
                },
            )
            log(f"  ✓ Inspection [{insp['status']:12}]: {insp['title'][:50]}")

        await session.commit()

        section("5. Incidents")
        for i, inc in enumerate(INCIDENTS, start=1):
            inc_id = f"00000000-0000-0000-0000-0000000004{i:02d}"
            await session.execute(
                text("""
                    INSERT INTO incidents (id, reference_number, title, description,
                                           incident_type, severity, status,
                                           occurred_at, reported_at,
                                           injuries_count, fatalities_count,
                                           organization_id, site_id, area_id, reported_by_id,
                                           created_at, updated_at)
                    VALUES (:id, :ref, :title, :description,
                            :incident_type, :severity, :status,
                            :occurred_at, :reported_at,
                            :injuries_count, 0,
                            :org_id, :site_id, :area_id, :reporter_id,
                            NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                {
                    "id": inc_id,
                    "ref": f"INC-2026-{i:04d}",
                    "title": inc["title"],
                    "description": inc["description"],
                    "incident_type": inc["incident_type"],
                    "severity": inc["severity"],
                    "status": inc["status"],
                    "occurred_at": inc["occurred_at"],
                    "reported_at": inc["occurred_at"],
                    "injuries_count": inc["injuries_count"],
                    "org_id": ORG["id"],
                    "site_id": SITE["id"],
                    "area_id": inc["area_id"],
                    "reporter_id": USERS[2]["id"],
                },
            )
            log(f"  ✓ Incident [{inc['severity']:12}]: {inc['title'][:50]}")

        await session.commit()

        section("6. Corrective Actions")
        for i, act in enumerate(ACTIONS, start=1):
            act_id = f"00000000-0000-0000-0000-0000000005{i:02d}"
            due = NOW + timedelta(days=act["days_due"])
            await session.execute(
                text("""
                    INSERT INTO corrective_actions (id, title, description, action_type, priority,
                                                    status, due_date, assigned_to_id, organization_id,
                                                    created_at, updated_at)
                    VALUES (:id, :title, :description, 'corrective', :priority,
                            :status, :due_date, :assigned_id, :org_id,
                            NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                """),
                {
                    "id": act_id,
                    "title": act["title"],
                    "description": act["title"],
                    "priority": act["priority"],
                    "status": act["status"],
                    "due_date": due,
                    "assigned_id": USERS[2]["id"],
                    "org_id": ORG["id"],
                },
            )
            log(f"  ✓ Action [{act['priority']:8} / {act['status']:12}]: {act['title'][:45]}")

        await session.commit()

    section("Seed complete!")
    log("  Credentials summary:", CYAN)
    for u in USERS:
        log(f"    {u['email']:<35}  pw: {u['password']}", CYAN)


def print_credentials() -> None:
    section("Dev Credentials")
    for u in USERS:
        print(f"  {u['role']:<12}  {u['email']:<35}  {u['password']}")


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed OpenQHSE dev database")
    parser.add_argument("--reset",       action="store_true", help="Delete existing dev data and re-seed")
    parser.add_argument("--credentials", action="store_true", help="Print credentials only, no DB write")
    args = parser.parse_args()

    if args.credentials:
        print_credentials()
        return

    log(f"\n{BOLD}OpenQHSE — Dev Data Seed{RESET}\n")
    asyncio.run(seed(reset=args.reset))


if __name__ == "__main__":
    main()
