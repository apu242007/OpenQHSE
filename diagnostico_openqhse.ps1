# ============================================================
# OpenQHSE — Script de Diagnóstico v3.0
# Windows PowerShell
# Uso: Abrir PowerShell en la raíz del proyecto y correr:
#   .\diagnostico_openqhse.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$ok    = "[OK]  "
$fail  = "[FAIL]"
$warn  = "[WARN]"
$info  = "[INFO]"

$totalOk   = 0
$totalFail = 0
$totalWarn = 0
$issues    = @()

function Pass($msg) {
    Write-Host "$ok $msg" -ForegroundColor Green
    $script:totalOk++
}
function Fail($msg, $fix) {
    Write-Host "$fail $msg" -ForegroundColor Red
    $script:totalFail++
    $script:issues += [PSCustomObject]@{ Tipo="ERROR"; Mensaje=$msg; Fix=$fix }
}
function Warn($msg, $fix) {
    Write-Host "$warn $msg" -ForegroundColor Yellow
    $script:totalWarn++
    $script:issues += [PSCustomObject]@{ Tipo="AVISO"; Mensaje=$msg; Fix=$fix }
}
function Info($msg) {
    Write-Host "$info $msg" -ForegroundColor Cyan
}
function Section($title) {
    Write-Host ""
    Write-Host "══════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "  $title" -ForegroundColor White
    Write-Host "══════════════════════════════════════════" -ForegroundColor DarkGray
}

# ── Verificar que estamos en la raíz del proyecto ─────────
if (-not (Test-Path "package.json") -and -not (Test-Path "apps")) {
    Write-Host ""
    Write-Host "[ERROR FATAL] No estás en la raíz del proyecto OpenQHSE." -ForegroundColor Red
    Write-Host "Navegá a la carpeta raíz del proyecto y volvé a correr este script." -ForegroundColor Red
    Write-Host "Ejemplo: cd C:\proyectos\openqhse" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   OpenQHSE — Diagnóstico del Proyecto    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Info "Directorio: $(Get-Location)"
Info "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ============================================================
Section "1. HERRAMIENTAS DEL SISTEMA"
# ============================================================

# Node.js
try {
    $nodeVer = node --version 2>$null
    if ($nodeVer -match "v(\d+)") {
        $major = [int]$Matches[1]
        if ($major -ge 20) { Pass "Node.js $nodeVer" }
        else { Warn "Node.js $nodeVer (se recomienda v20+)" "Descargá desde https://nodejs.org" }
    }
} catch { Fail "Node.js no encontrado" "Instalá desde https://nodejs.org" }

# pnpm
try {
    $pnpmVer = pnpm --version 2>$null
    if ($pnpmVer) { Pass "pnpm v$pnpmVer" }
} catch { Fail "pnpm no encontrado" "Corré: npm install -g pnpm" }

# Python
try {
    $pyVer = python --version 2>$null
    if ($pyVer -match "Python 3\.(\d+)") {
        $minor = [int]$Matches[1]
        if ($minor -ge 12) { Pass "Python $pyVer" }
        else { Warn "$pyVer (se requiere 3.12+)" "Descargá Python 3.12 desde python.org" }
    }
} catch { Fail "Python no encontrado" "Instalá Python 3.12+ desde https://python.org" }

# Docker
try {
    $dockerVer = docker --version 2>$null
    if ($dockerVer) { Pass "Docker: $dockerVer" }
} catch { Fail "Docker CLI no encontrado" "Instalá Docker Desktop desde https://docker.com" }

# Docker Compose
try {
    $composeVer = docker compose version 2>$null
    if ($composeVer) { Pass "Docker Compose: $composeVer" }
} catch { Fail "Docker Compose no encontrado" "Viene incluido con Docker Desktop" }

# Git
try {
    $gitVer = git --version 2>$null
    if ($gitVer) { Pass "Git: $gitVer" }
} catch { Warn "Git no encontrado" "Instalá desde https://git-scm.com" }

# ============================================================
Section "2. ESTRUCTURA DEL MONOREPO"
# ============================================================

$requiredDirs = @(
    "apps/web",
    "apps/api",
    "apps/mobile",
    "packages/types",
    "packages/ui",
    "infra",
    "scripts"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) { Pass "Directorio: $dir" }
    else { Fail "Falta directorio: $dir" "Verificá que la Fase 1 se generó correctamente" }
}

