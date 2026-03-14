#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# OpenQHSE Platform — Development Setup Script
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OpenQHSE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────
log "Checking prerequisites..."

command -v node >/dev/null 2>&1 || err "Node.js is not installed. Please install Node.js 20+"
command -v npm >/dev/null 2>&1  || err "npm is not installed."
command -v python3 >/dev/null 2>&1 || warn "Python 3 not found — backend won't work without it."
command -v docker >/dev/null 2>&1 || warn "Docker not found — you'll need it for infrastructure services."

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  err "Node.js 18+ is required (found v$NODE_VERSION)"
fi

log "Prerequisites OK ✓"

# ── Environment file ───────────────────────────────────────
if [ ! -f .env ]; then
  log "Creating .env from .env.example..."
  cp .env.example .env
  log ".env created — please review and update secrets before running in production."
else
  log ".env already exists, skipping."
fi

# ── Install pnpm dependencies ─────────────────────────────
log "Installing pnpm dependencies..."
pnpm install --frozen-lockfile

# ── Python backend ─────────────────────────────────────────
if command -v python3 >/dev/null 2>&1; then
  log "Setting up Python virtual environment for API..."
  cd apps/api
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -e ".[dev]"
  deactivate
  cd ../..

  log "Setting up Python virtual environment for AI Engine..."
  cd apps/ai-engine
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -e ".[dev]"
  deactivate
  cd ../..
fi

# ── Docker infrastructure ─────────────────────────────────
if command -v docker >/dev/null 2>&1; then
  log "Starting infrastructure services (Postgres, Redis, MinIO, Ollama)..."
  docker compose -f docker/docker-compose.dev.yml up -d postgres redis minio ollama
  log "Waiting for PostgreSQL to be ready..."
  sleep 5

  log "Pulling Ollama model (this may take a while on first run)..."
  docker exec openqhse-ollama ollama pull llama3.1:8b || warn "Could not pull Ollama model — AI features will be unavailable."
fi

# ── Database migrations ────────────────────────────────────
if command -v python3 >/dev/null 2>&1 && [ -d "apps/api/.venv" ]; then
  log "Running database migrations..."
  cd apps/api
  source .venv/bin/activate
  alembic upgrade head || warn "Migration failed — the database may not be ready yet."
  deactivate
  cd ../..
fi

# ── Summary ────────────────────────────────────────────────
echo ""
log "═══════════════════════════════════════════════════════════"
log " OpenQHSE development environment is ready!"
log "═══════════════════════════════════════════════════════════"
echo ""
log " Available commands:"
log "   npm run dev          — Start all services in dev mode"
log "   npm run dev:api      — Start API backend only"
log "   npm run dev:web      — Start web frontend only"
log "   npm run build        — Build all packages"
log "   npm run test         — Run all tests"
log "   npm run docker:dev   — Start full stack with Docker"
echo ""
log " Services:"
log "   Frontend:   http://localhost:3000"
log "   API:        http://localhost:8000"
log "   API Docs:   http://localhost:8000/docs"
log "   AI Engine:  http://localhost:8001/docs"
log "   MinIO:      http://localhost:9001"
log "   Grafana:    http://localhost:3001"
echo ""
