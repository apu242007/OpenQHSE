#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenQHSE — Local startup (no Docker, no login required)
#
# Usage:
#   chmod +x start-local.sh
#   ./start-local.sh
#
# Requirements:
#   - Python 3.12+ with pip
#   - Node.js 20+ with pnpm  (npm i -g pnpm  if missing)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}▶ $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $*${NC}"; }

# ── 1. API Python deps ───────────────────────────────────────────────────────
info "Installing Python dependencies..."
cd "$API_DIR"
pip install -q -r requirements.txt

# ── 2. Seed the SQLite database ──────────────────────────────────────────────
info "Seeding local SQLite database..."
python seed_local.py

# ── 3. Run Alembic migrations (idempotent) ────────────────────────────────────
info "Running Alembic migrations..."
alembic upgrade head || warn "Alembic migration warning (non-fatal)"

# ── 4. Frontend deps ─────────────────────────────────────────────────────────
info "Installing frontend dependencies..."
cd "$ROOT"
if command -v pnpm &>/dev/null; then
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
else
    warn "pnpm not found — trying npm"
    npm install
fi

# ── 5. Start API + Frontend in parallel ──────────────────────────────────────
info "Starting API on http://localhost:8000 ..."
info "Starting Frontend on http://localhost:3000 ..."
echo ""
echo "  API docs:  http://localhost:8000/api/v1/docs"
echo "  Frontend:  http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Trap Ctrl+C so both background jobs are killed cleanly
cleanup() {
    echo ""
    info "Shutting down..."
    kill "$API_PID" "$WEB_PID" 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

cd "$API_DIR"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!

cd "$WEB_DIR"
if command -v pnpm &>/dev/null; then
    pnpm dev &
else
    npm run dev &
fi
WEB_PID=$!

wait "$API_PID" "$WEB_PID"
