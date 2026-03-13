/**
 * Risk Management — main page with table/matrix toggle.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Grid3x3,
  List,
  ShieldAlert,
  FlaskConical,
  GitBranchPlus,
  BarChart3,
} from 'lucide-react';
import { useRisks, useRiskStatistics } from '@/hooks/use-risks';
import { RISK_TYPE_CONFIG, RISK_LEVEL_CONFIG } from '@/types/risks';
import type { RiskRegisterListItem, RiskLevel } from '@/types/risks';

function riskLevel(rating: number): RiskLevel {
  if (rating <= 4) return 'low';
  if (rating <= 9) return 'moderate';
  if (rating <= 16) return 'high';
  return 'extreme';
}

function RiskRow({ risk }: { risk: RiskRegisterListItem }) {
  const level = riskLevel(risk.residual_rating);
  const levelCfg = RISK_LEVEL_CONFIG[level];
  const typeCfg = RISK_TYPE_CONFIG[risk.risk_type as keyof typeof RISK_TYPE_CONFIG];

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <Link href={`/risks/${risk.id}`} className="text-sm font-medium text-foreground hover:text-primary line-clamp-2">
          {risk.hazard_description}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${typeCfg?.color ?? '#6b7280'}20`, color: typeCfg?.color ?? '#6b7280' }}>
          {typeCfg?.label ?? risk.risk_type}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-sm font-mono">{risk.inherent_rating}</td>
      <td className="px-4 py-3 text-center">
        <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: `${levelCfg.color}20`, color: levelCfg.color }}>
          {risk.residual_rating} – {levelCfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{risk.status}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {risk.review_date ? new Date(risk.review_date).toLocaleDateString('es-CL') : '—'}
      </td>
    </tr>
  );
}

export default function RisksPage() {
  const { data: risks, isLoading } = useRisks();
  const { data: stats } = useRiskStatistics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Riesgos</h1>
          <p className="text-sm text-muted-foreground">
            Registro de riesgos, matriz 5×5, HAZOP y Bow-Tie
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/risks/matrix"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Grid3x3 className="h-4 w-4" />
            Matriz 5×5
          </Link>
          <Link
            href="/risks/hazop"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <FlaskConical className="h-4 w-4" />
            HAZOP
          </Link>
          <Link
            href="/risks/bowtie"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <GitBranchPlus className="h-4 w-4" />
            Bow-Tie
          </Link>
          <Link
            href="/risks/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo riesgo
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">Total riesgos</div>
            <div className="mt-1 text-xl font-bold text-foreground">{stats.total}</div>
          </div>
          {Object.entries(stats.by_level).map(([level, count]) => {
            const cfg = RISK_LEVEL_CONFIG[level as RiskLevel];
            return (
              <div key={level} className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">{cfg?.label ?? level}</div>
                <div className="mt-1 text-xl font-bold" style={{ color: cfg?.color ?? '#6b7280' }}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : risks && risks.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Descripción del peligro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Inherente</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Residual</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Revisión</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <RiskRow key={r.id} risk={r} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No hay riesgos registrados aún.
        </div>
      )}
    </div>
  );
}
