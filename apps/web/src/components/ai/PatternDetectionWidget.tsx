/**
 * PatternDetectionWidget — displays detected incident patterns
 * with NEW / RECURRING badges and severity-based coloring.
 */

'use client';

import { useMemo } from 'react';
import {
  Activity,
  Flame,
  Clock,
  AlertCircle,
  BarChart3,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from 'lucide-react';
import type { PatternDetectionResponse } from '@/types/ai';
import { cn } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────

const TREND_ICONS = {
  increasing: TrendingUp,
  stable: Minus,
  decreasing: TrendingDown,
} as const;

const TREND_COLORS = {
  increasing: 'text-red-500',
  stable: 'text-muted-foreground',
  decreasing: 'text-green-500',
} as const;

interface PatternDetectionWidgetProps {
  data: PatternDetectionResponse | undefined;
  isLoading?: boolean;
}

// ── Sub-components ─────────────────────────────────────────

function HotspotList({ hotspots }: { hotspots: PatternDetectionResponse['hotspots'] }) {
  if (!hotspots.length) return null;
  const max = Math.max(...hotspots.map((h) => h.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Puntos Calientes
        </h4>
      </div>
      {hotspots.slice(0, 5).map((h, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground">{h.area}</span>
            <span className="font-mono font-medium text-foreground">{h.count}</span>
          </div>
          <div className="h-1 rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${(h.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimePatterns({ patterns }: { patterns: PatternDetectionResponse['time_patterns'] }) {
  if (!patterns.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-blue-500" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Patrones Temporales
        </h4>
      </div>
      <div className="grid gap-2">
        {patterns.slice(0, 4).map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium text-foreground">{p.period}</p>
              <p className="text-[11px] text-muted-foreground">{p.description}</p>
            </div>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-500">
              {p.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopCauses({ causes }: { causes: PatternDetectionResponse['top_causes'] }) {
  if (!causes.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Causas Principales
        </h4>
      </div>
      <div className="space-y-1.5">
        {causes.slice(0, 5).map((c, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-foreground">{c.cause}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{c.count}</span>
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                {c.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClusterView({ clusters }: { clusters: PatternDetectionResponse['clusters'] }) {
  if (!clusters.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-violet-500" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Clusters Detectados
        </h4>
      </div>
      <div className="grid gap-2">
        {clusters.slice(0, 3).map((cl, i) => (
          <div key={i} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">{cl.label}</p>
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-500">
                {cl.incidents} incidentes
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {cl.common_factors.slice(0, 4).map((f, j) => (
                <span
                  key={j}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Widget ────────────────────────────────────────────

export function PatternDetectionWidget({ data, isLoading }: PatternDetectionWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analizando patrones…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Activity className="h-8 w-8" />
          <p className="text-sm">Sin datos de patrones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Detección de Patrones</h3>
        </div>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="rounded-lg bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
          {data.summary}
        </p>
      )}

      {/* Sections */}
      <HotspotList hotspots={data.hotspots} />
      <TimePatterns patterns={data.time_patterns} />
      <TopCauses causes={data.top_causes} />
      <ClusterView clusters={data.clusters} />

      {/* Repeat Types */}
      {data.repeat_types.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tipos Recurrentes
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.repeat_types.map((rt, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600"
              >
                <span className="text-[10px] font-bold uppercase">Recurrente</span>
                {rt.type} ({rt.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