$requiredRootFiles = @(
    "package.json",
    "turbo.json",
    "docker-compose.yml",
    ".env.example",
    "pnpm-workspace.yaml"
)

foreach ($f in $requiredRootFiles) {
    if (Test-Path $f) { Pass "Archivo raíz: $f" }
    else { Fail "Falta archivo: $f" "Generado en Fase 1 — volvé a correr esa fase" }
}

# ============================================================
Section "3. BACKEND (apps/api)"
# ============================================================

$apiFiles = @(
    "apps/api/app/main.py",
    "apps/api/pyproject.toml",
    "apps/api/alembic.ini",
    "apps/api/alembic/env.py",
    "apps/api/app/core/config.py",
    "apps/api/app/core/security.py",
    "apps/api/app/core/database.py",
    "apps/api/app/core/context.py",
    "apps/api/app/models/base.py",
    "apps/api/app/api/routes/auth.py",
    "apps/api/app/api/routes/users.py",
    "apps/api/app/api/routes/inspections.py",
    "apps/api/app/api/routes/incidents.py",
    "apps/api/app/api/routes/forms.py",
    "apps/api/app/api/routes/actions.py",
    "apps/api/app/api/routes/risks.py",
    "apps/api/app/api/routes/permits.py",
    "apps/api/app/api/routes/documents.py",
    "apps/api/app/api/routes/analytics.py",
    "apps/api/app/services/inspection_service.py",
    "apps/api/app/services/incident_service.py"
)

foreach ($f in $apiFiles) {
    if (Test-Path $f) { Pass $f }
    else { Fail "Falta: $f" "Verificá la fase correspondiente" }
}

# Verificar que joserfc reemplazó python-jose
if (Test-Path "apps/api/pyproject.toml") {
    $pyproject = Get-Content "apps/api/pyproject.toml" -Raw
    if ($pyproject -match "(?m)^[^#\r\n]*python-jose") {
        Fail "pyproject.toml contiene python-jose (CVE activo)" "Reemplazar con joserfc>=0.12.0"
    } else { Pass "pyproject.toml: sin python-jose" }
    if ($pyproject -match "joserfc") {
        Pass "pyproject.toml: joserfc presente"
    } else { Fail "pyproject.toml: falta joserfc" "Agregar joserfc>=0.12.0 a las dependencias" }
    if ($pyproject -match "celery-redbeat") {
        Pass "pyproject.toml: celery-redbeat presente"
    } else { Warn "pyproject.toml: falta celery-redbeat" "Agregar celery-redbeat>=2.3.0" }
    if ($pyproject -match "slowapi") {
        Pass "pyproject.toml: slowapi presente"
    } else { Warn "pyproject.toml: falta slowapi" "Agregar slowapi>=0.1.9" }
}

# Verificar que security.py usa joserfc y no python-jose
if (Test-Path "apps/api/app/core/security.py") {
    $sec = Get-Content "apps/api/app/core/security.py" -Raw
    if (($sec -match "from jose\s+import") -and ($sec -notmatch "joserfc")) {
        Fail "security.py importa python-jose (CVE)" "Reemplazar con: from joserfc import jwt"
    } else { Pass "security.py: no usa python-jose" }
    if ($sec -match "joserfc") {
        Pass "security.py: usa joserfc correctamente"
    } else { Warn "security.py: no usa joserfc explícitamente" "Verificar manualmente" }
}

# Verificar localStorage en api-client web
if (Test-Path "apps/web/src/lib/api-client.ts") {
    $client = Get-Content "apps/web/src/lib/api-client.ts" -Raw
    if ($client -match "(?m)^(?!\s*(?://|\*|/\*)).*localStorage") {
        Fail "api-client.ts usa localStorage (vulnerabilidad XSS)" "Reemplazar con NextAuth session — ver Entrega A del prompt v3.0"
    } else { Pass "api-client.ts: sin localStorage" }
}

# Verificar migraciones de Alembic
$migrDir = "apps/api/alembic/versions"
if (Test-Path $migrDir) {
    $migrations = Get-ChildItem $migrDir -Filter "*.py" | Measure-Object
    if ($migrations.Count -gt 0) {
        Pass "Alembic: $($migrations.Count) migration(es) encontrada(s)"
    } else {
        Fail "Alembic: carpeta versions vacía" "Corré: alembic revision --autogenerate -m 'initial'"
    }
} else {
    Fail "Alembic: falta carpeta alembic/versions" "Verificá Fase 1"
}

