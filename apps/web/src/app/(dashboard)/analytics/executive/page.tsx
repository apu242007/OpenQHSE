/**
 * Executive Report — AI-generated narrative report with KPIs,
 * period selector, strengths / concerns, and PDF export.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Brain,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  useKPIs,
  useIncidentsTrend,
  useInspectionsCompliance,
  useActionsSummary,
} from '@/hooks/use-analytics';
import { useGenerateReport, useBenchmarkKpis } from '@/hooks/use-ai';
import type { ExecutiveReportResponse, BenchmarkResponse } from '@/types/ai';
import { cn } from '@/lib/utils';

const PERIODS = [
  { label: 'Último mes', value: 'monthly' },
  { label: 'Último trimestre', value: 'quarterly' },
  { label: 'Último semestre', value: 'semi-annual' },
  { label: 'Último año', value: 'annual' },
] as const;

// ── Sub-components ─────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function BenchmarkTable({ data }: { data: BenchmarkResponse }) {
  const statusColors = {
    excellent: 'text-green-500 bg-green-500/10',
    good: 'text-blue-500 bg-blue-500/10',
    average: 'text-amber-500 bg-amber-500/10',
    poor: 'text-red-500 bg-red-500/10',
  };

  const statusLabels = {
    excellent: 'Excelente',
    good: 'Bueno',
    average: 'Promedio',
    poor: 'Deficiente',
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">KPI</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Organización</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Industria</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Percentil</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.benchmarks.map((b, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-foreground">{b.kpi}</td>
              <td className="px-4 py-3 text-center font-mono font-medium">{b.org_value}</td>
              <td className="px-4 py-3 text-center font-mono text-muted-foreground">{b.industry_avg}</td>
              <td className="px-4 py-3 text-center">
                <div className="mx-auto h-2 w-16 rounded-full bg-muted/30">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${b.percentile}%` }}
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusColors[b.status])}>
                  {statusLabels[b.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function ExecutiveReportPage() {
  const [period, setPeriod] = useState<string>('quarterly');

  const { data: kpis } = useKPIs();
  const { data: trend } = useIncidentsTrend(6);
  const { data: inspections } = useInspectionsCompliance();
  const { data: actions } = useActionsSummary();

  const reportMutation = useGenerateReport();
  const benchmarkMutation = useBenchmarkKpis();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = kpis as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = actions as any;

  const report = reportMutation.data;
  const benchmark = benchmarkMutation.data;

  const handleGenerate = () => {
    reportMutation.mutate({
      period,
      kpis: {
        trir: k?.trir ?? 0,
        ltir: k?.ltir ?? 0,
        total_incidents: k?.total_incidents ?? 0,
        inspections_completed: k?.inspections_completed ?? 0,
      },
      incidents_summary: {
        total: k?.total_incidents ?? 0,
        near_misses: k?.near_misses ?? 0,
        fatalities: k?.fatalities ?? 0,
      },
      inspections_summary: {
        total: (inspections as Record<string, number>)?.total ?? 0,
        completed: (inspections as Record<string, number>)?.completed ?? 0,
        compliance_rate: (inspections as Record<string, number>)?.compliance_rate ?? 0,
      },
      actions_summary: {
        total: a?.total ?? 0,
        open: a?.open ?? 0,
        overdue: a?.overdue ?? 0,
        closed: a?.closed ?? 0,
      },
    });

    benchmarkMutation.mutate({
      org_data: {
        trir: k?.trir ?? 0,
        ltir: k?.ltir ?? 0,
        near_miss_ratio: k?.near_miss_ratio ?? 0,
        inspection_compliance: (inspections as Record<string, number>)?.compliance_rate ?? 0,
        overdue_action_rate: a?.total ? (a?.overdue ?? 0) / a.total * 100 : 0,
      },
    });
  };

  const isGenerating = reportMutation.isPending || benchmarkMutation.isPending;

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
            <h1 className="text-2xl font-bold text-foreground">Reporte Ejecutivo</h1>
            <p className="text-sm text-muted-foreground">
              Resumen gerencial generado por IA con análisis de KPIs y benchmarking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-lg border border-border bg-card">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg',
                  period === p.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="TRIR"
          value={k?.trir != null ? Number(k.trir).toFixed(2) : '—'}
          subtitle="Total Recordable Incident Rate"
          icon={BarChart3}
          color="text-blue-500"
        />
        <StatCard
          label="Incidentes"
          value={k?.total_incidents ?? '—'}
          subtitle="Período seleccionado"
          icon={AlertTriangle}
          color="text-red-500"
        />
        <StatCard
          label="Acciones Abiertas"
          value={a?.open ?? '—'}
          subtitle={`${a?.overdue ?? 0} vencidas`}
          icon={TrendingUp}
          color="text-amber-500"
        />
        <StatCard
          label="Cumplimiento"
          value={
            (inspections as Record<string, number>)?.compliance_rate != null
              ? `${Number((inspections as Record<string, number>).compliance_rate).toFixed(0)}%`
              : '—'
          }
          subtitle="Inspecciones"
          icon={CheckCircle2}
          color="text-green-500"
        />
      </div>

      {/* Report Content */}
      {report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Resumen Ejecutivo</h2>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {report.executive_summary}
            </p>
          </div>

          {/* Achievements & Concerns */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h3 className="text-sm font-semibold text-foreground">Logros Clave</h3>
              </div>
              <ul className="space-y-2">
                {report.key_achievements.map((ach, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1 text-green-500">✓</span>
                    {ach}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-semibold text-foreground">Áreas de Preocupación</h3>
              </div>
              <ul className="space-y-2">
                {report.areas_of_concern.map((area, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1 text-red-500">⚠</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Risk Outlook & KPI Analysis */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Perspectiva de Riesgo</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{report.risk_outlook}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Análisis de KPIs</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{report.kpi_analysis}</p>
            </div>
          </div>

          {/* Trend Analysis */}
          {report.trend_analysis && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Análisis de Tendencias</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {report.trend_analysis}
              </p>
            </div>
          )}

          {/* Recommendations */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Recomendaciones de IA</h3>
            </div>
            <ol className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Benchmark Table */}
      {benchmark && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Benchmarking de KPIs</h2>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-sm font-bold',
                benchmark.overall_score >= 70
                  ? 'bg-green-500/10 text-green-500'
                  : benchmark.overall_score >= 50
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-red-500/10 text-red-500',
              )}
            >
              Score: {benchmark.overall_score}/100
            </span>
          </div>
          <BenchmarkTable data={benchmark} />

          {/* Strengths & Gaps */}
          {(benchmark.strengths.length > 0 || benchmark.gaps.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {benchmark.strengths.length > 0 && (
                <div className="rounded-xl border border-green-500/20 bg-card p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-green-500">Fortalezas</h4>
                  <ul className="space-y-1">
                    {benchmark.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">✓ {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {benchmark.gaps.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-card p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-red-500">Brechas</h4>
                  <ul className="space-y-1">
                    {benchmark.gaps.map((g, i) => (
                      <li key={i} className="text-xs text-muted-foreground">⚠ {g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!report && !isGenerating && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Brain className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            Selecciona el período y presiona &quot;Generar Reporte&quot; para obtener un análisis ejecutivo con IA
          </p>
        </div>
      )}
    </div>
  );
}
