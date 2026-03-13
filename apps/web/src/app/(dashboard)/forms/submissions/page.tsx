'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileDown, Eye, Loader2, CheckCircle, Clock, CloudOff } from 'lucide-react';
import { useFormSubmissions } from '@/hooks/use-forms';
import type { FormSubmissionListItem, SubmissionStatus } from '@/types/forms';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { api } from '@/lib/api-client';

const STATUS_MAP: Record<SubmissionStatus, { label: string; icon: typeof CheckCircle; cls: string }> = {
  draft: { label: 'Borrador', icon: Clock, cls: 'text-muted-foreground' },
  submitted: { label: 'Enviado', icon: CheckCircle, cls: 'text-success' },
  synced: { label: 'Sincronizado', icon: CloudOff, cls: 'text-primary' },
};

function getScoreColor(pct: number | undefined): string {
  if (pct === undefined) return '';
  if (pct >= 80) return 'text-success';
  if (pct >= 60) return 'text-warning';
  return 'text-danger';
}

export default function SubmissionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);

  const { data: submissions, isLoading } = useFormSubmissions(params.toString() || undefined);

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await api.forms.submissions.report(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error:', e);
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Respuestas</h1>
        <p className="text-sm text-muted-foreground">Historial de formularios completados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar respuestas..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviado</option>
          <option value="synced">Sincronizado</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (submissions ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <CheckCircle className="h-12 w-12" />
          <p className="text-sm font-medium">No hay respuestas aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Puntaje</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(submissions ?? []).map((sub) => {
                const statusInfo = STATUS_MAP[sub.status] ?? STATUS_MAP.draft;
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{sub.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-medium', statusInfo.cls)}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.percentage !== undefined ? (
                        <span className={cn('text-sm font-bold', getScoreColor(sub.percentage))}>
                          {sub.percentage}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {sub.submitted_at ? formatDate(sub.submitted_at) : formatDate(sub.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/forms/submissions/${sub.id}`)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Ver detalle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(sub.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Descargar PDF"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
