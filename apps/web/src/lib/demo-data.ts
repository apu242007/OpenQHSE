/**
 * Static demo fixtures for GitHub Pages / AUTH_DISABLED mode.
 * All data is realistic QHSE data in Spanish for the mining/oil&gas/construction sector.
 */

// ─────────────────────────────────────────────────────────────
// ANALYTICS / KPIs
// ─────────────────────────────────────────────────────────────

export const DEMO_KPIS = {
  trir: { value: 1.8, previous: 2.4, variation_pct: -25.0, trend: 'down' },
  ltif: { value: 0.6, previous: 0.9, variation_pct: -33.3, trend: 'down' },
  inspections_completed: 47,
  inspections_scheduled: 52,
  inspections_compliance_pct: 90.4,
  overdue_actions: 8,
  open_incidents: 3,
  active_permits: 12,
  safety_score: 87,
};

export const DEMO_INCIDENTS_TREND = [
  { month: '2024-01', label: 'Ene', total: 5, near_miss: 3, first_aid: 1, lost_time: 1, fatality: 0 },
  { month: '2024-02', label: 'Feb', total: 4, near_miss: 2, first_aid: 2, lost_time: 0, fatality: 0 },
  { month: '2024-03', label: 'Mar', total: 7, near_miss: 4, first_aid: 2, lost_time: 1, fatality: 0 },
  { month: '2024-04', label: 'Abr', total: 3, near_miss: 2, first_aid: 1, lost_time: 0, fatality: 0 },
  { month: '2024-05', label: 'May', total: 6, near_miss: 3, first_aid: 2, lost_time: 1, fatality: 0 },
  { month: '2024-06', label: 'Jun', total: 4, near_miss: 3, first_aid: 1, lost_time: 0, fatality: 0 },
  { month: '2024-07', label: 'Jul', total: 5, near_miss: 3, first_aid: 1, lost_time: 1, fatality: 0 },
  { month: '2024-08', label: 'Ago', total: 3, near_miss: 2, first_aid: 1, lost_time: 0, fatality: 0 },
  { month: '2024-09', label: 'Sep', total: 4, near_miss: 2, first_aid: 1, lost_time: 1, fatality: 0 },
  { month: '2024-10', label: 'Oct', total: 2, near_miss: 1, first_aid: 1, lost_time: 0, fatality: 0 },
  { month: '2024-11', label: 'Nov', total: 3, near_miss: 2, first_aid: 1, lost_time: 0, fatality: 0 },
  { month: '2024-12', label: 'Dic', total: 2, near_miss: 1, first_aid: 1, lost_time: 0, fatality: 0 },
];

export const DEMO_INSPECTIONS_COMPLIANCE = [
  { week: '2024-W48', label: 'S48', scheduled: 10, completed: 9, compliance_pct: 90 },
  { week: '2024-W49', label: 'S49', scheduled: 10, completed: 10, compliance_pct: 100 },
  { week: '2024-W50', label: 'S50', scheduled: 12, completed: 11, compliance_pct: 92 },
  { week: '2024-W51', label: 'S51', scheduled: 8, completed: 7, compliance_pct: 88 },
  { week: '2024-W52', label: 'S52', scheduled: 5, completed: 4, compliance_pct: 80 },
  { week: '2025-W01', label: 'S01', scheduled: 10, completed: 9, compliance_pct: 90 },
];

export const DEMO_RISK_MATRIX = [
  { likelihood: 4, consequence: 4, count: 2, level: 'HIGH', risk_ids: ['r1', 'r2'] },
  { likelihood: 3, consequence: 4, count: 3, level: 'HIGH', risk_ids: ['r3', 'r4', 'r5'] },
  { likelihood: 3, consequence: 3, count: 5, level: 'MEDIUM', risk_ids: ['r6','r7','r8','r9','r10'] },
  { likelihood: 2, consequence: 3, count: 4, level: 'MEDIUM', risk_ids: ['r11','r12','r13','r14'] },
  { likelihood: 2, consequence: 2, count: 6, level: 'LOW', risk_ids: ['r15','r16','r17','r18','r19','r20'] },
  { likelihood: 1, consequence: 2, count: 3, level: 'LOW', risk_ids: ['r21','r22','r23'] },
  { likelihood: 5, consequence: 5, count: 1, level: 'CRITICAL', risk_ids: ['r24'] },
];

export const DEMO_ACTIONS_SUMMARY = {
  total: 34,
  open: 14,
  in_progress: 12,
  completed: 8,
  overdue: 8,
  completion_rate_pct: 23.5,
};

export const DEMO_TRAINING_COMPLIANCE = {
  total_employees: 120,
  compliant: 98,
  non_compliant: 22,
  compliance_pct: 81.7,
  expiring_soon: 11,
};

export const DEMO_WIDGETS = {
  overdue_actions: [
    { id: 'a1', title: 'Reparar baranda pasarela N°3', responsible: 'Carlos Méndez', due_date: '2024-12-15', days_overdue: 18, priority: 'HIGH', source_type: 'inspection', source_ref: 'INSP-0042' },
    { id: 'a2', title: 'Cambiar extintores Bodega A', responsible: 'Ana Torres', due_date: '2024-12-20', days_overdue: 13, priority: 'MEDIUM', source_type: 'audit', source_ref: 'AUD-0015' },
    { id: 'a3', title: 'Actualizar procedimiento LOTO', responsible: 'Luis Vargas', due_date: '2024-12-22', days_overdue: 11, priority: 'HIGH', source_type: 'incident', source_ref: 'INC-0089' },
    { id: 'a4', title: 'Señalizar zona de acopio temporal', responsible: 'María Soto', due_date: '2024-12-28', days_overdue: 5, priority: 'LOW', source_type: 'observation', source_ref: 'OBS-0234' },
    { id: 'a5', title: 'Calibrar manómetros sala de bombas', responsible: 'Pedro Ríos', due_date: '2024-12-30', days_overdue: 3, priority: 'MEDIUM', source_type: 'inspection', source_ref: 'INSP-0048' },
  ],
  open_incidents: [
    { id: 'i1', code: 'INC-0091', title: 'Caída a mismo nivel — Área de Proceso', severity: 'MINOR', status: 'UNDER_INVESTIGATION', reported_at: '2025-01-02T09:30:00Z' },
    { id: 'i2', code: 'INC-0090', title: 'Cuasi accidente — carro puente sin freno', severity: 'NEAR_MISS', status: 'OPEN', reported_at: '2025-01-01T14:00:00Z' },
    { id: 'i3', code: 'INC-0088', title: 'Derrame menor aceite hidráulico', severity: 'ENVIRONMENTAL', status: 'UNDER_INVESTIGATION', reported_at: '2024-12-28T11:15:00Z' },
  ],
};

