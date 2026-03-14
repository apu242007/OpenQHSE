#!/usr/bin/env pwsh
# Starts the Next.js frontend locally in dev mode (no Docker).
# Prerequisites: Node 22+, pnpm 9+, API running on port 8000.
# On first run, copy .env.example to apps/web/.env.local and fill in NEXTAUTH_SECRET.

$root = Join-Path $PSScriptRoot ".."
Set-Location $root

$envLocal = Join-Path $root "apps\web\.env.local"
if (-not (Test-Path $envLocal)) {
    Write-Host "apps/web/.env.local not found — creating from template..." -ForegroundColor Yellow
    @"
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me-dev-local-secret
API_URL=http://localhost:8000/api/v1
"@ | Set-Content $envLocal
    Write-Host "Created $envLocal — edit NEXTAUTH_SECRET before production use." -ForegroundColor Yellow
}

Write-Host "Installing workspace dependencies..." -ForegroundColor Cyan
pnpm install

Write-Host "Starting Next.js dev server on http://localhost:3000" -ForegroundColor Green
pnpm --filter=@openqhse/web dev --port 3000
