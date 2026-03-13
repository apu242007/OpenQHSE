/**
 * API-specific response and request types for OpenQHSE Platform.
 *
 * These types describe the exact shapes returned by the backend API
 * beyond the base entity types defined in index.ts.
 *
 * Re-export from this file when you need typed API responses.
 */

import type {
  FindingSeverity,
  FindingStatus,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  InspectionStatus,
} from './index';

// ── Generic API utilities ─────────────────────────────────

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface MessageResponse {
  message: string;
}

export interface CountResponse {
  count: number;
}

// ── Auth ──────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  organization_id: string;
  organization_name?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ── Inspection KPIs & Analytics ───────────────────────────

export interface InspectionKPIs {
  total: number;
  completed: number;
  in_progress: number;
  overdue: number;
  cancelled: number;
  completion_rate: number;
  average_score: number;
  critical_findings: number;
  high_findings: number;
  total_findings: number;
  open_findings: number;
  upcoming_7d: number;
  compliance_rate_by_area?: Record<string, number>;
  score_trend?: ScoreDataPoint[];
}

export interface ScoreDataPoint {
  date: string;
  score: number;
  count: number;
}

export interface InspectionCalendarEvent {
  id: string;
  title: string;
  reference_number: string;
  scheduled_date: string;
  status: InspectionStatus;
  inspector_name: string;
  site_name: string;
  area_name?: string;
  template_title: string;
  score?: number;
  is_overdue: boolean;
}

export interface OverdueInspection {
  id: string;
  title: string;
  reference_number: string;
  scheduled_date: string;
  days_overdue: number;
  inspector_name: string;
  site_name: string;
  template_title: string;
  status: InspectionStatus;
}

export interface BulkScheduleRequest {
  template_id: string;
  site_ids: string[];
  area_ids?: string[];
  inspector_ids: string[];
  start_date: string;
  frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
  count: number;
}

export interface BulkScheduleResult {
  created: number;
  skipped: number;
  inspections: Array<{ id: string; title: string; scheduled_date: string }>;
}

// ── Inspection requests ───────────────────────────────────

export interface CreateInspectionRequest {
  template_id: string;
  site_id: string;
  area_id?: string;
  inspector_id: string;
  scheduled_date?: string;
  title?: string;
  notes?: string;
}

export interface UpdateInspectionRequest {
  title?: string;
  notes?: string;
  scheduled_date?: string;
  area_id?: string;
}

export interface CompleteInspectionRequest {
  responses: Record<
    string,
    {
      value: string | number | boolean;
      notes?: string;
      photos?: string[];
      flagged?: boolean;
    }
  >;
  notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  signature?: string;
}

export interface CancelInspectionRequest {
  reason: string;
}

// ── Findings ──────────────────────────────────────────────

