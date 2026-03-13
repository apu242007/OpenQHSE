# Security Policy — OpenQHSE Platform

> **Responsible disclosure**: if you discover a vulnerability, please email **security@openqhse.io** before opening a public issue. We aim to acknowledge reports within 24 h and publish a fix within 7 days for critical issues.

---

## Table of Contents

1. [Authentication Model](#1-authentication-model)
2. [PostgreSQL Row-Level Security (RLS)](#2-postgresql-row-level-security-rls)
3. [Rate Limiting](#3-rate-limiting)
4. [Token Blacklist](#4-token-blacklist)
5. [Secrets Management](#5-secrets-management)
6. [Dependency Scanning](#6-dependency-scanning)
7. [Transport Security](#7-transport-security)
8. [Reporting a Vulnerability](#8-reporting-a-vulnerability)
9. [Supported Versions](#9-supported-versions)

---

## 1. Authentication Model

### httpOnly Cookies — never `localStorage`

JWTs are issued as **httpOnly, Secure, SameSite=Lax** cookies via NextAuth v5.  
The token is **never** accessible to JavaScript running in the browser, which eliminates XSS-based token theft.

```
Browser → POST /auth/signin (credentials)
         ← Set-Cookie: next-auth.session-token=<JWT>; HttpOnly; Secure; SameSite=Lax
```

All subsequent API calls from the Next.js server-side forward the cookie automatically.  
The FastAPI backend validates the JWT signature on every request through the `CurrentUser` dependency.

### JWT Configuration

| Parameter | Value |
|-----------|-------|
| Algorithm | HS256 |
| `exp` (access token) | 15 minutes |
| `exp` (refresh token) | 7 days |
| Signing secret | 256-bit random value (`SECRET_KEY` env var) |
| Issuer claim (`iss`) | `openqhse` |

### RBAC — 7 Role Levels

| Role | Level | Description |
|------|-------|-------------|
| `viewer` | 1 | Read-only access to assigned modules |
| `worker` | 2 | Submit observations, complete training |
| `supervisor` | 3 | Approve field-level records |
| `manager` | 4 | Full module management, no admin actions |
| `admin` | 5 | Organisation-level admin |
| `superadmin` | 6 | Multi-tenant platform admin |
| `readonly_auditor` | 7 | External auditor — immutable read access |

Roles are enforced at the FastAPI dependency level:

```python
# routes/observations.py
@router.post("/observations")
async def create_observation(
    payload: ObservationCreate,
    current_user: CurrentUser,   # any authenticated user
    db: DBSession,
): ...

@router.put("/observations/{id}")
async def update_observation(
    id: UUID,
    payload: ObservationUpdate,
    current_user: ManagerUser,   # manager+ only
    db: DBSession,
): ...
```

---

## 2. PostgreSQL Row-Level Security (RLS)

RLS is enabled on all multi-tenant tables to guarantee database-level isolation between organisations.  
Even if application code has a bug, a query can never return rows belonging to another organisation.

### Enabling RLS

```sql
-- scripts/init-rls.sql
ALTER TABLE inspections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_alert_rules  ENABLE ROW LEVEL SECURITY;
-- ... (all business tables)
```

### Policy pattern

```sql
CREATE POLICY tenant_isolation ON inspections
  USING (site_id IN (
    SELECT id FROM sites WHERE organisation_id = current_setting('app.organisation_id')::uuid
  ));
```

The application sets `app.organisation_id` at the start of each database session:

```python
# app/core/database.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        org_id = current_user_org_id.get()   # contextvars
        await session.execute(
            text("SET LOCAL app.organisation_id = :org_id"),
            {"org_id": str(org_id)},
        )
        yield session
```

### Superuser bypass

The `openqhse_api` database role is **not** a PostgreSQL superuser and cannot bypass RLS.  
Migrations run as a separate `openqhse_migrations` role with `BYPASSRLS` granted only for the duration of the migration job.

---

## 3. Rate Limiting

Rate limiting is applied at two layers:

### Layer 1 — nginx / API Gateway (ingress)

```nginx
# docker/nginx/nginx.conf
limit_req_zone $binary_remote_addr zone=api_general:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=api_auth:10m    rate=10r/m;

location /api/v1/auth/ {
    limit_req zone=api_auth burst=5 nodelay;
    ...
}

location /api/v1/ {
    limit_req zone=api_general burst=20 nodelay;
    ...
}
```

### Layer 2 — FastAPI middleware (SlowAPI)

```python
# app/core/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)

# Applied per endpoint:
@router.post("/auth/login")
@limiter.limit("10/minute")
async def login(...): ...

@router.post("/ai/analyze")
@limiter.limit("20/hour")
async def ai_analyze(...): ...
```

### Rate limit headers

All rate-limited responses include:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1710000000
Retry-After: 30    # only on 429 responses
```

---

## 4. Token Blacklist

Issued JWTs cannot be cryptographically revoked before expiry — the blacklist solves this.

### How it works

When a user logs out, changes their password, or an admin revokes a session, the JWT `jti` (JWT ID) claim is added to a Redis SET with a TTL equal to the token's remaining lifetime:

```python
# app/services/auth.py
async def revoke_token(jti: str, expires_at: datetime) -> None:
    ttl = int((expires_at - datetime.utcnow()).total_seconds())
    if ttl > 0:
        await redis.setex(f"blacklist:{jti}", ttl, "1")

async def is_token_revoked(jti: str) -> bool:
    return await redis.exists(f"blacklist:{jti}") == 1
```

The `CurrentUser` dependency calls `is_token_revoked` on every request.  
Tokens expiring within 60 seconds are automatically added to the blacklist during refresh.

### Session listing & remote logout

Users can view all active sessions and remotely invalidate any of them via:

```
GET  /auth/sessions          # list all active sessions for current user
DELETE /auth/sessions/{jti}  # revoke specific session
DELETE /auth/sessions         # revoke all sessions (full logout)
```

---

## 5. Secrets Management

| Environment | Storage |
|-------------|---------|
| Local dev | `.env` files (gitignored) |
| Staging / Production | AWS Secrets Manager + Kubernetes Secrets |
| CI/CD | GitHub Actions Encrypted Secrets |

### Never committed to git

The following patterns are in `.gitignore`:

```
.env
.env.*
!.env.example
apps/**/.env
apps/**/.env.local
**/secrets.yaml
**/values-production.yaml
```

### Rotation policy

| Secret | Rotation frequency |
|--------|--------------------|
| `SECRET_KEY` (JWT signing) | Every 90 days |
| Database passwords | Every 180 days |
| AWS IAM access keys | Not used — OIDC only |
| API keys (OpenAI, etc.) | On suspected compromise |

OIDC is used for GitHub Actions → AWS authentication, eliminating long-lived AWS credentials in CI entirely.

---

## 6. Dependency Scanning

### Python — Safety + pip-audit

```bash
pip-audit --requirement apps/api/requirements.txt
```

Runs in the CI `lint-backend` job.

### Node.js — npm audit

```bash
npm audit --audit-level=high
```

Runs in the CI `lint-frontend` job.

### Container images — Trivy (blocking)

Trivy scans the production API image on every release:

```yaml
# .github/workflows/release.yml
- uses: aquasecurity/trivy-action@master
  with:
    severity:       CRITICAL
    exit-code:      '1'       # blocks the pipeline
    ignore-unfixed: true      # only fails when a patch exists
```

A failed Trivy scan **blocks** deployment until the CVE is resolved or acknowledged as a false positive in `.trivyignore`.

### SBOM (Software Bill of Materials)

Docker build pushes an SBOM attestation with every image:

```yaml
# docker/build-push-action
provenance: true
sbom:       true
```

---

## 7. Transport Security

| Setting | Value |
|---------|-------|
| TLS minimum version | TLS 1.2 |
| Preferred | TLS 1.3 |
| HSTS | `max-age=31536000; includeSubDomains; preload` |
| Certificate provider | AWS ACM (auto-renewed) |
| Internal cluster traffic | mTLS via AWS App Mesh (production) |
| API CORS origins | Strict allowlist via `CORS_ORIGINS` env var |
| Content-Security-Policy | `default-src 'self'; script-src 'self'` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |

### nginx security headers

```nginx
# docker/nginx/nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options            "DENY"                                         always;
add_header X-Content-Type-Options     "nosniff"                                      always;
add_header Referrer-Policy            "strict-origin-when-cross-origin"              always;
add_header Permissions-Policy         "camera=(), microphone=(), geolocation=(self)" always;
```

---

## 8. Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

1. Email **security@openqhse.io** with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - (Optional) a suggested fix or patch

2. We will acknowledge receipt within **24 hours**.

3. We will provide an initial assessment within **72 hours**.

4. For confirmed critical vulnerabilities, we target a fix within **7 days**.

5. Once the fix is released, we will coordinate disclosure with the reporter and publish a CVE if applicable.

We follow [Responsible Disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html) principles and will credit researchers in our release notes (unless they prefer anonymity).

---

## 9. Supported Versions

| Version | Security fixes |
|---------|---------------|
| `main` (latest) | ✅ Active |
| Previous minor | ✅ Critical fixes only (90 days) |
| Older releases | ❌ No support — please upgrade |

We recommend always running the latest stable release.  
See [DEPLOYMENT.md](DEPLOYMENT.md) for zero-downtime upgrade instructions.
