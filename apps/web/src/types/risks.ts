/**
 * TypeScript types for the Risk Management module.
 * Matches backend models and schemas.
 */

// ── Enums ──────────────────────────────────────────────────

export type RiskType = 'safety' | 'health' | 'environment' | 'quality' | 'security';

export type RiskStatus = 'identified' | 'assessed' | 'mitigated' | 'accepted' | 'closed' | 'monitoring';

export type HazopStatus = 'draft' | 'in_progress' | 'completed' | 'approved';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

// ── Control ────────────────────────────────────────────────

export interface ControlItem {
  type: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
  description: string;
  effectiveness?: string;
  responsible?: string;
}

// ── Risk Register ──────────────────────────────────────────

export interface RiskRegister {
  id: string;
  organization_id: string;
  site_id: string;
  area?: string;
  process?: string;
  hazard_description: string;
  hazard_category: string;
  risk_type: RiskType;
  inherent_likelihood: number;
  inherent_severity: number;
  inherent_rating: number;
  controls: ControlItem[];
  residual_likelihood: number;
  residual_severity: number;
  residual_rating: number;
  risk_owner?: string;
  review_date?: string;
  status: RiskStatus;
  legal_requirement?: string;
  applicable_standard?: string;
  created_at: string;
}

export interface RiskRegisterListItem {
  id: string;
  hazard_description: string;
  hazard_category: string;
  risk_type: RiskType;
  inherent_rating: number;
  residual_rating: number;
  status: RiskStatus;
  review_date?: string;
  created_at: string;
}

// ── 5×5 Matrix ─────────────────────────────────────────────

export interface MatrixCell {
  likelihood: number;
  severity: number;
  rating: number;
  count: number;
  level: RiskLevel;
}

export interface RiskMatrixData {
  cells: MatrixCell[];
  total_risks: number;
}

// ── HAZOP ──────────────────────────────────────────────────

export interface HazopTeamMember {
  user_id: string;
  name: string;
  role_in_study: string;
}

export interface HazopStudy {
  id: string;
  organization_id: string;
  site_id: string;
  name: string;
  system_description: string;
  p_and_id_url?: string;
  status: HazopStatus;
  team_members?: HazopTeamMember[];
  facilitator_id?: string;
  nodes?: HazopNode[];
  created_at: string;
}

export interface HazopNode {
  id: string;
  study_id: string;
  node_name: string;
  design_intent: string;
  guide_word: string;
  deviation: string;
  causes?: Record<string, unknown>[];
  consequences?: Record<string, unknown>[];
  safeguards?: Record<string, unknown>[];
  risk_rating?: number;
  recommendations?: Record<string, unknown>[];
  created_at: string;
}

// ── Bow-Tie ────────────────────────────────────────────────

export interface BowTieThreat {
  id: string;
  description: string;
  likelihood: number;
}

export interface BowTieConsequence {
  id: string;
  description: string;
  severity: number;
}

export interface BowTieBarrier {
  id: string;
  description: string;
  type: string;
  threat_id?: string;
  consequence_id?: string;
  effectiveness: string;
}

export interface BowTieCriticalControl {
  id: string;
  barrier_id: string;
  description: string;
  verification_method: string;
  frequency: string;
}

export interface BowTieAnalysis {
  id: string;
  organization_id: string;
  site_id: string;
  top_event: string;
  hazard: string;
  threats: BowTieThreat[];
  consequences: BowTieConsequence[];
  prevention_barriers: BowTieBarrier[];
  mitigation_barriers: BowTieBarrier[];
  critical_controls?: BowTieCriticalControl[];
  created_at: string;
}

// ── Statistics ─────────────────────────────────────────────

export interface RiskStatistics {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_level: Record<string, number>;
  avg_inherent_rating: number;
  avg_residual_rating: number;
}

// ── Visual config ──────────────────────────────────────────

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  low: { label: 'Bajo', color: '#22c55e', bg: 'bg-green-500/20' },
  moderate: { label: 'Moderado', color: '#f59e0b', bg: 'bg-amber-500/20' },
  high: { label: 'Alto', color: '#ea580c', bg: 'bg-orange-600/20' },
  extreme: { label: 'Extremo', color: '#dc2626', bg: 'bg-red-600/20' },
};

export const RISK_TYPE_CONFIG: Record<RiskType, { label: string; icon: string; color: string }> = {
  safety: { label: 'Seguridad', icon: 'ShieldAlert', color: '#ef4444' },
  health: { label: 'Salud', icon: 'Heart', color: '#ec4899' },
  environment: { label: 'Ambiente', icon: 'Leaf', color: '#22c55e' },
  quality: { label: 'Calidad', icon: 'BadgeCheck', color: '#3b82f6' },
  security: { label: 'Seguridad física', icon: 'Lock', color: '#8b5cf6' },
};

export const HAZOP_GUIDE_WORDS = [
  'NO', 'MORE', 'LESS', 'AS WELL AS', 'PART OF',
  'REVERSE', 'OTHER THAN', 'EARLY', 'LATE', 'BEFORE', 'AFTER',
] as const;

export const LIKELIHOOD_LABELS = ['Raro', 'Improbable', 'Posible', 'Probable', 'Casi seguro'] as const;
export const SEVERITY_LABELS = ['Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico'] as const;
