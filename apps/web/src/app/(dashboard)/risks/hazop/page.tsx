/**
 * HAZOP Studies — list and inline study management.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FlaskConical, FileText, Users, ChevronRight } from 'lucide-react';
import { useHazopStudies } from '@/hooks/use-risks';
import type { HazopStudy } from '@/types/risks';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: '#6b7280' },
  in_progress: { label: 'En progreso', color: '#3b82f6' },
  completed: { label: 'Completado', color: '#f59e0b' },
  approved: { label: 'Aprobado', color: '#22c55e' },
};

function HazopStudyCard({ study }: { study: HazopStudy }) {
  const fallback = { label: 'Borrador', color: '#6b7280' };
  const statusCfg = STATUS_BADGE[study.status] ?? fallback;

  return (
    <Link href={`/risks/hazop/${study.id}`}>
      <div className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10">
              <FlaskConical className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                {study.name}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {study.system_description}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span
            className="rounded px-2 py-0.5 font-medium"
            style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          {study.nodes && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {study.nodes.length} nodos
            </span>
          )}
          {study.team_members && Array.isArray(study.team_members) && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {study.team_members.length} miembros
            </span>
          )}
          <span className="ml-auto">
            {new Date(study.created_at).toLocaleDateString('es-CL')}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HazopListPage() {
  const { data: studies, isLoading } = useHazopStudies();

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
          <h1 className="text-2xl font-bold text-foreground">Estudios HAZOP</h1>
          <p className="text-sm text-muted-foreground">
            Análisis de Peligros y Operabilidad (HAZOP)
          </p>
        </div>
        <Link
          href="/risks/hazop/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo estudio
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : studies && studies.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => (
            <HazopStudyCard key={study.id} study={study} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No hay estudios HAZOP registrados aún.
        </div>
      )}
    </div>
  );
}
