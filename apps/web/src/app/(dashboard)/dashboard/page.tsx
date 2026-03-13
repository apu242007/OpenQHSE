'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ClipboardCheck,
  Target,
  FileKey,
  ShieldAlert,
  GraduationCap,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  ExternalLink,
  Bell,
  BellOff,
  CheckCircle2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient as useQC } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores';
import { cn, formatDate } from '@/lib/utils';
import {
  useKPIs,
  useIncidentsTrend,
  useInspectionsCompliance,
  useRiskMatrix,
  useWidgets,
} from '@/hooks/use-analytics';

// ── Types ──────────────────────────────────────────────────

interface KPIVariation {
  value: number;
  previous: number;
  variation_pct: number;
  trend: 'up' | 'down' | 'stable';
}

interface KPIsSummary {
  trir: KPIVariation;
  ltif: KPIVariation;
  inspections_completed: number;
  inspections_scheduled: number;
  inspections_compliance_pct: number;
  overdue_actions: number;
  open_incidents: number;
  active_permits: number;
  safety_score: number;
}

interface IncidentTrendPoint {
  month: string;
  label: string;
  total: number;
  near_miss: number;
  first_aid: number;
  lost_time: number;
  fatality: number;
}

interface IncidentsByType {
  type: string;
  label: string;
  count: number;
  color: string;
}

interface WeeklyCompliance {
  week: string;
  label: string;
  scheduled: number;
  completed: number;
  compliance_pct: number;
}

interface RiskMatrixCell {
  likelihood: number;
  consequence: number;
  count: number;
  level: string;
  risk_ids: string[];
}

interface OverdueAction {
  id: string;
  title: string;
  responsible: string;
  due_date: string;
  days_overdue: number;
  priority: string;
  source_type: string;
  source_ref: string;
}

interface UpcomingInspection {
  id: string;
  title: string;
  site_name: string;
  scheduled_date: string;
  inspector_name: string;
}

interface RecentIncident {
  id: string;
  title: string;
  reference_number: string;
  severity: string;
  status: string;
  occurred_at: string;
  site_name: string;
}

interface ActivePermit {
  id: string;
  title: string;
  permit_type: string;
  site_name: string;
  valid_until: string;
  requestor_name: string;
}

interface TrainingExpiring {
  id: string;
  course_name: string;
  user_name: string;
  expiry_date: string;
  days_remaining: number;
  status: string;
}

interface TopFindingsArea {
  area_id: string;
  area_name: string;
  count: number;
}

// ── Color Constants ────────────────────────────────────────

const CHART_COLORS = {
  primary: '#0066FF',
  safe: '#00E5A0',
  warning: '#FFAA00',
  danger: '#FF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#FF6B35',
};

const RISK_COLORS: Record<string, string> = {
  low: '#00E5A0',
  medium: '#FFAA00',
  high: '#FF6B35',
  very_high: '#FF4444',
  extreme: '#991B1B',
};

const SEVERITY_BADGE: Record<string, string> = {
  near_miss: 'bg-warning/15 text-warning',
  first_aid: 'bg-primary/15 text-primary',
  medical_treatment: 'bg-cyan-500/15 text-cyan-600',
  lost_time: 'bg-orange-500/15 text-orange-600',
  fatality: 'bg-danger/15 text-danger',
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-danger/15 text-danger',
  high: 'bg-orange-500/15 text-orange-600',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-primary/15 text-primary',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: 12,
};

// ── Skeleton Loader ────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted/50', className)} />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function ChartSkeleton({ height = 'h-[300px]' }: { height?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className={cn('w-full', height)} />
    </div>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card Component ─────────────────────────────────────

