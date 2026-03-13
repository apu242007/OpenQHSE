# Deployment Guide

This guide covers five methods to deploy OpenQHSE:

1. [Docker Compose (recommended for small teams)](#1-docker-compose)
2. [Kubernetes / Helm (recommended for production)](#2-kubernetes--helm)
3. [AWS EKS with Terraform (enterprise)](#3-aws-eks--terraform)
4. [Manual (bare metal / VPS)](#4-manual-bare-metal--vps)
5. [Railway (one-click)](#5-railway)

---

## Prerequisites (all methods)

| Dependency | Minimum version | Notes |
|------------|----------------|-------|
| PostgreSQL | 15+ | 16 recommended |
| Redis | 7+ | Used for Celery queue + caching |
| Python | 3.11+ | Backend runtime |
| Node.js | 20+ | Build frontend |
| Docker | 24+ | Methods 1–3 |

---

## 1. Docker Compose

### Development

```bash
git clone https://github.com/openqhse/platform.git
cd platform
docker compose up -d
```

This starts: PostgreSQL, Redis, API, AI Engine, Celery Worker, Web.

### Production

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — set all secrets, your domain, SMTP, S3, etc.

# 2. Start the production stack
docker compose \
  -f docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d

# 3. Run database migrations
docker compose exec api alembic upgrade head

# 4. Seed marketplace templates
docker compose exec api python scripts/seed_marketplace.py

# 5. Verify all services are healthy
docker compose ps
docker compose logs api --tail=50
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host/db` |
| `REDIS_URL` | ✅ | `redis://host:6379/0` |
| `SECRET_KEY` | ✅ | Long random string (256-bit) |
| `OPENAI_API_KEY` | ✅ | For AI analysis features |
| `ENVIRONMENT` | ✅ | `production` |
| `CORS_ORIGINS` | ✅ | `https://yourdomain.com` |
| `SMTP_HOST` | ⚠️ | Email notifications |
| `S3_BUCKET` | ⚠️ | Media storage (local MinIO or AWS S3) |
| `SENTRY_DSN` | ⚠️ | Error monitoring |

### nginx reverse proxy

The `docker/nginx/nginx.conf` config handles:
- HTTPS redirect
- Next.js frontend (`/`)
- FastAPI backend (`/api/v1`)
- WebSocket upgrades

Update `nginx.conf` with your domain name before deploying.

---

## 2. Kubernetes / Helm

### Prerequisites

- Kubernetes cluster 1.26+
- `kubectl` configured
- Helm 3.12+
- An existing `Secret` with your credentials (see below)

### Create the secret

```bash
kubectl create namespace openqhse

kubectl create secret generic openqhse-secrets \
  --namespace openqhse \
  --from-literal=DATABASE_URL="postgresql+asyncpg://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=SECRET_KEY="$(openssl rand -hex 32)" \
  --from-literal=OPENAI_API_KEY="sk-..."
```

### Install with Helm

```bash
helm repo add openqhse https://charts.openqhse.io
helm repo update

helm upgrade --install openqhse openqhse/platform \
  --namespace openqhse \
  --create-namespace \
  --set api.existingSecret=openqhse-secrets \
  --set web.existingSecret=openqhse-secrets \
  --set ingress.enabled=true \
  --set ingress.hostname=app.yourdomain.com \
  --set ingress.tls.enabled=true \
  --values k8s/helm/values.yaml \
  --wait --timeout=10m
```

### Custom values

Create a `my-values.yaml` to override defaults:

```yaml
global:
  imageTag: "v1.0.0"

api:
  replicaCount: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8

web:
  replicaCount: 2

celeryWorker:
  queues: "default,inspections,reports"
  concurrency: 8

postgresql:
  enabled: false           # Use external RDS instead
  externalHost: "my-rds.cluster.amazonaws.com"

redis:
  enabled: false           # Use external ElastiCache
  externalHost: "my-redis.cache.amazonaws.com"

ingress:
  hostname: app.yourdomain.com
  tls:
    enabled: true
    certManager: true      # Use cert-manager for TLS
```

Then:
```bash
helm upgrade openqhse openqhse/platform \
  --namespace openqhse \
  --values my-values.yaml \
  --wait
```

### Seed templates via Helm Job

Templates can be seeded after installation via the included Job:

```bash
helm upgrade openqhse openqhse/platform \
  --namespace openqhse \
  --set jobs.seedMarketplace.enabled=true \
  --reuse-values
```

---

## 3. AWS EKS + Terraform

This method provisions a full AWS infrastructure:
- **VPC** with public/private subnets across 3 AZs
- **EKS** cluster (v1.29) with managed node groups
- **RDS** PostgreSQL 16 (Multi-AZ in production)
- **ElastiCache** Redis 7.1
- **ECR** repositories for all Docker images
- **S3** for media storage
- **ACM** SSL certificate
- **Secrets Manager** for credentials

### Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform 1.6+
- `kubectl`
- Helm 3.12+
- Docker

### Step 1 — Provision infrastructure

```bash
cd infra/terraform

# Initialize
terraform init

# Preview changes
terraform plan \
  -var="environment=production" \
  -var="aws_region=us-east-1" \
  -var="domain_name=yourdomain.com"

# Apply (takes ~15 minutes)
terraform apply \
  -var="environment=production" \
  -var="aws_region=us-east-1" \
  -var="domain_name=yourdomain.com"
```

Terraform will output:
- `eks_cluster_endpoint`
- `ecr_repository_urls`
- `rds_endpoint`
- `redis_endpoint`
- `secrets_manager_arn`

### Step 2 — Configure kubectl

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name openqhse-production
```

### Step 3 — Deploy with the deploy script

```bash
# Build, push Docker images, and deploy via Helm
./scripts/deploy.sh \
  --env production \
  --version v1.0.0 \
  --seed

# Flags:
# --env          staging|production
# --version      Docker image tag (default: git short SHA)
# --skip-build   Skip docker build
# --skip-push    Skip docker push to ECR
# --skip-deploy  Skip Helm upgrade
# --seed         Run seed_marketplace.py after deploy
# --dry-run      Show what would happen without executing
```

### Step 4 — Verify

```bash
kubectl get pods -n openqhse
kubectl get ingress -n openqhse
kubectl logs -n openqhse deployment/openqhse-api --tail=100
```

### Terraform variables reference

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-east-1` | AWS region |
| `environment` | `staging` | `staging` or `production` |
| `domain_name` | — | Your domain (e.g. `openqhse.com`) |
| `eks_version` | `1.29` | Kubernetes version |
| `eks_node_instance_type` | `t3.medium` | EC2 instance type for nodes |
| `rds_instance_class` | `db.t3.medium` | RDS instance class |
| `redis_node_type` | `cache.t3.micro` | ElastiCache node type |

---

## 4. Manual (Bare Metal / VPS)

### Requirements

- Ubuntu 22.04 LTS (or Debian 12)
- 2+ CPU cores, 4+ GB RAM
- PostgreSQL 16, Redis 7 installed
- nginx installed
- Python 3.11 + pip + uv
- Node.js 20 + npm

### Step 1 — Clone and build

```bash
git clone https://github.com/openqhse/platform.git /opt/openqhse
cd /opt/openqhse

# Install Node deps and build frontend
npm install
cd apps/web && npm run build
cd /opt/openqhse

# Install Python deps
pip install uv
uv pip install -e "apps/api[prod]"
uv pip install -e "apps/ai-engine[prod]"
```

### Step 2 — Configure environment

```bash
cp apps/api/.env.example apps/api/.env
# Edit /opt/openqhse/apps/api/.env with production values
```

### Step 3 — Run database migrations

```bash
cd /opt/openqhse/apps/api
alembic upgrade head
python ../../scripts/seed_marketplace.py
```

### Step 4 — Create systemd services

**API service** (`/etc/systemd/system/openqhse-api.service`):
```ini
[Unit]
Description=OpenQHSE FastAPI
After=network.target postgresql.service redis.service

[Service]
User=openqhse
WorkingDirectory=/opt/openqhse/apps/api
ExecStart=/usr/local/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=5
EnvironmentFile=/opt/openqhse/apps/api/.env

[Install]
WantedBy=multi-user.target
```

**Celery worker** (`/etc/systemd/system/openqhse-celery.service`):
```ini
[Unit]
Description=OpenQHSE Celery Worker

[Service]
User=openqhse
WorkingDirectory=/opt/openqhse/apps/api
ExecStart=/usr/local/bin/celery -A app.celery_app worker -l info -Q default,inspections
Restart=always
EnvironmentFile=/opt/openqhse/apps/api/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl enable openqhse-api openqhse-celery
systemctl start openqhse-api openqhse-celery
```

### Step 5 — nginx configuration

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    # Next.js frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50m;
    }
}
```

```bash
certbot --nginx -d app.yourdomain.com
nginx -t && systemctl reload nginx
```

---

## 5. Railway

One-click cloud deploy (ideal for evaluation or small teams):

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/openqhse)

Railway will automatically:
1. Provision PostgreSQL and Redis
2. Set `DATABASE_URL` and `REDIS_URL` environment variables
3. Build and deploy the API and web containers
4. Run migrations on first deploy

After deployment, set these environment variables in the Railway dashboard:
- `SECRET_KEY` — generate with `openssl rand -hex 32`
- `OPENAI_API_KEY` — your OpenAI key
- `ENVIRONMENT` — `production`

---

## Post-deployment checklist

- [ ] Change default admin credentials
- [ ] Configure SMTP for email notifications
- [ ] Enable S3/MinIO for photo/document storage
- [ ] Configure Prometheus + Grafana monitoring
- [ ] Set up log aggregation (Loki, CloudWatch, Datadog)
- [ ] Enable automated backups for PostgreSQL
- [ ] Review CORS origins — only allow your domains
- [ ] Generate a strong `SECRET_KEY` (never use the default)
- [ ] Set up an error monitoring service (Sentry)
- [ ] Verify TLS/HTTPS is enforced

---

## Monitoring

OpenQHSE exposes Prometheus metrics at `/api/v1/metrics`.

Import the included Grafana dashboard:
```bash
docker compose up -d grafana prometheus
# Visit http://localhost:3001
# Default credentials: admin / admin
```

The dashboard shows:
- HTTP request rate and latency (p50, p95, p99)
- Active users and sessions
- Celery task queue depth
- PostgreSQL connection pool
- Cache hit rates

---

## Backup and Restore

### PostgreSQL backup

```bash
# Backup
docker compose exec postgres pg_dump -U openqhse openqhse | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup-20250101.sql.gz | docker compose exec -T postgres psql -U openqhse openqhse
```

### Automated backups (cron)

```cron
0 2 * * * /opt/openqhse/scripts/backup.sh >> /var/log/openqhse-backup.log 2>&1
```

---

For help, open a [GitHub Discussion](https://github.com/openqhse/platform/discussions) or file an [issue](https://github.com/openqhse/platform/issues).
