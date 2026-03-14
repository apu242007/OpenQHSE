# API Reference

Base URL: `https://api.yourdomain.com` (production)  
Base URL: `http://localhost:8000` (local development)

All endpoints are prefixed with `/api/v1`.

Interactive documentation:
- **Swagger UI**: `{BASE_URL}/docs`
- **ReDoc**: `{BASE_URL}/redoc`
- **OpenAPI JSON**: `{BASE_URL}/openapi.json`

---

## Authentication

OpenQHSE uses **JWT Bearer tokens** (HS256).

### Login

```bash
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@openqhse.io",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "admin@openqhse.io",
    "full_name": "Admin User",
    "role": "super_admin"
  }
}
```

Use the token in all subsequent requests:
```bash
curl /api/v1/inspections \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5..."
```

### Register a new organisation

```bash
curl -X POST /api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organization_name": "Acme Corp",
    "email": "admin@acme.com",
    "password": "SecureP@ss123",
    "full_name": "John Admin"
  }'
```

### Refresh token

```bash
curl -X POST /api/v1/auth/refresh \
  -H "Authorization: Bearer {token}"
```

---

## Pagination

All list endpoints return paginated responses:

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

Use `?page=2&limit=50` query parameters to navigate.

---

## Errors

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad Request — validation error, see `detail` field |
| `401` | Unauthorized — missing or expired token |
| `403` | Forbidden — insufficient permissions |
| `404` | Not Found |
| `409` | Conflict — resource already exists (e.g. duplicate slug) |
| `422` | Unprocessable Entity — Pydantic validation failed |
| `500` | Internal Server Error |

Error response format:
```json
{
  "detail": "Template with slug 'my-template' already exists."
}
```

---

## Inspections

### List inspections

```bash
GET /api/v1/inspections?page=1&limit=20&status=completed&from_date=2025-01-01
```

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `limit` | int | Items per page (default: 20, max: 100) |
| `status` | string | `draft`, `in_progress`, `completed`, `cancelled` |
| `from_date` | date | ISO 8601 date (YYYY-MM-DD) |
| `to_date` | date | ISO 8601 date |
| `template_id` | int | Filter by template |
| `assigned_to` | int | Filter by user ID |

**Response:**
```json
{
  "items": [
    {
      "id": 42,
      "title": "Weekly Safety Walk - Plant A",
      "status": "completed",
      "score": 87.5,
      "max_score": 100,
      "template_id": 5,
      "template_name": "Inspección General de Seguridad",
      "assigned_to_name": "Carlos Méndez",
      "location": "Plant A - Section 3",
      "completed_at": "2025-01-15T14:32:00Z",
      "findings_count": 3
    }
  ],
  "total": 234,
  "page": 1,
  "limit": 20,
  "pages": 12
}
```

### Create inspection

```bash
POST /api/v1/inspections
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Weekly Safety Walk",
  "template_id": 5,
  "assigned_to": 12,
  "scheduled_date": "2025-01-20",
  "location": "Plant A - Section 3",
  "notes": "Focus on fire exits"
}
```

### Get inspection detail

```bash
GET /api/v1/inspections/{id}
```

### Submit inspection (with answers)

```bash
PUT /api/v1/inspections/{id}/submit
Content-Type: application/json
Authorization: Bearer {token}

{
  "answers": [
    {
      "question_id": "q1",
      "value": "yes",
      "comment": "All PPE visible and accessible",
      "photos": ["base64_image_data..."]
    },
    {
      "question_id": "q2",
      "value": "no",
      "comment": "Exit blocked by pallet",
      "finding_id": 15
    }
  ],
  "signature": "base64_signature_data",
  "completed_at": "2025-01-20T10:45:00Z"
}
```

### Generate PDF report

```bash
GET /api/v1/inspections/{id}/report.pdf
Authorization: Bearer {token}
```

---

## Incidents

### List incidents

```bash
GET /api/v1/incidents?severity=high&status=open
```

**Query parameters:**
| Param | Type | Values |
|-------|------|--------|
| `severity` | string | `low`, `medium`, `high`, `critical` |
| `status` | string | `open`, `under_investigation`, `resolved`, `closed` |
| `from_date` | date | ISO 8601 |
| `to_date` | date | ISO 8601 |

### Report new incident

