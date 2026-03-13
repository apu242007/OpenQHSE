'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { api } from '@/lib/api-client';
import { cn, formatDate, statusColor, severityColor } from '@/lib/utils';

interface IncidentItem {
  id: string;
  reference_number: string;
  title: string;
  incident_type: string;
  severity: string;
  status: string;
  occurred_at: string;
  injuries_count: number;
  fatalities_count: number;
}

interface IncidentListData {
  total: number;
  page: number;
  page_size: number;
  items: IncidentItem[];
}

export default function IncidentsPage() {
  const t = useTranslations('incidents');
  const [data, setData] = useState<IncidentListData>({
    total: 0,
    page: 1,
    page_size: 20,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), page_size: '20' });
        if (statusFilter) params.append('status', statusFilter);
        const response = await api.get<IncidentListData>(`/incidents?${params.toString()}`);
        setData(response);
      } catch {
        setData({ total: 0, page: 1, page_size: 20, items: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, statusFilter]);

  const totalPages = Math.ceil(data.total / data.page_size) || 1;

  const incidentTypeLabels: Record<string, string> = {
    near_miss: t('nearMiss'),
    first_aid: t('firstAid'),
    medical_treatment: 'Tratamiento médico',
    lost_time: t('lostTime'),
    fatality: t('fatality'),
    property_damage: 'Daño a propiedad',
    environmental: 'Ambiental',
    fire: 'Incendio',
    spill: 'Derrame',
    other: 'Otro',
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{data.total} incidentes registrados</p>
        </div>
        <Link
          href="/dashboard/incidents/new"
          className={cn(
            'inline-flex items-center gap-2 rounded-md bg-danger px-4 py-2.5',
            'text-sm font-medium text-white hover:bg-danger-700 transition-colors',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('new')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar incidentes..."
            className={cn(
              'h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Buscar incidentes"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="reported">{t('reported')}</option>
          <option value="under_investigation">{t('underInvestigation')}</option>
          <option value="corrective_actions">Acciones correctivas</option>
          <option value="review">Revisión</option>
          <option value="closed">{t('closed')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 opacity-50" />
            <p>No se encontraron incidentes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ref</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('type')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('severity')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('status')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((incident) => (
                  <tr key={incident.id} className="transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {incident.reference_number}
                    </td>
                    <td className="px-4 py-3 font-medium">{incident.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {incidentTypeLabels[incident.incident_type] ?? incident.incident_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          severityColor(incident.severity),
                        )}
                      >
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusColor(incident.status),
                        )}
                      >
                        {incident.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(incident.occurred_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/incidents/${incident.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} de{' '}
              {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input disabled:opacity-50 hover:bg-accent"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input disabled:opacity-50 hover:bg-accent"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
