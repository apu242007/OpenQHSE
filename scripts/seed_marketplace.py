#!/usr/bin/env python3
"""
OpenQHSE Marketplace — Seed Script
====================================
Seeds the marketplace with 30 real, production-ready QHSE checklist templates
covering Safety, Oil & Gas, Mining, Construction, Environment, Quality and Health.

Usage
-----
    # From the project root:
    python scripts/seed_marketplace.py

    # With a custom database URL:
    DATABASE_URL=postgresql+asyncpg://user:pass@host/db python scripts/seed_marketplace.py

    # Dry-run (validate templates without writing to DB):
    python scripts/seed_marketplace.py --dry-run

    # Reset: drop existing seeded templates and re-insert:
    python scripts/seed_marketplace.py --reset
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import os
import time
from pathlib import Path

# ── Make sure the api app is importable ──────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "apps" / "api"))

from templates import ALL_TEMPLATES  # noqa: E402 — local package

# ── Colours for the terminal ─────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def log(msg: str, colour: str = GREEN) -> None:
    print(f"{colour}{msg}{RESET}", flush=True)


# ─────────────────────────────────────────────────────────────
# Validation helpers
# ─────────────────────────────────────────────────────────────

REQUIRED_FIELDS = (
    "name", "slug", "description", "short_description",
    "category", "industry", "standards", "tags", "language",
    "version", "estimated_duration_minutes", "contributor_name",
    "schema_json", "scoring_config",
)

VALID_CATEGORIES = {
    "safety", "oil_and_gas", "mining", "construction",
    "environment", "quality", "health", "electrical",
    "manufacturing", "transportation", "food_safety", "general",
}

def _validate_template(tpl: dict) -> list[str]:
    """Return a list of validation error strings (empty = valid)."""
    errors: list[str] = []
    name = tpl.get("name", "<unnamed>")

    for field in REQUIRED_FIELDS:
        if field not in tpl:
            errors.append(f"  [{name}] Missing required field: {field}")

    if tpl.get("category") not in VALID_CATEGORIES:
        errors.append(f"  [{name}] Invalid category: {tpl.get('category')}")

    schema = tpl.get("schema_json", {})
    sections = schema.get("sections", [])
    if not sections:
        errors.append(f"  [{name}] schema_json.sections is empty")

    total_q = sum(len(s.get("questions", [])) for s in sections)
    if total_q < 5:
        errors.append(f"  [{name}] Only {total_q} questions — expected ≥5")

    return errors


def validate_all(templates: list[dict]) -> bool:
    """Validate all templates. Returns True if all pass."""
    all_errors: list[str] = []
    slugs: set[str] = set()

    for tpl in templates:
        all_errors.extend(_validate_template(tpl))
        slug = tpl.get("slug", "")
        if slug in slugs:
            all_errors.append(f"  Duplicate slug: {slug!r}")
        slugs.add(slug)

    if all_errors:
        log("Validation errors found:", RED)
        for e in all_errors:
            log(e, RED)
        return False

    log(f"  ✓ {len(templates)} templates validated successfully.", GREEN)
    return True


# ─────────────────────────────────────────────────────────────
# Database seed logic
# ─────────────────────────────────────────────────────────────

async def seed(reset: bool = False) -> None:
    from app.core.database import async_session_factory
    from app.models.marketplace import MarketplaceTemplate, TemplateStatus
    from sqlalchemy import select, delete

    start = time.perf_counter()
    inserted = 0
    skipped  = 0
    updated  = 0

    log(f"\n{BOLD}═══ OpenQHSE Marketplace Seed ═══{RESET}")
    log(f"  Templates to process: {len(ALL_TEMPLATES)}")

    async with async_session_factory() as session:
        if reset:
            log("\n  Resetting seeded templates (contributor_name='OpenQHSE Team')…", YELLOW)
            await session.execute(
                delete(MarketplaceTemplate).where(
                    MarketplaceTemplate.contributor_name == "OpenQHSE Team"
                )
            )
            await session.commit()
            log("  ✓ Existing seed templates removed.", YELLOW)

        for i, tpl_data in enumerate(ALL_TEMPLATES, 1):
            slug = tpl_data["slug"]

            # Check if already exists
            result = await session.execute(
                select(MarketplaceTemplate).where(MarketplaceTemplate.slug == slug)
            )
            existing = result.scalar_one_or_none()

            schema = tpl_data["schema_json"]
            sections = schema.get("sections", [])
            section_count  = len(sections)
            question_count = sum(len(s.get("questions", [])) for s in sections)

            if existing and not reset:
                skipped += 1
                log(f"  [{i:02d}] SKIP  {tpl_data['name'][:55]}", YELLOW)
                continue

            obj = existing or MarketplaceTemplate()
            obj.name                      = tpl_data["name"]
            obj.slug                      = slug
            obj.description               = tpl_data["description"]
            obj.short_description         = tpl_data["short_description"]
            obj.category                  = tpl_data["category"]
            obj.industry                  = tpl_data["industry"]
            obj.standards                 = tpl_data["standards"]
            obj.tags                      = tpl_data["tags"]
            obj.language                  = tpl_data.get("language", "es")
            obj.version                   = tpl_data.get("version", "1.0.0")
            obj.is_featured               = tpl_data.get("is_featured", False)
            obj.estimated_duration_minutes= tpl_data.get("estimated_duration_minutes", 20)
            obj.contributor_name          = tpl_data.get("contributor_name", "OpenQHSE Team")
            obj.contributor_org           = tpl_data.get("contributor_org")
            obj.schema_json               = schema
            obj.scoring_config            = tpl_data.get("scoring_config")
            obj.section_count             = section_count
            obj.question_count            = question_count
            obj.status                    = TemplateStatus.PUBLISHED
            obj.download_count            = tpl_data.get("download_count", 0)
            obj.import_count              = tpl_data.get("import_count", 0)
            obj.rating_average            = tpl_data.get("rating_average", 0.0)
            obj.rating_count              = tpl_data.get("rating_count", 0)
            obj.preview_image_url         = tpl_data.get("preview_image_url")
            obj.created_by                = "seed_script"

            if not existing:
                session.add(obj)
                inserted += 1
                log(f"  [{i:02d}] INSERT {tpl_data['name'][:55]} ({section_count}s / {question_count}q)", GREEN)
            else:
                updated += 1
                log(f"  [{i:02d}] UPDATE {tpl_data['name'][:55]}", CYAN)

        await session.commit()

    elapsed = time.perf_counter() - start
    log(f"\n{BOLD}═══ Seed Complete ═══{RESET}")
    log(f"  Inserted : {inserted}")
    log(f"  Updated  : {updated}")
    log(f"  Skipped  : {skipped}")
    log(f"  Total    : {len(ALL_TEMPLATES)}")
    log(f"  Time     : {elapsed:.2f}s")
    log("")


# ─────────────────────────────────────────────────────────────
# Reporting
# ─────────────────────────────────────────────────────────────

def print_summary() -> None:
    """Print a human-readable summary of all templates without touching the DB."""
    from collections import Counter

    cat_counter: Counter[str] = Counter()
    std_counter: Counter[str] = Counter()

    log(f"\n{BOLD}Templates in seed package ({len(ALL_TEMPLATES)} total):{RESET}")
    log("─" * 70)

    for i, t in enumerate(ALL_TEMPLATES, 1):
        sections  = t["schema_json"].get("sections", [])
        questions = sum(len(s.get("questions", [])) for s in sections)
        featured  = "⭐" if t.get("is_featured") else "  "
        log(
            f"  {featured} {i:02d}. {t['name'][:52]:<52} "
            f"[{t['category']:<12}] {questions:>2}q  {t.get('estimated_duration_minutes', '?'):>3}min",
            CYAN,
        )
        cat_counter[t["category"]] += 1
        for s in t.get("standards", []):
            std_counter[s] += 1

    log("\n  By category:")
    for cat, cnt in sorted(cat_counter.items(), key=lambda x: -x[1]):
        log(f"    {cat:<20} {cnt:>2} templates")

    log("\n  Top standards covered:")
    for std, cnt in std_counter.most_common(10):
        log(f"    {std:<30} {cnt:>2} templates")
    log("")


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed the OpenQHSE marketplace with 30 QHSE templates."
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Validate templates and print summary without writing to the database.",
    )
    parser.add_argument(
        "--reset", action="store_true",
        help="Delete existing seeded templates (contributor=OpenQHSE Team) before re-inserting.",
    )
    parser.add_argument(
        "--summary", action="store_true",
        help="Print a summary of templates in the seed package and exit.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    log(f"{BOLD}OpenQHSE Marketplace Seed Script{RESET}")
    log(f"  Python  : {sys.version.split()[0]}")
    log(f"  DB URL  : {os.environ.get('DATABASE_URL', 'from .env / config.py')}")
    log(f"  Mode    : {'DRY RUN' if args.dry_run else ('RESET+INSERT' if args.reset else 'INSERT/SKIP')}")

    # Validate templates first
    log("\nValidating templates…")
    if not validate_all(ALL_TEMPLATES):
        sys.exit(1)

    if args.dry_run or args.summary:
        print_summary()
        if args.dry_run:
            log("Dry-run complete — no database changes made.", YELLOW)
        return

    print_summary()

    try:
        asyncio.run(seed(reset=args.reset))
    except Exception as exc:
        log(f"\nSeed failed: {exc}", RED)
        raise


if __name__ == "__main__":
    main()
