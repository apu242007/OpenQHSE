/**
 * TypeScript types for the Inspections module.
 * Matches backend models and schemas.
 */

// ── Enums ──────────────────────────────────────────────────

export type InspectionStatus = 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'archived';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'observation';
export type FindingStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'overdue';
export type RecurrenceFrequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';

// ── Template ───────────────────────────────────────────────

export interface TemplateQuestion {
  id: string;
  text: string;
  question_type: 'text' | 'number' | 'yes_no' | 'multiple_choice' | 'photo' | 'signature' | 'date';
  required: boolean;
  options?: string[];
  weight: number;
  guidance?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  questions: TemplateQuestion[];
}

export interface InspectionTemplate {
  id: string;
  title: string;
  description?: string;
  category: string;
  version: number;
  is_published: boolean;
  is_global: boolean;
  tags?: string[];
  schema_definition: { sections: TemplateSection[] };
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

// ── Inspection ─────────────────────────────────────────────

export interface Inspection {
  id: string;
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
  template?: InspectionTemplate;
  organization_id: string;
  site_id: string;
  area_id?: string;
  inspector_id: string;
  findings?: Finding[];
  created_at: string;
  updated_at: string;
}

export interface QuestionResponse {
  value: unknown;
  notes?: string;
  photos?: string[];
  flagged?: boolean;
}

// ── Finding ────────────────────────────────────────────────

export interface Finding {
  id: string;
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
  created_at: string;
  updated_at: string;
}

// ── Calendar Event ─────────────────────────────────────────

export interface InspectionCalendarEvent {
  id: string;
  title: string;
  status: InspectionStatus;
  scheduled_date: string;
  score?: number;
  max_score?: number;
  inspector_name?: string;
  site_name?: string;
}

// ── Bulk Schedule ──────────────────────────────────────────

export interface BulkScheduleRequest {
  template_id: string;
  site_id: string;
  area_id?: string;
  inspector_id: string;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date?: string;
  custom_days?: number;
  title_prefix?: string;
}

// ── KPI ────────────────────────────────────────────────────

export interface InspectionKPIs {
  completed_today: number;
  in_progress: number;
  overdue: number;
  compliance_rate: number;
  avg_score: number;
  scheduled_this_week: number;
}

// ── List Response ──────────────────────────────────────────

export interface InspectionListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Inspection[];
}