```bash
POST /api/v1/incidents
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Sprain injury at loading dock",
  "description": "Worker slipped on wet floor while unloading truck",
  "severity": "medium",
  "incident_type": "injury",
  "occurred_at": "2025-01-20T08:30:00Z",
  "location": "Loading Dock B",
  "injured_person": "Juan García",
  "immediate_actions": "First aid administered, area cordoned off",
  "witnesses": ["María López", "Pedro Ruiz"],
  "photos": []
}
```

### Get CAPA actions for an incident

```bash
GET /api/v1/incidents/{id}/actions
```

### Add corrective action

```bash
POST /api/v1/incidents/{id}/actions
Content-Type: application/json
Authorization: Bearer {token}

{
  "description": "Install anti-slip mats at all loading dock entries",
  "action_type": "corrective",
  "assigned_to": 12,
  "due_date": "2025-02-01",
  "priority": "high"
}
```

---

## Marketplace

### List templates

```bash
GET /api/v1/marketplace/templates?category=safety&industry=mining&q=espacio+confinado
```

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search |
| `category` | string | `safety`, `environment`, `quality`, `health` |
| `industry` | string | `oil_gas`, `mining`, `construction`, `manufacturing` |
| `language` | string | `es`, `en`, `pt` |
| `standard` | string | Filter by standard (e.g. `ISO 45001`) |
| `page` | int | Page number |
| `limit` | int | Items per page |

**Response:**
```json
{
  "items": [
    {
      "id": 5,
      "name": "Inspección Espacio Confinado",
      "slug": "inspeccion-espacio-confinado-osha",
      "description": "Lista de verificación para trabajos en espacios confinados...",
      "category": "safety",
      "industry": "oil_gas",
      "standard": "OSHA 1910.146",
      "version": "2.1.0",
      "language": "es",
      "tags": ["confined-space", "osha", "ptw"],
      "section_count": 8,
      "question_count": 47,
      "import_count": 312,
      "avg_rating": 4.8,
      "status": "published",
      "contributor": "OpenQHSE Team",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 30,
  "page": 1,
  "limit": 20
}
```

### Get template detail

```bash
GET /api/v1/marketplace/templates/{id_or_slug}
```

Returns the full template including `schema_json` (all sections and questions).

### Import template

Imports a marketplace template into your organisation's template library.

```bash
POST /api/v1/marketplace/templates/{id}/import
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Template imported successfully",
  "template_id": 88,
  "name": "Inspección Espacio Confinado (imported)"
}
```

### Rate a template

```bash
POST /api/v1/marketplace/templates/{id}/rate
Content-Type: application/json
Authorization: Bearer {token}

{
  "rating": 5,
  "review": "Excellent template, covers all OSHA requirements perfectly"
}
```

### List categories

```bash
GET /api/v1/marketplace/categories
```

**Response:**
```json
[
  {
    "slug": "safety",
    "name": "Seguridad Industrial",
    "icon": "shield",
    "template_count": 12
  },
  {
    "slug": "environment",
    "name": "Medio Ambiente",
    "icon": "leaf",
    "template_count": 6
  }
]
```

### Submit a new template

```bash
POST /api/v1/marketplace/templates/submit
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "My Custom Template",
  "slug": "my-custom-template",
  "description": "Description of the template...",
  "category": "safety",
  "industry": "construction",
  "standard": "OSHA 1926",
  "language": "es",
  "version": "1.0.0",
  "tags": ["scaffolding", "heights"],
  "schema_json": {
    "sections": [...]
  }
}
```

New submissions are reviewed by the OpenQHSE team before being published.

---

## Risk Assessment

### List risk assessments

```bash
GET /api/v1/risks?status=active&level=high
```

### Create risk assessment

```bash
POST /api/v1/risks
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Electrical hazards in Panel Room 3",
  "activity": "Electrical maintenance",
  "hazards": [
    {
      "description": "Exposed live cables",
      "likelihood": 3,
      "severity": 5,
      "controls": ["LOTO procedure", "PPE class E", "Permit to work"],
      "residual_likelihood": 1,
      "residual_severity": 5
    }
  ]
}
```

### Get risk matrix

```bash
GET /api/v1/risks/matrix
```

---

## Permits to Work

### List permits

```bash
GET /api/v1/permits?type=hot_work&status=active
```

**Permit types:** `hot_work`, `confined_space`, `working_at_heights`, `loto`, `electrical`, `excavation`, `cold_work`

### Create permit

