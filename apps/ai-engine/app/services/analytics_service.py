"""Analytics Service — pattern detection, risk scoring, and KPI benchmarking."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

# Industry benchmark constants (ICSI / NSC averages for heavy industry)
_INDUSTRY_BENCHMARKS = {
    "trir": {"excellent": 0.5, "good": 1.5, "average": 3.0, "poor": 5.0},
    "ltir": {"excellent": 0.1, "good": 0.5, "average": 1.2, "poor": 2.5},
    "severity_rate": {"excellent": 10, "good": 30, "average": 60, "poor": 100},
    "near_miss_ratio": {"excellent": 10.0, "good": 5.0, "average": 2.0, "poor": 0.5},
    "inspection_compliance": {"excellent": 98, "good": 90, "average": 75, "poor": 60},
    "overdue_action_rate": {"excellent": 2, "good": 10, "average": 20, "poor": 35},
}


class AnalyticsService:
    """Statistical analysis and pattern detection for QHSE data."""

    # ── Incident pattern detection ─────────────────────────────────────────

    def detect_incident_patterns(self, incidents: list[dict]) -> dict:
        """Detect clusters and patterns in incident data.

        Returns:
            {
                patterns: [{pattern_type, description, count, incidents, severity}],
                hotspots: [{area, count, percentage}],
                time_patterns: [{period, count, trend}],
                top_causes: [{cause, count, percentage}],
                repeat_types: [{incident_type, count, last_occurrence}],
                clusters: [{cluster_id, incidents, common_factors}],
                summary: str
            }
        """
        if not incidents:
            return self._empty_pattern_result()

        patterns = []
        hotspots = self._detect_area_hotspots(incidents)
        time_patterns = self._detect_time_patterns(incidents)
        top_causes = self._detect_top_causes(incidents)
        repeat_types = self._detect_repeat_types(incidents)
        clusters = self._cluster_incidents(incidents)

        # Build pattern list from findings
        for hotspot in hotspots[:3]:
            if hotspot["count"] >= 2:
                patterns.append({
                    "pattern_type": "location_hotspot",
                    "description": f"Área crítica: {hotspot['area']} concentra {hotspot['percentage']:.0f}% de incidentes",
                    "count": hotspot["count"],
                    "incidents": [],
                    "severity": "high" if hotspot["percentage"] > 30 else "medium",
                })

        for cause in top_causes[:2]:
            if cause["count"] >= 2:
                patterns.append({
                    "pattern_type": "recurring_cause",
                    "description": f"Causa recurrente: '{cause['cause']}' aparece {cause['count']} veces",
                    "count": cause["count"],
                    "incidents": [],
                    "severity": "high" if cause["count"] >= 3 else "medium",
                })

        for tp in time_patterns:
            if tp.get("trend") == "increasing":
                patterns.append({
                    "pattern_type": "increasing_trend",
                    "description": f"Tendencia creciente en {tp['period']}",
                    "count": tp["count"],
                    "incidents": [],
                    "severity": "medium",
                })

        summary = self._generate_pattern_summary(incidents, patterns, hotspots)
        logger.info("incident_patterns_detected", total_incidents=len(incidents), patterns_found=len(patterns))

        return {
            "patterns": patterns,
            "hotspots": hotspots,
            "time_patterns": time_patterns,
            "top_causes": top_causes,
            "repeat_types": repeat_types,
            "clusters": clusters,
            "summary": summary,
        }

    def _detect_area_hotspots(self, incidents: list[dict]) -> list[dict]:
        area_counts: Counter = Counter()
        for inc in incidents:
            area = inc.get("area") or inc.get("location") or "Sin área"
            area_counts[area] += 1

        total = len(incidents)
        return [
            {"area": area, "count": count, "percentage": count / total * 100}
            for area, count in area_counts.most_common(10)
        ]

    def _detect_time_patterns(self, incidents: list[dict]) -> list[dict]:
        monthly: Counter = Counter()
        for inc in incidents:
            date_str = inc.get("occurred_at") or inc.get("created_at") or ""
            if date_str:
                try:
                    month = date_str[:7]  # "YYYY-MM"
                    monthly[month] += 1
                except Exception:
                    pass

        sorted_months = sorted(monthly.items())
        result = []
        for i, (period, count) in enumerate(sorted_months):
            trend = "stable"
            if i > 0:
                prev = sorted_months[i - 1][1]
                if count > prev * 1.2:
                    trend = "increasing"
                elif count < prev * 0.8:
                    trend = "decreasing"
            result.append({"period": period, "count": count, "trend": trend})
        return result

    def _detect_top_causes(self, incidents: list[dict]) -> list[dict]:
        cause_counts: Counter = Counter()
        for inc in incidents:
            causes = inc.get("immediate_causes") or []
            if isinstance(causes, list):
                for c in causes:
                    cause_counts[str(c)] += 1
            elif inc.get("cause"):
                cause_counts[str(inc["cause"])] += 1

        total = sum(cause_counts.values()) or 1
        return [
            {"cause": cause, "count": count, "percentage": count / total * 100}
            for cause, count in cause_counts.most_common(10)
        ]

    def _detect_repeat_types(self, incidents: list[dict]) -> list[dict]:
        type_data: dict[str, dict] = defaultdict(lambda: {"count": 0, "last": ""})
        for inc in incidents:
            itype = inc.get("incident_type") or inc.get("type") or "Desconocido"
            type_data[itype]["count"] += 1
            date = inc.get("occurred_at") or inc.get("created_at") or ""
            if date > type_data[itype]["last"]:
                type_data[itype]["last"] = date

        return sorted(
            [{"incident_type": k, "count": v["count"], "last_occurrence": v["last"]} for k, v in type_data.items()],
            key=lambda x: x["count"],
            reverse=True,
        )[:10]

    def _cluster_incidents(self, incidents: list[dict]) -> list[dict]:
        """Simple heuristic clustering by area + type combination."""
        cluster_map: dict[str, list] = defaultdict(list)
        for inc in incidents:
            area = inc.get("area") or "N/A"
            itype = inc.get("incident_type") or "N/A"
            key = f"{area}::{itype}"
            cluster_map[key].append(inc.get("id", ""))

        clusters = []
        for i, (key, inc_ids) in enumerate(cluster_map.items()):
            if len(inc_ids) >= 2:
                area, itype = key.split("::", 1)
                clusters.append({
                    "cluster_id": f"C{i + 1:03d}",
                    "incidents": inc_ids,
                    "common_factors": [f"Área: {area}", f"Tipo: {itype}"],
                })
        return clusters

    def _generate_pattern_summary(
        self,
        incidents: list[dict],
        patterns: list[dict],
        hotspots: list[dict],
    ) -> str:
        n = len(incidents)
        hp = hotspots[0]["area"] if hotspots else "N/A"
        hp_pct = hotspots[0]["percentage"] if hotspots else 0
        p_count = len(patterns)
        return (
            f"Análisis de {n} incidentes identificó {p_count} patrones significativos. "
            f"El área '{hp}' concentra {hp_pct:.0f}% de los incidentes. "
            f"Se recomienda intervención prioritaria en las zonas de mayor concentración."
        )

    def _empty_pattern_result(self) -> dict:
        return {
            "patterns": [],
            "hotspots": [],
            "time_patterns": [],
            "top_causes": [],
            "repeat_types": [],
            "clusters": [],
            "summary": "Sin datos suficientes para análisis de patrones.",
        }

    # ── Risk score calculation ─────────────────────────────────────────────

    def calculate_risk_score(
        self,
        site_id: str,
        incidents: list[dict],
        inspections: list[dict],
        actions: list[dict],
        period_days: int = 90,
    ) -> dict:
        """Calculate a composite predictive risk score for a site.

        Returns:
            {
                score: 0–100,
                level: "critical"|"high"|"medium"|"low",
                components: [{name, score, weight, contribution}],
                trend: "improving"|"stable"|"worsening",
                drivers: [str],
                recommended_priority: str
            }
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=period_days)

        # Filter recent data
        recent_incidents = [
            i for i in incidents
            if self._parse_date(i.get("occurred_at") or i.get("created_at") or "") >= cutoff
        ]
        recent_inspections = [
            i for i in inspections
            if self._parse_date(i.get("inspection_date") or i.get("created_at") or "") >= cutoff
        ]
        overdue_actions = [a for a in actions if a.get("status") == "overdue"]

        # Component scores (0=best, 100=worst)
        components = [
            self._score_incident_frequency(recent_incidents, period_days),
            self._score_severity_mix(recent_incidents),
            self._score_inspection_compliance(recent_inspections),
            self._score_overdue_actions(overdue_actions, actions),
            self._score_near_miss_ratio(recent_incidents),
        ]

        total_weight = sum(c["weight"] for c in components)
        composite = sum(c["score"] * c["weight"] for c in components) / total_weight if total_weight else 0

        level = (
            "critical" if composite >= 75
            else "high" if composite >= 55
            else "medium" if composite >= 35
            else "low"
        )

        # Trend: compare last half vs first half of period
        drivers = [c["name"] for c in sorted(components, key=lambda x: x["score"] * x["weight"], reverse=True)[:3]]
        trend = self._calculate_trend(incidents, period_days)

        logger.info("risk_score_calculated", site_id=site_id, score=round(composite), level=level)

        return {
            "score": round(composite),
            "level": level,
            "components": [
                {**c, "contribution": round(c["score"] * c["weight"] / total_weight, 1)}
                for c in components
            ],
            "trend": trend,
            "drivers": drivers,
            "recommended_priority": drivers[0] if drivers else "Sin datos",
        }

    def _score_incident_frequency(self, incidents: list[dict], period_days: int) -> dict:
        rate = len(incidents) / (period_days / 30)  # per month
        score = min(100, rate * 20)  # 5+ incidents/month = 100
        return {"name": "Frecuencia de incidentes", "score": round(score), "weight": 0.30}

    def _score_severity_mix(self, incidents: list[dict]) -> dict:
        severity_weights = {"fatal": 100, "critical": 80, "high": 60, "medium": 30, "low": 10}
        if not incidents:
            return {"name": "Severidad de incidentes", "score": 0, "weight": 0.25}
        scores = [severity_weights.get(i.get("severity") or i.get("risk_level") or "low", 10) for i in incidents]
        avg = sum(scores) / len(scores)
        return {"name": "Severidad de incidentes", "score": round(avg), "weight": 0.25}

    def _score_inspection_compliance(self, inspections: list[dict]) -> dict:
        if not inspections:
            return {"name": "Cumplimiento de inspecciones", "score": 50, "weight": 0.20}
        passed = sum(1 for i in inspections if (i.get("compliance_rate") or 0) >= 80)
        compliance = passed / len(inspections) * 100
        score = max(0, 100 - compliance)  # lower compliance = higher risk
        return {"name": "Cumplimiento de inspecciones", "score": round(score), "weight": 0.20}

    def _score_overdue_actions(self, overdue: list[dict], all_actions: list[dict]) -> dict:
        if not all_actions:
            return {"name": "Acciones vencidas", "score": 0, "weight": 0.15}
        rate = len(overdue) / len(all_actions) * 100
        score = min(100, rate * 2)
        return {"name": "Acciones vencidas", "score": round(score), "weight": 0.15}

    def _score_near_miss_ratio(self, incidents: list[dict]) -> dict:
        near_misses = sum(1 for i in incidents if i.get("incident_type") in ("near_miss", "cuasi_accidente", "near-miss"))
        total = len(incidents)
        if total == 0:
            return {"name": "Ratio cuasi-accidentes", "score": 50, "weight": 0.10}
        ratio = near_misses / total
        # High near-miss ratio is GOOD (people are reporting); inverse scoring
        score = max(0, 100 - ratio * 200)
        return {"name": "Ratio cuasi-accidentes", "score": round(score), "weight": 0.10}

    def _calculate_trend(self, incidents: list[dict], period_days: int) -> str:
        now = datetime.now(timezone.utc)
        mid = now - timedelta(days=period_days // 2)
        cutoff = now - timedelta(days=period_days)

        first_half = sum(1 for i in incidents if cutoff <= self._parse_date(i.get("occurred_at") or "") < mid)
        second_half = sum(1 for i in incidents if self._parse_date(i.get("occurred_at") or "") >= mid)

        if second_half > first_half * 1.2:
            return "worsening"
        if second_half < first_half * 0.8:
            return "improving"
        return "stable"

    def _parse_date(self, date_str: str) -> datetime:
        if not date_str:
            return datetime.min.replace(tzinfo=timezone.utc)
        try:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)

    # ── Repeat issue identification ────────────────────────────────────────

    def identify_repeat_issues(self, actions: list[dict]) -> dict:
        """Identify recurring corrective actions and their root causes.

        Returns:
            {
                repeat_issues: [{description, count, root_cause_category, actions, overdue_count}],
                systemic_failures: [str],
                effectiveness_rate: float,
                recommendations: [str]
            }
        """
        if not actions:
            return {
                "repeat_issues": [],
                "systemic_failures": [],
                "effectiveness_rate": 100.0,
                "recommendations": ["Sin acciones para analizar"],
            }

        # Group by similar descriptions using keyword matching
        category_map: dict[str, list[dict]] = defaultdict(list)
        keywords = {
            "EPP": ["epp", "casco", "guantes", "lentes", "chaleco", "protección personal"],
            "Capacitación": ["capacitación", "entrenamiento", "inducción", "training"],
            "Mantenimiento": ["mantenimiento", "reparación", "revisión", "equipo"],
            "Procedimientos": ["procedimiento", "instructivo", "protocolo", "sop"],
            "Señalización": ["señal", "señalización", "cartel", "aviso", "letrero"],
            "Orden y limpieza": ["orden", "limpieza", "housekeeping", "5s"],
        }

        for action in actions:
            desc = (action.get("description") or action.get("title") or "").lower()
            assigned = False
            for category, kws in keywords.items():
                if any(kw in desc for kw in kws):
                    category_map[category].append(action)
                    assigned = True
                    break
            if not assigned:
                category_map["Otros"].append(action)

        repeat_issues = []
        systemic_failures = []

        for category, acts in category_map.items():
            if len(acts) >= 2:
                overdue = sum(1 for a in acts if a.get("status") == "overdue")
                repeat_issues.append({
                    "description": f"Acciones relacionadas con {category}",
                    "count": len(acts),
                    "root_cause_category": category,
                    "actions": [a.get("id") or a.get("title", "") for a in acts[:5]],
                    "overdue_count": overdue,
                })
                if len(acts) >= 4 or overdue >= 2:
                    systemic_failures.append(
                        f"Falla sistémica en {category}: {len(acts)} acciones recurrentes ({overdue} vencidas)"
                    )

        repeat_issues.sort(key=lambda x: x["count"], reverse=True)

        closed = sum(1 for a in actions if a.get("status") == "closed")
        effectiveness_rate = closed / len(actions) * 100 if actions else 100.0

        recommendations = []
        if effectiveness_rate < 70:
            recommendations.append("Revisar el proceso de cierre de acciones correctivas — efectividad por debajo del 70%")
        for sf in systemic_failures[:3]:
            recommendations.append(f"Atender: {sf}")
        if not recommendations:
            recommendations.append("Mantener el seguimiento actual de acciones correctivas")

        logger.info("repeat_issues_identified", issues=len(repeat_issues), systemic=len(systemic_failures))

        return {
            "repeat_issues": repeat_issues,
            "systemic_failures": systemic_failures,
            "effectiveness_rate": round(effectiveness_rate, 1),
            "recommendations": recommendations,
        }

    # ── KPI benchmarking ──────────────────────────────────────────────────

    def benchmark_kpis(self, org_data: dict, industry_data: dict | None = None) -> dict:
        """Compare organizational KPIs against industry benchmarks.

        Returns:
            {
                benchmarks: [{kpi, org_value, industry_avg, percentile, status, gap}],
                overall_score: 0–100,
                strengths: [str],
                gaps: [str],
                priority_improvements: [str]
            }
        """
        benchmarks_cfg = industry_data or _INDUSTRY_BENCHMARKS
        benchmarks = []
        strengths = []
        gaps = []

        kpi_labels = {
            "trir": "TRIR (Total Recordable Incident Rate)",
            "ltir": "LTIR (Lost Time Incident Rate)",
            "severity_rate": "Índice de Severidad",
            "near_miss_ratio": "Ratio Cuasi-Accidentes/Accidentes",
            "inspection_compliance": "Cumplimiento de Inspecciones (%)",
            "overdue_action_rate": "Tasa de Acciones Vencidas (%)",
        }

        # Lower is better for: trir, ltir, severity_rate, overdue_action_rate
        # Higher is better for: near_miss_ratio, inspection_compliance
        higher_is_better = {"near_miss_ratio", "inspection_compliance"}

        scores = []
        for kpi, thresholds in _INDUSTRY_BENCHMARKS.items():
            org_value = org_data.get(kpi)
            if org_value is None:
                continue

            industry_avg = thresholds.get("average", 0)
            excellent = thresholds.get("excellent", 0)
            poor = thresholds.get("poor", 100)

            if kpi in higher_is_better:
                if org_value >= thresholds["excellent"]:
                    status = "excellent"
                    percentile = 90
                elif org_value >= thresholds["good"]:
                    status = "good"
                    percentile = 70
                elif org_value >= thresholds["average"]:
                    status = "average"
                    percentile = 50
                else:
                    status = "poor"
                    percentile = 25
                gap = org_value - industry_avg
            else:
                if org_value <= thresholds["excellent"]:
                    status = "excellent"
                    percentile = 90
                elif org_value <= thresholds["good"]:
                    status = "good"
                    percentile = 70
                elif org_value <= thresholds["average"]:
                    status = "average"
                    percentile = 50
                else:
                    status = "poor"
                    percentile = 25
                gap = industry_avg - org_value

            benchmarks.append({
                "kpi": kpi_labels.get(kpi, kpi),
                "org_value": round(org_value, 2),
                "industry_avg": round(industry_avg, 2),
                "percentile": percentile,
                "status": status,
                "gap": round(gap, 2),
            })
            scores.append(percentile)

            if status == "excellent":
                strengths.append(f"{kpi_labels.get(kpi, kpi)}: valor {org_value:.2f} (percentil 90+)")
            elif status == "poor":
                gaps.append(f"{kpi_labels.get(kpi, kpi)}: valor {org_value:.2f} vs promedio industria {industry_avg:.2f}")

        overall_score = round(sum(scores) / len(scores)) if scores else 50
        priority_improvements = [
            b["kpi"] for b in sorted(benchmarks, key=lambda x: x["percentile"])[:3]
            if b["status"] in ("poor", "average")
        ]

        logger.info("kpis_benchmarked", overall_score=overall_score, kpis=len(benchmarks))

        return {
            "benchmarks": benchmarks,
            "overall_score": overall_score,
            "strengths": strengths,
            "gaps": gaps,
            "priority_improvements": priority_improvements,
        }


def get_analytics_service() -> AnalyticsService:
    return AnalyticsService()
