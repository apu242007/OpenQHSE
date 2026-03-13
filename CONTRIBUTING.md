# Contributing to OpenQHSE

Thank you for your interest in contributing to OpenQHSE! This guide will help you get started.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Run** `bash scripts/setup.sh` to set up your environment
4. **Create** a feature branch from `main`

## Development Process

### Branch Naming

- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Test additions/changes
- `chore/` — Build process, dependencies, etc.

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(inspections): add bulk export to CSV
fix(auth): handle expired refresh token gracefully
docs(api): update endpoint documentation
test(incidents): add integration tests for corrective actions
```

### Code Style

#### TypeScript (Frontend & Packages)
- Strict mode enabled — no `any` types
- Use named exports over default exports
- All components must be accessible (WCAG 2.1 AA)
- All user-facing strings must use i18n (`useTranslations`)

#### Python (Backend & AI Engine)
- Type hints on all function parameters and returns
- Ruff linter with the project's configuration
- Async functions for all database operations
- Pydantic v2 models for all API schemas

### Testing

- **Frontend**: Vitest + React Testing Library
- **Backend**: Pytest + pytest-asyncio
- **Minimum coverage**: 80% for new features

```bash
# Run all tests
npm run test

# Backend tests only
cd apps/api && pytest

# Frontend tests only
cd apps/web && npx vitest
```

### Internationalization (i18n)

All new user-facing text must be added to all three locale files:
- `apps/web/src/i18n/messages/es.json` (Spanish — primary)
- `apps/web/src/i18n/messages/en.json` (English)
- `apps/web/src/i18n/messages/pt.json` (Portuguese)

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add entries to locale files for new user-facing strings
4. Request review from at least one maintainer
5. Squash and merge once approved

## Architecture Decisions

When proposing significant changes, please open an issue first to discuss the approach. Include:

- Problem statement
- Proposed solution
- Alternatives considered
- Impact on existing code

## Questions?

Open a [Discussion](https://github.com/openqhse/openqhse/discussions) for general questions, or an [Issue](https://github.com/openqhse/openqhse/issues) for bug reports and feature requests.
