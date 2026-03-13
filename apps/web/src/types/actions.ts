/**
 * TypeScript types for the CAPA (Corrective & Preventive Actions) module.
 * Matches backend models and schemas.
 */

// ── Enums ──────────────────────────────────────────────────

export type ActionType = 'corrective' | 'preventive';

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';

export type ActionStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'overdue';

// ── Action ─────────────────────────────────────────────────

export interface CorrectiveActionFull {
  id: string;
  title: string;
  description: string;
  action_type: ActionType;
  priority: ActionPriority;
  status: ActionStatus;
  due_date?: string;
  completed_at?: string;
  verification_notes?: string;
  evidence_urls?: string[];
  incident_id?: string;
  finding_id?: string;
  assigned_to_id?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ActionListItem {
  id: string;
  title: string;
  action_type: ActionType;
  priority: ActionPriority;
  status: ActionStatus;
  due_date?: string;
  assigned_to_id?: string;
  incident_id?: string;
  finding_id?: string;
  created_at: string;
  updated_at: string;
}

// ── Action Update (timeline entry) ─────────────────────────

export interface ActionUpdateEntry {
  id: string;
  action_id: string;
  user_id: string;
  comment: string;
  status_change?: string;
  attachments?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Kanban ─────────────────────────────────────────────────

export interface KanbanColumn {
  status: string;
  label: string;
  count: number;
  items: ActionListItem[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  total: number;
}

// ── Statistics ─────────────────────────────────────────────

export interface ActionStatistics {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  verified: number;
  overdue: number;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  avg_days_to_close: number;
  overdue_rate: number;
}

// ── Request bodies ─────────────────────────────────────────

export interface ActionCreateData {
  title: string;
  description: string;
  action_type?: ActionType;
  priority?: ActionPriority;
  due_date?: string;
  assigned_to_id?: string;
  incident_id?: string;
  finding_id?: string;
}

export interface ActionUpdateData {
  title?: string;
  description?: string;
  priority?: ActionPriority;
  status?: ActionStatus;
  due_date?: string;
  assigned_to_id?: string;
  verification_notes?: string;
  evidence_urls?: string[];
}

export interface EscalationData {
  reason: string;
  escalate_to_id?: string;
}

export interface VerificationData {
  notes: string;
  evidence_urls?: string[];
  is_effective: boolean;
}

export interface EffectivenessCheckData {
  notes: string;
  is_effective: boolean;
  re_open?: boolean;
}

// ── Visual config ──────────────────────────────────────────

export const PRIORITY_CONFIG: Record<ActionPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Crítica', color: '#dc2626', bg: 'bg-red-600/20' },
  high: { label: 'Alta', color: '#ea580c', bg: 'bg-orange-600/20' },
  medium: { label: 'Media', color: '#f59e0b', bg: 'bg-amber-500/20' },
  low: { label: 'Baja', color: '#22c55e', bg: 'bg-green-500/20' },
};

export const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; icon: string }> = {
  open: { label: 'Abierto', color: '#6b7280', icon: 'Circle' },
  in_progress: { label: 'En progreso', color: '#3b82f6', icon: 'Clock' },
  completed: { label: 'Completado', color: '#f59e0b', icon: 'CheckCircle' },
  verified: { label: 'Verificado', color: '#22c55e', icon: 'ShieldCheck' },
  overdue: { label: 'Vencido', color: '#dc2626', icon: 'AlertTriangle' },
};

export const KANBAN_COLUMNS: Array<{ key: ActionStatus; label: string; color: string }> = [
  { key: 'open', label: 'Abierto', color: '#6b7280' },
  { key: 'in_progress', label: 'En progreso', color: '#3b82f6' },
  { key: 'completed', label: 'Completado', color: '#f59e0b' },
  { key: 'verified', label: 'Verificado', color: '#22c55e' },
  { key: 'overdue', label: 'Vencido', color: '#dc2626' },
];