# ============================================================
Section "4. FRONTEND WEB (apps/web)"
# ============================================================

$webFiles = @(
    "apps/web/package.json",
    "apps/web/next.config.ts",
    "apps/web/tsconfig.json",
    "apps/web/src/lib/auth.ts",
    "apps/web/src/lib/api-client.ts",
    "apps/web/src/middleware.ts",
    "apps/web/src/app/layout.tsx",
    "apps/web/src/app/(dashboard)/page.tsx",
    "apps/web/src/app/(dashboard)/inspections/page.tsx",
    "apps/web/src/app/(dashboard)/inspections/new/page.tsx",
    "apps/web/src/app/(dashboard)/incidents/page.tsx",
    "apps/web/src/app/(dashboard)/incidents/report/page.tsx",
    "apps/web/src/app/(auth)/login/page.tsx"
)

foreach ($f in $webFiles) {
    if (Test-Path -LiteralPath $f) { Pass $f }
    else { Fail "Falta: $f" "Verificá la fase correspondiente" }
}

# Verificar versión de next-auth en package.json web
if (Test-Path "apps/web/package.json") {
    $webPkg = Get-Content "apps/web/package.json" -Raw
    if ($webPkg -match '"next-auth":\s*"\^5\.\d+\.\d+-beta\.\d+"') {
        Pass "next-auth: v5-beta (versión correcta — no existe v5 stable aún)"
    } elseif ($webPkg -match '"next-auth":\s*"\^5') {
        Pass "next-auth: v5"
    } else {
        Warn "next-auth: versión no identificada — verificar manualmente" ""
    }
    if ($webPkg -match '"react-map-gl":\s*"\^8') {
        Pass "react-map-gl: v8"
    } elseif ($webPkg -match '"react-map-gl"') {
        Fail "react-map-gl: no es v8" "Actualizar a react-map-gl@^8.1.0 + maplibre-gl@^4.5.0"
    } else {
        Warn "react-map-gl: no encontrado en package.json" "Agregar react-map-gl@^8.1.0"
    }
    if ($webPkg -match '"maplibre-gl"') {
        Pass "maplibre-gl: presente"
    } else {
        Fail "maplibre-gl: falta peer dependency" "Agregar maplibre-gl@^4.5.0"
    }
    if ($webPkg -match '"@sentry/nextjs":\s*"\^8') {
        Pass "@sentry/nextjs: v8"
    } elseif ($webPkg -match '"@sentry/nextjs"') {
        Warn "@sentry/nextjs: verificar que sea v8+" "Actualizar a @sentry/nextjs@^8.30.0"
    }
}

# Verificar CSP en next.config.ts
if (Test-Path "apps/web/next.config.ts") {
    $nextConf = Get-Content "apps/web/next.config.ts" -Raw
    if ($nextConf -match "Content-Security-Policy") {
        Pass "next.config.ts: CSP configurado"
    } else {
        Warn "next.config.ts: sin Content-Security-Policy" "Agregar headers de seguridad — ver Fase 2 v3.0"
    }
    if ($nextConf -match "Strict-Transport-Security") {
        Pass "next.config.ts: HSTS configurado"
    } else {
        Warn "next.config.ts: sin HSTS" "Agregar Strict-Transport-Security header"
    }
}

# ============================================================
Section "5. MOBILE (apps/mobile)"
# ============================================================

$mobileFiles = @(
    "apps/mobile/package.json",
    "apps/mobile/app.config.ts",
    "apps/mobile/babel.config.js",
    "apps/mobile/src/lib/api-client.ts"
)

foreach ($f in $mobileFiles) {
    if (Test-Path $f) { Pass $f }
    else { Warn "Falta: $f" "Verificá Fase 8" }
}

if (Test-Path "apps/mobile/package.json") {
    $mobPkg = Get-Content "apps/mobile/package.json" -Raw
    if ($mobPkg -match "expo-barcode-scanner") {
        Fail "mobile: usa expo-barcode-scanner (eliminado en SDK 51)" "Reemplazar con expo-camera + CameraView"
    } else { Pass "mobile: sin expo-barcode-scanner" }
    if ($mobPkg -match "expo-camera") {
        Pass "mobile: expo-camera presente"
    } else { Warn "mobile: falta expo-camera" "Agregar expo-camera@~16.0.0" }
    if ($mobPkg -match "expo-dev-client") {
        Pass "mobile: expo-dev-client presente (requerido para WatermelonDB)"
    } else { Fail "mobile: falta expo-dev-client" "Agregar expo-dev-client@~5.0.0 — requerido para WatermelonDB JSI" }
    if ($mobPkg -match "expo-secure-store") {
        Pass "mobile: expo-secure-store presente"
    } else { Fail "mobile: falta expo-secure-store" "Agregar expo-secure-store@~14.0.0" }
    if ($mobPkg -match "@nozbe/watermelondb") {
        Pass "mobile: WatermelonDB presente"
    } else { Warn "mobile: falta WatermelonDB" "Agregar @nozbe/watermelondb@^0.27.x" }
}

