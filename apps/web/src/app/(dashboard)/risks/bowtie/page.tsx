/**
 * Bow-Tie Analysis — list page.
 */

'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, GitBranchPlus, Shield, AlertTriangle } from 'lucide-react';
import { useBowTies } from '@/hooks/use-risks';
import type { BowTieAnalysis } from '@/types/risks';

function BowTieCard({ bt }: { bt: BowTieAnalysis }) {
  const threatCount = Array.isArray(bt.threats) ? bt.threats.length : 0;
  const consequenceCount = Array.isArray(bt.consequences) ? bt.consequences.length : 0;
  const barrierCount =
    (Array.isArray(bt.prevention_barriers) ? bt.prevention_barriers.length : 0) +
    (Array.isArray(bt.mitigation_barriers) ? bt.mitigation_barriers.length : 0);

  return (
    <Link href={`/risks/bowtie/${bt.id}`}>
      <div className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600/10">
            <GitBranchPlus className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary line-clamp-1">
              {bt.top_event}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{bt.hazard}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {threatCount} amenazas
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {barrierCount} barreras
          </span>
          <span>{consequenceCount} consecuencias</span>
          <span className="ml-auto">
            {new Date(bt.created_at).toLocaleDateString('es-CL')}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BowTieListPage() {
  const { data: bowties, isLoading } = useBowTies();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/risks"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a riesgos
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Análisis Bow-Tie</h1>
          <p className="text-sm text-muted-foreground">
            Diagramas de corbata para análisis de barreras
          </p>
        </div>
        <Link
          href="/risks/bowtie/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Bow-Tie
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : bowties && bowties.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bowties.map((bt) => (
            <BowTieCard key={bt.id} bt={bt} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No hay análisis Bow-Tie registrados aún.
        </div>
      )}
    </div>
  );
}
