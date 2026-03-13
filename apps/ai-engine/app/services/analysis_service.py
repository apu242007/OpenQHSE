"""Legacy AnalysisService — migrated from app/services.py into the services package."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import structlog

from app.core.llm import OllamaClient, get_ollama_client
from app.prompts import (
    CHAT_SYSTEM_PROMPT,
    INSPECTION_ANALYSIS_PROMPT,
    PREDICTIVE_ANALYSIS_PROMPT,
    QHSE_SYSTEM_PROMPT,
    REPORT_GENERATION_PROMPT,
    RISK_SCORING_PROMPT,
)
from app.schemas import (
    ChatRequest,
    ChatResponse,
    InspectionAnalysisRequest,
    InspectionAnalysisResponse,
    PredictiveRequest,
    PredictiveResponse,
    ReportRequest,
    ReportResponse,
    RiskScoreRequest,
    RiskScoreResponse,
)

logger = structlog.get_logger(__name__)


class AnalysisService:
    """Orchestrates LLM calls for QHSE analysis tasks (legacy v1 service)."""

    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or get_ollama_client()

    async def analyze_inspection(self, request: InspectionAnalysisRequest) -> InspectionAnalysisResponse:
        logger.info("analyzing_inspection", inspection_id=request.inspection_id)
        prompt = INSPECTION_ANALYSIS_PROMPT.format(
            title=request.title,
            category=request.template_category,
            site_name=request.site_name,
            area_name=request.area_name,
            responses=json.dumps(request.responses, indent=2, ensure_ascii=False),
            findings=json.dumps(request.findings, indent=2, ensure_ascii=False),
        )
        raw = await self.client.generate(prompt, system=QHSE_SYSTEM_PROMPT)
        data = self._parse_json(raw)
        return InspectionAnalysisResponse(
            inspection_id=request.inspection_id,
            overall_risk_score=data.get("overall_risk_score", 50),
            risk_level=data.get("risk_level", "medium"),
            summary=data.get("summary", ""),
            key_findings=data.get("key_findings", []),
            risk_items=data.get("risk_items", []),
            recommended_actions=data.get("recommended_actions", []),
            compliance_gaps=data.get("compliance_gaps", []),
            trend_indicators=data.get("trend_indicators", []),
        )

    async def score_risk(self, request: RiskScoreRequest) -> RiskScoreResponse:
        logger.info("scoring_risk", entity_type=request.entity_type, entity_id=request.entity_id)
        prompt = RISK_SCORING_PROMPT.format(
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            context=json.dumps(request.context, indent=2, ensure_ascii=False),
        )
        raw = await self.client.generate(prompt, system=QHSE_SYSTEM_PROMPT)
        data = self._parse_json(raw)
        return RiskScoreResponse(
            entity_id=request.entity_id,
            entity_type=request.entity_type,
            risk_score=data.get("risk_score", 50),
            risk_level=data.get("risk_level", "medium"),
            contributing_factors=data.get("contributing_factors", []),
            mitigation_suggestions=data.get("mitigation_suggestions", []),
        )

    async def generate_report(self, request: ReportRequest) -> ReportResponse:
        logger.info("generating_report", report_type=request.report_type)
        prompt = REPORT_GENERATION_PROMPT.format(
            report_type=request.report_type,
            organization_id=request.organization_id,
            date_from=request.date_from,
            date_to=request.date_to,
            site_id=request.site_id or "All sites",
            language=request.language,
            data=json.dumps(request.data, indent=2, ensure_ascii=False),
        )
        content = await self.client.generate(prompt, system=QHSE_SYSTEM_PROMPT, max_tokens=8192)
        report_titles = {
            "executive_summary": "Executive Summary — QHSE Report",
            "inspection_report": "Inspection Summary Report",
            "incident_report": "Incident Analysis Report",
            "trend_analysis": "QHSE Trend Analysis",
        }
        return ReportResponse(
            report_type=request.report_type,
            title=report_titles.get(request.report_type, "QHSE Report"),
            content_markdown=content,
            key_metrics=request.data.get("key_metrics", {}),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    async def predict(self, request: PredictiveRequest) -> PredictiveResponse:
        logger.info("predictive_analysis", analysis_type=request.analysis_type)
        prompt = PREDICTIVE_ANALYSIS_PROMPT.format(
            analysis_type=request.analysis_type,
            organization_id=request.organization_id,
            site_id=request.site_id or "All sites",
            historical_data=json.dumps(request.historical_data, indent=2, ensure_ascii=False),
        )
        raw = await self.client.generate(prompt, system=QHSE_SYSTEM_PROMPT)
        data = self._parse_json(raw)
        return PredictiveResponse(
            analysis_type=request.analysis_type,
            predictions=data.get("predictions", []),
            model_confidence=data.get("model_confidence", 0.5),
            data_quality_score=data.get("data_quality_score", 0.5),
        )

    async def chat(self, request: ChatRequest) -> ChatResponse:
        logger.info("chat_request", message_count=len(request.messages))
        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
        if request.context:
            messages.append({"role": "system", "content": f"Context: {json.dumps(request.context, ensure_ascii=False)}"})
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        response = await self.client.chat(messages)
        return ChatResponse(message=response, sources=[], suggested_actions=[])

    @staticmethod
    def _parse_json(raw: str) -> dict:  # type: ignore[type-arg]
        text = raw.strip()
        if text.startswith("```"):
            lines, inside, json_lines = text.split("\n"), False, []
            for line in lines:
                if line.strip().startswith("```") and not inside:
                    inside = True
                    continue
                if line.strip() == "```" and inside:
                    break
                if inside:
                    json_lines.append(line)
            text = "\n".join(json_lines)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start, end = text.find("{"), text.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
            return {}


def get_analysis_service() -> AnalysisService:
    return AnalysisService()
