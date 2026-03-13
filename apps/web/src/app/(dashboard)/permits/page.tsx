/**
 * Permits (PTW) — Active permits dashboard with auto-refresh.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Box,
  ArrowUpFromLine,
  Zap,
  Filter,
} from 'lucide-react';
import { usePermits, usePermitStatistics } from '@/hooks/use-permits';
import {
  PERMIT_STATUS_CONFIG,
  PERMIT_TYPE_CONFIG,
  type PermitStatus,
  type PermitType,
  type WorkPermitListItem,
} from '@/types/permits';

/* ── Icon map ────────────────────────────────────────────── */
const TYPE_ICONS: Record<string, React.ReactNode> = {
  hot_work: <Flame className="h-4 w-4" />,
  confined_space: <Box className="h-4 w-4" />,
  working_at_height: <ArrowUpFromLine className="h-4 w-4" />,
  electrical: <Zap className="h-4 w-4" />,
};

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

/* ── Permit row ──────────────────────────────────────────── */
function PermitRow({ permit }: { permit: WorkPermitListItem }) {
  const statusCfg = PERMIT_STATUS_CONFIG[permit.status];
  const typeCfg = PERMIT_TYPE_CONFIG[permit.permit_type];

  const isExpired =
    permit.status === 'active' && new Date(permit.valid_until) < new Date();

  return (
    <Link
      href={`/permits/${permit.id}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
    >
      {/* Type icon */}
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${typeCfg.color}20`, color: typeCfg.color }}
      >
        {TYPE_ICONS[permit.permit_type] ?? <Shield className="h-4 w-4" />}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{permit.title}</p>
          <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {permit.reference_number}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{typeCfg.label}</p>
      </div>

      {/* Validity */}
      <div className="hidden md:block text-right text-xs text-muted-foreground">
        <p>{new Date(permit.valid_from).toLocaleDateString('es-CL')}</p>
        <p>→ {new Date(permit.valid_until).toLocaleDateString('es-CL')}</p>
      </div>

      {/* Status badge */}
      <span
        className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
        style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
      >
        {isExpired ? 'Expirado' : statusCfg.label}
      </span>
    </Link>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function PermitsPage() {
  const [statusFilter, setStatusFilter] = useState<PermitStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<PermitType | ''>('');

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (statusFilter) sp.set('status', statusFilter);
    if (typeFilter) sp.set('permit_type', typeFilter);
    return sp.toString();
  }, [statusFilter, typeFilter]);

  const { data: permits, isLoading } = usePermits(params || undefined);
  const { data: stats } = usePermitStatistics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permisos de Trabajo</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de permisos de trabajo (PTW) con actualización automática cada 30 s
          </p>
        </div>
        <Link
          href="/permits/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo permiso
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} color="#6b7280" icon={<Shield className="h-5 w-5" />} />
          <StatCard label="Activos" value={stats.active} color="#22c55e" icon={<CheckCircle className="h-5 w-5" />} />
          <StatCard label="Expirados" value={stats.expired} color="#dc2626" icon={<AlertTriangle className="h-5 w-5" />} />
          <StatCard
            label="Pend. aprobación"
            value={stats.by_status?.['pending_approval'] ?? 0}
            color="#f59e0b"
            icon={<Clock className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PermitStatus | '')}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Todos los estados</option>
          {Object.entries(PERMIT_STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as PermitType | '')}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(PERMIT_TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Permit list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !permits?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          No se encontraron permisos.
        </div>
      ) : (
        <div className="space-y-3">
          {permits.map((p) => (
            <PermitRow key={p.id} permit={p} />
          ))}
        </div>
      )}
    </div>
  );
}