export interface FindingResponse {
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
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFindingRequest {
  title: string;
  description?: string;
  severity: FindingSeverity;
  evidence_urls?: string[];
  corrective_action?: string;
  due_date?: string;
  assigned_to_id?: string;
  question_id?: string;
}

export interface UpdateFindingRequest {
  title?: string;
  description?: string;
  severity?: FindingSeverity;
  status?: FindingStatus;
  corrective_action?: string;
  root_cause?: string;
  due_date?: string;
  assigned_to_id?: string;
  evidence_urls?: string[];
}

// ── Incident Statistics ───────────────────────────────────

export interface IncidentStatistics {
  total: number;
  open: number;
  under_investigation: number;
  closed: number;
  by_type: Record<IncidentType, number>;
  by_severity: Record<IncidentSeverity, number>;
  by_status: Record<IncidentStatus, number>;
  by_month: MonthlyCount[];
  trir: number;
  ltif: number;
  dart: number;
  far?: number;
  total_injuries: number;
  total_fatalities: number;
  avg_days_to_close: number;
  bird_pyramid: BirdPyramidStats;
  top_sites: SiteIncidentCount[];
  top_areas: AreaIncidentCount[];
}

export interface MonthlyCount {
  year: number;
  month: number;
  month_label: string;
  count: number;
  injuries: number;
  near_misses: number;
}

export interface BirdPyramidStats {
  fatalities: number;
  serious_injuries: number;
  minor_injuries: number;
  near_misses: number;
  unsafe_behaviors: number;
}

export interface SiteIncidentCount {
  site_id: string;
  site_name: string;
  count: number;
  fatalities: number;
}

export interface AreaIncidentCount {
  area_id: string;
  area_name: string;
  count: number;
}

// ── Incident requests ─────────────────────────────────────

export interface CreateIncidentRequest {
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  occurred_at: string;
  location_description?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  injuries_count?: number;
  fatalities_count?: number;
  immediate_actions?: string;
  site_id: string;
  area_id?: string;
  evidence_urls?: string[];
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  occurred_at?: string;
  location_description?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  injuries_count?: number;
  fatalities_count?: number;
  immediate_actions?: string;
  area_id?: string;
}

export interface InvestigationSubmitRequest {
  investigation: {
    methodology: 'five_whys' | 'ishikawa' | 'icam' | 'tripod_beta' | 'fault_tree';
    data: Record<string, unknown>;
    started_at: string;
    completed_at: string;
  };
  root_cause_analysis?: string;
  contributing_factors?: string[];
  lessons_learned?: string;
  recommendations?: string;
}

export interface AddWitnessRequest {
  name: string;
  employee_id?: string;
  department?: string;
  statement: string;
  contact?: string;
}

export interface AddTimelineEventRequest {
  timestamp: string;
  description: string;
  event_type: 'occurrence' | 'discovery' | 'notification' | 'action' | 'other';
  source?: string;
}

export interface CloseIncidentRequest {
  closure_notes?: string;
  effectiveness_verified?: boolean;
}

// ── Corrective Actions ────────────────────────────────────

export interface CorrectiveActionResponse {
  id: string;
  title: string;
  description: string;
  action_type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'overdue' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  verification_notes?: string;
  progress_percent?: number;
  incident_id?: string;
  finding_id?: string;
  assigned_to_id: string;
  assigned_to_name?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActionRequest {
  title: string;
  description: string;
  action_type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_date?: string;
  assigned_to_id: string;
  incident_id?: string;
  finding_id?: string;
}

export interface ActionProgressRequest {
  notes: string;
  progress_percent: number;
  evidence_urls?: string[];
}

export interface VerifyActionRequest {
  verified: boolean;
  verification_notes: string;
  evidence_urls?: string[];
}

// ── KPI Alerts ────────────────────────────────────────────

export interface KPIAlert {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  current_value: number;
  is_triggered: boolean;
  severity: 'critical' | 'warning' | 'info';
  notification_channels: string[];
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface KPIMetricValue {
  metric: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  delta?: number;
  period: string;
}

// ── Observations (BBS) ────────────────────────────────────

export interface ObservationResponse {
  id: string;
  reference_number: string;
  type: 'safe' | 'unsafe' | 'improvement';
  description: string;
  location_description?: string;
  behavior_category?: string;
  severity?: string;
  corrective_action?: string;
  is_anonymous: boolean;
  status: 'open' | 'reviewed' | 'closed';
  observed_at: string;
  site_id: string;
  area_id?: string;
  observer_id?: string;
  observer_name?: string;
  created_at: string;
}

export interface CreateObservationRequest {
  type: 'safe' | 'unsafe' | 'improvement';
  description: string;
  location_description?: string;
  behavior_category?: string;
  corrective_action?: string;
  is_anonymous?: boolean;
  site_id: string;
  area_id?: string;
  evidence_urls?: string[];
  observed_at?: string;
}

// ── Equipment ─────────────────────────────────────────────

export interface EquipmentResponse {
  id: string;
  name: string;
  asset_tag: string;
  serial_number?: string;
  model?: string;
  manufacturer?: string;
  category: string;
  status: 'operational' | 'maintenance' | 'out_of_service' | 'decommissioned';
  purchase_date?: string;
  last_inspection_date?: string;
  next_inspection_date?: string;
  location?: string;
  site_id: string;
  area_id?: string;
  qr_code_url?: string;
  created_at: string;
}

// ── Upload ────────────────────────────────────────────────

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mime_type: string;
}

// ── AI Engine ─────────────────────────────────────────────

export interface AIAssistRequest {
  message: string;
  context?: string;
  module?: 'inspections' | 'incidents' | 'risk' | 'general';
  language?: 'es' | 'en' | 'pt';
}

export interface AIAssistResponse {
  reply: string;
  suggestions?: string[];
  confidence?: number;
  model?: string;
}

export interface AIAnalyzeRequest {
  entity_type: 'inspection' | 'incident';
  entity_id: string;
  analysis_type: 'root_cause' | 'risk_assessment' | 'compliance' | 'trend';
}

export interface AIAnalyzeResponse {
  analysis: string;
  key_findings: string[];
  recommendations: string[];
  risk_score?: number;
  confidence: number;
}

// ── Pagination helpers ────────────────────────────────────

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface InspectionFilterParams extends PaginationParams {
  status?: InspectionStatus;
  template_id?: string;
  site_id?: string;
  area_id?: string;
  inspector_id?: string;
  date_from?: string;
  date_to?: string;
  is_overdue?: boolean;
}

export interface IncidentFilterParams extends PaginationParams {
  status?: IncidentStatus;
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  site_id?: string;
  area_id?: string;
  investigator_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface ActionFilterParams extends PaginationParams {
  status?: string;
  priority?: string;
  assigned_to_id?: string;
  incident_id?: string;
  finding_id?: string;
  overdue_only?: boolean;
}