```bash
POST /api/v1/permits
Content-Type: application/json
Authorization: Bearer {token}

{
  "type": "confined_space",
  "title": "Vessel inspection - Tank T-101",
  "location": "Process Area - Tank Farm",
  "work_description": "Internal visual inspection of vessel T-101",
  "scheduled_start": "2025-01-21T08:00:00Z",
  "scheduled_end": "2025-01-21T16:00:00Z",
  "workers": [
    {"user_id": 12, "role": "lead_worker"},
    {"user_id": 13, "role": "attendant"}
  ],
  "gas_readings": {
    "o2_percent": 20.9,
    "lel_percent": 0,
    "h2s_ppm": 0,
    "co_ppm": 0
  }
}
```

### Approve / reject permit

```bash
PUT /api/v1/permits/{id}/approve
Authorization: Bearer {token}

PUT /api/v1/permits/{id}/reject
Content-Type: application/json
Authorization: Bearer {token}
{ "reason": "Insufficient gas readings" }
```

---

## AI Engine

The AI Engine runs on port 8100 and is accessed via the API gateway.

### Analyse inspection

```bash
POST /api/v1/ai/analyze/inspection
Content-Type: application/json
Authorization: Bearer {token}

{
  "inspection_id": 42
}
```

**Response:**
```json
{
  "risk_level": "medium",
  "compliance_score": 87.5,
  "key_findings": [
    "3 non-conformities identified in fire protection systems",
    "PPE compliance at 94% — below required 98% threshold"
  ],
  "recommendations": [
    "Schedule immediate inspection of fire extinguishers in sections 3A and 3B",
    "Mandatory PPE refresher training for shift workers"
  ],
  "regulatory_gaps": [
    "NFPA 10 Section 7.3.3 — annual maintenance record missing"
  ],
  "auto_actions": [
    {
      "description": "Inspect and service fire extinguishers in Section 3A and 3B",
      "priority": "high",
      "due_days": 7
    }
  ]
}
```

### QHSE Assistant chat

```bash
POST /api/v1/ai/chat
Content-Type: application/json
Authorization: Bearer {token}

{
  "message": "What are the OSHA requirements for confined space entry?",
  "conversation_id": "conv_abc123"
}
```

**Response:**
```json
{
  "response": "Under OSHA 29 CFR 1910.146, permit-required confined spaces require...",
  "conversation_id": "conv_abc123",
  "sources": ["OSHA 1910.146", "NFPA 350"]
}
```

---

## Dashboard / Analytics

### Get KPI summary

```bash
GET /api/v1/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "period": "last_30_days",
  "inspections": {
    "total": 45,
    "completed": 38,
    "overdue": 3,
    "avg_score": 91.2,
    "trend": +5.3
  },
  "incidents": {
    "total": 8,
    "open": 2,
    "by_severity": {"low": 5, "medium": 2, "high": 1, "critical": 0},
    "mtbf_days": 12.5
  },
  "permits": {
    "active": 4,
    "expired_today": 1
  },
  "risks": {
    "critical": 2,
    "high": 7,
    "medium": 15
  },
  "training": {
    "overdue_certifications": 12,
    "compliance_rate": 88.3
  }
}
```

---

## Rate Limiting

API requests are limited per IP address:

| Endpoint group | Limit |
|----------------|-------|
| Auth endpoints | 10 req/min |
| General API | 300 req/min |
| AI endpoints | 20 req/min |
| File upload | 30 req/min |

Rate limit headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1705783200
```

---

## Webhooks

Configure webhooks to receive real-time event notifications:

```bash
POST /api/v1/webhooks
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "https://your-server.com/webhooks/openqhse",
  "events": [
    "incident.created",
    "incident.status_changed",
    "permit.approved",
    "permit.expired",
    "inspection.completed",
    "finding.overdue"
  ],
  "secret": "your-webhook-secret"
}
```

Webhook payloads are signed with `X-OpenQHSE-Signature` (HMAC-SHA256).

**Event payload format:**
```json
{
  "event": "incident.created",
  "timestamp": "2025-01-20T10:32:00Z",
  "data": {
    "id": 88,
    "title": "Sprain injury at loading dock",
    "severity": "medium"
  }
}
```

---

## SDKs

Official SDKs are coming soon:

- **JavaScript/TypeScript** — `npm install @openqhse/sdk`
- **Python** — `pip install openqhse-sdk`

Until then, use the hooks from `apps/web/src/hooks/` as reference implementations.

---

For questions, open a [GitHub Discussion](https://github.com/apu242007/OpenQHSE/discussions).
