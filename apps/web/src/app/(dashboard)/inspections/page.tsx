'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, ClipboardCheck, Calendar, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, Filter, Loader2, MoreHorizontal,
  Play, Eye, FileDown, BarChart3,
} from 'lucide-react';
import { useInspections, useInspectionKPIs, useInspectionCalendar } from '@/hooks/use-inspections';
import type { Inspection, InspectionStatus, InspectionCalendarEvent } from '@/types/inspections';
import { cn, formatDate, formatPercent, statusColor } from '@/lib/utils';

const STATUS_LABELS: Record<InspectionStatus, string> = {
  draft: 'Borrador',
  in_progress: 'En progreso',
  completed: 'Completada',
  reviewed: 'Revisada',
  archived: 'Archivada',
};

const TAB_OPTIONS = [
  { key: 'table', label: 'Tabla', icon: ClipboardCheck },
  { key: 'calendar', label: 'Calendario', icon: Calendar },
] as const;

export default function InspectionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'table' | 'calendar'>('table');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);

  const { data: listData, isLoading } = useInspections(params.toString() || undefined);
  const { data: kpis } = useInspectionKPIs();
  const { data: calendarEvents } = useInspectionCalendar(currentMonth);

  const inspections = listData?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inspecciones</h1>
          <p className="text-sm text-muted-foreground">Programa, ejecuta y gestiona inspecciones de seguridad</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/inspections/schedule')}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Calendar className="h-4 w-4" /> Programar
          </button>
          <button
            type="button"
            onClick={() => router.push('/inspections/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nueva inspección
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KPICard icon={CheckCircle2} label="Completadas hoy" value={kpis.completed_today} color="text-safe" />
          <KPICard icon={Play} label="En progreso" value={kpis.in_progress} color="text-primary" />
          <KPICard icon={AlertTriangle} label="Vencidas" value={kpis.overdue} color="text-danger" />
          <KPICard icon={TrendingUp} label="Cumplimiento" value={formatPercent(kpis.compliance_rate)} color="text-safe" />
          <KPICard icon={BarChart3} label="Puntuación promedio" value={formatPercent(kpis.avg_score)} color="text-primary" />
          <KPICard icon={Clock} label="Programadas semana" value={kpis.scheduled_this_week} color="text-warning" />
        </div>
      )}

      {/* Tab switcher + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border">
          {TAB_OPTIONS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar inspecciones..."
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
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tab === 'table' ? (
        <InspectionsTable inspections={inspections} onView={(id) => router.push(`/inspections/${id}`)} />
      ) : (
        <InspectionCalendarView events={calendarEvents ?? []} month={currentMonth} onMonthChange={setCurrentMonth} />
      )}
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────────── */

function KPICard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

/* ── Table ────────────────────────────────────────────────── */

function InspectionsTable({ inspections, onView }: { inspections: Inspection[]; onView: (id: string) => void }) {
  if (!inspections.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">No hay inspecciones registradas</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referencia</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Puntuación</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha prog.</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {inspections.map((ins) => (
            <tr key={ins.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onView(ins.id)}>
              <td className="px-4 py-3 font-mono text-xs">{ins.reference_number}</td>
              <td className="px-4 py-3 font-medium">{ins.title}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusColor(ins.status))}>
                  {STATUS_LABELS[ins.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                {ins.score != null && ins.max_score ? (
                  <span className="font-medium">{Math.round((ins.score / ins.max_score) * 100)}%</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {ins.scheduled_date ? formatDate(ins.scheduled_date) : '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onView(ins.id); }}
                    className="rounded p-1 hover:bg-muted" aria-label="Ver"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Calendar View ────────────────────────────────────────── */

function InspectionCalendarView({
  events,
  month,
  onMonthChange,
}: {
  events: InspectionCalendarEvent[];
  month: string;
  onMonthChange: (m: string) => void;
}) {
  const parts = month.split('-').map(Number);
  const year = parts[0] ?? 2024;
  const m = parts[1] ?? 1;
  const firstDay = new Date(year, m - 1, 1);
  const lastDay = new Date(year, m, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekDay = firstDay.getDay(); // 0=Sun

  const prevMonth = () => {
    const d = new Date(year, m - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, m, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < startWeekDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const eventsMap = new Map<number, InspectionCalendarEvent[]>();
  for (const ev of events) {
    const day = new Date(ev.scheduled_date).getDate();
    if (!eventsMap.has(day)) eventsMap.set(day, []);
    eventsMap.get(day)!.push(ev);
  }

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded p-1 hover:bg-muted">←</button>
        <h2 className="text-lg font-bold">{monthNames[m - 1]} {year}</h2>
        <button type="button" onClick={nextMonth} className="rounded p-1 hover:bg-muted">→</button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={cn('min-h-[80px] rounded border border-transparent p-1 text-xs', day ? 'hover:border-border' : '')}
          >
            {day && (
              <>
                <span className="font-medium">{day}</span>
                <div className="mt-1 space-y-0.5">
                  {(eventsMap.get(day) ?? []).slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={cn('truncate rounded px-1 py-0.5', statusColor(ev.status))}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {(eventsMap.get(day)?.length ?? 0) > 3 && (
                    <span className="text-muted-foreground">+{(eventsMap.get(day)?.length ?? 0) - 3} más</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