function KPICard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg,
  variation,
  invertTrend,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  iconBg: string;
  variation?: KPIVariation;
  invertTrend?: boolean;
}) {
  const TrendIcon =
    variation?.trend === 'up' ? TrendingUp : variation?.trend === 'down' ? TrendingDown : Minus;

  // For some KPIs (like TRIR), "down" is good
  const isPositive = invertTrend
    ? variation?.trend === 'down'
    : variation?.trend === 'up';

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
          {variation && (
            <div className="flex items-center gap-1">
              <TrendIcon
                className={cn(
                  'h-3.5 w-3.5',
                  isPositive ? 'text-safe-500' : variation.trend === 'stable' ? 'text-muted-foreground' : 'text-danger',
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive ? 'text-safe-500' : variation.trend === 'stable' ? 'text-muted-foreground' : 'text-danger',
                )}
              >
                {variation.variation_pct > 0 ? '+' : ''}
                {variation.variation_pct}% vs anterior
              </span>
            </div>
          )}
          {subtext && !variation && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-3', iconBg)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

// ── Risk Matrix Component ──────────────────────────────────

function RiskMatrix({ cells, onCellClick }: {
  cells: RiskMatrixCell[];
  onCellClick: (cell: RiskMatrixCell) => void;
}) {
  const getCell = (lik: number, con: number) =>
    cells.find((c) => c.likelihood === lik && c.consequence === con);

  const LABELS_Y = ['Muy Alta', 'Alta', 'Media', 'Baja', 'Muy Baja'];
  const LABELS_X = ['Insignificante', 'Menor', 'Moderada', 'Mayor', 'Catastrófica'];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        {/* Column headers */}
        <div className="mb-1 grid grid-cols-[80px_repeat(5,1fr)] gap-1">
          <div />
          {LABELS_X.map((l) => (
            <div key={l} className="text-center text-[10px] font-medium text-muted-foreground">
              {l}
            </div>
          ))}
        </div>
        {/* Rows */}
        {[5, 4, 3, 2, 1].map((lik, rowIdx) => (
          <div key={lik} className="grid grid-cols-[80px_repeat(5,1fr)] gap-1 mb-1">
            <div className="flex items-center text-[10px] font-medium text-muted-foreground pr-2 justify-end">
              {LABELS_Y[rowIdx]}
            </div>
            {[1, 2, 3, 4, 5].map((con) => {
              const cell = getCell(lik, con);
              const count = cell?.count ?? 0;
              const level = cell?.level ?? RISK_COLORS.low;
              const bg = RISK_COLORS[cell?.level ?? 'low'] ?? RISK_COLORS.low;
              return (
                <button
                  key={`${lik}-${con}`}
                  onClick={() => cell && onCellClick(cell)}
                  className={cn(
                    'flex h-12 items-center justify-center rounded-md text-xs font-bold transition-transform hover:scale-105',
                    count > 0 ? 'cursor-pointer text-white shadow-sm' : 'text-muted-foreground/40 bg-muted/40',
                  )}
                  // Dynamic colors from API data require inline style
                  {...(count > 0 && { style: { backgroundColor: bg } })}
                  title={`Probabilidad ${lik} × Consecuencia ${con}: ${count} riesgos`}
                >
                  {count > 0 ? count : ''}
                </button>
              );
            })}
          </div>
        ))}
        <div className="mt-1 grid grid-cols-[80px_repeat(5,1fr)] gap-1">
          <div className="text-[10px] font-medium text-muted-foreground text-right pr-2">
            Probabilidad ↑
          </div>
          <div className="col-span-5 text-center text-[10px] font-medium text-muted-foreground">
            Consecuencia →
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────────────────

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // React Query hooks — each handles caching + 5-min auto-refresh
  const { data: kpis, isLoading: kpisLoading } = useKPIs();
  const { data: incidentsTrend, isLoading: trendLoading } = useIncidentsTrend();
  const { data: inspCompliance, isLoading: complianceLoading } = useInspectionsCompliance();
  const { data: riskMatrix, isLoading: riskLoading } = useRiskMatrix();
  const { data: widgets, isLoading: widgetsLoading } = useWidgets();

  const loading = kpisLoading && trendLoading && complianceLoading && riskLoading && widgetsLoading;

  const [selectedRiskCell, setSelectedRiskCell] = useState<RiskMatrixCell | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Refresh all queries ──────────────────────────────
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  // ── PDF Export ───────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await api.analytics.exportPdf('period=year');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `openqhse_dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // silent fail
    } finally {
      setExporting(false);
    }
  };

  // ── TRIR LineChart data merge ────────────────────────
  const trirData = useMemo(() => {
    if (!incidentsTrend) return [];
    return incidentsTrend.trir_current_year.map((cur, i) => ({
      month: cur.month,
      current: cur.value,
      previous: incidentsTrend.trir_previous_year[i]?.value ?? 0,
    }));
  }, [incidentsTrend]);

  // ── Loading State ────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <ListSkeleton />
          <ListSkeleton />
          <ListSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* ── Header Row ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('welcome')}, {user?.first_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className={cn('h-4 w-4', exporting && 'animate-bounce')} />
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards (Top Row) ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="TRIR"
          value={kpis?.trir.value.toFixed(2) ?? '0.00'}
          icon={AlertTriangle}
          iconBg="bg-danger/10 text-danger"
          variation={kpis?.trir}
          invertTrend
        />
        <KPICard
          label="LTIF"
          value={kpis?.ltif.value.toFixed(2) ?? '0.00'}
          icon={TrendingDown}
          iconBg="bg-warning/10 text-warning"
          variation={kpis?.ltif}
          invertTrend
        />
        <KPICard
          label="Inspecciones"
          value={`${kpis?.inspections_completed ?? 0}/${kpis?.inspections_scheduled ?? 0}`}
          subtext={`${kpis?.inspections_compliance_pct ?? 0}% cumplimiento`}
          icon={ClipboardCheck}
          iconBg="bg-primary/10 text-primary"
        />
        <KPICard
          label="Acciones Vencidas"
          value={kpis?.overdue_actions ?? 0}
          icon={Target}
          iconBg={
            (kpis?.overdue_actions ?? 0) > 0
              ? 'bg-danger/10 text-danger'
              : 'bg-safe/10 text-safe-500'
          }
        />
      </div>

      {/* ── Charts Row 1: Incidents Trend (Area) + Incidents by Type (Pie) ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Incidents by Month — AreaChart */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold">Incidentes por Mes (últimos 12 meses)</h3>
          {incidentsTrend && incidentsTrend.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={incidentsTrend.trend}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="total" stroke={CHART_COLORS.primary} fill="url(#gradTotal)" strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="lost_time" stroke={CHART_COLORS.danger} fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" name="Tiempo perdido" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              Sin datos de incidentes
            </div>
          )}
        </div>

        {/* Incidents by Type — PieChart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold">Incidentes por Tipo</h3>
          {incidentsTrend && incidentsTrend.by_type.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={incidentsTrend.by_type}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="label"
                  >
                    {incidentsTrend.by_type.map((entry) => (
                      <Cell key={entry.type} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {incidentsTrend.by_type.map((item) => (
                  <div key={item.type} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      ref={(el) => { if (el) el.style.backgroundColor = item.color; }}
                    />
                    <span className="flex-1 text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              Sin datos
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row 2: Top Areas (HBar) + TRIR Trend (Line) + Compliance (Bar) ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top 5 Areas — HorizontalBarChart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold">Top 5 Áreas con Hallazgos</h3>
          {widgets && widgets.top_findings_areas.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={widgets.top_findings_areas.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="area_name"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={100}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Hallazgos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
              Sin datos de hallazgos
            </div>
          )}
        </div>

        {/* TRIR Trend — LineChart (current vs previous year) */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold">Tendencia TRIR (vs año anterior)</h3>
          {trirData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trirData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="current" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} name="Año actual" />
                <Line type="monotone" dataKey="previous" stroke={CHART_COLORS.warning} strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Año anterior" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
              Sin datos TRIR
            </div>
          )}
        </div>

        {/* Inspections Compliance — BarChart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold">
            Cumplimiento Inspecciones
            {inspCompliance && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({inspCompliance.overall_pct}%)
              </span>
            )}
          </h3>
          {inspCompliance && inspCompliance.weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inspCompliance.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="scheduled" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Programadas" />
                <Bar dataKey="completed" fill={CHART_COLORS.safe} radius={[4, 4, 0, 0]} name="Completadas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
              Sin datos de cumplimiento
            </div>
          )}
        </div>
      </div>

      {/* ── Secondary Widgets Row ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overdue Actions Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-danger" />
              Acciones Vencidas
            </h3>
            <Link href="/actions?filter=overdue" className="text-xs text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(!widgets || widgets.overdue_actions.length === 0) ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Target className="h-6 w-6 text-safe-500" />
                <p className="text-sm text-muted-foreground">Sin acciones vencidas</p>
              </div>
            ) : (
              widgets.overdue_actions.slice(0, 5).map((action) => (
                <Link
                  key={action.id}
                  href={`/actions/${action.id}`}
                  className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.responsible}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', PRIORITY_BADGE[action.priority] ?? 'bg-muted text-muted-foreground')}>
                      {action.days_overdue}d vencida
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Inspections */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Próximas Inspecciones
            </h3>
            <Link href="/inspections?filter=scheduled" className="text-xs text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(!widgets || widgets.upcoming_inspections.length === 0) ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <ClipboardCheck className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin inspecciones programadas</p>
              </div>
            ) : (
              widgets.upcoming_inspections.map((insp) => (
                <Link
                  key={insp.id}
                  href={`/inspections/${insp.id}`}
                  className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{insp.title}</p>
                    <p className="text-xs text-muted-foreground">{insp.site_name} · {insp.inspector_name}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(insp.scheduled_date)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Últimos Incidentes
            </h3>
            <Link href="/incidents" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(!widgets || widgets.recent_incidents.length === 0) ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <AlertTriangle className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin incidentes recientes</p>
              </div>
            ) : (
              widgets.recent_incidents.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/incidents/${inc.id}`}
                  className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inc.title}</p>
                    <p className="text-xs text-muted-foreground">{inc.site_name} · {inc.reference_number}</p>
                  </div>
                  <span className={cn('shrink-0 ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium', SEVERITY_BADGE[inc.severity] ?? 'bg-muted text-muted-foreground')}>
                    {inc.severity.replace('_', ' ')}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Permits + Training + Risk Matrix ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Permits */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileKey className="h-4 w-4 text-primary" />
              Permisos Activos
            </h3>
            <span className="text-xs text-muted-foreground">
              {kpis?.active_permits ?? 0} activos
            </span>
          </div>
          <div className="divide-y divide-border">
            {(!widgets || widgets.active_permits.length === 0) ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <FileKey className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin permisos activos</p>
              </div>
            ) : (
              widgets.active_permits.map((p) => (
                <Link
                  key={p.id}
                  href={`/permits/${p.id}`}
                  className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.site_name} · {p.requestor_name}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(p.valid_until)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Expiring Training */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-500" />
              Capacitaciones por Vencer (30d)
            </h3>
          </div>
          <div className="divide-y divide-border">
            {(!widgets || widgets.expiring_training.length === 0) ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <GraduationCap className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin capacitaciones por vencer</p>
              </div>
            ) : (
              widgets.expiring_training.map((tr) => (
                <div
                  key={tr.id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tr.course_name}</p>
                    <p className="text-xs text-muted-foreground">{tr.user_name}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    tr.days_remaining <= 7 ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning',
                  )}>
                    {tr.days_remaining}d
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk Heat Map */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-danger" />
              Mapa de Calor de Riesgos
            </h3>
            {riskMatrix && (
              <span className="text-xs text-muted-foreground">
                {riskMatrix.total_risks} riesgos · {riskMatrix.high_or_above} altos+
              </span>
            )}
          </div>
          {riskMatrix ? (
            <>
              <RiskMatrix
                cells={riskMatrix.cells}
                onCellClick={(cell) => setSelectedRiskCell(cell)}
              />
              {/* Selected cell tooltip */}
              {selectedRiskCell && selectedRiskCell.count > 0 && (
                <div className="mt-3 rounded-lg border border-border bg-accent/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">
                      P:{selectedRiskCell.likelihood} × C:{selectedRiskCell.consequence} —{' '}
                      <span className="uppercase">{selectedRiskCell.level.replace('_', ' ')}</span>
                    </p>
                    <button
                      onClick={() => setSelectedRiskCell(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedRiskCell.count} riesgo(s) en esta celda
                  </p>
                  <Link
                    href={`/risks?likelihood=${selectedRiskCell.likelihood}&consequence=${selectedRiskCell.consequence}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver riesgos <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              Sin datos de riesgos
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Alert Widget ─── */}
      <KPIAlertWidget />
    </div>
  );
}

