/**
 * CAPA Module — Kanban board with drag-and-drop.
 * Lists all corrective/preventive actions grouped by status.
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Filter,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle,
  ShieldCheck,
  Circle,
  GripVertical,
} from 'lucide-react';
import { useKanbanBoard, useActionStatistics, useUpdateAction } from '@/hooks/use-actions';
import type { ActionListItem, ActionStatus, ActionPriority } from '@/types/actions';
import { PRIORITY_CONFIG, STATUS_CONFIG, KANBAN_COLUMNS } from '@/types/actions';

/* ── Status icon mapping ───────────────────────────────────── */
const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Circle className="h-4 w-4" />,
  in_progress: <Clock className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  verified: <ShieldCheck className="h-4 w-4" />,
  overdue: <AlertTriangle className="h-4 w-4" />,
};

/* ── Action Card ────────────────────────────────────────────── */
function ActionCard({ action }: { action: ActionListItem }) {
  const priorityCfg = PRIORITY_CONFIG[action.priority as ActionPriority];
  const isOverdue =
    action.due_date &&
    new Date(action.due_date) < new Date() &&
    !['completed', 'verified'].includes(action.status);

  return (
    <Link href={`/actions/${action.id}`}>
      <div className="group cursor-pointer rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${priorityCfg?.color ?? '#6b7280'}20`, color: priorityCfg?.color ?? '#6b7280' }}
            >
              {priorityCfg?.label ?? action.priority}
            </span>
          </div>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted">
            {action.action_type === 'corrective' ? 'AC' : 'AP'}
          </span>
        </div>

        <h4 className="mb-1 text-sm font-medium text-foreground line-clamp-2">
          {action.title}
        </h4>

        {action.due_date && (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
            <Clock className="h-3 w-3" />
            <span>
              {new Date(action.due_date).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Kanban Column ──────────────────────────────────────────── */
function KanbanColumnComponent({
  status,
  label,
  color,
  items,
  count,
}: {
  status: string;
  label: string;
  color: string;
  items: ActionListItem[];
  count: number;
}) {
  return (
    <div className="flex min-w-[260px] max-w-[300px] flex-1 flex-col rounded-lg border border-border bg-muted/30">
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {items.map((item) => (
          <ActionCard key={item.id} action={item} />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            Sin acciones
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function ActionsPage() {
  const { data: kanban, isLoading: kanbanLoading } = useKanbanBoard();
  const { data: stats } = useActionStatistics();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acciones Correctivas (CAPA)</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de acciones correctivas y preventivas con tablero Kanban
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/actions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nueva acción
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total', value: stats.total, color: '#6b7280' },
            { label: 'Abiertas', value: stats.open, color: '#6b7280' },
            { label: 'En progreso', value: stats.in_progress, color: '#3b82f6' },
            { label: 'Completadas', value: stats.completed, color: '#f59e0b' },
            { label: 'Verificadas', value: stats.verified, color: '#22c55e' },
            { label: 'Vencidas', value: stats.overdue, color: '#dc2626' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-xl font-bold" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      {kanbanLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : kanban ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanban.columns.map((col) => (
            <KanbanColumnComponent
              key={col.status}
              status={col.status}
              label={col.label}
              color={
                KANBAN_COLUMNS.find((c) => c.key === col.status)?.color ?? '#6b7280'
              }
              items={col.items}
              count={col.count}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No hay acciones correctivas registradas aún.
        </div>
      )}
    </div>
  );
}
