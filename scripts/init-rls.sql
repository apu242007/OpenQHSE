-- ════════════════════════════════════════════════════════════
-- OpenQHSE Platform — PostgreSQL Row Level Security (RLS)
-- ════════════════════════════════════════════════════════════
-- Este script se ejecuta automáticamente al inicializar el
-- contenedor de PostgreSQL (docker-entrypoint-initdb.d).
--
-- ARQUITECTURA DE SEGURIDAD (doble capa):
--   Capa 1: Filtros WHERE organization_id = ? en cada query (SQLAlchemy)
--   Capa 2: PostgreSQL RLS — políticas a nivel de motor de base de datos
--
-- Las políticas usan current_setting('app.current_org_id', true) que es
-- seteado por FastAPI en cada request vía:
--   SET LOCAL app.current_org_id = '<uuid>'
--
-- NOTA: El usuario 'openqhse' necesita BYPASSRLS para operaciones
-- de sistema (migrations, seeds). Los usuarios de aplicación NO tienen BYPASSRLS.
-- ════════════════════════════════════════════════════════════

-- Crear el parámetro de configuración personalizado si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_settings WHERE name = 'app.current_org_id'
    ) THEN
        -- PostgreSQL no permite CREATE SETTING directamente
        -- El parámetro se crea automáticamente con SET
        PERFORM set_config('app.current_org_id', '', false);
    END IF;
END $$;

-- ── Función helper para obtener el org_id actual ──────────────
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_org_id', true), '')::uuid;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════
-- HABILITAR RLS EN TABLAS SENSIBLES
-- ════════════════════════════════════════════════════════════

-- ── Incidents ────────────────────────────────────────────────
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON incidents;
CREATE POLICY tenant_isolation ON incidents
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL  -- permite super_admin y operaciones de sistema
    );

-- ── Inspections ───────────────────────────────────────────────
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON inspections;
CREATE POLICY tenant_isolation ON inspections
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Corrective Actions ────────────────────────────────────────
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON corrective_actions;
CREATE POLICY tenant_isolation ON corrective_actions
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Work Permits ──────────────────────────────────────────────
ALTER TABLE work_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_permits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON work_permits;
CREATE POLICY tenant_isolation ON work_permits
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Risk Registers ────────────────────────────────────────────
ALTER TABLE risk_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_registers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON risk_registers;
CREATE POLICY tenant_isolation ON risk_registers
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Documents ─────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON documents;
CREATE POLICY tenant_isolation ON documents
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Form Submissions ──────────────────────────────────────────
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON form_submissions;
CREATE POLICY tenant_isolation ON form_submissions
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Training Enrollments ──────────────────────────────────────
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON training_enrollments;
CREATE POLICY tenant_isolation ON training_enrollments
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Training Courses ──────────────────────────────────────────
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON training_courses;
CREATE POLICY tenant_isolation ON training_courses
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Equipment ─────────────────────────────────────────────────
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON equipment;
CREATE POLICY tenant_isolation ON equipment
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Behavior Observations (BBS) ───────────────────────────────
ALTER TABLE behavior_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_observations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON behavior_observations;
CREATE POLICY tenant_isolation ON behavior_observations
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Contractors ───────────────────────────────────────────────
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON contractors;
CREATE POLICY tenant_isolation ON contractors
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Contractor Workers ────────────────────────────────────────
ALTER TABLE contractor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_workers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON contractor_workers;
CREATE POLICY tenant_isolation ON contractor_workers
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── KPI Alerts ────────────────────────────────────────────────
ALTER TABLE kpi_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_alerts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON kpi_alerts;
CREATE POLICY tenant_isolation ON kpi_alerts
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── KPI Alert Rules ───────────────────────────────────────────
ALTER TABLE kpi_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_alert_rules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON kpi_alert_rules;
CREATE POLICY tenant_isolation ON kpi_alert_rules
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── KPI Snapshots ─────────────────────────────────────────────
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON kpi_snapshots;
CREATE POLICY tenant_isolation ON kpi_snapshots
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Notifications ─────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON notifications;
CREATE POLICY tenant_isolation ON notifications
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ── Audit Log ─────────────────────────────────────────────────
-- El audit log es de solo lectura para tenants; super_admin ve todo
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
    USING (
        organization_id = current_org_id()
        OR current_org_id() IS NULL
    );

-- ════════════════════════════════════════════════════════════
-- ÍNDICES DE PERFORMANCE PARA MULTI-TENANCY
-- (Complementan los índices definidos en __table_args__)
-- ════════════════════════════════════════════════════════════

-- Partial indexes para queries de tenant activo (is_deleted = false)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_org_active
    ON incidents (organization_id, created_at DESC)
    WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_org_active
    ON inspections (organization_id, created_at DESC)
    WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permits_org_status_active
    ON work_permits (organization_id, status, expires_at)
    WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_actions_org_status_active
    ON corrective_actions (organization_id, status, due_date)
    WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_org_active
    ON documents (organization_id, expiry_date)
    WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_org_active
    ON training_enrollments (organization_id, status, expires_at)
    WHERE is_deleted = false;

-- ════════════════════════════════════════════════════════════
-- COMENTARIO FINAL
-- ════════════════════════════════════════════════════════════
-- Las tablas sin RLS (organizations, sites, areas, users, etc.)
-- son accedidas con filtros WHERE explícitos en la capa de aplicación.
-- El RLS agrega una segunda capa de defensa en profundidad
-- para datos sensibles de operaciones QHSE.