// ── KPI Alert Widget ─────────────────────────────────────────

interface KPIAlert {
  id: string;
  kpi_name: string;
  condition: string;
  threshold_value: number;
  current_value: number;
  period: string;
  status: string;
  triggered_at: string;
  acknowledged_at: string | null;
  escalation_count: number;
  notes: string | null;
}

const ALERT_STATUS_STYLE: Record<string, string> = {
  TRIGGERED: 'bg-danger/15 text-danger border-danger/30',
  ACKNOWLEDGED: 'bg-warning/15 text-warning border-warning/30',
  RESOLVED: 'bg-safe/15 text-safe-600 border-safe/30',
  ACTIVE: 'bg-muted/50 text-muted-foreground border-border',
};

const KPI_LABELS: Record<string, string> = {
  TRIR: 'TRIR',
  LTIF: 'LTIF',
  DART: 'DART',
  FAR: 'FAR',
  SEVERITY_RATE: 'Tasa Severidad',
  ACTIONS_OVERDUE: 'Acciones Vencidas',
  ACTIONS_OPEN: 'Acciones Abiertas',
  INSPECTIONS_OVERDUE: 'Inspecciones Vencidas',
  TRAINING_COMPLIANCE: 'Cumpl. Capacitación',
  PERMIT_COMPLIANCE: 'Cumpl. Permisos',
  NEAR_MISS_RATE: 'Tasa Cuasi-accidentes',
  OBSERVATION_RATE: 'Tasa Observaciones',
  CONTRACTOR_INCIDENTS: 'Inc. Contratistas',
};

