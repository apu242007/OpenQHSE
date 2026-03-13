<div align="center">

<img src="https://raw.githubusercontent.com/openqhse/platform/main/apps/web/public/icons/icon-192x192.png" alt="OpenQHSE Logo" width="96" />

# 🛡️ OpenQHSE Platform

### Enterprise QHSE Management — Open Source, Self-Hosted, Production-Ready

[![CI](https://github.com/openqhse/platform/actions/workflows/ci.yml/badge.svg)](https://github.com/openqhse/platform/actions/workflows/ci.yml)
[![Release](https://github.com/openqhse/platform/actions/workflows/release.yml/badge.svg)](https://github.com/openqhse/platform/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-00E5A0.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776ab?logo=python&logoColor=white)](apps/api)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](apps/web)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)](docker/)
[![Helm Chart](https://img.shields.io/badge/Helm-Chart-326ce5?logo=helm&logoColor=white)](k8s/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**[Live Demo](https://app.openqhse.io)** · **[Marketplace](https://app.openqhse.io/marketplace)** · **[Docs](docs/)** · **[Report a Bug](https://github.com/openqhse/platform/issues/new?template=bug_report.md)**

</div>

---

## Why OpenQHSE?

| | OpenQHSE | SafetyCulture / iAuditor | Intelex | Cority |
|---|---|---|---|---|
| **License** | ✅ MIT Open-source | ❌ Proprietary SaaS | ❌ Proprietary | ❌ Proprietary |
| **Self-host** | ✅ Docker / Kubernetes | ❌ Cloud only | ⚠️ Enterprise req. | ❌ Cloud only |
| **AI-powered analysis** | ✅ Built-in (GPT-4) | ⚠️ Paid add-on | ❌ | ⚠️ Limited |
| **Offline PWA** | ✅ Full offline support | ⚠️ Limited | ❌ | ❌ |
| **Template marketplace** | ✅ 30+ free templates | ⚠️ Paid library | ❌ | ❌ |
| **HAZOP / Bowtie / Risk matrix** | ✅ | ❌ | ✅ | ✅ |
| **Multi-tenant SaaS-ready** | ✅ | ✅ | ✅ | ✅ |
| **Cost** | **$0 forever** | $19–$45 /user/mo | $$$$ | $$$$ |

> Every worker deserves to go home safe — and every organisation deserves tools to make that happen, regardless of budget.</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔍 Inspections & Audits
- Dynamic form builder with 30+ templates
- Scoring & compliance tracking
- GPS, photo evidence, digital signature
- Automated PDF reports
- QR-code field access

</td>
<td width="50%">

### 🚨 Incident Management
- Full investigation workflow (CAPA)
- Root cause analysis & Bowtie
- Witness management
- Insurance-grade documentation
- Trend & recurrence tracking

</td>
</tr>
<tr>
<td>

### 🔐 Permit to Work (PTW)
- Hot work, confined space, heights, LOTO
- Gas reading validation
- Digital multi-step approvals
- QR-code site activation
- Conflict detection engine

</td>
<td>

### ⚠️ Risk Assessment
- 5×5 risk matrix builder
- HAZOP studies
- Bowtie diagrams
- Legal & regulatory register
- Automatic risk scoring

</td>
</tr>
<tr>
<td>

### 🤖 AI Engine (GPT-4)
- Incident root cause suggestions
- Regulatory compliance checks
- Automated action generation
- Natural language report writing
- Predictive analytics

</td>
<td>

### 📱 Offline-First PWA + Mobile
- 100% offline operation (Service Worker)
- Background sync when reconnected
- Camera & digital signature
- Push notifications
- React Native app (Expo)

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Docker (3 commands — zero configuration needed)

```bash
git clone https://github.com/openqhse/platform.git
cd platform
docker compose up -d
```

Open **http://localhost:3000** and log in: `admin@openqhse.io` / `admin123`

> ⚠️ Change these credentials before any public deployment.

### Development mode

```bash
# 1. Install all workspace dependencies
npm install

# 2. Set up Python backends
pip install uv
uv pip install -e "apps/api[dev]"
uv pip install -e "apps/ai-engine[dev]"

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 5. Run migrations and seed
cd apps/api && alembic upgrade head && cd ../..
python scripts/seed_marketplace.py

# 6. Start all dev servers (turbo)
npm run dev
```

### Available services

| Service | URL | Notes |
|---------|-----|-------|
| Web App | http://localhost:3000 | Next.js 14 + PWA |
| API Docs | http://localhost:8000/docs | Swagger UI |
| AI Engine | http://localhost:8100/docs | LangChain FastAPI |
| Grafana | http://localhost:3001 | Monitoring |
| Prometheus | http://localhost:9090 | Metrics |

---

## 📦 Template Marketplace

30+ production-ready QHSE templates — free, open-source, and certified to international standards:

| ID | Template | Standard | Industry |
|----|----------|----------|----------|
| T01 | Inspección General de Seguridad Industrial | ISO 45001 | Safety |
| T04 | Trabajo en Altura | OSHA 1926.502 | Safety |
| T05 | Espacio Confinado | OSHA 1910.146 | Safety |
| T09 | LOTO / Bloqueo y Etiquetado | OSHA 1910.147 | Safety |
| T11 | Plataforma Petrolera (Diaria) | API RP 75 | Oil & Gas |
| T16 | Maquinaria Pesada Minería | MSHA 30 CFR | Mining |
| T17 | Voladura Controlada | MSHA 30 CFR 57 | Mining |
| T20 | Inspección Semanal de Obra | OSHA 1926 | Construction |
| T23 | Auditoría Ambiental ISO 14001 | ISO 14001 | Environment |
| T26 | Auditoría de Calidad ISO 9001 | ISO 9001 | Quality |
| T29 | Higiene Industrial | ACGIH TLV | Health |
| … | [+19 more templates](https://app.openqhse.io/marketplace) | | |

```bash
# Seed all 30 templates into your database
python scripts/seed_marketplace.py

# Preview without writing to DB
python scripts/seed_marketplace.py --dry-run

# Reset and re-seed
python scripts/seed_marketplace.py --reset --summary
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CloudFront / nginx                     │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
       ┌───────▼──────┐     ┌─────────▼───────┐
       │  Next.js 14  │     │   FastAPI API   │
       │  (PWA + SSR) │     │  (Python 3.11)  │
       └──────────────┘     └────────┬────────┘
                                     │
         ┌───────────────────────────┼─────────────────┐
         │                           │                 │
  ┌──────▼──────┐   ┌────────────────▼──┐  ┌──────────▼───┐
  │  PostgreSQL  │   │  Redis / Celery   │  │  AI Engine   │
  │  (async ORM) │   │  (task queues)    │  │  (LangChain) │
  └─────────────┘   └───────────────────┘  └──────────────┘
  ┌──────────────────────────────────────────────────────┐
  │          React Native / Expo (Mobile App)            │
  │        SQLite (offline) ↔ Background Sync            │
  └──────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript strict, Tailwind CSS |
| State | TanStack Query v5, Zustand |
| Mobile | React Native (Expo), SQLite offline, Background Sync |
| Backend | FastAPI, SQLAlchemy 2 (async), Pydantic v2, Alembic |
| AI | LangChain, OpenAI GPT-4o, Redis caching |
| Queue | Celery + Redis |
| Database | PostgreSQL 16 (JSONB for dynamic forms) |
| Auth | JWT (HS256), RBAC (7 role levels) |
| Infra | Docker, Kubernetes (Helm), Terraform (AWS EKS) |
| CI/CD | GitHub Actions, Trivy, OIDC auth |
| Monitoring | Prometheus + Grafana |
| i18n | next-intl (ES, EN, PT) |

---

## 🗂️ Project Structure

```
├── apps/
│   ├── api/          # FastAPI + SQLAlchemy backend (Python 3.11)
│   ├── web/          # Next.js 14 PWA frontend
│   ├── mobile/       # React Native / Expo (offline-first)
│   └── ai-engine/    # LangChain AI microservice
├── packages/
│   ├── ui/           # Shared React component library
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared ESLint / TS configs
├── scripts/
│   ├── templates/    # 30 QHSE inspection templates (Python)
│   ├── seed_marketplace.py
│   └── deploy.sh     # Full production deploy orchestrator
├── k8s/helm/         # Helm chart (HPA, StatefulSet, Jobs)
├── infra/terraform/  # AWS EKS, RDS, ElastiCache, ECR (IaC)
├── docker/           # Service Dockerfiles
└── .github/workflows/# CI (ci.yml) + Release / Deploy (release.yml)
```

---

## 🚢 Deployment

### Docker Compose (Production)

```bash
cp .env.example .env      # Configure all secrets
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml up -d
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed_marketplace.py
```

### Kubernetes — Helm

```bash
helm repo add openqhse https://charts.openqhse.io
helm upgrade --install openqhse openqhse/platform \
  --namespace openqhse --create-namespace \
  --set api.existingSecret=openqhse-secrets \
  --values my-values.yaml
```

### AWS EKS — Terraform + Helm

```bash
cd infra/terraform
terraform init
terraform apply -var="environment=production" -var="aws_region=us-east-1"

# Then deploy all services
./scripts/deploy.sh --env production --seed
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for all five deployment methods.

---

## 📋 Module Status

| Module | Status | Description |
|--------|--------|-------------|
| 🔍 Inspections | ✅ Stable | Dynamic checklists, scoring, PDF reports |
| 🚨 Incidents | ✅ Stable | Full investigation & CAPA workflow |
| 🔐 Permits (PTW) | ✅ Stable | Digital PTW with multi-step approvals |
| ⚠️ Risk Assessment | ✅ Stable | Matrix, HAZOP, Bowtie |
| 📄 Documents | ✅ Stable | DMS with versioning & acknowledgments |
| 🎓 Training | ✅ Stable | Courses, enrollments, competencies |
| 🔧 Equipment | ✅ Stable | Asset registry & maintenance |
| 👷 Contractors | ✅ Stable | Registry, workers, documents & compliance |
| 👁️ BBS Observations | ✅ Stable | Behavior-based safety observations |
| 🔔 KPI Alerts | ✅ Stable | Automated KPI thresholds & notification rules |
| 🤖 AI Analysis | ✅ Beta | Incident analysis, regulatory check |
| 📊 Analytics | ✅ Beta | KPIs, trends, leading indicators |
| 🛒 Marketplace | ✅ Stable | 30+ certified templates |
| 📱 PWA | ✅ Stable | Offline-first, background sync |
| 📱 Mobile (Native) | 🔄 Beta | React Native / Expo |
| 🌐 Multi-language | ✅ Stable | ES, EN (PT coming) |
| 🏢 Multi-tenant | 🗓️ Q2 2025 | Organisation isolation |

---

## 🔧 Environment Variables

Key variables for `apps/api/.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/openqhse
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-256-bit-random-secret
OPENAI_API_KEY=sk-...
ENVIRONMENT=production
CORS_ORIGINS=https://yourdomain.com

# Optional: Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=...

# Optional: S3 media storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=openqhse-media
```

---

## 🎨 Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#0066FF` | Actions, links, brand |
| Safe | `#00E5A0` | Passed, compliant |
| Warning | `#FFAA00` | Medium risk, attention |
| Danger | `#FF4444` | High risk, critical |
| Background | `#141921` | Dark surfaces |

---

## 🤝 Contributing

We welcome all contributions!

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/platform.git
cd platform

# 2. Create a feature branch
git checkout -b feat/amazing-feature

# 3. Develop and test
docker compose up -d
npm run dev
npm run test

# 4. Commit (Conventional Commits)
git commit -m "feat(marketplace): add new mining template"

# 5. Open a Pull Request
git push origin feat/amazing-feature
```

### Code standards

- **TypeScript**: Strict mode — no `any`, no `@ts-ignore`
- **Python**: Ruff linter, type hints on all functions
- **Tests**: Required for all new features
- **i18n**: All user-facing strings via `t()` / `__`

### Ways to contribute

| Area | Description |
|------|-------------|
| 🌐 Translations | PT-BR, FR, DE, AR — see `apps/web/src/i18n/` |
| 📋 Templates | New industry templates via `scripts/templates/` |
| 🧪 Testing | Unit & integration coverage |
| 📖 Docs | Tutorials, video walkthroughs |
| 🎨 UI/UX | Accessibility, mobile responsiveness |
| 🐛 Bug reports | [Open an issue](https://github.com/openqhse/platform/issues) |

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide and PR checklist.

---

## 🗺️ Roadmap

- [x] Core modules (inspections, incidents, permits, risks, documents, training, equipment)
- [x] AI-powered analysis (GPT-4)
- [x] Template marketplace (30 templates, MIT licensed)
- [x] PWA + full offline support (Service Worker)
- [x] Kubernetes Helm chart (HPA, StatefulSet, Jobs, nightly backup)
- [x] GitHub Actions CI/CD with Trivy security scanning (blocking on CRITICAL CVEs)
- [x] Terraform AWS infrastructure (EKS + RDS + ElastiCache)
- [x] Contractor management module (registry, workers, compliance tracking)
- [x] BBS Observations module (behavior-based safety, mobile-friendly form)
- [x] Automated KPI alert rules (threshold + channel notifications)
- [ ] Multi-tenant architecture
- [ ] Native mobile app (Expo EAS build)
- [ ] Carbon footprint tracking module
- [ ] Contractor / visitor portal
- [ ] SCIM / SSO (Okta, Azure AD, Google Workspace)
- [ ] Real-time collaboration (WebSocket rooms)
- [ ] OpenQHSE Cloud (managed SaaS offering)

---

## 📜 License

OpenQHSE is released under the **[MIT License](LICENSE)**.  
Free to use, modify, and distribute — including commercially. Attribution appreciated.

---

## 🌟 Acknowledgments

Built with ❤️ for safety professionals worldwide.  
Inspired by the belief that **great QHSE tools should be accessible to every organisation, not just Fortune 500 companies.**

If OpenQHSE saves a single life or prevents a single injury — it was worth building.

---

<div align="center">

**[⭐ Star us on GitHub](https://github.com/openqhse/platform)** — it helps more people discover the project.

[openqhse.io](https://openqhse.io) · [Marketplace](https://app.openqhse.io/marketplace) · [Documentation](docs/) · [MIT License](LICENSE)

</div>
