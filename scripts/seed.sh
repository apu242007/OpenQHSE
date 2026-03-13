#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# OpenQHSE Platform — Database Seed Script
# Populates the database with realistic demo data.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[Seed]${NC} $1"; }

cd "$(dirname "$0")/../apps/api"

if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

python3 -c "
import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from random import choice, randint, uniform

from app.core.database import async_session, engine, Base
from app.core.security import hash_password
from app.models.user import Organization, User, Site, Area
from app.models.inspection import InspectionTemplate, Inspection, Finding
from app.models.incident import Incident, CorrectiveAction

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # ── Organization ────────────────────────────────────
        org = Organization(
            id=uuid.uuid4(),
            name='Petromax Industrial S.A.',
            slug='petromax-industrial',
            industry='oil_gas',
            country='CO',
            timezone='America/Bogota',
            is_active=True,
        )
        db.add(org)
        await db.flush()

        # ── Users ───────────────────────────────────────────
        users = []
        user_data = [
            ('admin@petromax.com', 'Admin', 'Principal', 'org_admin'),
            ('carlos.mendez@petromax.com', 'Carlos', 'Méndez', 'manager'),
            ('maria.lopez@petromax.com', 'María', 'López', 'supervisor'),
            ('juan.rodriguez@petromax.com', 'Juan', 'Rodríguez', 'inspector'),
            ('ana.garcia@petromax.com', 'Ana', 'García', 'inspector'),
            ('pedro.martinez@petromax.com', 'Pedro', 'Martínez', 'worker'),
            ('lucia.fernandez@petromax.com', 'Lucía', 'Fernández', 'viewer'),
        ]
        for email, first, last, role in user_data:
            user = User(
                id=uuid.uuid4(),
                email=email,
                hashed_password=hash_password('OpenQHSE2024!'),
                first_name=first,
                last_name=last,
                role=role,
                status='active',
                language='es',
                is_email_verified=True,
                organization_id=org.id,
            )
            db.add(user)
            users.append(user)
        await db.flush()

        admin, manager, supervisor, inspector1, inspector2, worker, viewer = users

        # ── Sites ───────────────────────────────────────────
        sites_data = [
            ('Planta Barrancabermeja', 'PBQ', 'Barrancabermeja, Santander', 'CO', 7.0653, -73.8547),
            ('Campo Cusiana', 'CUS', 'Tauramena, Casanare', 'CO', 5.0131, -72.7467),
            ('Terminal Coveñas', 'COV', 'Coveñas, Sucre', 'CO', 9.4050, -75.6914),
        ]
        sites = []
        for name, code, address, country, lat, lng in sites_data:
            site = Site(
                id=uuid.uuid4(),
                name=name,
                code=code,
                address=address,
                country=country,
                latitude=lat,
                longitude=lng,
                is_active=True,
                organization_id=org.id,
            )
            db.add(site)
            sites.append(site)
        await db.flush()

        # ── Areas ───────────────────────────────────────────
        areas = []
        areas_data = [
            ('Área de Destilación', 'DEST', sites[0].id, 'high', ['explosion', 'toxic_gases', 'high_temperature']),
            ('Almacenamiento de Crudo', 'ALMC', sites[0].id, 'critical', ['fire', 'spill', 'confined_space']),
            ('Plataforma de Perforación', 'PERF', sites[1].id, 'critical', ['fall', 'explosion', 'heavy_machinery']),
            ('Sala de Control', 'CTRL', sites[1].id, 'low', ['electrical', 'ergonomic']),
            ('Muelle de Carga', 'MUEL', sites[2].id, 'high', ['fall', 'drowning', 'heavy_loads']),
        ]
        for name, code, site_id, risk, hazards in areas_data:
            area = Area(
                id=uuid.uuid4(),
                name=name,
                code=code,
                risk_level=risk,
                hazard_tags=hazards,
                is_active=True,
                site_id=site_id,
            )
            db.add(area)
            areas.append(area)
        await db.flush()

        # ── Inspection Templates ────────────────────────────
        template = InspectionTemplate(
            id=uuid.uuid4(),
            title='Inspección General de Seguridad',
            description='Checklist estándar para inspecciones de seguridad en planta',
            category='safety',
            version=1,
            is_published=True,
            is_global=False,
            tags=['safety', 'general', 'plant'],
            schema_definition={
                'sections': [
                    {
                        'id': 's1',
                        'title': 'EPP y Vestimenta',
                        'order': 1,
                        'questions': [
                            {'id': 'q1', 'text': '¿Todo el personal usa casco de seguridad?', 'question_type': 'yes_no', 'required': True, 'weight': 10},
                            {'id': 'q2', 'text': '¿Gafas de protección en uso?', 'question_type': 'yes_no', 'required': True, 'weight': 10},
                            {'id': 'q3', 'text': '¿Botas de seguridad adecuadas?', 'question_type': 'yes_no', 'required': True, 'weight': 10},
                        ],
                    },
                    {
                        'id': 's2',
                        'title': 'Orden y Limpieza',
                        'order': 2,
                        'questions': [
                            {'id': 'q4', 'text': '¿Área libre de obstrucciones?', 'question_type': 'yes_no', 'required': True, 'weight': 8},
                            {'id': 'q5', 'text': '¿Señalización visible y en buen estado?', 'question_type': 'yes_no', 'required': True, 'weight': 8},
                            {'id': 'q6', 'text': 'Calificación general del área', 'question_type': 'number', 'required': True, 'weight': 15},
                        ],
                    },
                ],
            },
            organization_id=org.id,
        )
        db.add(template)
        await db.flush()

        # ── Inspections ─────────────────────────────────────
        statuses = ['draft', 'in_progress', 'completed', 'reviewed']
        now = datetime.now(timezone.utc)

        for i in range(25):
            site = choice(sites)
            area = choice(areas)
            inspector = choice([inspector1, inspector2])
            status = choice(statuses)
            created = now - timedelta(days=randint(1, 90))

            inspection = Inspection(
                id=uuid.uuid4(),
                title=f'Inspección #{1000 + i}',
                reference_number=f'INS-2024-{1000 + i}',
                status=status,
                scheduled_date=created.date().isoformat(),
                started_at=created.isoformat() if status != 'draft' else None,
                completed_at=(created + timedelta(hours=randint(1, 4))).isoformat() if status in ('completed', 'reviewed') else None,
                score=round(uniform(60, 100), 1) if status in ('completed', 'reviewed') else None,
                max_score=100,
                notes='Inspección de rutina' if i % 3 == 0 else None,
                gps_latitude=site.latitude + uniform(-0.01, 0.01) if site.latitude else None,
                gps_longitude=site.longitude + uniform(-0.01, 0.01) if site.longitude else None,
                responses={'q1': {'value': True}, 'q2': {'value': choice([True, False])}, 'q3': {'value': True}},
                template_id=template.id,
                organization_id=org.id,
                site_id=site.id,
                area_id=area.id,
                inspector_id=inspector.id,
                created_by=inspector.id,
            )
            db.add(inspection)
        await db.flush()

        # ── Findings ────────────────────────────────────────
        severities = ['critical', 'high', 'medium', 'low', 'observation']
        finding_statuses = ['open', 'in_progress', 'resolved', 'verified', 'closed']
        finding_titles = [
            'Falta de uso de EPP',
            'Derrame de aceite no contenido',
            'Señalización dañada',
            'Extintor vencido',
            'Cable eléctrico expuesto',
            'Barrera de seguridad rota',
            'Ventilación insuficiente',
            'Acceso a salida de emergencia bloqueado',
            'Detector de gas fuera de servicio',
            'Falta de procedimiento documentado',
        ]
        for i in range(15):
            finding = Finding(
                id=uuid.uuid4(),
                title=choice(finding_titles),
                description=f'Hallazgo identificado durante inspección de rutina. Requiere acción correctiva inmediata.' if choice(severities) in ('critical', 'high') else 'Observación para mejora continua.',
                severity=choice(severities),
                status=choice(finding_statuses),
                due_date=(now + timedelta(days=randint(7, 30))).date().isoformat(),
                corrective_action=f'Implementar medida correctiva #{i+1}' if randint(0, 1) else None,
                organization_id=org.id,
                assigned_to_id=choice([supervisor.id, manager.id]),
                created_by=choice([inspector1.id, inspector2.id]),
            )
            db.add(finding)

        # ── Incidents ───────────────────────────────────────
        incident_types = ['near_miss', 'first_aid', 'medical_treatment', 'property_damage', 'environmental']
        incident_severities = ['minor', 'moderate', 'serious', 'critical']
        incident_statuses = ['reported', 'under_investigation', 'corrective_actions', 'review', 'closed']

        for i in range(12):
            site = choice(sites)
            occurred = now - timedelta(days=randint(1, 60))
            inc_type = choice(incident_types)

            incident = Incident(
                id=uuid.uuid4(),
                reference_number=f'INC-2024-{2000 + i}',
                title=f'Incidente en {site.name} — {inc_type.replace(\"_\", \" \").title()}',
                description=f'Descripción detallada del incidente ocurrido en las instalaciones de {site.name}. Se requiere investigación completa.',
                incident_type=inc_type,
                severity=choice(incident_severities),
                status=choice(incident_statuses),
                occurred_at=occurred.isoformat(),
                reported_at=(occurred + timedelta(hours=randint(1, 8))).isoformat(),
                location_description=f'Zona operativa {choice([\"A\", \"B\", \"C\"])}, nivel {randint(1, 3)}',
                injuries_count=randint(0, 2) if inc_type in ('first_aid', 'medical_treatment') else 0,
                fatalities_count=0,
                immediate_actions='Se aplicaron primeros auxilios y se aisló el área.' if randint(0, 1) else None,
                organization_id=org.id,
                site_id=site.id,
                reported_by_id=choice([worker.id, supervisor.id]),
                assigned_investigator_id=manager.id if randint(0, 1) else None,
                created_by=choice([supervisor.id, worker.id]),
            )
            db.add(incident)

        await db.commit()
        print('✅ Database seeded successfully!')
        print(f'   Organization: {org.name}')
        print(f'   Users: {len(users)}')
        print(f'   Sites: {len(sites)}')
        print(f'   Areas: {len(areas)}')
        print('   Inspections: 25')
        print('   Findings: 15')
        print('   Incidents: 12')
        print()
        print('   Admin login: admin@petromax.com / OpenQHSE2024!')

asyncio.run(seed())
"