export const DEMO_SIDEBAR_BADGES = {
  incidents: 3,
  actions_overdue: 8,
  permits_expiring: 2,
  inspections_overdue: 3,
  observations_pending: 5,
};

// ─────────────────────────────────────────────────────────────
// INCIDENTS
// ─────────────────────────────────────────────────────────────

export const DEMO_INCIDENTS_LIST = {
  total: 12,
  page: 1,
  page_size: 20,
  total_pages: 1,
  items: [
    { id: 'i1', code: 'INC-0091', title: 'Caída a mismo nivel — Área de Proceso', incident_type: 'ACCIDENT', severity: 'MINOR', status: 'UNDER_INVESTIGATION', occurred_at: '2025-01-02T09:30:00Z', reported_at: '2025-01-02T09:45:00Z', location: 'Planta Principal', area: 'Proceso', days_lost: 0 },
    { id: 'i2', code: 'INC-0090', title: 'Cuasi accidente — carro puente sin freno', incident_type: 'NEAR_MISS', severity: 'NEAR_MISS', status: 'OPEN', occurred_at: '2025-01-01T14:00:00Z', reported_at: '2025-01-01T14:20:00Z', location: 'Taller Mecánico', area: 'Mantenimiento', days_lost: 0 },
    { id: 'i3', code: 'INC-0089', title: 'Corte leve con herramienta manual', incident_type: 'ACCIDENT', severity: 'FIRST_AID', status: 'CLOSED', occurred_at: '2024-12-29T10:10:00Z', reported_at: '2024-12-29T10:30:00Z', location: 'Bodega Central', area: 'Logística', days_lost: 0 },
    { id: 'i4', code: 'INC-0088', title: 'Derrame menor aceite hidráulico', incident_type: 'ENVIRONMENTAL', severity: 'ENVIRONMENTAL', status: 'UNDER_INVESTIGATION', occurred_at: '2024-12-28T11:15:00Z', reported_at: '2024-12-28T11:30:00Z', location: 'Sala Bombas', area: 'Operaciones', days_lost: 0 },
    { id: 'i5', code: 'INC-0087', title: 'Contusión durante carga manual', incident_type: 'ACCIDENT', severity: 'MINOR', status: 'CLOSED', occurred_at: '2024-12-22T08:45:00Z', reported_at: '2024-12-22T09:00:00Z', location: 'Bodega A', area: 'Logística', days_lost: 1 },
    { id: 'i6', code: 'INC-0086', title: 'Exposición a ruido por sobre límite', incident_type: 'OCCUPATIONAL_HEALTH', severity: 'OCCUPATIONAL', status: 'CLOSED', occurred_at: '2024-12-20T15:30:00Z', reported_at: '2024-12-20T16:00:00Z', location: 'Sala Compresores', area: 'Mantenimiento', days_lost: 0 },
    { id: 'i7', code: 'INC-0085', title: 'Incendio incipiente en tablero eléctrico', incident_type: 'NEAR_MISS', severity: 'NEAR_MISS', status: 'CLOSED', occurred_at: '2024-12-18T13:00:00Z', reported_at: '2024-12-18T13:10:00Z', location: 'Sub Estación 2', area: 'Eléctrico', days_lost: 0 },
    { id: 'i8', code: 'INC-0084', title: 'Lesión lumbar por levantamiento', incident_type: 'ACCIDENT', severity: 'LOST_TIME', status: 'CLOSED', occurred_at: '2024-12-15T11:00:00Z', reported_at: '2024-12-15T11:20:00Z', location: 'Bodega Norte', area: 'Logística', days_lost: 3 },
  ],
};

export const DEMO_INCIDENT_STATISTICS = {
  total_ytd: 12,
  lost_time: 2,
  first_aid: 4,
  near_miss: 4,
  environmental: 1,
  occupational: 1,
  trir: 1.8,
  ltif: 0.6,
  days_lost_ytd: 4,
  open: 3,
  under_investigation: 2,
  closed: 7,
};

// ─────────────────────────────────────────────────────────────
// INSPECTIONS
// ─────────────────────────────────────────────────────────────

export const DEMO_INSPECTION_TEMPLATES = [
  { id: 't1', name: 'Inspección Pre-Operacional Equipos Pesados', category: 'EQUIPMENT', frequency: 'DAILY', sections_count: 6, questions_count: 42, is_active: true, created_at: '2024-01-15T00:00:00Z' },
  { id: 't2', name: 'Auditoría ISO 45001:2018', category: 'AUDIT', frequency: 'MONTHLY', sections_count: 10, questions_count: 87, is_active: true, created_at: '2024-02-01T00:00:00Z' },
  { id: 't3', name: 'Inspección Orden y Aseo', category: 'SAFETY', frequency: 'WEEKLY', sections_count: 4, questions_count: 28, is_active: true, created_at: '2024-01-20T00:00:00Z' },
  { id: 't4', name: 'IPERC — Identificación de Peligros', category: 'RISK', frequency: 'WEEKLY', sections_count: 5, questions_count: 35, is_active: true, created_at: '2024-03-01T00:00:00Z' },
  { id: 't5', name: 'Inspección Instalaciones Eléctricas', category: 'ELECTRICAL', frequency: 'MONTHLY', sections_count: 7, questions_count: 55, is_active: true, created_at: '2024-02-10T00:00:00Z' },
  { id: 't6', name: 'Auditoría Ambiental ISO 14001', category: 'ENVIRONMENTAL', frequency: 'QUARTERLY', sections_count: 8, questions_count: 64, is_active: true, created_at: '2024-01-25T00:00:00Z' },
];

export const DEMO_INSPECTIONS_LIST = {
  total: 15,
  page: 1,
  page_size: 20,
  total_pages: 1,
  items: [
    { id: 'insp1', code: 'INSP-0052', template_name: 'Inspección Pre-Operacional Equipos Pesados', status: 'COMPLETED', score: 94, inspector_name: 'Jorge Castillo', location: 'Mina Nivel 3', scheduled_date: '2025-01-05T08:00:00Z', completed_at: '2025-01-05T09:30:00Z', findings_count: 2, critical_findings: 0 },
    { id: 'insp2', code: 'INSP-0051', template_name: 'Inspección Orden y Aseo', status: 'COMPLETED', score: 88, inspector_name: 'Ana Torres', location: 'Bodega Central', scheduled_date: '2025-01-04T08:00:00Z', completed_at: '2025-01-04T09:00:00Z', findings_count: 3, critical_findings: 0 },
    { id: 'insp3', code: 'INSP-0050', template_name: 'Auditoría ISO 45001:2018', status: 'IN_PROGRESS', score: null, inspector_name: 'Luis Vargas', location: 'Planta Principal', scheduled_date: '2025-01-06T09:00:00Z', completed_at: null, findings_count: 0, critical_findings: 0 },
    { id: 'insp4', code: 'INSP-0049', template_name: 'Inspección Instalaciones Eléctricas', status: 'OVERDUE', score: null, inspector_name: 'Pedro Ríos', location: 'Sub Estación 1', scheduled_date: '2024-12-30T08:00:00Z', completed_at: null, findings_count: 0, critical_findings: 0 },
    { id: 'insp5', code: 'INSP-0048', template_name: 'IPERC — Identificación de Peligros', status: 'COMPLETED', score: 78, inspector_name: 'María Soto', location: 'Área de Proceso', scheduled_date: '2024-12-28T08:00:00Z', completed_at: '2024-12-28T10:15:00Z', findings_count: 5, critical_findings: 1 },
  ],
};

