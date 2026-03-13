/**
 * Shared TypeScript types for OpenQHSE Platform.
 *
 * Used across web frontend, mobile app, and any TypeScript tooling.
 */

// ── Enums ──────────────────────────────────────────────────

export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  INSPECTOR: 'inspector',
  WORKER: 'worker',
  VIEWER: 'viewer',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const InspectionStatus = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REVIEWED: 'reviewed',
  ARCHIVED: 'archived',
} as const;
export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus];

export const FindingSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  OBSERVATION: 'observation',
} as const;
export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export const FindingStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  VERIFIED: 'verified',
  CLOSED: 'closed',
  OVERDUE: 'overdue',
} as const;
export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];

export const IncidentType = {
  NEAR_MISS: 'near_miss',
  FIRST_AID: 'first_aid',
  MEDICAL_TREATMENT: 'medical_treatment',
  LOST_TIME: 'lost_time',
  FATALITY: 'fatality',
  PROPERTY_DAMAGE: 'property_damage',
  ENVIRONMENTAL: 'environmental',
  FIRE: 'fire',
  SPILL: 'spill',
  OTHER: 'other',
} as const;
export type IncidentType = (typeof IncidentType)[keyof typeof IncidentType];

export const IncidentSeverity = {
  CATASTROPHIC: 'catastrophic',
  CRITICAL: 'critical',
  SERIOUS: 'serious',
  MODERATE: 'moderate',
  MINOR: 'minor',
} as const;
export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

export const IncidentStatus = {
  REPORTED: 'reported',
  UNDER_INVESTIGATION: 'under_investigation',
  CORRECTIVE_ACTIONS: 'corrective_actions',
  REVIEW: 'review',
  CLOSED: 'closed',
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const PermitType = {
  HOT_WORK: 'hot_work',
  CONFINED_SPACE: 'confined_space',
  WORKING_AT_HEIGHT: 'working_at_height',
  ELECTRICAL: 'electrical',
  EXCAVATION: 'excavation',
  LIFTING: 'lifting',
  CHEMICAL_HANDLING: 'chemical_handling',
  GENERAL: 'general',
} as const;
export type PermitType = (typeof PermitType)[keyof typeof PermitType];

export const PermitStatus = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;
export type PermitStatus = (typeof PermitStatus)[keyof typeof PermitStatus];

// ── Interfaces ─────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  logo_url?: string;
  industry?: string;
  country?: string;
  timezone: string;
  is_active: boolean;
}

export interface User extends BaseEntity {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  language: string;
  is_email_verified: boolean;
  organization_id: string;
}

export interface Site extends BaseEntity {
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  organization_id: string;
}

export interface Area extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  risk_level: string;
  hazard_tags?: string[];
  is_active: boolean;
  site_id: string;
}

export interface InspectionTemplate extends BaseEntity {
  title: string;
  description?: string;
  category: string;
  version: number;
  is_published: boolean;
  is_global: boolean;
  tags?: string[];
  schema_definition: TemplateSchemaDefinition;
  organization_id?: string;
}

export interface TemplateSchemaDefinition {
  sections: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  questions: TemplateQuestion[];
}

export interface TemplateQuestion {
  id: string;
  text: string;
  question_type: 'text' | 'number' | 'yes_no' | 'multiple_choice' | 'photo' | 'signature' | 'date';
  required: boolean;
  options?: string[];
  weight: number;
  guidance?: string;
}

export interface Inspection extends BaseEntity {
  title: string;
  reference_number: string;
  status: InspectionStatus;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  score?: number;
  max_score?: number;
  notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  responses: Record<string, QuestionResponse>;
  template_id: string;
  organization_id: string;
  site_id: string;
  area_id?: string;
  inspector_id: string;
}

export interface QuestionResponse {
  value: string | number | boolean;
  notes?: string;
  photos?: string[];
  flagged?: boolean;
}

export interface Finding extends BaseEntity {
  title: string;
  description?: string;
  severity: FindingSeverity;
  status: FindingStatus;
  due_date?: string;
  resolved_at?: string;
  evidence_urls?: string[];
  corrective_action?: string;
  root_cause?: string;
  inspection_id: string;
  assigned_to_id?: string;
  organization_id: string;
}

export interface Incident extends BaseEntity {
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
  organization_id: string;
  site_id: string;
  area_id?: string;
  reported_by_id: string;
  assigned_investigator_id?: string;
}

export interface WorkPermit extends BaseEntity {
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
  organization_id: string;
  site_id: string;
  area_id?: string;
  requested_by_id: string;
  approved_by_id?: string;
}

export interface CorrectiveAction extends BaseEntity {
  title: string;
  description: string;
  action_type: string;
  priority: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  verification_notes?: string;
  evidence_urls?: string[];
  incident_id?: string;
  finding_id?: string;
  assigned_to_id: string;
  organization_id: string;
}

// ── API-specific types (request/response shapes) ──────────
export * from './api';

// ── API Response Types ─────────────────────────────────────

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface DashboardKPIs {
  total_inspections: number;
  completed_inspections: number;
  inspections_in_progress: number;
  inspection_completion_rate: number;
  total_findings: number;
  open_findings: number;
  overdue_findings: number;
  critical_findings: number;
  total_incidents: number;
  open_incidents: number;
  incidents_this_month: number;
  active_permits: number;
  pending_permits: number;
  safety_score: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  recent_inspections: Array<{
    id: string;
    title: string;
    reference_number: string;
    status: string;
    created_at: string;
  }>;
  recent_incidents: Array<{
    id: string;
    title: string;
    reference_number: string;
    severity: string;
    status: string;
    occurred_at: string;
  }>;
}
