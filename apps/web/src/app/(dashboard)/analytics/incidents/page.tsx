/**
 * Incident Analysis — Bird pyramid, distribution charts,
 * AI-powered root-cause analysis, and repeat-issues detection.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Brain,
  Loader2,
  Search,
  Flame,
  Repeat,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useIncidentsTrend, useKPIs } from '@/hooks/use-analytics';
import {
  useAnalyzeIncident,
  useDetectPatterns,
  useRepeatIssues,
} from '@/hooks/use-ai';
import { PatternDetectionWidget } from '@/components/ai/PatternDetectionWidget';
import type {
  IncidentAnalysisResponse,
  RepeatIssuesResponse,
} from '@/types/ai';
import { cn } from '@/lib/utils';

// ── Bird Pyramid ───────────────────────────────────────────

const BIRD_LEVELS = [
  { key: 'fatalities', label: 'Fatalidades', ratio: 1, color: 'bg-red-600' },
  { key: 'serious_injuries', label: 'Lesiones Graves', ratio: 10, color: 'bg-red-500' },
  { key: 'minor_injuries', label: 'Lesiones Menores', ratio: 30, color: 'bg-orange-500' },
  { key: 'near_misses', label: 'Cuasi-Accidentes', ratio: 600, color: 'bg-amber-500' },
  { key: 'unsafe_conditions', label: 'Condiciones Inseguras', ratio: 1000, color: 'bg-yellow-500' },
] as const;

function BirdPyramid({ data }: { data: Record<string, number> }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Pirámide de Bird</h3>
      <p className="text-xs text-muted-foreground">
        Distribución de eventos según la relación de Heinrich/Bird
      </p>
      <div className="mt-4 flex flex-col items-center gap-1">
        {BIRD_LEVELS.map((level, i) => {
          const value = data[level.key] ?? 0;
          const widthPct = 30 + i * 15; // 30% → 90%
          return (
            <div
              key={level.key}
              className="relative flex items-center justify-center overflow-hidden rounded"
              style={{ width: `${widthPct}%`, minWidth: 120 }}
            >
              <div
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2',
                  level.color,
                )}
              >
                <span className="text-xs font-medium text-white">{level.label}</span>
                <span className="text-sm font-bold text-white">{value}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Ratio teórica: 1 : 10 : 30 : 600 : 1000
      </p>
    </div>
  );
}

// ── Distribution Chart (simple horizontal bars) ────────────

function DistributionChart({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{item.label}</span>
              <span className="font-mono font-medium text-foreground">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/30">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Root-Cause Card ─────────────────────────────────────

function RootCauseCard({ analysis }: { analysis: IncidentAnalysisResponse }) {
  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Análisis de Causa Raíz (IA)</h3>
        <span
          className={cn(
            'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold',
            analysis.risk_level === 'critical'
              ? 'bg-red-500/10 text-red-500'
              : analysis.risk_level === 'high'
                ? 'bg-orange-500/10 text-orange-500'
                : analysis.risk_level === 'medium'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-green-500/10 text-green-500',
          )}
        >
          {analysis.risk_level}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-red-500">Causas Raíz</p>
          <ul className="space-y-1">
            {analysis.root_causes.map((c, i) => (
              <li key={i} className="text-xs text-foreground">• {c}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-amber-500">Factores Contribuyentes</p>
          <ul className="space-y-1">
            {analysis.contributing_factors.map((f, i) => (
              <li key={i} className="text-xs text-foreground">• {f}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-green-600">Acciones Recomendadas</p>
        <ul className="space-y-1">
          {analysis.long_term_recommendations.map((r, i) => (
            <li key={i} className="text-xs text-foreground">→ {r}</li>
          ))}
        </ul>
      </div>

      {analysis.regulatory_references.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.regulatory_references.map((ref, i) => (
            <span
              key={i}
              className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {ref}
            </span>
          ))}
        </div>
      )}

      <p className="text-right text-[11px] text-muted-foreground">
        Confianza: {(analysis.confidence * 100).toFixed(0)}%
      </p>
    </div>
  );
}

// ── Repeat Issues Card ─────────────────────────────────────

function RepeatIssuesCard({ data }: { data: RepeatIssuesResponse }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Problemas Recurrentes</h3>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-bold',
            data.effectiveness_rate >= 80
              ? 'bg-green-500/10 text-green-500'
              : data.effectiveness_rate >= 60
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-red-500/10 text-red-500',
          )}
        >
          Efectividad: {data.effectiveness_rate}%
        </span>
      </div>

      {data.repeat_issues.map((issue, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div>
            <p className="text-xs font-medium text-foreground">{issue.description}</p>
            <p className="text-[11px] text-muted-foreground">
              Categoría: {issue.root_cause_category} · {issue.overdue_count} vencidas
            </p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500">
            ×{issue.count}
          </span>
        </div>
      ))}

      {data.systemic_failures.length > 0 && (
        <div className="rounded-lg bg-red-500/5 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase text-red-500">Fallas Sistémicas</p>
          {data.systemic_failures.map((sf, i) => (
            <p key={i} className="text-xs text-foreground">⚠ {sf}</p>
          ))}
        </div>
      )}

      {data.recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Recomendaciones</p>
          {data.recommendations.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">→ {r}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function IncidentAnalysisPage() {
  const [incidentDesc, setIncidentDesc] = useState('');

  const { data: kpis } = useKPIs();
  const { data: trend } = useIncidentsTrend(12);

  const analyzeMutation = useAnalyzeIncident();
  const patternsMutation = useDetectPatterns();
  const repeatMutation = useRepeatIssues();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = kpis as any;

  // Build Bird data from KPIs
  const birdData = useMemo(
    () => ({
      fatalities: k?.fatalities ?? 0,
      serious_injuries: k?.serious_injuries ?? 0,
      minor_injuries: k?.minor_injuries ?? 0,
      near_misses: k?.near_misses ?? 0,
      unsafe_conditions: k?.unsafe_conditions ?? 0,
    }),
    [k],
  );

  // Build type distribution from KPIs
  const typeDistribution = useMemo(() => {
    if (!k?.by_type) return [];
    return Object.entries(k.by_type as Record<string, number>).map(([label, value]) => ({
      label,
      value,
    }));
  }, [k]);

  const handleAnalyze = () => {
    if (!incidentDesc.trim()) return;
    analyzeMutation.mutate({
      incident_description: incidentDesc,
      incident_type: 'unknown',
      severity: 'medium',
    });
  };

  const handleDetectPatterns = () => {
    patternsMutation.mutate({ incidents: [], period_days: 90 });
  };

  const handleRepeatIssues = () => {
    repeatMutation.mutate({ actions: [] });
  };

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
            <h1 className="text-2xl font-bold text-foreground">Análisis de Incidentes</h1>
            <p className="text-sm text-muted-foreground">
              Pirámide de Bird, distribución, causa raíz con IA y patrones
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDetectPatterns}
            disabled={patternsMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {patternsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4 text-orange-500" />
            )}
            Detectar Patrones
          </button>
          <button
            onClick={handleRepeatIssues}
            disabled={repeatMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {repeatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Repeat className="h-4 w-4 text-amber-500" />
            )}
            Repetitivos
          </button>
        </div>
      </div>

      {/* Bird Pyramid + Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <BirdPyramid data={birdData} />
        </div>
        <div className="space-y-6 rounded-xl border border-border bg-card p-5">
          {typeDistribution.length > 0 ? (
            <DistributionChart title="Distribución por Tipo" items={typeDistribution} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin datos de distribución por tipo
            </div>
          )}
        </div>
      </div>

      {/* AI Root-Cause Analyzer */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Análisis de Causa Raíz con IA</h3>
        </div>
        <div className="flex gap-2">
          <input
            value={incidentDesc}
            onChange={(e) => setIncidentDesc(e.target.value)}
            placeholder="Describe el incidente para obtener un análisis de causa raíz…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAnalyze}
            disabled={!incidentDesc.trim() || analyzeMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Analizar
          </button>
        </div>
      </div>

      {/* AI Analysis Result */}
      {analyzeMutation.data && <RootCauseCard analysis={analyzeMutation.data} />}

      {/* Pattern Detection Widget */}
      {(patternsMutation.data || patternsMutation.isPending) && (
        <PatternDetectionWidget
          data={patternsMutation.data}
          isLoading={patternsMutation.isPending}
        />
      )}

      {/* Repeat Issues */}
      {repeatMutation.data && <RepeatIssuesCard data={repeatMutation.data} />}
    </div>
  );
}