export const DEMO_INSPECTION_KPIS = {
  total_scheduled: 52,
  completed: 47,
  overdue: 3,
  in_progress: 2,
  compliance_pct: 90.4,
  avg_score: 89.2,
  critical_findings_open: 2,
  total_findings: 24,
};

// ─────────────────────────────────────────────────────────────
// PERMITS (PTW)
// ─────────────────────────────────────────────────────────────

export const DEMO_PERMITS_LIST: Array<{
  id: string; code: string; title: string; permit_type: string; status: string;
  requester_name: string; work_location: string; start_datetime: string;
  end_datetime: string; risk_level: string; worker_count: number;
}> = [
  { id: 'p1', code: 'PTW-0024', title: 'Trabajo en altura — Torre de Refrigeración', permit_type: 'WORK_AT_HEIGHT', status: 'ACTIVE', requester_name: 'Carlos Méndez', work_location: 'Torre Refrigeración Bloque B', start_datetime: '2025-01-06T07:00:00Z', end_datetime: '2025-01-06T17:00:00Z', risk_level: 'HIGH', worker_count: 4 },
  { id: 'p2', code: 'PTW-0023', title: 'Trabajo en caliente — Soldadura Ducto 12"', permit_type: 'HOT_WORK', status: 'ACTIVE', requester_name: 'Roberto Silva', work_location: 'Sala Bombas — Sector Norte', start_datetime: '2025-01-06T08:00:00Z', end_datetime: '2025-01-06T14:00:00Z', risk_level: 'HIGH', worker_count: 2 },
  { id: 'p3', code: 'PTW-0022', title: 'Ingreso a espacio confinado — Estanque TK-04', permit_type: 'CONFINED_SPACE', status: 'PENDING_APPROVAL', requester_name: 'Ana Torres', work_location: 'Estanque TK-04', start_datetime: '2025-01-07T07:00:00Z', end_datetime: '2025-01-07T12:00:00Z', risk_level: 'CRITICAL', worker_count: 3 },
  { id: 'p4', code: 'PTW-0021', title: 'Trabajo eléctrico HV — Panel Principal', permit_type: 'ELECTRICAL', status: 'APPROVED', requester_name: 'Pedro Ríos', work_location: 'Sub Estación 2', start_datetime: '2025-01-08T06:00:00Z', end_datetime: '2025-01-08T10:00:00Z', risk_level: 'CRITICAL', worker_count: 2 },
  { id: 'p5', code: 'PTW-0020', title: 'Excavación — Zanja nueva línea agua servida', permit_type: 'EXCAVATION', status: 'COMPLETED', requester_name: 'Luis Vargas', work_location: 'Patio Exterior Norte', start_datetime: '2025-01-03T07:00:00Z', end_datetime: '2025-01-03T16:00:00Z', risk_level: 'MEDIUM', worker_count: 5 },
  { id: 'p6', code: 'PTW-0019', title: 'Trabajo eléctrico LV — Cableado Oficinas', permit_type: 'ELECTRICAL', status: 'COMPLETED', requester_name: 'Jorge Castillo', work_location: 'Edificio Administrativo', start_datetime: '2025-01-02T08:00:00Z', end_datetime: '2025-01-02T17:00:00Z', risk_level: 'LOW', worker_count: 2 },
];

export const DEMO_PERMIT_STATISTICS = {
  total_ytd: 48,
  active: 2,
  pending_approval: 1,
  approved: 1,
  completed: 42,
  cancelled: 2,
  expired: 0,
  by_type: {
    WORK_AT_HEIGHT: 12,
    HOT_WORK: 10,
    CONFINED_SPACE: 6,
    ELECTRICAL: 9,
    EXCAVATION: 7,
    OTHER: 4,
  },
};

// ─────────────────────────────────────────────────────────────
// RISKS
// ─────────────────────────────────────────────────────────────

export const DEMO_RISKS_LIST = [
  { id: 'r1', code: 'RIS-0024', hazard: 'Trabajo en altura sin doble protección', activity: 'Mantenimiento estructural', likelihood: 4, consequence: 4, risk_level: 'HIGH', residual_risk_level: 'MEDIUM', status: 'OPEN', owner_name: 'Carlos Méndez', site: 'Planta Principal', last_reviewed: '2024-12-15T00:00:00Z' },
  { id: 'r2', code: 'RIS-0023', hazard: 'Contacto con partes energizadas HV', activity: 'Mantenimiento eléctrico', likelihood: 3, consequence: 5, risk_level: 'HIGH', residual_risk_level: 'LOW', status: 'CONTROLLED', owner_name: 'Pedro Ríos', site: 'Sub Estación 2', last_reviewed: '2024-12-20T00:00:00Z' },
  { id: 'r3', code: 'RIS-0022', hazard: 'Atmósfera deficiente de oxígeno', activity: 'Ingreso a espacio confinado', likelihood: 3, consequence: 5, risk_level: 'HIGH', residual_risk_level: 'MEDIUM', status: 'OPEN', owner_name: 'Ana Torres', site: 'Sala Bombas', last_reviewed: '2024-12-18T00:00:00Z' },
  { id: 'r4', code: 'RIS-0021', hazard: 'Incendio por trabajos en caliente', activity: 'Soldadura y corte', likelihood: 3, consequence: 4, risk_level: 'HIGH', residual_risk_level: 'LOW', status: 'CONTROLLED', owner_name: 'Roberto Silva', site: 'Taller Mecánico', last_reviewed: '2024-12-22T00:00:00Z' },
  { id: 'r5', code: 'RIS-0020', hazard: 'Golpe por objetos en movimiento (grúa)', activity: 'Izaje de cargas', likelihood: 3, consequence: 4, risk_level: 'HIGH', residual_risk_level: 'MEDIUM', status: 'OPEN', owner_name: 'Luis Vargas', site: 'Patio Exterior', last_reviewed: '2024-12-10T00:00:00Z' },
  { id: 'r6', code: 'RIS-0019', hazard: 'Exposición a ruido ocupacional (>85dB)', activity: 'Operación de compresores', likelihood: 5, consequence: 3, risk_level: 'MEDIUM', residual_risk_level: 'LOW', status: 'CONTROLLED', owner_name: 'María Soto', site: 'Sala Compresores', last_reviewed: '2024-11-30T00:00:00Z' },
  { id: 'r7', code: 'RIS-0018', hazard: 'Derrame de hidrocarburos', activity: 'Transporte interno combustible', likelihood: 2, consequence: 4, risk_level: 'MEDIUM', residual_risk_level: 'LOW', status: 'CONTROLLED', owner_name: 'Jorge Castillo', site: 'Área de Proceso', last_reviewed: '2024-11-25T00:00:00Z' },
  { id: 'r8', code: 'RIS-0017', hazard: 'Atropello por vehículo liviano', activity: 'Tránsito peatonal en planta', likelihood: 3, consequence: 3, risk_level: 'MEDIUM', residual_risk_level: 'LOW', status: 'CONTROLLED', owner_name: 'Carlos Méndez', site: 'Planta Principal', last_reviewed: '2024-12-01T00:00:00Z' },
];

