/**
 * TypeScript types for the Permits (PTW) module.
 * Matches backend models and schemas.
 */

// ── Enums ──────────────────────────────────────────────────

export type PermitStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'active'
  | 'suspended' | 'closed' | 'rejected' | 'expired';

export type PermitType =
  | 'hot_work' | 'confined_space' | 'working_at_height' | 'electrical'
  | 'excavation' | 'lifting' | 'chemical_handling' | 'general';

// ── Work Permit ────────────────────────────────────────────

export interface WorkPermit {
  id: string;
  reference_number: string;
  title: string;
  permit_type: PermitType;
  status: PermitStatus;
  description: string;
  hazards_identified?: string[];
  precautions?: string[];
  ppe_required?: string[];
  valid_from: string;
  valid_until: string;
  approved_at?: string;
  closed_at?: string;
  checklist_data?: Record<string, unknown>;
  signatures?: Record<string, unknown>;
  organization_id: string;
  site_id: string;
  area_id?: string;
  requested_by_id: string;
  approved_by_id?: string;
  extensions?: PermitExtension[];
  created_at: string;
  updated_at: string;
}

export interface WorkPermitListItem {
  id: string;
  reference_number: string;
  title: string;
  permit_type: PermitType;
  status: PermitStatus;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

// ── Extension ──────────────────────────────────────────────

export interface PermitExtension {
  id: string;
  permit_id: string;
  new_end_datetime: string;
  reason: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

// ── QR ─────────────────────────────────────────────────────

export interface PermitQRData {
  permit_id: string;
  reference_number: string;
  validation_token: string;
  qr_content: string;
}

// ── Checklist ──────────────────────────────────────────────

export interface SafetyChecklistItem {
  item: string;
  required: boolean;
  checked?: boolean;
}

// ── Gas Readings ───────────────────────────────────────────

export interface GasReading {
  gas: string;
  value: number;
  is_safe?: boolean;
  limit_min?: number;
  limit_max?: number;
  unit?: string;
}

export interface GasLimits {
  [gas: string]: { min: number; max: number; unit: string };
}

// ── Statistics ─────────────────────────────────────────────

export interface PermitStatistics {
  total: number;
  active: number;
  expired: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

// ── Request bodies ─────────────────────────────────────────

export interface PermitCreateData {
  title: string;
  permit_type: PermitType;
  description: string;
  site_id: string;
  area_id?: string;
  hazards_identified?: string[];
  precautions?: string[];
  ppe_required?: string[];
  valid_from: string;
  valid_until: string;
  checklist_data?: Record<string, unknown>;
}

export interface PermitUpdateData {
  title?: string;
  description?: string;
  status?: PermitStatus;
  hazards_identified?: string[];
  precautions?: string[];
  ppe_required?: string[];
  valid_until?: string;
  checklist_data?: Record<string, unknown>;
  signatures?: Record<string, unknown>;
}

// ── Visual config ──────────────────────────────────────────

export const PERMIT_STATUS_CONFIG: Record<PermitStatus, { label: string; color: string; icon: string }> = {
  draft: { label: 'Borrador', color: '#6b7280', icon: 'FileEdit' },
  pending_approval: { label: 'Pendiente aprobación', color: '#f59e0b', icon: 'Clock' },
  approved: { label: 'Aprobado', color: '#3b82f6', icon: 'CheckCircle' },
  active: { label: 'Activo', color: '#22c55e', icon: 'ShieldCheck' },
  suspended: { label: 'Suspendido', color: '#ea580c', icon: 'PauseCircle' },
  closed: { label: 'Cerrado', color: '#6b7280', icon: 'XCircle' },
  rejected: { label: 'Rechazado', color: '#dc2626', icon: 'XOctagon' },
  expired: { label: 'Expirado', color: '#991b1b', icon: 'AlertOctagon' },
};

export const PERMIT_TYPE_CONFIG: Record<PermitType, { label: string; icon: string; color: string }> = {
  hot_work: { label: 'Trabajo en caliente', icon: 'Flame', color: '#ef4444' },
  confined_space: { label: 'Espacio confinado', icon: 'Box', color: '#8b5cf6' },
  working_at_height: { label: 'Trabajo en alturas', icon: 'ArrowUpFromLine', color: '#3b82f6' },
  electrical: { label: 'Eléctrico / LOTO', icon: 'Zap', color: '#f59e0b' },
  excavation: { label: 'Excavación', icon: 'Shovel', color: '#92400e' },
  lifting: { label: 'Izaje', icon: 'ArrowUp', color: '#0ea5e9' },
  chemical_handling: { label: 'Manejo de químicos', icon: 'FlaskConical', color: '#22c55e' },
  general: { label: 'General', icon: 'ClipboardList', color: '#6b7280' },
};

export const LOTO_ENERGY_TYPES = [
  'Eléctrica', 'Mecánica', 'Hidráulica', 'Neumática',
  'Térmica', 'Química', 'Gravitacional', 'Radiación',
] as const;
