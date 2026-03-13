'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';

import { api } from '@/lib/api-client';
import { cn, formatDate, statusColor, formatPercent } from '@/lib/utils';

interface InspectionItem {
  id: string;
  title: string;
  reference_number: string;
  status: string;
  scheduled_date: string | null;
  completed_at: string | null;
  score: number | null;
  max_score: number | null;
  site_id: string;
  inspector_id: string;
  created_at: string;
}

interface InspectionListData {
  total: number;
  page: number;
  page_size: number;
  items: InspectionItem[];
}

export default function InspectionsPage() {
  const t = useTranslations('inspections');
  const [data, setData] = useState<InspectionListData>({
    total: 0,
    page: 1,
    page_size: 20,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadInspections = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), page_size: '20' });
        if (statusFilter) params.append('status', statusFilter);
        const response = await api.get<InspectionListData>(
          `/inspections?${params.toString()}`,
        );
        setData(response);
      } catch {
        setData({ total: 0, page: 1, page_size: 20, items: [] });
      } finally {
        setLoading(false);
      }
    };
    loadInspections();
  }, [page, statusFilter]);

  const totalPages = Math.ceil(data.total / data.page_size) || 1;

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'draft', label: t('draft') },
    { value: 'in_progress', label: t('inProgress') },
    { value: 'completed', label: t('completed') },
    { value: 'reviewed', label: t('reviewed') },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {data.total} inspecciones en total
          </p>
        </div>
        <Link
          href="/dashboard/inspections/new"
          className={cn(
            'inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5',
            'text-sm font-medium text-primary-foreground',
            'hover:bg-primary-600 transition-colors',
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
            placeholder="Buscar por título o referencia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Buscar inspecciones"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={cn(
              'h-10 rounded-md border border-input bg-background px-3 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Filtrar por estado"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-md border border-input',
            'bg-background px-4 text-sm text-muted-foreground hover:bg-accent',
          )}
          aria-label="Exportar inspecciones"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Exportar
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 opacity-50" />
            <p>No se encontraron inspecciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Referencia
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('status')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('score')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('date')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((inspection) => (
                  <tr
                    key={inspection.id}
                    className="transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {inspection.reference_number}
                    </td>
                    <td className="px-4 py-3 font-medium">{inspection.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusColor(inspection.status),
                        )}
                      >
                        {inspection.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {inspection.score !== null && inspection.max_score
                        ? formatPercent(
                            (inspection.score / inspection.max_score) * 100,
                          )
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(inspection.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/inspections/${inspection.id}`}
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
              Mostrando {(page - 1) * data.page_size + 1}–
              {Math.min(page * data.page_size, data.total)} de {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-input',
                  'disabled:opacity-50 hover:bg-accent',
                )}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-input',
                  'disabled:opacity-50 hover:bg-accent',
                )}
                aria-label="Página siguiente"
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