export const DEMO_RISK_STATISTICS = {
  total: 24,
  critical: 1,
  high: 7,
  medium: 10,
  low: 6,
  open: 8,
  controlled: 14,
  closed: 2,
  overdue_reviews: 3,
};

export const DEMO_RISK_MATRIX_DATA = {
  cells: DEMO_RISK_MATRIX,
  total_risks: 24,
  critical: 1,
  high: 7,
  medium: 10,
  low: 6,
};

export const DEMO_HAZOP_STUDIES = [
  { id: 'h1', code: 'HAZOP-001', title: 'HAZOP Sistema de Enfriamiento Circuito 1', process_description: 'Análisis de peligros y operabilidad del circuito de agua de refrigeración de proceso', status: 'COMPLETED', team_leader: 'Ing. Roberto Silva', nodes_count: 8, deviations_count: 34, actions_count: 12, created_at: '2024-10-01T00:00:00Z', completed_at: '2024-11-15T00:00:00Z' },
  { id: 'h2', code: 'HAZOP-002', title: 'HAZOP Ducto de Alimentación GN', process_description: 'Análisis del sistema de ductos de gas natural hacia caldera principal', status: 'IN_PROGRESS', team_leader: 'Ing. Ana Torres', nodes_count: 5, deviations_count: 18, actions_count: 6, created_at: '2024-11-20T00:00:00Z', completed_at: null },
];

export const DEMO_BOWTIE_ANALYSES = [
  { id: 'bt1', code: 'BTA-001', title: 'BowTie — Pérdida de Contención Ácido Sulfúrico', top_event: 'Derrame de H2SO4 concentrado', status: 'APPROVED', threats_count: 6, consequences_count: 4, controls_count: 18, created_at: '2024-09-15T00:00:00Z' },
  { id: 'bt2', code: 'BTA-002', title: 'BowTie — Falla Estructural Puente Grúa', top_event: 'Colapso de carga suspendida', status: 'DRAFT', threats_count: 4, consequences_count: 3, controls_count: 12, created_at: '2024-12-01T00:00:00Z' },
];

// ─────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────

export const DEMO_DOCUMENTS_LIST = [
  { id: 'd1', code: 'DOC-0045', title: 'Procedimiento de Trabajo en Altura', category: 'PROCEDURE', version: '3.1', status: 'APPROVED', last_reviewed: '2024-09-01T00:00:00Z', expiry_date: '2025-09-01T00:00:00Z', owner_name: 'Carlos Méndez', file_size_kb: 245, acknowledgment_required: true, acknowledged_count: 45, total_recipients: 52 },
  { id: 'd2', code: 'DOC-0044', title: 'Procedimiento LOTO (Bloqueo/Etiquetado)', category: 'PROCEDURE', version: '2.4', status: 'APPROVED', last_reviewed: '2024-10-15T00:00:00Z', expiry_date: '2025-10-15T00:00:00Z', owner_name: 'Pedro Ríos', file_size_kb: 312, acknowledgment_required: true, acknowledged_count: 38, total_recipients: 40 },
  { id: 'd3', code: 'DOC-0043', title: 'Política de Seguridad y Salud Ocupacional', category: 'POLICY', version: '1.2', status: 'APPROVED', last_reviewed: '2024-01-10T00:00:00Z', expiry_date: '2026-01-10T00:00:00Z', owner_name: 'Gerencia SSMA', file_size_kb: 128, acknowledgment_required: true, acknowledged_count: 118, total_recipients: 120 },
  { id: 'd4', code: 'DOC-0042', title: 'Plan de Emergencia y Evacuación', category: 'PLAN', version: '4.0', status: 'APPROVED', last_reviewed: '2024-06-01T00:00:00Z', expiry_date: '2025-06-01T00:00:00Z', owner_name: 'Ana Torres', file_size_kb: 489, acknowledgment_required: true, acknowledged_count: 112, total_recipients: 120 },
  { id: 'd5', code: 'DOC-0041', title: 'Matriz de Identificación de Aspectos Ambientales', category: 'REGISTER', version: '2.0', status: 'APPROVED', last_reviewed: '2024-07-22T00:00:00Z', expiry_date: '2025-07-22T00:00:00Z', owner_name: 'María Soto', file_size_kb: 198, acknowledgment_required: false, acknowledged_count: 0, total_recipients: 0 },
  { id: 'd6', code: 'DOC-0040', title: 'Procedimiento Respuesta Emergencia Derrame', category: 'PROCEDURE', version: '1.5', status: 'UNDER_REVIEW', last_reviewed: '2024-11-01T00:00:00Z', expiry_date: '2025-11-01T00:00:00Z', owner_name: 'Jorge Castillo', file_size_kb: 276, acknowledgment_required: false, acknowledged_count: 0, total_recipients: 0 },
  { id: 'd7', code: 'DOC-0039', title: 'Estándar de Vehículos y Equipos Móviles', category: 'STANDARD', version: '2.2', status: 'EXPIRING_SOON', last_reviewed: '2024-02-15T00:00:00Z', expiry_date: '2025-02-15T00:00:00Z', owner_name: 'Luis Vargas', file_size_kb: 356, acknowledgment_required: true, acknowledged_count: 28, total_recipients: 35 },
];

// ─────────────────────────────────────────────────────────────
// TRAINING
// ─────────────────────────────────────────────────────────────

