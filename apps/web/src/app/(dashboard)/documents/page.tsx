'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Search, Plus, Filter, Clock, Eye, Download,
  FolderOpen, CheckCircle, AlertTriangle, Loader2, BarChart3,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { useDocuments, useExpiringDocuments, useDownloadDocumentReport } from '@/hooks/use-documents';
import { DOC_STATUS_CONFIG, DOC_TYPE_CONFIG } from '@/types/documents';
import type { DocumentType, DocumentStatus } from '@/types/documents';
import { cn, formatDate } from '@/lib/utils';

const EXPIRY_OPTIONS = [
  { label: 'Próximos 30 días', value: 30 },
  { label: 'Próximos 60 días', value: 60 },
  { label: 'Próximos 90 días', value: 90 },
];

export default function DocumentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (typeFilter) params.set('doc_type', typeFilter);
  if (statusFilter) params.set('doc_status', statusFilter);
  if (expiryDays) params.set('days_to_expiry', String(expiryDays));

  const { data: documents = [], isLoading } = useDocuments(params.toString() || undefined);
  const { data: expiring30 = [] } = useExpiringDocuments(30);
  const downloadReport = useDownloadDocumentReport();

  const handleDownloadReport = async () => {
    try {
      const blob = await downloadReport.mutateAsync(params.toString() || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // error handled by mutation
    }
  };

  const displayDocs = activeTab === 'expiring' ? expiring30 : documents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión Documental</h1>
          <p className="text-sm text-muted-foreground">Repositorio centralizado de documentos controlados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloadReport.isPending}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {downloadReport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => router.push('/documents/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo Documento
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          icon={FileText}
          label="Total documentos"
          value={documents.length}
          color="text-primary"
        />
        <KPICard
          icon={CheckCircle}
          label="Aprobados"
          value={documents.filter((d) => d.status === 'approved').length}
          color="text-green-600"
        />
        <KPICard
          icon={Clock}
          label="En revisión"
          value={documents.filter((d) => d.status === 'under_review').length}
          color="text-blue-600"
        />
        <KPICard
          icon={AlertTriangle}
          label="Por vencer (30d)"
          value={expiring30.length}
          color={expiring30.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}
          highlight={expiring30.length > 0}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <FolderOpen className="mr-2 inline h-4 w-4" />
          Todos los documentos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expiring')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'expiring'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Clock className="h-4 w-4" />
          Por vencer
          {expiring30.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {expiring30.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o título..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filtrar por tipo"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(DOC_TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(DOC_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {activeTab === 'all' && (
          <select
            value={expiryDays ?? ''}
            onChange={(e) => setExpiryDays(e.target.value ? Number(e.target.value) : null)}
            aria-label="Filtrar por vencimiento"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="">Sin filtro de vencimiento</option>
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Documents Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !displayDocs.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {activeTab === 'expiring'
              ? 'No hay documentos próximos a vencer'
              : 'No hay documentos que coincidan con los filtros'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ver.</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoría</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revisión</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayDocs.map((doc) => {
                const typeConf = DOC_TYPE_CONFIG[doc.doc_type];
                const statusConf = DOC_STATUS_CONFIG[doc.status as DocumentStatus];
                const isExpiringSoon = doc.review_date &&
                  new Date(doc.review_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <tr
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/documents/${doc.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">{doc.code}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{doc.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ color: typeConf?.color, backgroundColor: `${typeConf?.color}20` }}
                      >
                        {typeConf?.label ?? doc.doc_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">v{doc.version}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusConf?.bg, statusConf?.color)}>
                        {statusConf?.label ?? doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      {doc.review_date ? (
                        <span className={cn('text-xs', isExpiringSoon ? 'font-medium text-amber-600' : 'text-muted-foreground')}>
                          {isExpiringSoon && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                          {formatDate(doc.review_date)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/documents/${doc.id}`); }}
                        className="rounded p-1 hover:bg-muted"
                        aria-label="Ver documento"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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

function KPICard({
  icon: Icon, label, value, color, highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 transition-all',
      highlight ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-border',
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn('mt-1 text-2xl font-bold', color)}>{value}</p>
    </div>
  );
}
