/**
 * Predictive Analytics — risk prediction gauge, site risk score,
 * AI recommendations, and proactive alerts.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  Brain,
  Loader2,
  Shield,
  Zap,
  MapPin,
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Target,
} from 'lucide-react';
import { useKPIs, useActionsSummary } from '@/hooks/use-analytics';
import {
  usePredictRisk,
  useSiteRiskScore,
  useRecommendations,
  useSuggestControls,
} from '@/hooks/use-ai';
import { AIPredictionCard } from '@/components/ai/AIPredictionCard';
import type {
  SiteRiskScoreResponse,
  RecommendationsResponse,
  RecommendationItem,
} from '@/types/ai';
import { cn } from '@/lib/utils';

// ── Risk Score Gauge ───────────────────────────────────────

function RiskScorePanel({ data }: { data: SiteRiskScoreResponse }) {
  const levelConfig = {
    low: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Bajo' },
    medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Medio' },
    high: { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Alto' },
    critical: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Crítico' },
  };
  const cfg = levelConfig[data.level] ?? levelConfig.low;

  const trendIcons = {
    improving: { icon: '↓', color: 'text-green-500', label: 'Mejorando' },
    stable: { icon: '→', color: 'text-muted-foreground', label: 'Estable' },
    worsening: { icon: '↑', color: 'text-red-500', label: 'Empeorando' },
  };
  const tr = trendIcons[data.trend] ?? trendIcons.stable;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Risk Score del Sitio</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', tr.color)}>
            {tr.icon} {tr.label}
          </span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Score display */}
      <div className="mb-6 flex items-end justify-center gap-1">
        <span className={cn('text-5xl font-bold', cfg.color)}>{data.score}</span>
        <span className="mb-1 text-sm text-muted-foreground">/ 100</span>
      </div>

      {/* Score bar */}
      <div className="mb-6 h-3 rounded-full bg-muted/30">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', {
            'bg-green-500': data.score < 35,
            'bg-amber-500': data.score >= 35 && data.score < 55,
            'bg-orange-500': data.score >= 55 && data.score < 75,
            'bg-red-500': data.score >= 75,
          })}
          style={{ width: `${data.score}%` }}
        />
      </div>

      {/* Components */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Componentes
        </h4>
        {data.components.map((comp, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{comp.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{comp.score}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({(comp.contribution * 10).toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30">
              <div
                className={cn('h-full rounded-full transition-all duration-700', {
                  'bg-green-500': comp.score < 35,
                  'bg-amber-500': comp.score >= 35 && comp.score < 55,
                  'bg-orange-500': comp.score >= 55 && comp.score < 75,
                  'bg-red-500': comp.score >= 75,
                })}
                style={{ width: `${comp.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Drivers */}
      {data.drivers.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Principales drivers de riesgo
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {data.drivers.map((d, i) => (
              <span
                key={i}
                className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-500"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recommendations List ───────────────────────────────────

function RecommendationsList({ data }: { data: RecommendationsResponse }) {
  const priorityColors = {
    critical: 'border-red-500/30 bg-red-500/5',
    high: 'border-orange-500/30 bg-orange-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    low: 'border-green-500/30 bg-green-500/5',
  };
  const priorityLabels = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
  const priorityTextColors = { critical: 'text-red-500', high: 'text-orange-500', medium: 'text-amber-500', low: 'text-green-500' };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Recomendaciones Proactivas</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Foco: {data.priority_focus}
        </span>
      </div>
      <div className="space-y-3">
        {data.recommendations.map((rec, i) => (
          <div
            key={i}
            className={cn('rounded-lg border p-3', priorityColors[rec.priority])}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{rec.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{rec.description}</p>
              </div>
              <span className={cn('shrink-0 text-xs font-bold', priorityTextColors[rec.priority])}>
                {priorityLabels[rec.priority]}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Categoría: {rec.category}</span>
              <span>Impacto: {rec.estimated_impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function PredictiveAnalyticsPage() {
  const [siteId] = useState('default');

  const { data: kpis } = useKPIs();
  const { data: actions } = useActionsSummary();

  const predictMutation = usePredictRisk();
  const riskScoreMutation = useSiteRiskScore(siteId);
  const recommendationsMutation = useRecommendations(siteId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = kpis as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = actions as any;

  const handleRunPredictions = () => {
    // Run all predictive models
    predictMutation.mutate({
      site_id: siteId,
      recent_incidents: k?.total_incidents ?? 0,
      near_misses: k?.near_misses ?? 0,
      open_actions: a?.open ?? 0,
      overdue_actions: a?.overdue ?? 0,
      last_inspection_days: k?.days_since_last_inspection ?? 7,
      workforce_size: k?.workforce_size ?? 100,
      high_risk_activities: [],
    });

    riskScoreMutation.mutate({
      incidents: [],
      inspections: [],
      actions: [],
      overdue_actions: [],
      period_days: 90,
    });

    recommendationsMutation.mutate({
      site_id: siteId,
      recent_incidents: k?.total_incidents ?? 0,
      open_findings: k?.open_findings ?? 0,
      overdue_actions: a?.overdue ?? 0,
      inspection_compliance: k?.inspection_compliance ?? 80,
      training_compliance: k?.training_compliance ?? 85,
    });
  };

  const isLoading =
    predictMutation.isPending || riskScoreMutation.isPending || recommendationsMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/analytics"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analítica Predictiva</h1>
            <p className="text-sm text-muted-foreground">
              Predicción de riesgos, puntuación de sitio y recomendaciones proactivas
            </p>
          </div>
        </div>
        <button
          onClick={handleRunPredictions}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Ejecutar Modelos Predictivos
        </button>
      </div>

      {/* Status alerts */}
      {!predictMutation.data && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <TrendingUp className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            Presiona &quot;Ejecutar Modelos Predictivos&quot; para obtener predicciones basadas en IA
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Los modelos analizan incidentes recientes, inspecciones y acciones correctivas
          </p>
        </div>
      )}

      {/* Prediction + Risk Score */}
      {(predictMutation.data || riskScoreMutation.data || isLoading) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AIPredictionCard
            data={predictMutation.data}
            isLoading={predictMutation.isPending}
            title="Predicción de Accidentes"
          />
          {riskScoreMutation.data ? (
            <RiskScorePanel data={riskScoreMutation.data} />
          ) : riskScoreMutation.isPending ? (
            <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Calculando risk score…</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Recommendations */}
      {recommendationsMutation.data && (
        <RecommendationsList data={recommendationsMutation.data} />
      )}

      {/* Info Card */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 text-violet-500" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">¿Cómo funciona?</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Los modelos predictivos de OpenQHSE combinan datos históricos de incidentes,
              cumplimiento de inspecciones, acciones correctivas vencidas y reportes de
              cuasi-accidentes para calcular una probabilidad de accidente y un risk score
              compuesto. Las recomendaciones priorizan las áreas de mayor impacto usando
              análisis de jerarquía de controles (eliminación → sustitución → ingeniería →
              administrativo → EPP).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