export const DEMO_COURSES_LIST = [
  { id: 'c1', code: 'CRS-001', title: 'Inducción General SSO — Nuevos Trabajadores', category: 'INDUCTION', duration_hours: 8, modality: 'PRESENTIAL', status: 'ACTIVE', enrolled_count: 15, completed_count: 12, compliance_pct: 80, expiry_months: 12, instructor_name: 'Ing. Carlos Méndez' },
  { id: 'c2', code: 'CRS-002', title: 'Trabajo en Altura y Uso de Arnés', category: 'SAFETY', duration_hours: 16, modality: 'PRESENTIAL', status: 'ACTIVE', enrolled_count: 22, completed_count: 20, compliance_pct: 91, expiry_months: 24, instructor_name: 'Ing. Ana Torres' },
  { id: 'c3', code: 'CRS-003', title: 'Primeros Auxilios y RCP', category: 'FIRST_AID', duration_hours: 16, modality: 'PRESENTIAL', status: 'ACTIVE', enrolled_count: 35, completed_count: 28, compliance_pct: 80, expiry_months: 24, instructor_name: 'Paramédico Roberto Silva' },
  { id: 'c4', code: 'CRS-004', title: 'Manejo Defensivo — Vehículos Livianos', category: 'DRIVING', duration_hours: 8, modality: 'PRESENTIAL', status: 'ACTIVE', enrolled_count: 18, completed_count: 18, compliance_pct: 100, expiry_months: 36, instructor_name: 'Instructor Pedro Ríos' },
  { id: 'c5', code: 'CRS-005', title: 'Uso e Interpretación de MSDS/HDS', category: 'HAZMAT', duration_hours: 4, modality: 'E_LEARNING', status: 'ACTIVE', enrolled_count: 45, completed_count: 39, compliance_pct: 87, expiry_months: 12, instructor_name: 'eLearning' },
  { id: 'c6', code: 'CRS-006', title: 'Investigación de Accidentes — Técnica JPT', category: 'INCIDENT_INVESTIGATION', duration_hours: 24, modality: 'PRESENTIAL', status: 'ACTIVE', enrolled_count: 8, completed_count: 6, compliance_pct: 75, expiry_months: 0, instructor_name: 'Ing. María Soto' },
  { id: 'c7', code: 'CRS-007', title: 'Bloqueo y Etiquetado (LOTO) Avanzado', category: 'ELECTRICAL', duration_hours: 8, modality: 'PRESENTIAL', status: 'ACTIVE', enrolled_count: 12, completed_count: 10, compliance_pct: 83, expiry_months: 24, instructor_name: 'Técnico Luis Vargas' },
];

export const DEMO_COMPLIANCE_SUMMARY = {
  total_employees: 120,
  fully_compliant: 78,
  partially_compliant: 31,
  non_compliant: 11,
  compliance_pct: 65.0,
  courses_due_this_month: 23,
  expired_certifications: 14,
};

export const DEMO_ENROLLMENTS_LIST = [
  { id: 'en1', course_id: 'c1', course_title: 'Inducción General SSO — Nuevos Trabajadores', employee_name: 'Jorge Castillo', employee_id: 'EMP-001', status: 'COMPLETED', enrolled_at: '2024-11-01T00:00:00Z', completed_at: '2024-11-08T17:00:00Z', score: 92, expiry_date: '2025-11-08T00:00:00Z' },
  { id: 'en2', course_id: 'c2', course_title: 'Trabajo en Altura y Uso de Arnés', employee_name: 'Carlos Méndez', employee_id: 'EMP-002', status: 'COMPLETED', enrolled_at: '2024-10-15T00:00:00Z', completed_at: '2024-10-30T17:00:00Z', score: 88, expiry_date: '2026-10-30T00:00:00Z' },
  { id: 'en3', course_id: 'c3', course_title: 'Primeros Auxilios y RCP', employee_name: 'Ana Torres', employee_id: 'EMP-003', status: 'IN_PROGRESS', enrolled_at: '2024-12-10T00:00:00Z', completed_at: null, score: null, expiry_date: null },
  { id: 'en4', course_id: 'c5', course_title: 'Uso e Interpretación de MSDS/HDS', employee_name: 'Luis Vargas', employee_id: 'EMP-004', status: 'OVERDUE', enrolled_at: '2024-11-20T00:00:00Z', completed_at: null, score: null, expiry_date: null },
];

// ─────────────────────────────────────────────────────────────
// EQUIPMENT
// ─────────────────────────────────────────────────────────────

export const DEMO_EQUIPMENT_LIST = [
  { id: 'eq1', code: 'EQ-CAT-001', name: 'Excavadora CAT 336 GC', type: 'HEAVY_EQUIPMENT', brand: 'Caterpillar', model: '336 GC', year: 2021, status: 'OPERATIONAL', location: 'Mina Nivel 3', last_inspection: '2024-12-28T00:00:00Z', next_inspection: '2025-01-28T00:00:00Z', operator_name: 'Jorge Castillo', hours_operated: 4520, maintenance_due: false },
  { id: 'eq2', code: 'EQ-KOM-002', name: 'Camión Minero Komatsu HD785', type: 'HAUL_TRUCK', brand: 'Komatsu', model: 'HD785-7', year: 2020, status: 'OPERATIONAL', location: 'Rajo Principal', last_inspection: '2024-12-30T00:00:00Z', next_inspection: '2025-01-30T00:00:00Z', operator_name: 'Carlos Méndez', hours_operated: 8320, maintenance_due: false },
  { id: 'eq3', code: 'EQ-LIE-003', name: 'Grúa Torre Liebherr 200 EC-H', type: 'CRANE', brand: 'Liebherr', model: '200 EC-H 10', year: 2019, status: 'MAINTENANCE', location: 'Patio Norte', last_inspection: '2024-12-15T00:00:00Z', next_inspection: '2025-01-15T00:00:00Z', operator_name: 'Luis Vargas', hours_operated: 12450, maintenance_due: true },
  { id: 'eq4', code: 'EQ-MAN-004', name: 'Montacargas Yale GDP 3T', type: 'FORKLIFT', brand: 'Yale', model: 'GDP 30VX', year: 2022, status: 'OPERATIONAL', location: 'Bodega Central', last_inspection: '2025-01-03T00:00:00Z', next_inspection: '2025-02-03T00:00:00Z', operator_name: 'Pedro Ríos', hours_operated: 1850, maintenance_due: false },
  { id: 'eq5', code: 'EQ-GEN-005', name: 'Generador Cummins 500 kVA', type: 'GENERATOR', brand: 'Cummins', model: 'C500D5', year: 2020, status: 'OPERATIONAL', location: 'Sala Generadores', last_inspection: '2024-12-20T00:00:00Z', next_inspection: '2025-03-20T00:00:00Z', operator_name: 'Roberto Silva', hours_operated: 5210, maintenance_due: false },
  { id: 'eq6', code: 'EQ-BOM-006', name: 'Bomba Centrífuga Sulzer 100 m³/h', type: 'PUMP', brand: 'Sulzer', model: 'MZ 100', year: 2023, status: 'OFFLINE', location: 'Sala Bombas', last_inspection: '2024-11-30T00:00:00Z', next_inspection: '2024-12-30T00:00:00Z', operator_name: null, hours_operated: 720, maintenance_due: true },
];

