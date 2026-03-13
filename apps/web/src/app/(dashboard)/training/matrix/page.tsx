'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, CheckCircle, Clock, XCircle, AlertTriangle,
  BarChart3, Users, BookOpen, UserPlus,
} from 'lucide-react';
import { useComplianceMatrix, useBulkEnroll } from '@/hooks/use-training';
import { cn } from '@/lib/utils';

type CellStatus = 'completed' | 'in_progress' | 'pending' | 'expired';

function getCellStatus(cell: { pct: number; completed: number; enrolled: number; expired: number }): CellStatus {
  if (cell.expired > 0 && cell.completed <= cell.expired) return 'expired';
  if (cell.pct >= 80) return 'completed';
  if (cell.enrolled > 0 && cell.pct > 0) return 'in_progress';
  return 'pending';
}

const CELL_STATUS_CONFIG: Record<CellStatus, { icon: React.ElementType; bg: string; text: string; label: string }> = {
  completed:   { icon: CheckCircle,    bg: 'bg-green-100 dark:bg-green-950/40',   text: 'text-green-700 dark:text-green-400',  label: 'Cumple' },
  in_progress: { icon: Clock,          bg: 'bg-yellow-100 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-400', label: 'En progreso' },
  pending:     { icon: XCircle,        bg: 'bg-red-100 dark:bg-red-950/40',       text: 'text-red-700 dark:text-red-400',       label: 'Pendiente' },
  expired:     { icon: AlertTriangle,  bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', label: 'Vencido' },
};

export default function CompetencyMatrixPage() {
  const router = useRouter();
  const { data: matrixData, isLoading } = useComplianceMatrix();
  const bulkEnroll = useBulkEnroll();

  const [selectedCell, setSelectedCell] = useState<{
    role: string;
    courseId: string;
    courseTitle: string;
    data: { pct: number; completed: number; enrolled: number; expired: number };
  } | null>(null);

  const handleAssign = async (courseId: string, role: string) => {
    try {
      const result = await bulkEnroll.mutateAsync({ courseId, role });
      setSelectedCell(null);
      alert(`Matriculados: ${result.enrolled} usuarios. Omitidos: ${result.skipped}`);
    } catch {
      // error handled
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!matrixData) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">No hay datos de matriz disponibles</p>
      </div>
    );
  }

  const { roles, courses, matrix, overall_pct } = matrixData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => router.push('/training')}
          className="mt-1 rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Matriz de Competencias</h1>
          <p className="text-sm text-muted-foreground">
            Estado de capacitación por rol y curso — Cumplimiento general: <strong>{overall_pct}%</strong>
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leyenda:</span>
        {Object.entries(CELL_STATUS_CONFIG).map(([status, conf]) => {
          const Icon = conf.icon;
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <span className={cn('flex items-center justify-center rounded h-5 w-5', conf.bg)}>
                <Icon className={cn('h-3 w-3', conf.text)} />
              </span>
              <span>{conf.label}</span>
            </div>
          );
        })}
      </div>

      {/* Matrix Table */}
      {roles.length === 0 || courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Configura la matriz de competencias para ver el estado aquí
          </p>
          <button
            type="button"
            onClick={() => router.push('/training')}
            className="mt-3 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Ir a configuración
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur">
              <tr>
                <th className="min-w-40 px-4 py-3 text-left font-medium text-muted-foreground sticky left-0 bg-muted/90">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Rol / Puesto
                  </div>
                </th>
                {courses.map((course) => (
                  <th key={course.id} className="min-w-32 px-3 py-3 text-center font-medium text-muted-foreground">
                    <div className="max-w-32 truncate text-xs" title={course.title}>
                      {course.title}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role) => {
                const roleMatrix = matrix[role] ?? {};
                const cells = courses.map((c) => roleMatrix[c.id]);
                const rolePct = cells.length > 0
                  ? cells.reduce((sum, cell) => sum + (cell?.pct ?? 0), 0) / cells.length
                  : 0;

                return (
                  <tr key={role} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium sticky left-0 bg-card">
                      {role}
                    </td>
                    {courses.map((course) => {
                      const cell = roleMatrix[course.id];
                      if (!cell) {
                        return (
                          <td key={course.id} className="px-3 py-3 text-center">
                            <span className="text-xs text-muted-foreground">—</span>
                          </td>
                        );
                      }
                      const cellStatus = getCellStatus(cell);
                      const conf = CELL_STATUS_CONFIG[cellStatus];
                      const Icon = conf.icon;
                      return (
                        <td key={course.id} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedCell({
                              role,
                              courseId: course.id,
                              courseTitle: course.title,
                              data: cell,
                            })}
                            title={`${conf.label} — ${cell.pct}% (${cell.completed}/${cell.enrolled})`}
                            className={cn(
                              'inline-flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-all hover:scale-105 hover:shadow-sm',
                              conf.bg,
                            )}
                          >
                            <Icon className={cn('h-4 w-4', conf.text)} />
                            <span className={cn('text-[10px] font-bold', conf.text)}>
                              {cell.pct}%
                            </span>
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn(
                          'text-sm font-bold',
                          rolePct >= 80 ? 'text-green-600' : rolePct >= 60 ? 'text-amber-500' : 'text-red-600',
                        )}>
                          {rolePct.toFixed(0)}%
                        </span>
                        <div className="h-1.5 w-16 rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              rolePct >= 80 ? 'bg-green-500' : rolePct >= 60 ? 'bg-amber-500' : 'bg-red-500',
                            )}
                            style={{ width: `${rolePct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cell Detail Modal */}
      {selectedCell && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{selectedCell.role}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{selectedCell.courseTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="rounded p-1 hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatCard label="Matriculados" value={selectedCell.data.enrolled} color="text-blue-600" />
              <StatCard label="Completados" value={selectedCell.data.completed} color="text-green-600" />
              <StatCard label="Vencidos" value={selectedCell.data.expired} color="text-orange-600" />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cumplimiento</span>
                <span className={cn(
                  'font-bold',
                  selectedCell.data.pct >= 80 ? 'text-green-600' : selectedCell.data.pct >= 60 ? 'text-amber-500' : 'text-red-600',
                )}>
                  {selectedCell.data.pct}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    selectedCell.data.pct >= 80 ? 'bg-green-500' : selectedCell.data.pct >= 60 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                  style={{ width: `${selectedCell.data.pct}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/training/courses/${selectedCell.courseId}`)}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                <BookOpen className="h-4 w-4" /> Ver curso
              </button>
              <button
                type="button"
                onClick={() => handleAssign(selectedCell.courseId, selectedCell.role)}
                disabled={bulkEnroll.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                {bulkEnroll.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Asignar a todos en rol
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center">
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
