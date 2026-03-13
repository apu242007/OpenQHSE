"""
Seed script: Inserta los templates del marketplace en la base de datos de OpenQHSE.
Uso: python seed_marketplace_templates.py

Requiere:
  - Variable de entorno DATABASE_URL configurada
  - Tablas form_templates existentes (migraciones aplicadas)
  - Un organization_id de una organización "global" o de sistema
"""

import asyncio
import json
import os
import uuid
from pathlib import Path

import asyncpg

TEMPLATES_DIR = Path(__file__).parent

# UUID fijo para la organización "sistema" (marketplace global)
# Ajusta este valor al UUID real de tu organización global en producción
SYSTEM_ORG_ID = os.getenv("MARKETPLACE_ORG_ID", "00000000-0000-0000-0000-000000000001")

TEMPLATE_FILES = [
    "01_inspeccion_equipos_pesados_mineria.json",
    "02_auditoria_iso45001_2018.json",
    "03_perforacion_petrolera_api_rp54.json",
    "04_espacio_confinado_entrada_permitida.json",
    "05_auditoria_iso14001_2015.json",
]


async def seed_templates():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    # asyncpg requiere postgresql:// (no postgresql+asyncpg://)
    db_url = database_url.replace("postgresql+asyncpg://", "postgresql://")

    conn = await asyncpg.connect(db_url)

    try:
        for filename in TEMPLATE_FILES:
            filepath = TEMPLATES_DIR / filename
            if not filepath.exists():
                print(f"[SKIP] {filename} — archivo no encontrado")
                continue

            with open(filepath, encoding="utf-8") as f:
                tpl = json.load(f)

            template_id = str(uuid.uuid4())
            name = tpl["name"]

            # Verificar si ya existe un template con ese nombre (idempotente)
            existing = await conn.fetchrow(
                "SELECT id FROM form_templates WHERE name = $1 AND organization_id = $2",
                name,
                uuid.UUID(SYSTEM_ORG_ID),
            )
            if existing:
                print(f"[EXISTS] '{name}' — ya existe, saltando")
                continue

            await conn.execute(
                """
                INSERT INTO form_templates (
                    id, name, description, category, version, status,
                    is_global, tags, schema, scoring_config, organization_id,
                    site_id, is_deleted, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, 1, 'published',
                    true, $5, $6, $7, $8,
                    NULL, false, NOW(), NOW()
                )
                """,
                uuid.UUID(template_id),
                name,
                tpl.get("description"),
                tpl.get("category"),
                tpl.get("tags", []),
                json.dumps(tpl["schema_def"]),
                json.dumps(tpl.get("scoring_config")),
                uuid.UUID(SYSTEM_ORG_ID),
            )
            print(f"[OK] Insertado: '{name}' ({template_id})")

    finally:
        await conn.close()

    print("\nSeed completado.")


if __name__ == "__main__":
    asyncio.run(seed_templates())
