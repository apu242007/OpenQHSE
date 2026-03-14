#!/usr/bin/env pwsh
# Starts the FastAPI backend locally (no Docker).
# Prerequisites: Python 3.11+, PostgreSQL running, Redis running, .env in repo root.

$apiDir = Join-Path $PSScriptRoot "..\apps\api"
Set-Location $apiDir

$venv = Join-Path $apiDir ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $venv)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

. $venv

Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -e ".[dev]" -q

Write-Host "Running database migrations..." -ForegroundColor Cyan
alembic upgrade head

Write-Host "Starting API on http://127.0.0.1:8000" -ForegroundColor Green
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
