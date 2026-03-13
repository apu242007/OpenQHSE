/**
 * TypeScript types for the AI Engine module.
 * Matches apps/ai-engine schemas.
 */

// ── Incident Analysis ──────────────────────────────────────

export interface IncidentAnalysisRequest {
  incident_description: string;
  incident_type: string;
  severity: string;
  location?: string;
  date?: string;
  previous_incidents?: string[];
}

export interface IncidentAnalysisResponse {
  root_causes: string[];
  contributing_factors: string[];
  immediate_actions: string[];
  long_term_recommendations: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  similar_incidents_analysis: string;
  regulatory_references: string[];
  confidence: number;
}

// ── Accident Probability / Predict Risk ────────────────────

export interface RiskFactorItem {
  factor: string;
  weight: number;
  score: number;
}

export interface AccidentProbabilityRequest {
  site_id: string;
  area?: string;
  recent_incidents: number;
  near_misses: number;
  open_actions: number;
  overdue_actions: number;
  last_inspection_days: number;
  workforce_size: number;
  high_risk_activities: string[];
}

export interface AccidentProbabilityResponse {
  probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: RiskFactorItem[];
  recommendations: string[];
  estimated_timeline: string;
  confidence: number;
}

// ── Finding Classification ─────────────────────────────────

export interface FindingClassificationRequest {
  description: string;
  area?: string;
  inspection_type?: string;
  photo_description?: string;
}

export interface FindingClassificationResponse {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  subcategory: string;
  recommended_actions: string[];
  priority: number;
  regulatory_standard: string;
  confidence: number;
}

// ── Executive Report ───────────────────────────────────────

export interface ExecutiveReportRequest {
  period: string;
  site_id?: string;
  kpis: Record<string, number>;
  incidents_summary: Record<string, number>;
  inspections_summary: Record<string, number>;
  actions_summary: Record<string, number>;
  training_summary?: Record<string, number>;
}

export interface ExecutiveReportResponse {
  executive_summary: string;
  key_achievements: string[];
  areas_of_concern: string[];
  risk_outlook: string;
  recommendations: string[];
  kpi_analysis: string;
  trend_analysis: string;
  confidence: number;
}

// ── OCR / Evidence ─────────────────────────────────────────

export interface OCRResponse {
  text: string;
  confidence: number;
  language: string;
  pages?: number;
}

// ── Safety Photo Analysis ──────────────────────────────────

export interface SafetyPhotoResponse {
  hazards_detected: string[];
  ppe_compliance: Record<string, boolean>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  description: string;
  confidence: number;
}

// ── Safety Chat ────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SafetyChatRequest {
  message: string;
  context?: string;
  history?: ChatMessage[];
}

export interface SafetyChatResponse {
  response: string;
  references: string[];
  suggested_actions: string[];
  confidence: number;
}

// ── Recommendations ────────────────────────────────────────

export interface RecommendationItem {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  estimated_impact: string;
}

export interface RecommendationsRequest {
  site_id: string;
  recent_incidents: number;
  open_findings: number;
  overdue_actions: number;
  inspection_compliance: number;
  training_compliance: number;
}

export interface RecommendationsResponse {
  recommendations: RecommendationItem[];
  overall_risk_level: string;
  priority_focus: string;
}

// ── Suggest Controls ───────────────────────────────────────

export interface SuggestControlsRequest {
  hazard_description: string;
  risk_type: string;
  current_controls: string[];
  risk_level: string;
}

export interface SuggestControlsResponse {
  controls: {
    type: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
    description: string;
    effectiveness: string;
    estimated_cost: string;
    implementation_time: string;
  }[];
  hierarchy_analysis: string;
  confidence: number;
}

// ── Pattern Detection ──────────────────────────────────────

export interface PatternDetectionRequest {
  incidents: Record<string, unknown>[];
  period_days?: number;
}

export interface PatternItem {
  type: string;
  description: string;
  count: number;
  severity: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  is_new: boolean;
}

export interface PatternDetectionResponse {
  hotspots: { area: string; count: number; severity_avg: number }[];
  time_patterns: { period: string; count: number; description: string }[];
  top_causes: { cause: string; count: number; percentage: number }[];
  repeat_types: { type: string; count: number; percentage: number }[];
  clusters: { label: string; incidents: number; common_factors: string[] }[];
  summary: string;
}

// ── Site Risk Score ────────────────────────────────────────

export interface RiskScoreComponent {
  name: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface SiteRiskScoreResponse {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  components: RiskScoreComponent[];
  trend: 'improving' | 'stable' | 'worsening';
  drivers: string[];
  recommended_priority: string;
}

// ── Repeat Issues ──────────────────────────────────────────

export interface RepeatIssueItem {
  description: string;
  count: number;
  root_cause_category: string;
  actions: string[];
  overdue_count: number;
}

export interface RepeatIssuesResponse {
  repeat_issues: RepeatIssueItem[];
  systemic_failures: string[];
  effectiveness_rate: number;
  recommendations: string[];
}

// ── Benchmark ──────────────────────────────────────────────

export interface BenchmarkKPI {
  kpi: string;
  org_value: number;
  industry_avg: number;
  percentile: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
  gap: number;
}

export interface BenchmarkResponse {
  benchmarks: BenchmarkKPI[];
  overall_score: number;
  strengths: string[];
  gaps: string[];
  priority_improvements: string[];
}
