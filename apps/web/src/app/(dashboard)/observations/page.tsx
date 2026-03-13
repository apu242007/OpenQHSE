'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  Plus,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  useObservations,
  useObservationStats,
  useUnsafeTrends,
  OBSERVATION_TYPE_LABELS,
  OBSERVATION_CATEGORY_LABELS,
  OBSERVATION_TYPE_COLOR,
  type Observation,
} from '@/hooks/use-observations';
import { cn } from '@/lib/utils';

// ── Mini chart (simple bar) ────────────────────────────────────────────────

function MiniBarChart({
  data,
  height = 80,
}: {
  data: { label: string; safe: number; unsafe: number }[];
  height?: number;
}) {
  const max = Math.max(...data.flatMap((d) => [d.safe + d.unsafe]), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-0.5">
          <div
            className="w-full flex flex-col justify-end rounded-sm overflow-hidden"
            style={{ height: height - 16 }}
          >
            <div
              className="w-full bg-red-400 rounded-t-sm"
              style={{ height: `${(d.unsafe / max) * 100}%` }}
            />
            <div
              className="w-full bg-green-400"
              style={{ height: `${(d.safe / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 truncate w-full text-center">
            {d.label.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Donut (CSS-only) ───────────────────────────────────────────────────────

function SafeUnsafeDonut({ safePct }: { safePct: number }) {
  const unsafe = Math.round(100 - safePct);
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative h-24 w-24 rounded-full"
        style={{
          background: `conic-gradient(#22c55e ${safePct}%, #ef4444 ${safePct}%)`,
        }}
      >
        <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{Math.round(safePct)}%</span>
        </div>
      </div>
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-600">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Seguro
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Inseguro {unsafe}%
        </span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ObservationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (typeFilter) params.set('type', typeFilter);

  const listQuery = useObservations(params.toString() || undefined);
  const statsQuery = useObservationStats('months=6');
  const trendsQuery = useUnsafeTrends('days=90');

  const observations = listQuery.data?.items ?? [];
  const stats = statsQuery.data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Observaciones BBS</h1>
          <p className="mt-1 text-sm text-gray-600">
            Behavior Based Safety — monitoreo proactivo de comportamientos
          </p>
        </div>
        <Link
          href="/observations/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Nueva Observación
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Total',
            value: stats?.total ?? 0,
            color: 'text-gray-900',
            icon: Eye,
          },
          {
            label: 'Seguros',
            value: stats?.safe_count ?? 0,
            color: 'text-green-600',
            icon: CheckCircle2,
          },
          {
            label: 'Inseguros',
            value: stats?.unsafe_count ?? 0,
            color: 'text-red-600',
            icon: AlertTriangle,
          },
          {
            label: 'Cuasi-accidentes',
            value: stats?.near_miss_count ?? 0,
            color: 'text-amber-600',
            icon: Zap,
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500">{card.label}</p>
              <card.icon size={16} className={card.color} />
            </div>
            <p className={cn('text-3xl font-bold', card.color)}>
              {statsQuery.isLoading ? '…' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Donut */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Ratio Seguro/Inseguro</h3>
          {statsQuery.isLoading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : (
            <SafeUnsafeDonut safePct={stats?.safe_pct ?? 0} />
          )}
        </div>

        {/* Monthly Trend */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Tendencia Mensual (6 meses)</h3>
          {statsQuery.isLoading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : (
            <MiniBarChart
              data={(stats?.monthly_trend ?? []).map((t) => ({
                label: t.label,
                safe: t.safe,
                unsafe: t.unsafe,
              }))}
              height={100}
            />
          )}
        </div>
      </div>

      {/* Top Unsafe Areas + Category breakdown */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top unsafe areas */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-gray-700">Áreas con más comportamientos inseguros</h3>
          </div>
          {statsQuery.isLoading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : (stats?.top_unsafe_areas ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos suficientes</p>
          ) : (
            <div className="space-y-2">
              {stats?.top_unsafe_areas.map((area) => (
                <div key={area.area} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-800 truncate">{area.area}</span>
                      <span className="text-gray-500 ml-2">{area.unsafe_count} inseguros</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${area.unsafe_pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-red-600 font-medium">{area.unsafe_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unsafe trends by category */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Tendencia insegura por categoría (90 días)</h3>
          </div>
          {trendsQuery.isLoading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : (trendsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">Sin observaciones inseguras en el período</p>
          ) : (
            <div className="space-y-2">
              {trendsQuery.data?.map((t) => (
                <div key={t.category} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {OBSERVATION_CATEGORY_LABELS[t.category as keyof typeof OBSERVATION_CATEGORY_LABELS] ?? t.category}
                  </span>
                  <span className="font-medium text-red-600">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters + list */}
      <div className="mb-4 flex gap-3">
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="SAFE">Seguro</option>
          <option value="UNSAFE">Inseguro</option>
          <option value="NEAR_MISS_BEHAVIOR">Cuasi-accidente</option>
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="OPEN">Abierta</option>
          <option value="IN_REVIEW">En revisión</option>
          <option value="ACTION_ASSIGNED">Con acción</option>
          <option value="CLOSED">Cerrada</option>
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {listQuery.isLoading ? (
          <p className="p-6 text-sm text-gray-500">Cargando observaciones…</p>
        ) : observations.length === 0 ? (
          <div className="p-8 text-center">
            <Eye className="mx-auto mb-2 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No hay observaciones registradas.</p>
            <Link
              href="/observations/new"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={14} />
              Registrar primera observación
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {observations.map((obs: Observation) => (
                <tr key={obs.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', OBSERVATION_TYPE_COLOR[obs.type])}>
                      {OBSERVATION_TYPE_LABELS[obs.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {OBSERVATION_CATEGORY_LABELS[obs.category]}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{obs.area ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {obs.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(obs.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/observations/${obs.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Ver <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