// ─────────────────────────────────────────────────────────────
// CONTRACTORS
// ─────────────────────────────────────────────────────────────

export const DEMO_CONTRACTORS_LIST = {
  total: 8,
  page: 1,
  page_size: 20,
  total_pages: 1,
  items: [
    { id: 'con1', name: 'Constructora Andina Ltda.', rut_tax_id: '76.234.567-8', country: 'CL', contact_name: 'Marco Flores', contact_email: 'mflores@andina.cl', contact_phone: '+56 9 9876 5432', status: 'APPROVED', insurance_expiry: '2025-06-30T00:00:00Z', worker_count: 24, active_worker_count: 20, incident_count: 1, compliance_pct: 92, created_at: '2023-05-15T00:00:00Z', updated_at: '2024-12-20T00:00:00Z', certifications: [], documents: [], approved_by: 'admin', approved_at: '2023-05-20T00:00:00Z', suspension_reason: null, insurance_url: null, organization_id: 'org1' },
    { id: 'con2', name: 'Servicios Industriales MTEK SpA', rut_tax_id: '77.890.123-4', country: 'CL', contact_name: 'Rita Gómez', contact_email: 'rgomez@mtek.cl', contact_phone: '+56 9 8765 4321', status: 'APPROVED', insurance_expiry: '2025-03-31T00:00:00Z', worker_count: 12, active_worker_count: 12, incident_count: 0, compliance_pct: 97, created_at: '2023-08-01T00:00:00Z', updated_at: '2024-12-15T00:00:00Z', certifications: [], documents: [], approved_by: 'admin', approved_at: '2023-08-05T00:00:00Z', suspension_reason: null, insurance_url: null, organization_id: 'org1' },
    { id: 'con3', name: 'Electricidad y Automatización Sur S.A.', rut_tax_id: '96.112.345-6', country: 'CL', contact_name: 'Héctor Navarro', contact_email: 'hnavarro@easur.cl', contact_phone: '+56 9 7654 3210', status: 'APPROVED', insurance_expiry: '2025-08-31T00:00:00Z', worker_count: 8, active_worker_count: 6, incident_count: 0, compliance_pct: 100, created_at: '2022-11-10T00:00:00Z', updated_at: '2024-11-20T00:00:00Z', certifications: [], documents: [], approved_by: 'admin', approved_at: '2022-11-15T00:00:00Z', suspension_reason: null, insurance_url: null, organization_id: 'org1' },
    { id: 'con4', name: 'Transportes Norte Grande Ltda.', rut_tax_id: '79.456.789-0', country: 'CL', contact_name: 'Diego Araya', contact_email: 'daraya@tnorte.cl', contact_phone: '+56 9 6543 2109', status: 'SUSPENDED', insurance_expiry: '2024-09-30T00:00:00Z', worker_count: 15, active_worker_count: 0, incident_count: 3, compliance_pct: 45, created_at: '2023-01-20T00:00:00Z', updated_at: '2024-10-01T00:00:00Z', certifications: [], documents: [], approved_by: 'admin', approved_at: '2023-01-25T00:00:00Z', suspension_reason: 'Seguro vencido + 2 incidentes YTD', insurance_url: null, organization_id: 'org1' },
  ],
};

// ─────────────────────────────────────────────────────────────
// OBSERVATIONS (BBS)
// ─────────────────────────────────────────────────────────────

export const DEMO_OBSERVATIONS_LIST = {
  total: 18,
  page: 1,
  page_size: 20,
  total_pages: 1,
  items: [
    { id: 'ob1', type: 'UNSAFE' as const, category: 'PPE' as const, description: 'Trabajador en esmerilado sin careta facial, sólo lentes de seguridad.', area: 'Taller Mecánico', status: 'ACTION_ASSIGNED' as const, is_anonymous: false, observer_id: 'emp1', created_at: '2025-01-05T10:00:00Z', updated_at: '2025-01-05T14:30:00Z', organization_id: 'org1', site_id: 'site1', task_being_performed: 'Esmerilado de pieza metálica', observed_person_id: null, observed_contractor_worker_id: null, positive_feedback: null, improvement_feedback: 'Usar careta facial durante operación de esmeriles', photos: [], action_id: 'a10', latitude: null, longitude: null },
    { id: 'ob2', type: 'SAFE' as const, category: 'PROCEDURE' as const, description: 'Operadores de bodega respetan señalización vial interna y ceden paso correcto.', area: 'Bodega Central', status: 'CLOSED' as const, is_anonymous: false, observer_id: 'emp2', created_at: '2025-01-04T09:00:00Z', updated_at: '2025-01-04T09:00:00Z', organization_id: 'org1', site_id: 'site1', task_being_performed: 'Movimiento interno de materiales', observed_person_id: null, observed_contractor_worker_id: null, positive_feedback: 'Excelente cumplimiento de normas viales internas', improvement_feedback: null, photos: [], action_id: null, latitude: null, longitude: null },
    { id: 'ob3', type: 'NEAR_MISS_BEHAVIOR' as const, category: 'ENERGY_ISOLATION' as const, description: 'Técnico inició trabajo en panel eléctrico sin verificar LOTO previo a apertura.', area: 'Sub Estación 2', status: 'OPEN' as const, is_anonymous: true, observer_id: 'emp3', created_at: '2025-01-03T15:30:00Z', updated_at: '2025-01-03T15:30:00Z', organization_id: 'org1', site_id: 'site1', task_being_performed: 'Mantenimiento preventivo panel MCC', observed_person_id: null, observed_contractor_worker_id: null, positive_feedback: null, improvement_feedback: 'Reforzar entrenamiento de LOTO y procedimiento de verificación pre-trabajo', photos: [], action_id: null, latitude: null, longitude: null },
    { id: 'ob4', type: 'UNSAFE' as const, category: 'HOUSEKEEPING' as const, description: 'Pasillo de evacuación bloqueado con pallets de material pendiente de despacho.', area: 'Bodega Norte', status: 'IN_REVIEW' as const, is_anonymous: false, observer_id: 'emp4', created_at: '2025-01-02T11:00:00Z', updated_at: '2025-01-02T16:00:00Z', organization_id: 'org1', site_id: 'site1', task_being_performed: 'Inspección rutinaria de orden y aseo', observed_person_id: null, observed_contractor_worker_id: null, positive_feedback: null, improvement_feedback: 'Despejar inmediatamente rutas de evacuación', photos: [], action_id: null, latitude: null, longitude: null },
    { id: 'ob5', type: 'SAFE' as const, category: 'TOOL_USE' as const, description: 'Mecánico utiliza herramienta correcta para apriete de pernos — torquímetro calibrado.', area: 'Taller Mecánico', status: 'CLOSED' as const, is_anonymous: false, observer_id: 'emp5', created_at: '2025-01-02T08:30:00Z', updated_at: '2025-01-02T08:30:00Z', organization_id: 'org1', site_id: 'site1', task_being_performed: 'Mantenimiento preventivo compresor #3', observed_person_id: null, observed_contractor_worker_id: null, positive_feedback: 'Buen uso de herramienta calibrada y procedimiento correcto', improvement_feedback: null, photos: [], action_id: null, latitude: null, longitude: null },
  ],
};

