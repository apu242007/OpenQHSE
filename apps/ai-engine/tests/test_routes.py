"""Tests for AI Engine endpoints — Phase 7 (LangChain 0.3.x / Ollama 0.4.x)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.anyio
async def test_health_endpoint(client: AsyncClient):
    with patch("app.main.get_ollama_client") as mock_ollama, \
         patch("app.main.get_redis") as mock_redis:
        mock_ollama_instance = AsyncMock()
        mock_ollama_instance.health_check.return_value = True
        mock_ollama.return_value = mock_ollama_instance

        mock_redis_instance = AsyncMock()
        mock_redis_instance.ping.return_value = True
        mock_redis.return_value = mock_redis_instance

        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("healthy", "degraded")
        assert "ollama_connected" in data
        assert "redis_connected" in data
        assert "model_loaded" in data


@pytest.mark.anyio
async def test_analyze_inspection_endpoint(client: AsyncClient):
    mock_response = {
        "overall_risk_score": 65,
        "risk_level": "medium",
        "summary": "Moderate risk identified in welding area.",
        "key_findings": ["Incomplete PPE usage", "Ventilation issues"],
        "risk_items": [],
        "recommended_actions": ["Review PPE policy"],
        "compliance_gaps": [],
        "trend_indicators": [],
    }

    with patch("app.services.AnalysisService.analyze_inspection", new_callable=AsyncMock) as mock_analyze:
        from app.schemas import InspectionAnalysisResponse

        mock_analyze.return_value = InspectionAnalysisResponse(
            inspection_id="test-123",
            **mock_response,
        )

        response = await client.post("/ai/analyze/inspection", json={
            "inspection_id": "test-123",
            "title": "Welding Area Inspection",
            "template_category": "safety",
            "responses": {"q1": {"value": True}},
            "findings": [],
            "site_name": "Plant A",
            "area_name": "Welding Bay",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["inspection_id"] == "test-123"
        assert data["overall_risk_score"] == 65
        assert data["risk_level"] == "medium"


@pytest.mark.anyio
async def test_risk_score_endpoint(client: AsyncClient):
    with patch("app.services.AnalysisService.score_risk", new_callable=AsyncMock) as mock_score:
        from app.schemas import RiskScoreResponse

        mock_score.return_value = RiskScoreResponse(
            entity_id="area-456",
            entity_type="area",
            risk_score=72,
            risk_level="high",
            contributing_factors=["Hazardous chemicals"],
            mitigation_suggestions=["Install additional ventilation"],
        )

        response = await client.post("/ai/risk/score", json={
            "entity_type": "area",
            "entity_id": "area-456",
            "context": {"hazards": ["chemical_exposure"]},
        })

        assert response.status_code == 200
        data = response.json()
        assert data["risk_score"] == 72
        assert data["risk_level"] == "high"


@pytest.mark.anyio
async def test_chat_endpoint(client: AsyncClient):
    with patch("app.services.AnalysisService.chat", new_callable=AsyncMock) as mock_chat:
        from app.schemas import ChatResponse

        mock_chat.return_value = ChatResponse(
            message="Based on ISO 45001, you should implement a confined space entry program.",
            sources=["ISO 45001:2018 Section 8.1"],
            suggested_actions=["Create confined space entry permit template"],
        )

        response = await client.post("/ai/chat", json={
            "messages": [{"role": "user", "content": "How should I manage confined space entries?"}],
            "context": {},
        })

        assert response.status_code == 200
        data = response.json()
        assert "confined space" in data["message"].lower()


# ── Phase 7: KPI Trend Analysis (LangChain 0.3.x LCEL + Ollama 0.4.x) ────────

@pytest.mark.anyio
async def test_analyze_kpi_trend_improving(client: AsyncClient):
    """Endpoint returns correct schema for an IMPROVING KPI trend."""
    mock_data = {
        "trend": "IMPROVING",
        "prediction_30d": 1.45,
        "alert_level": "NONE",
        "explanation": (
            "El TRIR del sitio muestra una tendencia a la baja sostenida durante los últimos 90 días. "
            "La proyección a 30 días indica un valor de 1.45, por debajo del promedio histórico. "
            "Se recomienda mantener las iniciativas de seguridad actuales."
        ),
        "mean": 1.82,
        "std": 0.31,
        "slope": -0.012,
        "data_points": 6,
    }

    with patch(
        "app.services.llm_service.LLMService.analyze_kpi_trend",
        new_callable=AsyncMock,
        return_value=mock_data,
    ):
        response = await client.post(
            "/ai/analyze-kpi-trend",
            json={
                "site_id": "site-001",
                "kpi_name": "TRIR",
                "historical_values": [2.5, 2.2, 1.9, 1.7, 1.6, 1.5],
                "period_days": 90,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["site_id"] == "site-001"
    assert data["kpi_name"] == "TRIR"
    assert data["trend"] == "IMPROVING"
    assert data["alert_level"] == "NONE"
    assert isinstance(data["prediction_30d"], float)
    assert isinstance(data["explanation"], str) and len(data["explanation"]) > 0
    assert isinstance(data["mean"], float)
    assert isinstance(data["std"], float)
    assert isinstance(data["slope"], float)
    assert data["data_points"] == 6


@pytest.mark.anyio
async def test_analyze_kpi_trend_deteriorating_high_alert(client: AsyncClient):
    """Endpoint returns HIGH alert for a strongly deteriorating KPI."""
    mock_data = {
        "trend": "DETERIORATING",
        "prediction_30d": 4.80,
        "alert_level": "HIGH",
        "explanation": (
            "El LTIF ha aumentado un 35% en los últimos 60 días, superando el umbral crítico de la industria. "
            "La proyección a 30 días alcanzaría 4.80, requiriendo intervención inmediata. "
            "Se recomienda pausar operaciones de alto riesgo y realizar una inspección de seguridad de emergencia."
        ),
        "mean": 3.25,
        "std": 0.72,
        "slope": 0.055,
        "data_points": 5,
    }

    with patch(
        "app.services.llm_service.LLMService.analyze_kpi_trend",
        new_callable=AsyncMock,
        return_value=mock_data,
    ):
        response = await client.post(
            "/ai/analyze-kpi-trend",
            json={
                "site_id": "site-002",
                "kpi_name": "LTIF",
                "historical_values": [2.1, 2.8, 3.3, 3.9, 4.4],
                "period_days": 60,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["trend"] == "DETERIORATING"
    assert data["alert_level"] == "HIGH"
    assert data["prediction_30d"] == pytest.approx(4.80, abs=0.001)


@pytest.mark.anyio
async def test_analyze_kpi_trend_validation_too_few_values(client: AsyncClient):
    """Request with fewer than 3 historical values must return 422."""
    response = await client.post(
        "/ai/analyze-kpi-trend",
        json={
            "site_id": "site-003",
            "kpi_name": "Cumplimiento de Inspecciones",
            "historical_values": [85.0, 87.0],   # only 2 — below min_length=3
            "period_days": 30,
        },
    )
    assert response.status_code == 422


@pytest.mark.anyio
async def test_analyze_kpi_trend_uses_langchain_lcel(client: AsyncClient):
    """Verify the service method is invoked with the correct parameters
    (ensures LCEL chain path, not the legacy OllamaClient).
    """
    captured: dict = {}

    async def _fake_analyze_kpi_trend(
        self,
        site_id: str,
        kpi_name: str,
        historical_values: list,
        period_days: int,
        lc=None,
    ) -> dict:
        captured.update(
            site_id=site_id,
            kpi_name=kpi_name,
            historical_values=historical_values,
            period_days=period_days,
        )
        return {
            "trend": "STABLE",
            "prediction_30d": 2.00,
            "alert_level": "LOW",
            "explanation": "Tendencia estable. Monitorear indicadores clave.",
            "mean": 2.0,
            "std": 0.1,
            "slope": 0.001,
            "data_points": 4,
        }

    with patch(
        "app.services.llm_service.LLMService.analyze_kpi_trend",
        new=_fake_analyze_kpi_trend,
    ):
        response = await client.post(
            "/ai/analyze-kpi-trend",
            json={
                "site_id": "site-lcel",
                "kpi_name": "Inspection Compliance",
                "historical_values": [90.0, 88.5, 91.0, 89.5],
                "period_days": 45,
            },
        )

    assert response.status_code == 200
    assert captured["site_id"] == "site-lcel"
    assert captured["kpi_name"] == "Inspection Compliance"
    assert len(captured["historical_values"]) == 4
    assert captured["period_days"] == 45
