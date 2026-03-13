"""LLM Service — high-level wrappers for every AI task in OpenQHSE."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import structlog

from app.core.llm import LangChainLLM, OllamaClient, get_langchain_llm, get_ollama_client
from app.prompts import KPI_TREND_ANALYSIS_PROMPT

logger = structlog.get_logger(__name__)

# ── System prompt shared by all tasks ────────────────────────────────────────

_QHSE_SYSTEM = """You are an expert QHSE (Quality, Health, Safety & Environment) analyst for
heavy industry (oil & gas, mining, construction, manufacturing).
Your expertise covers ISO 45001, ISO 14001, ISO 9001, OSHA regulations,
root-cause analysis (5-Why, Fishbone, Bow-Tie), HAZOP, FMEA, JSA and
incident investigation best practices.
Always provide specific, actionable recommendations grounded in industry standards.
Respond in the same language as the input data. Default to Spanish if unclear.
Return ONLY valid JSON when a JSON structure is requested — no extra text, no markdown fences."""


class LLMService:
    """Orchestrates all LLM-powered QHSE analysis operations."""

    def __init__(self, client: OllamaClient | None = None) -> None:
        self.client = client or get_ollama_client()

    # ── Root-cause analysis ────────────────────────────────────────────────

    async def analyze_incident_root_cause(
        self,
        incident: dict,  # type: ignore[type-arg]
        historical_incidents: list[dict],  # type: ignore[type-arg]
    ) -> dict:  # type: ignore[type-arg]
        """Analyze root causes of an incident using historical context.

        Returns:
            {
                immediate_causes: [str],
                root_causes: [str],
                contributing_factors: [str],
                recommendations: [str],
                similar_incidents: [{id, title, similarity_reason}],
                risk_level: "critical"|"high"|"medium"|"low",
                preventability_score: 0–100,
                investigation_summary: str
            }
        """
        prompt = f"""Analyze the following workplace incident and identify root causes.

INCIDENT:
{json.dumps(incident, indent=2, ensure_ascii=False)}

SIMILAR HISTORICAL INCIDENTS (last 24 months):
{json.dumps(historical_incidents[:10], indent=2, ensure_ascii=False)}

Provide a structured root-cause analysis following the Bow-Tie methodology.
Return a JSON object with this exact structure:
{{
  "immediate_causes": ["<cause>"],
  "root_causes": ["<cause>"],
  "contributing_factors": ["<factor>"],
  "recommendations": ["<action with owner and deadline type>"],
  "similar_incidents": [{{"id": "<id>", "title": "<title>", "similarity_reason": "<why similar>"}}],
  "risk_level": "critical|high|medium|low",
  "preventability_score": <0-100>,
  "investigation_summary": "<2-3 sentence narrative>"
}}"""

        raw = await self.client.generate(prompt, system=_QHSE_SYSTEM)
        data = _parse_json(raw)
        logger.info("incident_root_cause_analyzed", incident_id=incident.get("id"))
        return data

    # ── Accident probability prediction ───────────────────────────────────

    async def predict_accident_probability(
        self,
        site_id: str,
        area: str,
        period_days: int,
        historical_data: dict,  # type: ignore[type-arg]
    ) -> dict:  # type: ignore[type-arg]
        """Predict accident probability for a site/area over a given period.

        Returns:
            {
                probability: 0.0–1.0,
                confidence: 0.0–1.0,
                risk_factors: [{factor, weight, trend}],
                preventive_measures: [str],
                risk_level: str,
                predicted_incident_types: [str],
                comparison_to_industry: str
            }
        """
        prompt = f"""Based on the following QHSE historical data, predict the probability of
a workplace accident occurring in the next {period_days} days.

SITE ID: {site_id}
AREA: {area}
HISTORICAL DATA:
{json.dumps(historical_data, indent=2, ensure_ascii=False)}