export const DEMO_OBSERVATIONS_TREND: Array<{
  month: string; label: string; safe: number; unsafe: number; near_miss: number; total: number; participation_rate: number;
}> = [
  { month: '2024-07', label: 'Jul', safe: 18, unsafe: 8, near_miss: 2, total: 28, participation_rate: 63 },
  { month: '2024-08', label: 'Ago', safe: 22, unsafe: 10, near_miss: 3, total: 35, participation_rate: 72 },
  { month: '2024-09', label: 'Sep', safe: 20, unsafe: 9, near_miss: 2, total: 31, participation_rate: 68 },
  { month: '2024-10', label: 'Oct', safe: 25, unsafe: 7, near_miss: 4, total: 36, participation_rate: 78 },
  { month: '2024-11', label: 'Nov', safe: 28, unsafe: 6, near_miss: 2, total: 36, participation_rate: 81 },
  { month: '2024-12', label: 'Dic', safe: 24, unsafe: 5, near_miss: 1, total: 30, participation_rate: 75 },
];

export const DEMO_OBSERVATIONS_BY_CATEGORY = [
  { category: 'PPE' as const, safe_count: 35, unsafe_count: 18, near_miss_count: 3, total: 56 },
  { category: 'PROCEDURE' as const, safe_count: 42, unsafe_count: 12, near_miss_count: 5, total: 59 },
  { category: 'HOUSEKEEPING' as const, safe_count: 28, unsafe_count: 22, near_miss_count: 2, total: 52 },
  { category: 'TOOL_USE' as const, safe_count: 38, unsafe_count: 8, near_miss_count: 1, total: 47 },
  { category: 'ENERGY_ISOLATION' as const, safe_count: 15, unsafe_count: 5, near_miss_count: 4, total: 24 },
  { category: 'ERGONOMICS' as const, safe_count: 20, unsafe_count: 10, near_miss_count: 2, total: 32 },
];

// ─────────────────────────────────────────────────────────────
// ACTIONS (CAPA)
// ─────────────────────────────────────────────────────────────

export const DEMO_ACTIONS_LIST = [
  { id: 'a1', code: 'ACC-0034', title: 'Reparar baranda pasarela N°3', description: 'Reemplazar segmento de baranda dañada en pasarela norte, nivel 3', status: 'OVERDUE', priority: 'HIGH', responsible_name: 'Carlos Méndez', due_date: '2024-12-15T00:00:00Z', source_type: 'inspection', source_ref: 'INSP-0042', category: 'CORRECTIVE', completion_pct: 0 },
  { id: 'a2', code: 'ACC-0033', title: 'Cambiar extintores Bodega A', description: 'Reemplazo de 4 extintores PQS vencidos en sector almacenamiento', status: 'OVERDUE', priority: 'MEDIUM', responsible_name: 'Ana Torres', due_date: '2024-12-20T00:00:00Z', source_type: 'audit', source_ref: 'AUD-0015', category: 'CORRECTIVE', completion_pct: 50 },
  { id: 'a3', code: 'ACC-0032', title: 'Actualizar procedimiento LOTO', description: 'Revisión y actualización del procedimiento de bloqueo y etiquetado', status: 'OVERDUE', priority: 'HIGH', responsible_name: 'Luis Vargas', due_date: '2024-12-22T00:00:00Z', source_type: 'incident', source_ref: 'INC-0089', category: 'CORRECTIVE', completion_pct: 75 },
  { id: 'a4', code: 'ACC-0031', title: 'Señalizar zona de acopio temporal', description: 'Instalar señalética horizontal y vertical en zona de acopio norte', status: 'IN_PROGRESS', priority: 'LOW', responsible_name: 'María Soto', due_date: '2025-01-10T00:00:00Z', source_type: 'observation', source_ref: 'OBS-0234', category: 'CORRECTIVE', completion_pct: 60 },
  { id: 'a5', code: 'ACC-0030', title: 'Calibrar manómetros sala de bombas', description: 'Calibración y documentación de 6 manómetros del sistema de bombeo', status: 'IN_PROGRESS', priority: 'MEDIUM', responsible_name: 'Pedro Ríos', due_date: '2025-01-12T00:00:00Z', source_type: 'inspection', source_ref: 'INSP-0048', category: 'PREVENTIVE', completion_pct: 40 },
  { id: 'a6', code: 'ACC-0029', title: 'Instalar duchas de emergencia adicionales', description: 'Instalar 2 duchas de emergencia en sector manejo de químicos', status: 'OPEN', priority: 'HIGH', responsible_name: 'Roberto Silva', due_date: '2025-01-20T00:00:00Z', source_type: 'risk', source_ref: 'RIS-0019', category: 'PREVENTIVE', completion_pct: 0 },
  { id: 'a7', code: 'ACC-0028', title: 'Charla de 5 minutos — uso correcto EPP', description: 'Impartir charla de 5 minutos diaria sobre uso correcto de EPP facial', status: 'COMPLETED', priority: 'MEDIUM', responsible_name: 'Jorge Castillo', due_date: '2024-12-31T00:00:00Z', source_type: 'observation', source_ref: 'OBS-0230', category: 'CORRECTIVE', completion_pct: 100 },
  { id: 'a8', code: 'ACC-0027', title: 'Renovar certificación operador grúa', description: 'Programa de recertificación operadores grúas torre — 3 personas', status: 'COMPLETED', priority: 'HIGH', responsible_name: 'Ana Torres', due_date: '2024-12-28T00:00:00Z', source_type: 'training', source_ref: 'CRS-006', category: 'PREVENTIVE', completion_pct: 100 },
];

