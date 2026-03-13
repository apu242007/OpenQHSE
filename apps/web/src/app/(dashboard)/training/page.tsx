'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Clock, CheckCircle, AlertTriangle, Loader2,
  GraduationCap, BarChart3, Play, Award, Search, Plus,
  TrendingUp, Users,
} from 'lucide-react';
import { useCourses, useComplianceSummary, useExpiringCertifications, useMyEnrollments } from '@/hooks/use-training';
import { COURSE_TYPE_CONFIG, ENROLLMENT_STATUS_CONFIG } from '@/types/training';
import type { CourseType } from '@/types/training';
import { cn, formatDate } from '@/lib/utils';

export default function TrainingPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (typeFilter) params.set('course_type', typeFilter);

  const { data: courses = [], isLoading: coursesLoading } = useCourses(params.toString() || undefined);
  const { data: compliance } = useComplianceSummary();
  const { data: expiring = [] } = useExpiringCertifications(30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centro de Capacitación</h1>
          <p className="text-sm text-muted-foreground">Gestión de cursos, competencias y certificaciones</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/training/matrix')}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            <BarChart3 className="h-4 w-4" /> Matriz de competencias
          </button>
          <button
            type="button"
            onClick={() => router.push('/training/courses/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo curso
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          icon={TrendingUp}
          label="Cumplimiento general"
          value={compliance ? `${compliance.overall_pct}%` : '—'}
          color={compliance && compliance.overall_pct >= 80 ? 'text-green-600' : 'text-amber-500'}
          highlight={compliance !== undefined && compliance.overall_pct < 80}
        />
        <KPICard
          icon={BookOpen}
          label="Cursos disponibles"
          value={courses.length}
          color="text-primary"
        />
        <KPICard
          icon={Users}
          label="Roles en matriz"
          value={compliance?.by_role?.length ?? 0}
          color="text-purple-600"
        />
        <KPICard
          icon={AlertTriangle}
          label="Cert. por vencer (30d)"
          value={expiring.length}
          color={expiring.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}
          highlight={expiring.length > 0}
        />
      </div>

      {/* Expiring Alert */}
      {expiring.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                {expiring.length} certificación{expiring.length > 1 ? 'es' : ''} próxima{expiring.length > 1 ? 's' : ''} a vencer
              </p>
              <div className="mt-2 space-y-1">
                {expiring.slice(0, 3).map((e) => (
                  <p key={e.enrollment_id} className="text-xs text-amber-700 dark:text-amber-500">
                    Usuario {e.user_id.slice(0, 8)}... — {e.days_remaining} días restantes
                  </p>
                ))}
                {expiring.length > 3 && (
                  <p className="text-xs text-amber-700">
                    +{expiring.length - 3} más...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-role Compliance */}
      {compliance && compliance.by_role.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Cumplimiento por rol
          </h2>
          <div className="space-y-3">
            {compliance.by_role.map((item) => (
              <div key={item.role}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.role}</span>
                  <span className={cn(
                    'font-bold',
                    item.compliance_pct >= 80 ? 'text-green-600' : item.compliance_pct >= 60 ? 'text-amber-500' : 'text-red-600',
                  )}>
                    {item.compliance_pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      item.compliance_pct >= 80 ? 'bg-green-500' : item.compliance_pct >= 60 ? 'bg-amber-500' : 'bg-red-500',
                    )}
                    style={{ width: `${item.compliance_pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cursos..."
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
          {Object.entries(COURSE_TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Courses Grid */}
      {coursesLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !courses.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No hay cursos disponibles</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const typeConf = COURSE_TYPE_CONFIG[course.course_type as CourseType];
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => router.push(`/training/courses/${course.id}`)}
                className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Type badge */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ color: typeConf?.color, backgroundColor: `${typeConf?.color}20` }}
                  >
                    {typeConf?.label ?? course.course_type}
                  </span>
                  {course.is_mandatory && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Obligatorio
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="mt-3 font-semibold leading-tight group-hover:text-primary transition-colors">
                  {course.title}
                </h3>

                {/* Meta */}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration_hours}h
                  </span>
                  {course.category && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {course.category}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(course.created_at)}</span>
                  <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-3 w-3" /> Ver curso
                  </div>
                </div>
              </button>
            );
          })}
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
  value: string | number;
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
