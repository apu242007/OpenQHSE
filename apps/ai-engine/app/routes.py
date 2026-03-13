"""AI Engine API routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.schemas import (
    AccidentProbabilityRequest,
    AccidentProbabilityResponse,
    BenchmarkRequest,
    BenchmarkResponse,
    ChatRequest,
    ChatResponse,
    ExecutiveReportRequest,
    ExecutiveReportResponse,
    FindingClassificationRequest,
    FindingClassificationResponse,
    IncidentAnalysisRequest,
    IncidentAnalysisResponse,
    InspectionAnalysisRequest,
    InspectionAnalysisResponse,
    KpiTrendAnalysisRequest,
    KpiTrendAnalysisResponse,
    OCRResponse,
    PatternDetectionRequest,
    PatternDetectionResponse,
    PredictiveRequest,
    PredictiveResponse,
    RecommendationItem,
    RecommendationsRequest,
    RecommendationsResponse,
    RepeatIssuesRequest,
    RepeatIssuesResponse,
    ReportRequest,
    ReportResponse,
    RiskScoreRequest,
    RiskScoreResponse,
    SafetyChatRequest,
    SafetyChatResponse,
    SafetyPhotoResponse,
    SiteRiskScoreRequest,
    SiteRiskScoreResponse,
    SuggestControlsRequest,
    SuggestControlsResponse,
)
from app.services import AnalyticsService, LLMService, OCRService, get_analytics_service, get_llm_service, get_ocr_service
from app.services import AnalysisService, get_analysis_service

router = APIRouter(prefix="/ai", tags=["AI Analysis"])


# ── Legacy endpoints (v1 compatibility) ───────────────────────────────────────

@router.post("/analyze/inspection", response_model=InspectionAnalysisResponse)
async def analyze_inspection(
    request: InspectionAnalysisRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> InspectionAnalysisResponse:
    """Analyze an inspection using LLM and return risk assessment."""
    try:
        return await service.analyze_inspection(request)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {exc}") from exc


@router.post("/risk/score", response_model=RiskScoreResponse)
async def score_risk(
    request: RiskScoreRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> RiskScoreResponse:
    """Calculate risk score for an entity (inspection, incident, area, site)."""
    try:
        return await service.score_risk(request)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Risk scoring failed: {exc}") from exc


@router.post("/report/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> ReportResponse:
    """Generate a formatted QHSE report (executive summary, trend analysis, etc.)."""
    try:
        return await service.generate_report(request)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Report generation failed: {exc}") from exc


@router.post("/predict", response_model=PredictiveResponse)
async def predictive_analysis(
    request: PredictiveRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> PredictiveResponse:
    """Run predictive analysis on historical QHSE data."""
    try:
        return await service.predict(request)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Prediction failed: {exc}") from exc


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> ChatResponse:
    """Interactive QHSE assistant chat endpoint (legacy)."""
    try:
        return await service.chat(request)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Chat failed: {exc}") from exc


# ── Incident Analysis ──────────────────────────────────────────────────────────

@router.post("/analyze-incident", response_model=IncidentAnalysisResponse)
async def analyze_incident(
    request: IncidentAnalysisRequest,
    llm: LLMService = Depends(get_llm_service),
) -> IncidentAnalysisResponse:
    """Perform Bow-Tie root-cause analysis on a workplace incident."""
    try:
        data = await llm.analyze_incident_root_cause(
            incident=request.incident,
            historical_incidents=request.historical_incidents,
        )
        return IncidentAnalysisResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Incident analysis failed: {exc}") from exc


# ── Accident Probability Prediction ───────────────────────────────────────────

@router.post("/predict-risk", response_model=AccidentProbabilityResponse)
async def predict_risk(
    request: AccidentProbabilityRequest,
    llm: LLMService = Depends(get_llm_service),
) -> AccidentProbabilityResponse:
    """Predict accident probability for a site/area over a given period."""
    try:
        data = await llm.predict_accident_probability(
            site_id=request.site_id,
            area=request.area,
            period_days=request.period_days,
            historical_data=request.historical_data,
        )
        return AccidentProbabilityResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Risk prediction failed: {exc}") from exc


# ── Finding Severity Classification ───────────────────────────────────────────

@router.post("/classify-finding", response_model=FindingClassificationResponse)
async def classify_finding(
    request: FindingClassificationRequest,
    llm: LLMService = Depends(get_llm_service),
) -> FindingClassificationResponse:
    """Classify the severity of an inspection finding per ISO 45001 / OSHA."""
    try:
        data = await llm.classify_finding_severity(
            finding_description=request.finding_description,
            context=request.context,
        )
        return FindingClassificationResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Classification failed: {exc}") from exc


# ── Executive Report Generation ────────────────────────────────────────────────

@router.post("/generate-report", response_model=ExecutiveReportResponse)
async def generate_executive_report(
    request: ExecutiveReportRequest,
    llm: LLMService = Depends(get_llm_service),
) -> ExecutiveReportResponse:
    """Generate a professional narrative executive QHSE report in Markdown."""
    try:
        content = await llm.generate_executive_report(
            kpi_data=request.kpi_data,
            incidents=request.incidents,
            actions=request.actions,
            period=request.period,
            language=request.language,
        )
        return ExecutiveReportResponse(
            content_markdown=content,
            period=request.period,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Report generation failed: {exc}") from exc


# ── OCR Evidence Extraction ────────────────────────────────────────────────────

@router.post("/ocr-evidence", response_model=OCRResponse)
async def ocr_evidence(
    file: UploadFile = File(...),
    ocr: OCRService = Depends(get_ocr_service),
) -> OCRResponse:
    """Extract text from an uploaded image or PDF file."""
    try:
        content_type = file.content_type or ""
        data = await file.read()

        if "pdf" in content_type or (file.filename or "").lower().endswith(".pdf"):
            result = await ocr.extract_text_from_pdf(data)
            return OCRResponse(
                text=result["text"],
                confidence=1.0,
                language="es",
                blocks=[],
                pages=result.get("pages"),
                total_pages=result.get("total_pages"),
            )
        else:
            result = await ocr.extract_text_from_image(data)
            return OCRResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"OCR failed: {exc}") from exc


# ── Safety Photo Analysis ──────────────────────────────────────────────────────

@router.post("/analyze-photo", response_model=SafetyPhotoResponse)
async def analyze_safety_photo(
    file: UploadFile = File(...),
    ocr: OCRService = Depends(get_ocr_service),
) -> SafetyPhotoResponse:
    """Detect safety hazards in a workplace photo (PPE, conditions, signage)."""
    try:
        data = await file.read()
        result = await ocr.analyze_safety_photo(data)
        return SafetyPhotoResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Photo analysis failed: {exc}") from exc


# ── Safety Chatbot ─────────────────────────────────────────────────────────────

@router.post("/safety-chat", response_model=SafetyChatResponse)
async def safety_chat(
    request: SafetyChatRequest,
    llm: LLMService = Depends(get_llm_service),
) -> SafetyChatResponse:
    """Interactive QHSE assistant with access to real org context data."""
    try:
        response = await llm.safety_chat(
            user_message=request.message,
            org_context=request.org_context,
            conversation_history=[m.model_dump() for m in request.conversation_history],
        )
        return SafetyChatResponse(response=response)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Chat failed: {exc}") from exc


# ── Proactive Recommendations ──────────────────────────────────────────────────

@router.post("/recommendations/{site_id}", response_model=RecommendationsResponse)
async def get_recommendations(
    site_id: str,
    request: RecommendationsRequest,
    llm: LLMService = Depends(get_llm_service),
) -> RecommendationsResponse:
    """Generate 5 proactive weekly safety recommendations for a site."""
    try:
        items = await llm.get_proactive_recommendations(
            site_id=site_id,
            site_data=request.site_data,
        )
        recommendations = [RecommendationItem(**item) for item in items]
        return RecommendationsResponse(
            site_id=site_id,
            recommendations=recommendations,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Recommendations failed: {exc}") from exc


# ── Suggest Controls (Hierarchy of Controls) ──────────────────────────────────

@router.post("/suggest-controls", response_model=SuggestControlsResponse)
async def suggest_controls(
    request: SuggestControlsRequest,
    llm: LLMService = Depends(get_llm_service),
) -> SuggestControlsResponse:
    """Suggest controls for a risk using the Hierarchy of Controls (ISO 45001)."""
    try:
        data = await llm.suggest_controls(
            risk_description=request.risk_description,
            hazard_type=request.hazard_type,
            context=request.context,
        )
        return SuggestControlsResponse(**data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Control suggestion failed: {exc}") from exc


# ── Analytics: Pattern Detection ──────────────────────────────────────────────

@router.post("/analytics/patterns", response_model=PatternDetectionResponse)
async def detect_patterns(
    request: PatternDetectionRequest,
    analytics: AnalyticsService = Depends(get_analytics_service),
) -> PatternDetectionResponse:
    """Detect incident patterns, hotspots, and clusters."""
    result = analytics.detect_incident_patterns(request.incidents)
    return PatternDetectionResponse(**result)


# ── Analytics: Site Risk Score ─────────────────────────────────────────────────

@router.post("/analytics/risk-score/{site_id}", response_model=SiteRiskScoreResponse)
async def calculate_site_risk_score(
    site_id: str,
    request: SiteRiskScoreRequest,
    analytics: AnalyticsService = Depends(get_analytics_service),
) -> SiteRiskScoreResponse:
    """Calculate a composite predictive risk score for a site."""
    result = analytics.calculate_risk_score(
        site_id=site_id,
        incidents=request.incidents,
        inspections=request.inspections,
        actions=request.actions,
        period_days=request.period_days,
    )
    return SiteRiskScoreResponse(site_id=site_id, **result)


# ── Analytics: Repeat Issues ───────────────────────────────────────────────────

@router.post("/analytics/repeat-issues", response_model=RepeatIssuesResponse)
async def identify_repeat_issues(
    request: RepeatIssuesRequest,
    analytics: AnalyticsService = Depends(get_analytics_service),
) -> RepeatIssuesResponse:
    """Identify recurring corrective actions indicating systemic failures."""
    result = analytics.identify_repeat_issues(request.actions)
    return RepeatIssuesResponse(**result)


# ── Analytics: KPI Benchmarking ────────────────────────────────────────────────

@router.post("/analytics/benchmark", response_model=BenchmarkResponse)
async def benchmark_kpis(
    request: BenchmarkRequest,
    analytics: AnalyticsService = Depends(get_analytics_service),
) -> BenchmarkResponse:
    """Compare organizational KPIs against industry benchmarks."""
    result = analytics.benchmark_kpis(
        org_data=request.org_data,
        industry_data=request.industry_data,
    )
    return BenchmarkResponse(**result)


# ── KPI Trend Analysis (LangChain 0.3.x LCEL + Ollama 0.4.x) ──────────────────

@router.post("/analyze-kpi-trend", response_model=KpiTrendAnalysisResponse)
async def analyze_kpi_trend(
    request: KpiTrendAnalysisRequest,
    llm: LLMService = Depends(get_llm_service),
) -> KpiTrendAnalysisResponse:
    """Analyze a KPI time-series trend and generate a 30-day predictive alert.

    Uses **LangChain 0.3.x LCEL** (``ChatOllama | StrOutputParser`` chain) and
    the **Ollama Python 0.4.x** attribute-access response model.

    The endpoint:
    1. Computes basic statistics (mean, std, linear slope) on the input series.
    2. Sends all context to the LLM via an LCEL chain (``chain.ainvoke()``).
    3. Returns trend classification, 30-day prediction, alert level and
       an actionable narrative explanation for the site manager.

    Request body:
    - ``site_id``          — site identifier
    - ``kpi_name``         — e.g. ``"TRIR"`` or ``"Cumplimiento de Inspecciones"``
    - ``historical_values``— chronological list of floats (oldest first, ≥3 points)
    - ``period_days``      — number of days the series spans (default 90)

    Response:
    - ``trend``            — ``IMPROVING`` | ``STABLE`` | ``DETERIORATING``
    - ``prediction_30d``   — predicted value 30 days out
    - ``alert_level``      — ``NONE`` | ``LOW`` | ``MEDIUM`` | ``HIGH``
    - ``explanation``      — 2-3 sentence narrative in Spanish
    - ``mean``, ``std``, ``slope``, ``data_points`` — statistical transparency
    """
    try:
        data = await llm.analyze_kpi_trend(
            site_id=request.site_id,
            kpi_name=request.kpi_name,
            historical_values=request.historical_values,
            period_days=request.period_days,
        )
        return KpiTrendAnalysisResponse(
            site_id=request.site_id,
            kpi_name=request.kpi_name,
            **data,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"KPI trend analysis failed: {exc}") from exc