function KPIAlertWidget() {
  const qc = useQC();

  const { data: alerts, isLoading } = useQuery<KPIAlert[]>({
    queryKey: ['kpi-alerts', 'TRIGGERED'],
    queryFn: () => api.analytics.kpiAlerts.list('status=TRIGGERED') as Promise<KPIAlert[]>,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => api.analytics.kpiAlerts.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-alerts'] }),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => api.analytics.kpiAlerts.resolve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-alerts'] }),
  });

  if (!isLoading && (!alerts || alerts.length === 0)) return null;

  return (
    <div className="rounded-xl border border-danger/30 bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-danger" />
          <h3 className="font-semibold">Alertas KPI Activas</h3>
          {alerts && alerts.length > 0 && (
            <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
              {alerts.length}
            </span>
          )}
        </div>
        <Link href="/analytics?tab=alerts" className="text-xs text-primary hover:underline">
          Ver todas
        </Link>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted/50" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {alerts!.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start justify-between gap-3 p-4',
                alert.status === 'TRIGGERED' && 'bg-danger/5',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border',
                    ALERT_STATUS_STYLE[alert.status] ?? 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {KPI_LABELS[alert.kpi_name] ?? alert.kpi_name}
                    <span className="ml-2 text-muted-foreground">
                      {alert.current_value.toFixed(2)} / umbral {alert.threshold_value}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Período: {alert.period} · Disparada{' '}
                    {formatDate(alert.triggered_at)}
                    {alert.escalation_count > 0 && (
                      <span className="ml-2 font-medium text-danger">
                        · {alert.escalation_count}× escalada
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1">
                {alert.status === 'TRIGGERED' && (
                  <button
                    onClick={() => acknowledge.mutate(alert.id)}
                    disabled={acknowledge.isPending}
                    title="Reconocer alerta"
                    className="rounded p-1 text-muted-foreground hover:bg-warning/10 hover:text-warning disabled:opacity-50"
                  >
                    <BellOff className="h-4 w-4" />
                  </button>
                )}
                {alert.status !== 'RESOLVED' && (
                  <button
                    onClick={() => resolve.mutate(alert.id)}
                    disabled={resolve.isPending}
                    title="Marcar como resuelta"
                    className="rounded p-1 text-muted-foreground hover:bg-safe/10 hover:text-safe-600 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
