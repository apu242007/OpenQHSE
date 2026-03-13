'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileDown, CheckCircle, Clock, CloudOff, MapPin, Loader2,
} from 'lucide-react';
import { useFormSubmission, useFormTemplate } from '@/hooks/use-forms';
import { api } from '@/lib/api-client';
import type { SubmissionStatus } from '@/types/forms';
import { cn, formatDate } from '@/lib/utils';

const STATUS_MAP: Record<SubmissionStatus, { label: string; icon: typeof CheckCircle; cls: string }> = {
  draft: { label: 'Borrador', icon: Clock, cls: 'text-muted-foreground' },
  submitted: { label: 'Enviado', icon: CheckCircle, cls: 'text-success' },
  synced: { label: 'Sincronizado', icon: CloudOff, cls: 'text-primary' },
};

function getScoreColor(pct: number | undefined) {
  if (pct === undefined) return '';
  if (pct >= 80) return 'text-success';
  if (pct >= 60) return 'text-warning';
  return 'text-danger';
}

function GradeBar({ percentage }: { percentage: number }) {
  const color = percentage >= 80 ? 'bg-success' : percentage >= 60 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${percentage}%` }} />
    </div>
  );
}

export default function SubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: submission, isLoading } = useFormSubmission(params.id);
  const { data: template } = useFormTemplate(submission?.template_id);

  const handleDownloadPdf = async () => {
    if (!params.id) return;
    try {
      const blob = await api.forms.submissions.report(params.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission_${params.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Respuesta no encontrada</p>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[submission.status] ?? STATUS_MAP.draft;
  const StatusIcon = statusInfo.icon;

  // Flatten all fields from template for label lookup
  const fieldMap = new Map<string, string>();
  if (template?.schema_def?.sections) {
    for (const sec of template.schema_def.sections) {
      for (const field of sec.fields) {
        fieldMap.set(field.id, field.label || field.id);
      }
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md p-1.5 hover:bg-muted"
            title="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{template?.name ?? 'Respuesta'}</h1>
            <p className="text-sm text-muted-foreground font-mono">{submission.id.slice(0, 8)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <FileDown className="h-4 w-4" /> Descargar PDF
        </button>
      </div>

      {/* Meta */}
      <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Estado</p>
          <span className={cn('flex items-center gap-1.5 text-sm font-medium', statusInfo.cls)}>
            <StatusIcon className="h-4 w-4" />
            {statusInfo.label}
          </span>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Enviado</p>
          <p className="text-sm">
            {submission.submitted_at ? formatDate(submission.submitted_at) : '—'}
          </p>
        </div>
        {submission.gps_latitude !== undefined && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Ubicación GPS</p>
            <p className="flex items-center gap-1 text-sm">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {submission.gps_latitude.toFixed(4)}, {submission.gps_longitude?.toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* Score */}
      {submission.percentage !== undefined && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Puntaje</p>
            <span className={cn('text-2xl font-bold', getScoreColor(submission.percentage))}>
              {submission.percentage}%
            </span>
          </div>
          <GradeBar percentage={submission.percentage} />
          {submission.score !== undefined && submission.max_score !== undefined && (
            <p className="text-[11px] text-muted-foreground">
              {submission.score} / {submission.max_score} puntos
            </p>
          )}
        </div>
      )}

      {/* Answers */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Respuestas</h2>
        </div>
        <div className="divide-y divide-border">
          {Object.entries(submission.data).map(([fieldId, answer]) => {
            const label = fieldMap.get(fieldId) ?? fieldId;
            const value = answer?.value;
            const notes = answer?.notes;

            return (
              <div key={fieldId} className="px-4 py-3 space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-sm">
                  {value === null || value === undefined
                    ? <span className="text-muted-foreground italic">Sin respuesta</span>
                    : typeof value === 'boolean'
                      ? (value ? 'Sí' : 'No')
                      : Array.isArray(value)
                        ? value.join(', ')
                        : typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value)}
                </p>
                {notes && (
                  <p className="text-[11px] text-muted-foreground">Nota: {notes}</p>
                )}
                {answer?.flagged && (
                  <span className="inline-block rounded bg-danger/20 px-1.5 text-[10px] font-medium text-danger">
                    Marcado
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