export const DEMO_ACTION_STATISTICS = {
  total: 34,
  open: 6,
  in_progress: 12,
  completed: 8,
  overdue: 8,
  cancelled: 0,
  by_priority: { HIGH: 12, MEDIUM: 15, LOW: 7 },
  by_source: { inspection: 12, incident: 8, audit: 6, observation: 5, risk: 3 },
  completion_rate_pct: 23.5,
  avg_days_to_complete: 14,
};

export const DEMO_KANBAN = {
  columns: [
    { id: 'OPEN', label: 'Abierta', items: DEMO_ACTIONS_LIST.filter(a => a.status === 'OPEN') },
    { id: 'IN_PROGRESS', label: 'En Progreso', items: DEMO_ACTIONS_LIST.filter(a => a.status === 'IN_PROGRESS') },
    { id: 'OVERDUE', label: 'Vencida', items: DEMO_ACTIONS_LIST.filter(a => a.status === 'OVERDUE') },
    { id: 'COMPLETED', label: 'Completada', items: DEMO_ACTIONS_LIST.filter(a => a.status === 'COMPLETED') },
  ],
};

// ─────────────────────────────────────────────────────────────
// FORMS
// ─────────────────────────────────────────────────────────────

export const DEMO_FORM_TEMPLATES = [
  { id: 'ft1', name: 'Permiso de Excavación', description: 'Formulario para autorización de trabajos de excavación', category: 'PERMITS', status: 'PUBLISHED', submissions_count: 28, version: 2, created_at: '2024-06-01T00:00:00Z', updated_at: '2024-10-15T00:00:00Z' },
  { id: 'ft2', name: 'Reporte de Incidente Ambiental', description: 'Formulario de reporte inicial para incidentes ambientales', category: 'INCIDENTS', status: 'PUBLISHED', submissions_count: 6, version: 1, created_at: '2024-07-10T00:00:00Z', updated_at: '2024-07-10T00:00:00Z' },
  { id: 'ft3', name: 'Inspección Diaria Montacargas', description: 'Checklist de inspección pre-operacional para montacargas', category: 'INSPECTIONS', status: 'PUBLISHED', submissions_count: 124, version: 3, created_at: '2024-01-15T00:00:00Z', updated_at: '2024-09-01T00:00:00Z' },
  { id: 'ft4', name: 'Registro de Capacitación — Asistencia', description: 'Control de asistencia a cursos y talleres de capacitación', category: 'TRAINING', status: 'PUBLISHED', submissions_count: 45, version: 1, created_at: '2024-03-20T00:00:00Z', updated_at: '2024-03-20T00:00:00Z' },
  { id: 'ft5', name: 'Evaluación de Riesgo Tarea (ART)', description: 'Análisis de Riesgo por Tarea antes de iniciar trabajos', category: 'RISK', status: 'DRAFT', submissions_count: 0, version: 1, created_at: '2024-12-01T00:00:00Z', updated_at: '2024-12-15T00:00:00Z' },
];

// ─────────────────────────────────────────────────────────────
// KPI ALERTS
// ─────────────────────────────────────────────────────────────

export const DEMO_KPI_ALERT_RULES = [
  { id: 'kar1', name: 'TRIR > 2.0', kpi_name: 'TRIR', condition: 'GREATER_THAN', threshold: 2.0, period: 'MONTHLY', is_active: true, channels: { email: true, sms: false }, recipients: {}, escalation_rules: {}, organization_id: 'org1', site_id: null, description: 'Alerta cuando TRIR mensual supera 2.0', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'kar2', name: 'Acciones Vencidas > 10', kpi_name: 'ACTIONS_OVERDUE', condition: 'GREATER_THAN', threshold: 10, period: 'REAL_TIME', is_active: true, channels: { email: true, sms: true }, recipients: {}, escalation_rules: {}, organization_id: 'org1', site_id: null, description: 'Alerta cuando acciones vencidas superan 10', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'kar3', name: 'Cumplimiento Capacitación < 75%', kpi_name: 'TRAINING_COMPLIANCE', condition: 'LESS_THAN', threshold: 75, period: 'MONTHLY', is_active: true, channels: { email: true, sms: false }, recipients: {}, escalation_rules: {}, organization_id: 'org1', site_id: null, description: 'Alerta cuando cumplimiento baja de 75%', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
];

export const DEMO_KPI_ALERTS = [
  { id: 'ka1', rule_id: 'kar2', kpi_name: 'ACTIONS_OVERDUE', condition: 'GREATER_THAN', threshold_value: 10, current_value: 8, period: 'REAL_TIME', status: 'ACKNOWLEDGED', triggered_at: '2024-12-28T08:00:00Z', acknowledged_at: '2024-12-28T09:30:00Z', acknowledged_by: 'Jorge Castillo', resolved_at: null, escalation_count: 0, notes: 'Se inició plan de cierre de acciones vencidas', rule_name: 'Acciones Vencidas > 10', severity: 'medium' as const, organization_id: 'org1', site_id: null },
];

// ─────────────────────────────────────────────────────────────
// MARKETPLACE
// ─────────────────────────────────────────────────────────────

export const DEMO_MARKETPLACE_TEMPLATES = [
  { id: 'mt1', name: 'Inspección Pre-Operacional Equipos Pesados', industry: 'MINING', standard: 'Internal', downloads: 1842, rating: 4.8, category: 'EQUIPMENT', language: 'es', is_free: true },
  { id: 'mt2', name: 'Auditoría ISO 45001:2018 — Checklist Completo', industry: 'ALL', standard: 'ISO 45001', downloads: 3210, rating: 4.9, category: 'AUDIT', language: 'es', is_free: true },
  { id: 'mt3', name: 'Análisis de Trabajo Seguro (ATS/JSA)', industry: 'ALL', standard: 'OSHA', downloads: 2654, rating: 4.7, category: 'RISK', language: 'es', is_free: true },
  { id: 'mt4', name: 'Perforación Petrolera — API RP 54', industry: 'OIL_GAS', standard: 'API RP 54', downloads: 987, rating: 4.6, category: 'DRILLING', language: 'es', is_free: true },
  { id: 'mt5', name: 'Espacio Confinado — Entrada Permitida', industry: 'ALL', standard: 'OSHA 1910.146', downloads: 2103, rating: 4.8, category: 'CONFINED_SPACE', language: 'es', is_free: true },
  { id: 'mt6', name: 'Auditoría Sistema Ambiental ISO 14001', industry: 'ALL', standard: 'ISO 14001', downloads: 1567, rating: 4.7, category: 'ENVIRONMENTAL', language: 'es', is_free: true },
];
