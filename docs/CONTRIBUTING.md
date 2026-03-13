# Contributing to OpenQHSE

Thank you for your interest in contributing! OpenQHSE is an open-source project and we welcome all kinds of contributions — bug fixes, new features, documentation improvements, translations, and new QHSE templates.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Development Setup](#development-setup)
5. [Code Conventions](#code-conventions)
6. [Commit Messages](#commit-messages)
7. [Pull Request Process](#pull-request-process)
8. [Adding a New Template](#adding-a-new-template)
9. [Adding a Translation](#adding-a-translation)
10. [Reporting Bugs](#reporting-bugs)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We do not tolerate harassment in any form.  
By participating you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/platform.git
   cd platform
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/openqhse/platform.git
   ```
4. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Project Structure

```
apps/
  api/          # FastAPI backend — Python 3.11+
  web/          # Next.js 14 frontend — TypeScript
  mobile/       # React Native / Expo — TypeScript
  ai-engine/    # AI microservice — Python 3.11+
packages/
  ui/           # Shared React component library
  types/        # Shared TypeScript types
  config/       # Shared ESLint / TS configs
scripts/
  templates/    # QHSE seed templates (Python)
  seed_marketplace.py
docs/           # This folder
k8s/helm/       # Kubernetes Helm chart
infra/terraform/ # AWS infrastructure (IaC)
```

---

## Development Setup

### Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Node.js | 20+ | Frontend, monorepo tooling |
| Python | 3.11+ | Backend, AI engine |
| Docker | 24+ | Local infrastructure |
| Git | Any | Version control |
| uv | latest | Python dependency management |

### Full local setup

```bash
# 1. Install Node dependencies (monorepo)
npm install

# 2. Install Python backends
pip install uv
uv pip install -e "apps/api[dev]"
uv pip install -e "apps/ai-engine[dev]"

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit both .env files with your local values

# 4. Start infrastructure
docker compose up -d postgres redis

# 5. Run database migrations
cd apps/api
alembic upgrade head
cd ../..

# 6. Seed marketplace templates
python scripts/seed_marketplace.py

# 7. Start all dev servers
npm run dev
```

### Run tests

```bash
# All tests (via Turbo)
npm run test

# API tests only
cd apps/api
pytest -v

# Web tests only
cd apps/web
npm run test

# With coverage
cd apps/api
pytest --cov=app --cov-report=term-missing
```

### Linting

```bash
# Lint everything (TypeScript + Python)
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Python only (Ruff)
cd apps/api
ruff check . --fix
```

---

## Code Conventions

### TypeScript / JavaScript

- **Strict mode** — `"strict": true` in `tsconfig.json`
- **No `any`** — Use `unknown` with type guards, or proper generics
- **No `@ts-ignore`** — Fix the type issue instead
- **Component naming** — PascalCase for components, camelCase for utilities
- **File naming** — `kebab-case.tsx` for components, `camelCase.ts` for utilities
- **Imports** — Absolute imports via `@/` alias; no relative `../../` imports
- **i18n** — All user-facing strings via `t('key')` / `useTranslations()`; never hardcode UI text

```typescript
// ✅ Good
const data = await fetchTemplates({ page: 1, limit: 20 });

// ❌ Bad
const data: any = await fetch('/api/templates');
```

### Python

- **Type hints** on all function signatures (parameters and return types)
- **Pydantic v2** for all request/response schemas
- **Async everywhere** — use `async def` for all route handlers and DB operations
- **Ruff** for linting (replaces flake8, isort, black)
- **Docstrings** for all public functions/classes (Google style)
- **SQLAlchemy 2** patterns — use `select()`, `session.execute()`, etc.

```python
# ✅ Good
async def get_template(
    template_id: int,
    session: AsyncSession,
) -> MarketplaceTemplateRead | None:
    """Fetch a single marketplace template by ID.

    Args:
        template_id: Primary key of the template.
        session: AsyncSQLAlchemy session.

    Returns:
        Template data or None if not found.
    """
    result = await session.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    return result.scalar_one_or_none()

# ❌ Bad
async def get_template(id, session):
    return session.query(MarketplaceTemplate).get(id)
```

### CSS / Tailwind

- Use design tokens — `text-primary`, `bg-surface`, `border-border`
- Prefer Tailwind utility classes over custom CSS
- Use `cn()` utility for conditional class merging
- Follow BEM-style mental model for component structure

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting (no logic change) |
| `refactor` | Code refactor (no new feature/fix) |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependency updates |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Examples

```bash
feat(marketplace): add T31 electrical safety template
fix(api): correct pagination offset in template list endpoint
docs(contributing): add translation guide
test(incidents): add CAPA workflow integration tests
chore(deps): upgrade sqlalchemy to 2.0.36
```

---

## Pull Request Process

1. **Ensure your branch is up to date**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run the full test suite** locally before opening a PR:
   ```bash
   npm run test
   npm run lint
   ```

3. **Open the PR** against the `main` branch.

4. **Fill in the PR template** — describe what changed and why, link related issues.

5. **PR checklist**:
   - [ ] Tests added/updated for new functionality
   - [ ] All tests pass
   - [ ] Linting passes
   - [ ] New user-facing strings use `t()` for i18n
   - [ ] Sensitive data (keys, passwords) not committed
   - [ ] Documentation updated if needed

6. **Review process**:
   - At least **1 maintainer approval** required to merge
   - CI must be green (lint + tests + security scan)
   - Squash merge into `main`

---

## Adding a New Template

Templates live in `scripts/templates/`. Each template is a Python dict with this shape:

```python
{
    "name": "My New Template",
    "slug": "my-new-template",
    "description": "Short description (max 300 chars)",
    "category": "safety",          # safety|environment|quality|health
    "industry": "construction",    # oil_gas|mining|construction|manufacturing|...
    "standard": "OSHA 1926",       # Applicable standard/regulation
    "language": "es",              # es|en|pt
    "version": "1.0.0",
    "tags": ["excavation", "earthwork"],
    "scoring_method": "percentage",   # percentage|points|compliance
    "passing_score": 80.0,
    "schema_json": {
        "sections": [
            {
                "title": "Section Title",
                "questions": [
                    {
                        "id": "q1",
                        "text": "Question text?",
                        "type": "yes_no",      # yes_no|multiple|numeric|text|photo
                        "required": True,
                        "weight": 1,
                    }
                ]
            }
        ]
    }
}
```

1. Choose the correct file in `scripts/templates/` (or create a new one for a new industry).
2. Add your template dict to the appropriate list.
3. Run `python scripts/seed_marketplace.py --dry-run` to validate.
4. Open a PR with the template file changes.

---

## Adding a Translation

Translations live in `apps/web/src/i18n/messages/`:

```
apps/web/src/i18n/messages/
  es.json   # Spanish (default)
  en.json   # English
  pt.json   # Portuguese (in progress)
```

To add or update a translation:
1. Find the key in `es.json` (Spanish is the source of truth).
2. Add/update the matching key in your target language file.
3. Run `npm run dev` and verify the text renders correctly.
4. Open a PR — translations can be merged without code review if they are accurate.

---

## Reporting Bugs

Please use the [Bug Report template](https://github.com/openqhse/platform/issues/new?template=bug_report.md) and include:

- OpenQHSE version (or commit SHA)
- Steps to reproduce
- Expected vs actual behaviour
- Logs / screenshots if applicable
- Environment (OS, browser, Docker version)

---

## Feature Requests

Use the [Feature Request template](https://github.com/openqhse/platform/issues/new?template=feature_request.md).  
For large changes, open a **Discussion** first to align on approach before writing code.

---

Thank you for making OpenQHSE better! 🛡️
