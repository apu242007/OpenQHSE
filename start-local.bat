@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM OpenQHSE — Local startup (no Docker, no login required)  [Windows]
REM
REM Usage:  double-click start-local.bat  OR  run from terminal
REM
REM Requirements:
REM   - Python 3.12+ in PATH
REM   - Node.js 20+ with pnpm  (npm i -g pnpm  if missing)
REM ─────────────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "API_DIR=%ROOT%apps\api"
set "WEB_DIR=%ROOT%apps\web"

echo.
echo  OpenQHSE Platform — Local Startup
echo  ===================================
echo.

REM ── 1. Install Python deps ───────────────────────────────────────────────────
echo [1/4] Installing Python dependencies...
cd /d "%API_DIR%"
pip install -q -r requirements.txt
if errorlevel 1 ( echo ERROR: pip install failed & pause & exit /b 1 )

REM ── 2. Seed SQLite database ──────────────────────────────────────────────────
echo [2/4] Seeding local SQLite database...
python seed_local.py
if errorlevel 1 ( echo ERROR: seed_local.py failed & pause & exit /b 1 )

REM ── 3. Alembic migrations ────────────────────────────────────────────────────
echo [3/4] Running Alembic migrations...
alembic upgrade head
REM Non-fatal if it fails (tables may already exist from seed)

REM ── 4. Frontend deps ─────────────────────────────────────────────────────────
echo [4/4] Installing frontend dependencies...
cd /d "%ROOT%"
where pnpm >nul 2>&1
if %errorlevel%==0 (
    pnpm install 2>nul || pnpm install
) else (
    echo pnpm not found, using npm...
    npm install
)

REM ── Start both servers in separate windows ────────────────────────────────────
echo.
echo  Starting API on   http://localhost:8000
echo  Starting Web on   http://localhost:3000
echo.
echo  API docs:  http://localhost:8000/api/v1/docs
echo  Press Ctrl+C in each window to stop the server.
echo.

cd /d "%API_DIR%"
start "OpenQHSE API (port 8000)" cmd /k "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

cd /d "%WEB_DIR%"
where pnpm >nul 2>&1
if %errorlevel%==0 (
    start "OpenQHSE Web (port 3000)" cmd /k "pnpm dev"
) else (
    start "OpenQHSE Web (port 3000)" cmd /k "npm run dev"
)

echo  Both servers started in separate windows.
echo.
pause
