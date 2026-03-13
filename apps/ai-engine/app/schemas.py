"""Pydantic schemas for AI Engine request/response models."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Inspection Analysis ─────────────────────────────────────

class InspectionAnalysisRequest(BaseModel):
    inspection_id: str
    title: str
    template_category: str
    responses: dict
    findings: list[dict] = Field(default_factory=list)
    site_name: str = ""
    area_name: str = ""


class RiskItem(BaseModel):
    area: str
    description: str
    severity: str
    likelihood: str
    recommended_action: str


class InspectionAnalysisResponse(BaseModel):
    inspection_id: str
    overall_risk_score: float = Field(ge=0, le=100)
    risk_level: str  # critical | high | medium | low
    summary: str
    key_findings: list[str]
    risk_items: list[RiskItem]
    recommended_actions: list[str]
    compliance_gaps: list[str]
    trend_indicators: list[str]


# ── Risk Scoring ────────────────────────────────────────────

class RiskScoreRequest(BaseModel):
    entity_type: str  # inspection | incident | area | site
    entity_id: str
    context: dict = Field(default_factory=dict)


class RiskScoreResponse(BaseModel):
    entity_id: str
    entity_type: str
    risk_score: float = Field(ge=0, le=100)
    risk_level: str
    contributing_factors: list[str]
    mitigation_suggestions: list[str]


# ── Report Generation ──────────────────────────────────────

class ReportRequest(BaseModel):
    report_type: str  # executive_summary | inspection_report | incident_report | trend_analysis
    organization_id: str
    date_from: str
    date_to: str
    site_id: str | None = None
    language: str = "es"
    data: dict = Field(default_factory=dict)


class ReportResponse(BaseModel):
    report_type: str
    title: str
    content_markdown: str
    key_metrics: dict
    generated_at: str


# ── Predictive Analysis ────────────────────────────────────

class PredictiveRequest(BaseModel):
    organization_id: str
    site_id: str | None = None
    analysis_type: str  # incident_prediction | compliance_forecast | resource_planning
    historical_data: dict = Field(default_factory=dict)


class PredictionItem(BaseModel):
    category: str
    prediction: str
    confidence: float = Field(ge=0, le=1)
    timeframe: str
    recommended_action: str


class PredictiveResponse(BaseModel):
    analysis_type: str
    predictions: list[PredictionItem]
    model_confidence: float
    data_quality_score: float


# ── Chat / Assistant ────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # user | assistant | system
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: dict = Field(default_factory=dict)
    organization_id: str | None = None


class ChatResponse(BaseModel):
    message: str
    sources: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)


# ── Incident Root-Cause Analysis ────────────────────────────

class IncidentAnalysisRequest(BaseModel):
    incident: dict
    historical_incidents: list[dict] = Field(default_factory=list)


class IncidentAnalysisResponse(BaseModel):
    immediate_causes: list[str]
    root_causes: list[str]
    contributing_factors: list[str]
    recommendations: list[str]
    similar_incidents: list[dict] = Field(default_factory=list)
    risk_level: str
    preventability_score: int = Field(ge=0, le=100)
    investigation_summary: str


# ── Accident Probability Prediction ────────────────────────

class AccidentProbabilityRequest(BaseModel):
    site_id: str
    area: str
    period_days: int = Field(default=30, ge=1, le=365)
    historical_data: dict = Field(default_factory=dict)


class RiskFactorItem(BaseModel):
    factor: str
    weight: float = Field(ge=0, le=1)
    trend: str  # increasing | stable | decreasing


class AccidentProbabilityResponse(BaseModel):
    probability: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    risk_factors: list[RiskFactorItem]
    preventive_measures: list[str]
    risk_level: str
    predicted_incident_types: list[str]
    comparison_to_industry: str


# ── Finding Severity Classification ────────────────────────

class FindingClassificationRequest(BaseModel):
    finding_description: str
    context: dict = Field(default_factory=dict)


class FindingClassificationResponse(BaseModel):
    severity: str  # critical | major | minor | observation
    justification: str
    regulatory_reference: str
    recommended_action: str
    deadline_days: int
    requires_immediate_shutdown: bool


# ── Executive Report ────────────────────────────────────────

class ExecutiveReportRequest(BaseModel):
    kpi_data: dict
    incidents: list[dict] = Field(default_factory=list)
    actions: list[dict] = Field(default_factory=list)
    period: str
    language: str = "es"


class ExecutiveReportResponse(BaseModel):
    content_markdown: str
    period: str
    generated_at: str


# ── OCR Evidence ────────────────────────────────────────────

class OCRResponse(BaseModel):
    text: str
    confidence: float = Field(ge=0, le=1)
    language: str
    blocks: list[dict] = Field(default_factory=list)
    pages: list[dict] | None = None
    total_pages: int | None = None


# ── Safety Photo Analysis ───────────────────────────────────

class SafetyPhotoResponse(BaseModel):
    missing_ppe: list[str]
    unsafe_conditions: list[str]
    signage_issues: list[str]
    risk_level: str
    confidence: float = Field(ge=0, le=1)
    observations: list[str]
    recommended_actions: list[str]
    extracted_text: str


# ── Safety Chatbot ──────────────────────────────────────────

class SafetyChatRequest(BaseModel):
    message: str
    org_context: dict = Field(default_factory=dict)
    conversation_history: list[ChatMessage] = Field(default_factory=list)


class SafetyChatResponse(BaseModel):
    response: str


# ── Proactive Recommendations ───────────────────────────────

class RecommendationsRequest(BaseModel):
    site_data: dict = Field(default_factory=dict)


class RecommendationItem(BaseModel):
    category: str
    title: str
    description: str
    priority: str  # critical | high | medium | low
    action_items: list[str]
    data_basis: str


class RecommendationsResponse(BaseModel):
    site_id: str
    recommendations: list[RecommendationItem]
    generated_at: str


# ── Hierarchy of Controls ───────────────────────────────────

class SuggestControlsRequest(BaseModel):
    risk_description: str
    hazard_type: str
    context: dict = Field(default_factory=dict)


class SuggestControlsResponse(BaseModel):
    elimination: list[str]
    substitution: list[str]
    engineering: list[str]
    administrative: list[str]
    ppe: list[str]
    effectiveness_rating: str
    regulatory_basis: str
    implementation_priority: str


# ── Analytics: Pattern Detection ────────────────────────────

class PatternDetectionRequest(BaseModel):
    incidents: list[dict]


class PatternDetectionResponse(BaseModel):
    patterns: list[dict]
    hotspots: list[dict]
    time_patterns: list[dict]
    top_causes: list[dict]
    repeat_types: list[dict]
    clusters: list[dict]
    summary: str


# ── Analytics: Risk Score ───────────────────────────────────

class SiteRiskScoreRequest(BaseModel):
    incidents: list[dict] = Field(default_factory=list)
    inspections: list[dict] = Field(default_factory=list)
    actions: list[dict] = Field(default_factory=list)
    period_days: int = Field(default=90, ge=1, le=365)


class SiteRiskScoreResponse(BaseModel):
    site_id: str
    score: int = Field(ge=0, le=100)
    level: str
    components: list[dict]
    trend: str
    drivers: list[str]
    recommended_priority: str


# ── Analytics: Repeat Issues ────────────────────────────────

class RepeatIssuesRequest(BaseModel):
    actions: list[dict]


class RepeatIssuesResponse(BaseModel):
    repeat_issues: list[dict]
    systemic_failures: list[str]
    effectiveness_rate: float
    recommendations: list[str]


# ── Analytics: KPI Benchmarking ─────────────────────────────

class BenchmarkRequest(BaseModel):
    org_data: dict
    industry_data: dict | None = None


class BenchmarkResponse(BaseModel):
    benchmarks: list[dict]
    overall_score: int = Field(ge=0, le=100)
    strengths: list[str]
    gaps: list[str]
    priority_improvements: list[str]

# ── KPI Trend Analysis ──────────────────────────────────────────────

class KpiTrendAnalysisRequest(BaseModel):
    site_id: str
    kpi_name: str = Field(
        description="Human-readable KPI name, e.g. 'TRIR', 'LTIF', 'Cumplimiento de Inspecciones'"
    )
    historical_values: list[float] = Field(
        min_length=3,
        description="Chronological list of KPI values (oldest first). Minimum 3 data points.",
    )
    period_days: int = Field(
        default=90,
        ge=7,
        le=730,
        description="Total number of days covered by the historical series.",
    )


class KpiTrendAnalysisResponse(BaseModel):
    site_id: str
    kpi_name: str
    trend: str = Field(description="IMPROVING | STABLE | DETERIORATING")
    prediction_30d: float = Field(description="Predicted KPI value 30 days from now")
    alert_level: str = Field(description="NONE | LOW | MEDIUM | HIGH")
    explanation: str = Field(description="Actionable 2-3 sentence narrative for the site manager")
    # Statistical context returned for transparency / debugging
    mean: float
    std: float
    slope: float
    data_points: int

# ── Health ──────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    redis_connected: bool
    model_loaded: str
