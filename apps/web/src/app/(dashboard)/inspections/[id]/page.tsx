'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, ClipboardCheck, AlertTriangle, CheckCircle2,
  Clock, FileDown, Play, XCircle, Eye, MapPin, User, Calendar,
} from 'lucide-react';
import { useInspection, useInspectionFindings, useStartInspection, useCompleteInspection } from '@/hooks/use-inspections';
import type { Finding, FindingSeverity } from '@/types/inspections';
import { cn, formatDate, severityColor, statusColor } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_progress: 'En progreso',
  completed: 'Completada',
  reviewed: 'Revisada',
  archived: 'Archivada',
};

const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  observation: 'Observación',
};

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: inspection, isLoading } = useInspection(id);
  const { data: findings } = useInspectionFindings(id);
  const startMutation = useStartInspection();
  const completeMutation = useCompleteInspection();

  if (isLoading || !inspection) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const scorePercent =
    inspection.score != null && inspection.max_score
      ? Math.round((inspection.score / inspection.max_score) * 100)
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-1 rounded-lg p-2 hover:bg-muted" aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{inspection.reference_number}</p>
            <h1 className="text-2xl font-bold">{inspection.title}</h1>
            <span className={cn('mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(inspection.status))}>
              {STATUS_LABELS[inspection.status] ?? inspection.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {inspection.status === 'draft' && (
            <button
              type="button"
              onClick={() => startMutation.mutate(id)}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> Iniciar
            </button>
          )}
          {inspection.status === 'in_progress' && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/inspections/${id}/execute`)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <ClipboardCheck className="h-4 w-4" /> Ejecutar
              </button>
              <button
                type="button"
                onClick={() => completeMutation.mutate(id)}
                disabled={completeMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-safe bg-safe/10 px-4 py-2 text-sm font-medium text-safe hover:bg-safe/20 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Completar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              window.open(`/api/inspections/${id}/report`, '_blank');
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <FileDown className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={Calendar} label="Fecha programada" value={inspection.scheduled_date ? formatDate(inspection.scheduled_date) : '—'} />
        <InfoCard icon={User} label="Inspector" value={inspection.inspector_id ?? '—'} />
        <InfoCard icon={MapPin} label="Sitio" value={inspection.site_id} />
      </div>

      {/* Score */}
      {scorePercent !== null && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">Puntuación</h2>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeDasharray={`${scorePercent} ${100 - scorePercent}`}
                  className={cn(scorePercent >= 80 ? 'text-safe' : scorePercent >= 60 ? 'text-warning' : 'text-danger')}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{scorePercent}%</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {inspection.score} / {inspection.max_score} puntos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Findings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-warning" /> Hallazgos ({findings?.length ?? 0})
        </h2>

        {!findings?.length ? (
          <p className="text-sm text-muted-foreground">No se han registrado hallazgos.</p>
        ) : (
          <div className="space-y-3">
            {findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {inspection.notes && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{inspection.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ── Info Card ────────────────────────────────────────────── */

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

/* ── Finding Card ─────────────────────────────────────────── */

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <span className={cn('mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', severityColor(finding.severity))}>
        {SEVERITY_LABELS[finding.severity] ?? finding.severity}
      </span>
      <div className="flex-1">
        <p className="font-medium">{finding.title}</p>
        {finding.description && <p className="mt-0.5 text-sm text-muted-foreground">{finding.description}</p>}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className={cn('rounded-full px-2 py-0.5', statusColor(finding.status))}>{finding.status}</span>
          {finding.due_date && <span>Vence: {formatDate(finding.due_date)}</span>}
        </div>
      </div>
    </div>
  );
}
