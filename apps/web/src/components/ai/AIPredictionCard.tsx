/**
 * AIPredictionCard — animated gauge displaying accident probability
 * with risk factors and top recommendations.
 */

'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Zap,
  Loader2,
} from 'lucide-react';
import type { AccidentProbabilityResponse, RiskFactorItem } from '@/types/ai';
import { cn } from '@/lib/utils';

// ── Gauge Colors ───────────────────────────────────────────

const LEVEL_CONFIG = {
  low: { color: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-500', label: 'Bajo' },
  medium: { color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Medio' },
  high: { color: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'Alto' },
  critical: { color: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-500', label: 'Crítico' },
} as const;

interface AIPredictionCardProps {
  data: AccidentProbabilityResponse | undefined;
  isLoading?: boolean;
  title?: string;
}

function GaugeArc({ probability, color }: { probability: number; color: string }) {
  const radius = 60;
  const stroke = 10;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference - (probability / 100) * circumference;

  return (
    <svg viewBox="0 0 140 80" className="h-32 w-full">
      {/* Background arc */}
      <path
        d="M 10 75 A 60 60 0 0 1 130 75"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted/20"
        strokeLinecap="round"
      />
      {/* Filled arc */}
      <path
        d="M 10 75 A 60 60 0 0 1 130 75"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
      {/* Center value */}
      <text x="70" y="65" textAnchor="middle" className="fill-foreground text-2xl font-bold">
        {probability}%
      </text>
      <text x="70" y="78" textAnchor="middle" className="fill-muted-foreground text-[8px]">
        probabilidad
      </text>
    </svg>
  );
}

function RiskFactorBar({ factor }: { factor: RiskFactorItem }) {
  const pct = Math.min(100, factor.score);
  const barColor =
    pct >= 75 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-500' : pct >= 25 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{factor.factor}</span>
        <span className="font-mono font-medium text-foreground">{factor.score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AIPredictionCard({ data, isLoading, title = 'Predicción de Riesgo' }: AIPredictionCardProps) {
  const config = useMemo(() => {
    if (!data) return LEVEL_CONFIG.low;
    return LEVEL_CONFIG[data.risk_level] ?? LEVEL_CONFIG.low;
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Calculando predicción…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ShieldAlert className="h-8 w-8" />
          <p className="text-sm">Sin datos de predicción</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn('h-5 w-5', config.text)} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
            config.bg,
            config.text,
          )}
        >
          {config.label}
        </span>
      </div>

      {/* Gauge */}
      <GaugeArc probability={data.probability} color={config.color} />

      {/* Risk Factors */}
      {data.risk_factors.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Factores de riesgo
          </p>
          {data.risk_factors.slice(0, 4).map((f, i) => (
            <RiskFactorBar key={i} factor={f} />
          ))}
        </div>
      )}

      {/* Timeline & Recommendations */}
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        {data.estimated_timeline && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Horizonte: {data.estimated_timeline}</span>
          </div>
        )}
        {data.recommendations.slice(0, 2).map((rec, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 text-primary">→</span>
            <span>{rec}</span>
          </div>
        ))}
      </div>

      {/* Confidence */}
      <div className="mt-3 text-right text-[11px] text-muted-foreground">
        Confianza: {(data.confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
}
