'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, AlertTriangle, Loader2, Filter, Eye,
  TrendingDown, Shield, Clock, Flame, Activity, BarChart3, Calendar,
} from 'lucide-react';
import { useIncidents, useIncidentStatistics } from '@/hooks/use-incidents';
import { BirdPyramid } from '@/components/incidents/BirdPyramid';
import type { Incident, IncidentStatus, IncidentType } from '@/types/incidents';
import { INCIDENT_TYPE_CONFIG, SEVERITY_CONFIG } from '@/types/incidents';
import { cn, formatDate, statusColor } from '@/lib/utils';

const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reportado',
  under_investigation: 'En investigación',
  corrective_actions: 'Acciones correctivas',
  review: 'En revisión',
  closed: 'Cerrado',
};

export default function IncidentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);
  if (typeFilter) params.set('incident_type', typeFilter);

  const { data: listData, isLoading } = useIncidents(params.toString() || undefined);
  const { data: stats } = useIncidentStatistics();

  const incidents = listData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Incidentes</h1>
          <p className="text-sm text-muted-foreground">Reporta, investiga y gestiona incidentes de seguridad</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/incidents/report')}
          className="flex items-center gap-2 rounded-lg bg-danger px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-danger/25 hover:bg-danger/90 transition-all"
        >
          <AlertTriangle className="h-5 w-5" /> REPORTAR INCIDENTE
        </button>
      </div>

      {/* KPI Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <KPICard icon={Activity} label="Incidentes este año" value={stats.total_year} color="text-primary" />
          <KPICard icon={Shield} label="Días sin accidente" value={stats.days_without_accident} color="text-safe" highlight />
          <KPICard icon={TrendingDown} label="TRIR" value={stats.trir.toFixed(2)} color="text-warning" />
          <KPICard icon={Clock} label="LTIF" value={stats.ltif.toFixed(2)} color="text-danger" />
          <KPICard icon={BarChart3} label="Casi accidentes" value={stats.near_miss_count} color="text-amber-500" />
        </div>
      )}

      {/* Bird Pyramid + Trend */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Bird Pyramid */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Pirámide de Bird</h2>
            <BirdPyramid data={stats.bird_pyramid} />
          </div>

          {/* Monthly Trend */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Tendencia mensual</h2>
            <div className="flex h-48 items-end gap-2">
              {stats.monthly_trend.map((m) => {
                const maxCount = Math.max(...stats.monthly_trend.map((t) => t.count), 1);
                const height = (m.count / maxCount) * 100;
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium">{m.count}</span>
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    {m.lti > 0 && (
                      <div
                        className="w-full rounded-t bg-danger/80"
                        style={{ height: `${Math.max((m.lti / maxCount) * 100, 2)}%` }}
                      />
                    )}
                    <span className="text-[10px] text-muted-foreground">{m.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/80" /> Total</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger/80" /> LTI</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar incidentes..."
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
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filtrar por tipo"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(INCIDENT_TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !incidents.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Shield className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No hay incidentes registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referencia</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severidad</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {incidents.map((inc) => {
                const typeConfig = INCIDENT_TYPE_CONFIG[inc.incident_type];
                const sevConfig = SEVERITY_CONFIG[inc.severity];
                return (
                  <tr key={inc.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => router.push(`/incidents/${inc.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs">{inc.reference_number}</td>
                    <td className="px-4 py-3 font-medium">{inc.title}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: typeConfig?.color, backgroundColor: `${typeConfig?.color}20` }}>
                        {typeConfig?.label ?? inc.incident_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sevConfig?.bg)} style={{ color: sevConfig?.color }}>
                        {sevConfig?.label ?? inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusColor(inc.status))}>
                        {STATUS_LABELS[inc.status] ?? inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inc.occurred_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/incidents/${inc.id}`); }}
                        className="rounded p-1 hover:bg-muted" aria-label="Ver"
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

/* ── KPI Card ─────────────────────────────────────────────── */

function KPICard({ icon: Icon, label, value, color, highlight }: { icon: React.ElementType; label: string; value: string | number; color: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 transition-all', highlight ? 'border-safe/50 shadow-lg shadow-safe/10' : 'border-border')}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn('mt-1 text-2xl font-bold', highlight && 'text-safe')}>{value}</p>
    </div>
  );
}