Consider:
- Incident frequency trends
- Near-miss rates (Bird's Triangle)
- Inspection compliance gaps
- Overdue corrective actions
- Seasonal/operational factors

Return a JSON object:
{{
  "probability": <0.0-1.0>,
  "confidence": <0.0-1.0>,
  "risk_factors": [
    {{"factor": "<name>", "weight": <0.0-1.0>, "trend": "increasing|stable|decreasing"}}
  ],
  "preventive_measures": ["<measure>"],
  "risk_level": "critical|high|medium|low",
  "predicted_incident_types": ["<type>"],
  "comparison_to_industry": "<benchmark comparison>"
}}"""

        raw = await self.client.generate(prompt, system=_QHSE_SYSTEM)
        data = _parse_json(raw)
        logger.info("accident_probability_predicted", site_id=site_id, area=area)
        return data

    # ── Finding severity classification ───────────────────────────────────

    async def classify_finding_severity(
        self,
        finding_description: str,
        context: dict,  # type: ignore[type-arg]
    ) -> dict:  # type: ignore[type-arg]
        """Classify the severity of an inspection finding.

        Returns:
            {
                severity: "critical"|"major"|"minor"|"observation",
                justification: str,
                regulatory_reference: str,
                recommended_action: str,
                deadline_days: int,
                requires_immediate_shutdown: bool
            }
        """
        prompt = f"""Classify the severity of the following QHSE finding.

FINDING: {finding_description}

CONTEXT:
{json.dumps(context, indent=2, ensure_ascii=False)}

Apply ISO 45001 and OSHA severity classification criteria.
Return a JSON object:
{{
  "severity": "critical|major|minor|observation",
  "justification": "<reasoning>",
  "regulatory_reference": "<specific standard/regulation>",
  "recommended_action": "<corrective action>",
  "deadline_days": <int>,
  "requires_immediate_shutdown": <true|false>
}}"""

        raw = await self.client.generate(prompt, system=_QHSE_SYSTEM)
        data = _parse_json(raw)
        logger.info("finding_severity_classified", severity=data.get("severity"))
        return data

    # ── Executive report generation ────────────────────────────────────────

    async def generate_executive_report(
        self,
        kpi_data: dict,  # type: ignore[type-arg]
        incidents: list[dict],  # type: ignore[type-arg]
        actions: list[dict],  # type: ignore[type-arg]
        period: str,
        language: str = "es",
    ) -> str:
        """Generate a professional narrative executive report in Markdown.

        Returns Markdown-formatted text suitable for PDF rendering.
        """
        prompt = f"""Generate a professional QHSE executive report for the following period: {period}.
Language: {'Spanish' if language == 'es' else 'English'}

KPI SUMMARY:
{json.dumps(kpi_data, indent=2, ensure_ascii=False)}

INCIDENTS SUMMARY ({len(incidents)} total):
{json.dumps(incidents[:5], indent=2, ensure_ascii=False)}

CORRECTIVE ACTIONS ({len(actions)} open):
{json.dumps(actions[:5], indent=2, ensure_ascii=False)}

Write a structured executive report in Markdown with these sections:
## Resumen Ejecutivo
## Indicadores Clave de Desempeño
## Análisis de Incidentes
## Estado de Acciones Correctivas
## Tendencias y Alertas
## Recomendaciones Prioritarias
## Conclusión

Use specific numbers, percentages, and trends. Be concise, professional and actionable.
Target audience: C-suite / site directors. Max 800 words."""

        report = await self.client.generate(
            prompt, system=_QHSE_SYSTEM, max_tokens=8192, use_cache=False
        )
        logger.info("executive_report_generated", period=period)
        return report

    # ── Safety chatbot ────────────────────────────────────────────────────

    async def safety_chat(
        self,
        user_message: str,
        org_context: dict,  # type: ignore[type-arg]
        conversation_history: list[dict],  # type: ignore[type-arg]
    ) -> str:
        """Interactive QHSE assistant with access to org data.

        Answers questions like:
        - "¿Cuáles son nuestros 3 riesgos más críticos?"
        - "¿Qué áreas tienen más incidentes este año?"
        - "¿Qué acciones correctivas están vencidas?"
        """
        context_summary = f"""
Datos de la organización (últimos 30 días):
- Incidentes: {org_context.get('incident_count', 0)} ({org_context.get('open_incidents', 0)} abiertos)
- Inspecciones: {org_context.get('inspection_compliance', 0)}% cumplimiento
- Acciones vencidas: {org_context.get('overdue_actions', 0)}
- TRIR: {org_context.get('trir', 0):.2f}
- Área con más incidentes: {org_context.get('top_incident_area', 'N/A')}
- Riesgos críticos: {org_context.get('critical_risks', 0)}
- Certificaciones vencidas: {org_context.get('expired_certifications', 0)}
"""

        system = f"""{_QHSE_SYSTEM}

Tienes acceso a los datos reales de la organización:
{context_summary}

Cuando respondas:
1. Cita datos reales de la organización con "Según los datos de tu organización..."
2. Sé conciso (máx 3 párrafos)
3. Termina con 1-2 acciones concretas recomendadas
4. Si no tienes datos suficientes, indícalo claramente"""

        messages = [{"role": "system", "content": system}]
        for msg in conversation_history[-10:]:  # keep last 10 turns
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        response = await self.client.chat(messages)
        logger.info("safety_chat_response", message_preview=user_message[:50])
        return response

    # ── Control suggestions ───────────────────────────────────────────────

    async def suggest_controls(
        self,
        risk_description: str,
        hazard_type: str,
        context: dict,  # type: ignore[type-arg]
    ) -> dict:  # type: ignore[type-arg]
        """Suggest controls for a risk using the Hierarchy of Controls.

        Returns:
            {
                elimination: [str],
                substitution: [str],
                engineering: [str],
                administrative: [str],
                ppe: [str],
                effectiveness_rating: str,
                regulatory_basis: str
            }
        """
        prompt = f"""Suggest specific controls for the following QHSE risk using the
Hierarchy of Controls (ISO 45001 Annex A).

RISK: {risk_description}
HAZARD TYPE: {hazard_type}
CONTEXT:
{json.dumps(context, indent=2, ensure_ascii=False)}

Return a JSON object with controls at each level:
{{
  "elimination": ["<measure>"],
  "substitution": ["<measure>"],
  "engineering": ["<measure>"],
  "administrative": ["<measure>"],
  "ppe": ["<required PPE>"],
  "effectiveness_rating": "high|medium|low",
  "regulatory_basis": "<ISO/OSHA references>",
  "implementation_priority": "immediate|short_term|long_term"
}}"""

        raw = await self.client.generate(prompt, system=_QHSE_SYSTEM)
        data = _parse_json(raw)
        logger.info("controls_suggested", hazard_type=hazard_type)
        return data

    # ── Proactive recommendations ─────────────────────────────────────────

    async def get_proactive_recommendations(
        self,
        site_id: str,
        site_data: dict,  # type: ignore[type-arg]
    ) -> list[dict]:  # type: ignore[type-arg]
        """Generate proactive weekly safety recommendations for a site.

        Returns:
            [{ category, title, description, priority, action_items, data_basis }]
        """
        prompt = f"""Based on the following site QHSE data, generate 5 proactive
safety recommendations for the next 7 days.

SITE: {site_id}
DATA:
{json.dumps(site_data, indent=2, ensure_ascii=False)}

Focus on:
- Leading indicators (near-misses, observations)
- Recurring patterns
- Seasonal/operational risks
- Overdue preventive actions

Return a JSON array of recommendations:
[
  {{
    "category": "<category>",
    "title": "<concise title>",
    "description": "<detailed description>",
    "priority": "critical|high|medium|low",
    "action_items": ["<specific action>"],
    "data_basis": "<what data supports this recommendation>"
  }}
]"""

        raw = await self.client.generate(prompt, system=_QHSE_SYSTEM)
        data = _parse_json(raw)
        if isinstance(data, list):
            return data
        return data.get("recommendations", [])
    # ── KPI trend analysis (LangChain 0.3.x LCEL) ────────────────────────────

    async def analyze_kpi_trend(
        self,
        site_id: str,
        kpi_name: str,
        historical_values: list[float],
        period_days: int,
        lc: LangChainLLM | None = None,
    ) -> dict:  # type: ignore[type-arg]
        """Analyze a KPI time-series trend and generate a 30-day predictive alert.

        Uses LangChain 0.3.x LCEL (``ChatOllama | StrOutputParser``) instead of
        the legacy ``OllamaClient.generate()`` to demonstrate the updated API.

        Args:
            site_id:           Site identifier.
            kpi_name:          Human-readable KPI name (e.g. 'TRIR', 'LTIF').
            historical_values: Chronological list of KPI observations (oldest first).
            period_days:       Number of days covered by the series.
            lc:                Optional ``LangChainLLM`` instance (injected in tests).

        Returns:
            {{
                trend:         "IMPROVING" | "STABLE" | "DETERIORATING",
                prediction_30d: float,
                alert_level:   "NONE" | "LOW" | "MEDIUM" | "HIGH",
                explanation:   str,
                mean:          float,
                std:           float,
                slope:         float,
                data_points:   int,
            }}
        """
        arr = np.array(historical_values, dtype=float)
        n = len(arr)
        x = np.arange(n, dtype=float)

        # Linear regression via least squares
        slope: float
        if n >= 2:
            coeffs = np.polyfit(x, arr, 1)
            slope = float(coeffs[0])
        else:
            slope = 0.0

        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))
        last_val = float(arr[-1])
        min_val = float(np.min(arr))
        max_val = float(np.max(arr))

        lc_client = lc or get_langchain_llm()

        # KPI_TREND_ANALYSIS_PROMPT uses plain {var} template variables so that
        # LangChain 0.3.x ChatPromptTemplate can parse them correctly.
        # Numeric stats are pre-formatted as strings to avoid format-spec issues.
        raw = await lc_client.ainvoke(
            system=_QHSE_SYSTEM,
            human_template=KPI_TREND_ANALYSIS_PROMPT,
            variables={
                "kpi_name": kpi_name,
                "site_id": site_id,
                "period_days": str(period_days),
                "historical_values": ", ".join(f"{v:.4f}" for v in historical_values),
                "mean_str": f"{mean_val:.4f}",
                "std_str": f"{std_val:.4f}",
                "slope_str": f"{slope:.6f}",
                "last_value_str": f"{last_val:.4f}",
                "min_value_str": f"{min_val:.4f}",
                "max_value_str": f"{max_val:.4f}",
            },
            use_cache=True,
        )

        data = _parse_json(raw)

        # Merge statistical context into the response so callers get full
        # transparency without an extra round-trip.
        data.setdefault("trend", "STABLE")
        data.setdefault("prediction_30d", round(last_val + slope * 30, 4))
        data.setdefault("alert_level", "NONE")
        data.setdefault("explanation", "")
        data["mean"] = round(mean_val, 4)
        data["std"] = round(std_val, 4)
        data["slope"] = round(slope, 6)
        data["data_points"] = n

        logger.info(
            "kpi_trend_analyzed",
            site_id=site_id,
            kpi_name=kpi_name,
            trend=data["trend"],
            alert_level=data["alert_level"],
        )
        return data

# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict:  # type: ignore[type-arg]
    """Robustly extract JSON from LLM output."""
    text = raw.strip()
    # Strip markdown fences
    if text.startswith("```"):
        inside = False
        lines = []
        for line in text.split("\n"):
            if line.strip().startswith("```") and not inside:
                inside = True
                continue
            if line.strip() == "```" and inside:
                break
            if inside:
                lines.append(line)
        text = "\n".join(lines)

    try:
        return json.loads(text)  # type: ignore[return-value]
    except json.JSONDecodeError:
        # Try to find first JSON object or array
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = text.find(start_char)
            end = text.rfind(end_char) + 1
            if start != -1 and end > start:
                try:
                    return json.loads(text[start:end])  # type: ignore[return-value]
                except json.JSONDecodeError:
                    pass
    logger.warning("llm_json_parse_failed", raw_preview=text[:200])
    return {}


def get_llm_service() -> LLMService:
    return LLMService()