# Verificar localStorage en api-client mobile
if (Test-Path "apps/mobile/src/lib/api-client.ts") {
    $mobClient = Get-Content "apps/mobile/src/lib/api-client.ts" -Raw
    if (($mobClient -match "(?m)^(?!\s*(?://|\*|/\*)).*AsyncStorage") -and ($mobClient -match "token")) {
        Fail "mobile api-client: usa AsyncStorage para tokens" "Reemplazar con expo-secure-store"
    } elseif ($mobClient -match "SecureStore") {
        Pass "mobile api-client: usa SecureStore correctamente"
    }
}

# ============================================================
Section "6. DOCKER COMPOSE"
# ============================================================

if (Test-Path "docker-compose.yml") {
    $dc = Get-Content "docker-compose.yml" -Raw

    if ($dc -match "minio/minio:RELEASE\.") { Pass "docker-compose: minio con tag pineado" }
    elseif ($dc -match "minio/minio:latest") { Pass "docker-compose: minio:latest (ok para dev)" }
    else { Warn "docker-compose: imagen de minio no identificada" "Usar minio/minio:latest o un tag RELEASE.*" }

    if ($dc -match "postgres:17") { Pass "docker-compose: postgres 17" }
    elseif ($dc -match "postgres:15") { Fail "docker-compose: usa postgres:15 (debería ser 17)" "Cambiar a postgres:17-alpine" }
    else { Warn "docker-compose: versión de postgres no identificada" "Verificar manualmente" }

    if ($dc -match "redis:7\.4") { Pass "docker-compose: redis 7.4" }
    elseif ($dc -match "redis:latest") { Fail "docker-compose: redis:latest — pineá versión" "Cambiar a redis:7.4-alpine" }
    else { Warn "docker-compose: versión de redis no identificada" "" }

    if ($dc -match "ollama/ollama:latest") { Pass "docker-compose: ollama:latest (ok para dev)" }
    elseif ($dc -match "ollama/ollama:\d") { Pass "docker-compose: ollama con versión pineada" }
    else { Warn "docker-compose: versión de ollama no identificada" "" }

    if ($dc -match "postgres-backup") { Pass "docker-compose: postgres-backup configurado" }
    else { Warn "docker-compose: sin postgres-backup" "Agregar servicio prodrigestivill/postgres-backup-local" }

    if ($dc -match "init-rls.sql") { Pass "docker-compose: init-rls.sql montado" }
    else { Warn "docker-compose: sin init-rls.sql" "Agregar volume: ./scripts/init-rls.sql:/docker-entrypoint-initdb.d/01-rls.sql" }

    if ($dc -match "service_healthy") { Pass "docker-compose: health checks con service_healthy" }
    else { Warn "docker-compose: faltan health checks" "Agregar healthcheck + condition: service_healthy en depends_on" }
}

# ============================================================
Section "7. VARIABLES DE ENTORNO"
# ============================================================

if (-not (Test-Path ".env")) {
    Fail ".env no existe" "Copiar .env.example a .env y completar los valores: copy .env.example .env"
} else {
    Pass ".env existe"
    $env = Get-Content ".env" -Raw

    $requiredEnvVars = @(
        "DATABASE_URL",
        "REDIS_URL",
        "API_SECRET_KEY",
        "NEXTAUTH_SECRET",
        "NEXTAUTH_URL",
        "NEXT_PUBLIC_API_URL",
        "MINIO_ENDPOINT",
        "REDBEAT_REDIS_URL"
    )

    foreach ($var in $requiredEnvVars) {
        if ($env -match "$var=.+") { Pass ".env: $var configurado" }
        else { Fail ".env: falta $var" "Agregar $var al archivo .env" }
    }

    # Verificar que JWT_SECRET no es el valor por defecto
    if ($env -match "API_SECRET_KEY=change-me-in-production") {
        Warn ".env: API_SECRET_KEY es el valor de ejemplo" "Cambiar a un secreto real de 32+ caracteres"
    }
    if ($env -match "NEXTAUTH_SECRET=change-me") {
        Warn ".env: NEXTAUTH_SECRET es el valor de ejemplo" "Generar con: node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`""
    }
}

