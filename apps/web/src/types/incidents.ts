/**
 * TypeScript types for the Incidents module.
 * Matches backend models and schemas.
 */

// ── Enums ──────────────────────────────────────────────────

export type IncidentType =
  | 'near_miss' | 'first_aid' | 'medical_treatment' | 'lost_time'
  | 'fatality' | 'property_damage' | 'environmental' | 'fire' | 'spill' | 'other';

export type IncidentStatus =
  | 'reported' | 'under_investigation' | 'corrective_actions' | 'review' | 'closed';

export type IncidentSeverity =
  | 'catastrophic' | 'critical' | 'serious' | 'moderate' | 'minor';

export type InvestigationMethodology =
  | 'five_whys' | 'ishikawa' | 'icam' | 'tripod_beta' | 'fault_tree';

// ── Incident ───────────────────────────────────────────────

export interface Incident {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string;
  reported_at: string;
  location_description?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  injuries_count: number;
  fatalities_count: number;
  immediate_actions?: string;
  root_cause_analysis?: string;
  evidence_urls?: string[];
  witness_statements?: Record<string, unknown>;
  investigation?: InvestigationData;
  organization_id: string;
  site_id: string;
  area_id?: string;
  reported_by_id: string;
  assigned_investigator_id?: string;
  corrective_actions?: CorrectiveAction[];
  witnesses?: IncidentWitness[];
  incident_attachments?: IncidentAttachment[];
  timeline_events?: TimelineEvent[];
  lessons_learned?: string;
  created_at: string;
  updated_at: string;
}

// ── Corrective Action ──────────────────────────────────────

export interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  action_type: 'corrective' | 'preventive';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'completed' | 'verified' | 'overdue';
  due_date?: string;
  completed_at?: string;
  verification_notes?: string;
  evidence_urls?: string[];
  incident_id?: string;
  finding_id?: string;
  assigned_to_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// ── Witness ────────────────────────────────────────────────

export interface IncidentWitness {
  id: string;
  incident_id: string;
  name: string;
  statement?: string;
  contact?: string;
  created_at: string;
}

// ── Attachment ─────────────────────────────────────────────

export interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_url: string;
  file_type: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
}

// ── Timeline ───────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  incident_id: string;
  event_type: 'status_change' | 'comment' | 'attachment' | 'action_created' | 'investigation_update';
  title: string;
  description?: string;
  user_name?: string;
  created_at: string;
}

// ── Investigation ──────────────────────────────────────────

export interface InvestigationData {
  methodology: InvestigationMethodology;
  started_at?: string;
  completed_at?: string;
  data: FiveWhysData | IshikawaData | ICAMData | TripodBetaData | FaultTreeData;
}

// Five Whys
export interface FiveWhysData {
  problem: string;
  whys: Array<{ question: string; answer: string }>;
  root_cause: string;
}

// Ishikawa (Fishbone) - 6M
export interface IshikawaData {
  effect: string;
  categories: {
    man: string[];
    machine: string[];
    method: string[];
    material: string[];
    measurement: string[];
    environment: string[];   // milieu
  };
  root_cause: string;
}

// ICAM
export interface ICAMData {
  absent_defenses: string[];
  individual_actions: string[];
  task_conditions: string[];
  organizational_factors: string[];
  root_cause: string;
}

// Tripod Beta
export interface TripodBetaData {
  event: string;
  barriers: Array<{
    id: string;
    name: string;
    failed: boolean;
    failure_reason?: string;
  }>;
  preconditions: Array<{
    id: string;
    description: string;
    barrier_id: string;
  }>;
  latent_failures: Array<{
    id: string;
    description: string;
    precondition_id: string;
  }>;
  root_cause: string;
}

// Fault Tree
export interface FaultTreeNode {
  id: string;
  label: string;
  type: 'event' | 'and_gate' | 'or_gate' | 'basic_event';
  children?: FaultTreeNode[];
}

export interface FaultTreeData {
  top_event: string;
  tree: FaultTreeNode;
  root_cause: string;
}

// ── Statistics ─────────────────────────────────────────────

export interface IncidentStatistics {
  total_year: number;
  lti_count: number;
  near_miss_count: number;
  days_without_accident: number;
  trir: number;
  ltif: number;
  dart: number;
  far: number;
  bird_pyramid: BirdPyramidData;
  monthly_trend: Array<{ month: string; count: number; lti: number }>;
  by_type: Array<{ type: IncidentType; count: number }>;
  by_severity: Array<{ severity: IncidentSeverity; count: number }>;
}

export interface BirdPyramidData {
  fatalities: number;
  serious_injuries: number;
  minor_injuries: number;
  near_misses: number;
  unsafe_behaviors: number;
}

// ── List Response ──────────────────────────────────────────

export interface IncidentListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Incident[];
}

// ── Report Wizard Steps ────────────────────────────────────

export interface IncidentReportDraft {
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  title?: string;
  description?: string;
  occurred_at?: string;
  location_description?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  site_id?: string;
  area_id?: string;
  photos?: string[];
  immediate_actions?: string;
  injuries_count?: number;
  fatalities_count?: number;
  involved_persons?: Array<{ name: string; role: string; injury_type?: string }>;
  witnesses?: Array<{ name: string; contact?: string; statement?: string }>;
}

// ── Visual type labels ─────────────────────────────────────

export const INCIDENT_TYPE_CONFIG: Record<IncidentType, { label: string; icon: string; color: string }> = {
  near_miss: { label: 'Casi accidente', icon: 'AlertTriangle', color: '#f59e0b' },
  first_aid: { label: 'Primeros auxilios', icon: 'Heart', color: '#3b82f6' },
  medical_treatment: { label: 'Tratamiento médico', icon: 'Stethoscope', color: '#8b5cf6' },
  lost_time: { label: 'Tiempo perdido (LTI)', icon: 'Clock', color: '#ef4444' },
  fatality: { label: 'Fatalidad', icon: 'Skull', color: '#1f2937' },
  property_damage: { label: 'Daño a propiedad', icon: 'Building2', color: '#6b7280' },
  environmental: { label: 'Ambiental', icon: 'Leaf', color: '#22c55e' },
  fire: { label: 'Incendio', icon: 'Flame', color: '#dc2626' },
  spill: { label: 'Derrame', icon: 'Droplets', color: '#0ea5e9' },
  other: { label: 'Otro', icon: 'MoreHorizontal', color: '#9ca3af' },
};

export const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string; bg: string }> = {
  catastrophic: { label: 'Catastrófico', color: '#991b1b', bg: 'bg-red-900/20' },
  critical: { label: 'Crítico', color: '#dc2626', bg: 'bg-red-600/20' },
  serious: { label: 'Serio', color: '#ea580c', bg: 'bg-orange-600/20' },
  moderate: { label: 'Moderado', color: '#f59e0b', bg: 'bg-amber-500/20' },
  minor: { label: 'Menor', color: '#22c55e', bg: 'bg-green-500/20' },
};
