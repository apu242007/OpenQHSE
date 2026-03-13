/**
 * Analytics Hub — main page with navigation cards to analytics sub-modules.
 */

'use client';

import Link from 'next/link';
import {
  BarChart3,
  FileText,
  AlertTriangle,
  TrendingUp,
  Activity,
  Brain,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  useKPIs,
  useIncidentsTrend,
  useActionsSummary,
} from '@/hooks/use-analytics';

// ── Card config ────────────────────────────────────────────

const MODULES = [
  {
    title: 'Reporte Ejecutivo',
    description: 'Resumen gerencial con análisis narrativo de IA, KPIs y tendencias del período.',
    href: '/analytics/executive',
    icon: FileText,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20 hover:border-blue-500/40',
  },
  {
    title: 'Análisis de Incidentes',
    description: 'Pirámide de Bird, distribución por tipo, análisis de causas raíz con IA.',
    href: '/analytics/incidents',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20 hover:border-orange-500/40',
  },
  {
    title: 'Analítica Predictiva',
    description: 'Predicción de riesgos, patrones detectados, mapa de calor y recomendaciones proactivas.',
    href: '/analytics/predictive',
    icon: TrendingUp,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20 hover:border-violet-500/40',
  },
] as const;

// ── KPI mini-card ──────────────────────────────────────────

function KPIMini({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function AnalyticsHubPage() {
  const { data: kpis } = useKPIs();
  const { data: trend } = useIncidentsTrend(6);
  const { data: actions } = useActionsSummary();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const k = kpis as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = actions as any;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analítica Avanzada</h1>
            <p className="text-sm text-muted-foreground">
              Centro de inteligencia QHSE con análisis predictivo e IA
            </p>
          </div>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIMini
          label="Incidentes (30d)"
          value={k?.total_incidents ?? '—'}
          icon={AlertTriangle}
          color="bg-red-500/10 text-red-500"
        />
        <KPIMini
          label="Inspecciones Completadas"
          value={k?.inspections_completed ?? '—'}
          icon={ShieldCheck}
          color="bg-green-500/10 text-green-500"
        />
        <KPIMini
          label="Acciones Abiertas"
          value={a?.open ?? '—'}
          icon={Activity}
          color="bg-amber-500/10 text-amber-500"
        />
        <KPIMini
          label="TRIR"
          value={k?.trir != null ? Number(k.trir).toFixed(2) : '—'}
          icon={BarChart3}
          color="bg-blue-500/10 text-blue-500"
        />
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {MODULES.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className={`group flex flex-col justify-between rounded-xl border bg-card p-6 transition-all hover:shadow-lg ${mod.border}`}
          >
            <div>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${mod.bg}`}>
                <mod.icon className={`h-6 w-6 ${mod.color}`} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{mod.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {mod.description}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-medium text-primary">
              Ver módulo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* AI Capabilities Info */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Motor de IA Integrado</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              OpenQHSE utiliza un motor de IA local basado en LLM (Ollama) para análisis de causa raíz,
              predicción de riesgos, clasificación de hallazgos, OCR de evidencia fotográfica y chat
              especializado en normativas QHSE. Toda la información se procesa de forma privada y segura.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['ISO 45001', 'ISO 14001', 'ISO 9001', 'OSHA', 'Análisis Predictivo', 'OCR', 'NLP'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