# ============================================================
Section "8. SCRIPTS CRÍTICOS"
# ============================================================

$scripts = @(
    "scripts/init-rls.sql",
    "scripts/seed_dev_data.py"
)

foreach ($s in $scripts) {
    if (Test-Path $s) { Pass "Script: $s" }
    else { Warn "Falta script: $s" "Verificá Fase 1" }
}

# ============================================================
Section "9. DOCKER — ESTADO DE CONTENEDORES"
# ============================================================

try {
    $containers = docker ps --format "{{.Names}}\t{{.Status}}" 2>$null
    if ($containers) {
        Info "Contenedores corriendo:"
        $containers | ForEach-Object { Info "  $_" }

        $needed = @("postgres", "redis", "minio", "ollama")
        foreach ($svc in $needed) {
            if ($containers -match $svc) { Pass "Contenedor: $svc corriendo" }
            else { Warn "Contenedor: $svc no está corriendo" "Correr: docker compose up -d $svc" }
        }
    } else {
        Warn "Ningún contenedor de OpenQHSE corriendo" "Correr: docker compose up -d postgres redis minio ollama"
    }
} catch {
    Warn "No se pudo consultar Docker" "Verificar que Docker Desktop esté corriendo"
}

# ============================================================
Section "10. RESUMEN FINAL"
# ============================================================

Write-Host ""
Write-Host "  ✅ OK:      $totalOk controles" -ForegroundColor Green
Write-Host "  ⚠️  AVISOS: $totalWarn advertencias" -ForegroundColor Yellow
Write-Host "  ❌ ERRORES: $totalFail problemas críticos" -ForegroundColor Red
Write-Host ""

if ($issues.Count -gt 0) {
    Write-Host "══════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "  PROBLEMAS A RESOLVER (en orden de prioridad)" -ForegroundColor White
    Write-Host "══════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""

    $errores = $issues | Where-Object { $_.Tipo -eq "ERROR" }
    $avisos  = $issues | Where-Object { $_.Tipo -eq "AVISO" }

    if ($errores.Count -gt 0) {
        Write-Host "❌ ERRORES CRÍTICOS (bloquean el arranque):" -ForegroundColor Red
        $i = 1
        foreach ($issue in $errores) {
            Write-Host "  $i. $($issue.Mensaje)" -ForegroundColor Red
            if ($issue.Fix) { Write-Host "     → FIX: $($issue.Fix)" -ForegroundColor Yellow }
            $i++
        }
        Write-Host ""
    }

    if ($avisos.Count -gt 0) {
        Write-Host "⚠️  AVISOS (no bloquean pero conviene corregir):" -ForegroundColor Yellow
        $i = 1
        foreach ($issue in $avisos) {
            Write-Host "  $i. $($issue.Mensaje)" -ForegroundColor Yellow
            if ($issue.Fix) { Write-Host "     → FIX: $($issue.Fix)" -ForegroundColor Cyan }
            $i++
        }
        Write-Host ""
    }
}

if ($totalFail -eq 0) {
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  PROYECTO LISTO — podés proceder al      ║" -ForegroundColor Green
    Write-Host "║  arranque con el script de inicio.       ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo paso — correr en PowerShell:" -ForegroundColor Cyan
    Write-Host "  docker compose up -d postgres redis minio ollama" -ForegroundColor White
    Write-Host "  cd apps/api && pip install -e `".[dev]`"" -ForegroundColor White
    Write-Host "  alembic upgrade head" -ForegroundColor White
    Write-Host "  python scripts/seed_dev_data.py" -ForegroundColor White
    Write-Host "  cd ..\..\apps\web && pnpm install && pnpm dev" -ForegroundColor White
} elseif ($totalFail -le 5) {
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  CASI LISTO — corregí los errores        ║" -ForegroundColor Yellow
    Write-Host "║  críticos y volvé a correr este script.  ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Yellow
} else {
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  PROYECTO INCOMPLETO — hay fases que     ║" -ForegroundColor Red
    Write-Host "║  no se generaron correctamente.          ║" -ForegroundColor Red
    Write-Host "║  Corregí los errores antes de arrancar.  ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Red
}

Write-Host ""
