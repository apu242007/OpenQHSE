'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertTriangle, FileDown, Shield, CheckCircle2,
  Search as SearchIcon, Clock, MapPin, User, Users, Paperclip,
  MessageSquare, Activity, BookOpen, XCircle, RotateCcw,
} from 'lucide-react';
import {
  useIncident, useIncidentActions, useCloseIncident, useReopenIncident,
  useAssignInvestigator, useDownloadIncidentReport,
} from '@/hooks/use-incidents';
import { InvestigationWizard } from '@/components/incidents/InvestigationWizard';
import type { CorrectiveAction, TimelineEvent } from '@/types/incidents';
import { INCIDENT_TYPE_CONFIG, SEVERITY_CONFIG } from '@/types/incidents';
import { cn, formatDate, statusColor } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  reported: 'Reportado',
  under_investigation: 'En investigación',
  corrective_actions: 'Acciones correctivas',
  review: 'En revisión',
  closed: 'Cerrado',
};

const TABS = [
  { key: 'summary', label: 'Resumen', icon: Activity },
  { key: 'investigation', label: 'Investigación', icon: SearchIcon },
  { key: 'actions', label: 'Acciones', icon: CheckCircle2 },
  { key: 'documents', label: 'Documentos', icon: Paperclip },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'lessons', label: 'Lecciones', icon: BookOpen },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: incident, isLoading } = useIncident(id);
  const { data: actions } = useIncidentActions(id);
  const closeMutation = useCloseIncident();
  const reopenMutation = useReopenIncident();
  const reportMutation = useDownloadIncidentReport();
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  if (isLoading || !incident) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const typeConfig = INCIDENT_TYPE_CONFIG[incident.incident_type];
  const sevConfig = SEVERITY_CONFIG[incident.severity];

  const handleDownloadPDF = async () => {
    const blob = await reportMutation.mutateAsync(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-${incident.reference_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => router.back()} className="mt-1 rounded-lg p-2 hover:bg-muted" aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="font-mono text-xs text-muted-foreground">{incident.reference_number}</p>
            <h1 className="text-2xl font-bold">{incident.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusColor(incident.status))}>
                {STATUS_LABELS[incident.status] ?? incident.status}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: typeConfig?.color, backgroundColor: `${typeConfig?.color}20` }}>
                {typeConfig?.label}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sevConfig?.bg)} style={{ color: sevConfig?.color }}>
                {sevConfig?.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {incident.status !== 'closed' && (
            <button
              type="button"
              onClick={() => closeMutation.mutate(id)}
              disabled={closeMutation.isPending}
              className="flex items-center gap-1 rounded-lg border border-safe px-3 py-2 text-sm text-safe hover:bg-safe/10 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Cerrar
            </button>
          )}
          {incident.status === 'closed' && (
            <button
              type="button"
              onClick={() => reopenMutation.mutate(id)}
              disabled={reopenMutation.isPending}
              className="flex items-center gap-1 rounded-lg border border-warning px-3 py-2 text-sm text-warning hover:bg-warning/10 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Reabrir
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={reportMutation.isPending}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <FileDown className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && <SummaryTab incident={incident} />}
      {activeTab === 'investigation' && <InvestigationTab incident={incident} />}
      {activeTab === 'actions' && <ActionsTab actions={actions ?? []} />}
      {activeTab === 'documents' && <DocumentsTab incident={incident} />}
      {activeTab === 'timeline' && <TimelineTab events={incident.timeline_events ?? []} />}
      {activeTab === 'lessons' && <LessonsTab incident={incident} />}
    </div>
  );
}

/* ── Summary Tab ──────────────────────────────────────────── */

function SummaryTab({ incident }: { incident: ReturnType<typeof useIncident>['data'] }) {
  if (!incident) return null;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={Clock} label="Fecha del incidente" value={formatDate(incident.occurred_at)} />
        <InfoCard icon={MapPin} label="Ubicación" value={incident.location_description ?? '—'} />
        <InfoCard icon={User} label="Reportado por" value={incident.reported_by_id} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-2 font-semibold">Descripción</h3>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{incident.description}</p>
      </div>

      {incident.immediate_actions && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-2 font-semibold">Acciones inmediatas</h3>
          <p className="text-sm text-muted-foreground">{incident.immediate_actions}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-2 font-semibold">Personas afectadas</h3>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold">{incident.injuries_count}</p>
              <p className="text-xs text-muted-foreground">Lesionados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-danger">{incident.fatalities_count}</p>
              <p className="text-xs text-muted-foreground">Fatalidades</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Testigos ({incident.witnesses?.length ?? 0})</h3>
          {incident.witnesses?.length ? (
            <ul className="space-y-1 text-sm">
              {incident.witnesses.map((w) => (
                <li key={w.id} className="text-muted-foreground">{w.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No se registraron testigos</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Investigation Tab ────────────────────────────────────── */

function InvestigationTab({ incident }: { incident: ReturnType<typeof useIncident>['data'] }) {
  if (!incident) return null;
  return (
    <div className="space-y-4">
      <InvestigationWizard incidentId={incident.id} existingData={incident.investigation ?? undefined} />
    </div>
  );
}

/* ── Actions Tab ──────────────────────────────────────────── */

function ActionsTab({ actions }: { actions: CorrectiveAction[] }) {
  if (!actions.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
        <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">No hay acciones correctivas registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actions.map((a) => (
        <div key={a.id} className="rounded-lg border border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
            </div>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColor(a.status))}>
              {a.status}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{a.action_type === 'corrective' ? 'Correctiva' : 'Preventiva'}</span>
            {a.due_date && <span>Vence: {formatDate(a.due_date)}</span>}
            <span className={cn('rounded px-1.5 py-0.5', a.priority === 'critical' ? 'bg-danger/20 text-danger' : a.priority === 'high' ? 'bg-orange-500/20 text-orange-500' : 'bg-muted')}>
              {a.priority}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Documents Tab ────────────────────────────────────────── */

function DocumentsTab({ incident }: { incident: ReturnType<typeof useIncident>['data'] }) {
  if (!incident) return null;
  const attachments = incident.incident_attachments ?? [];

  if (!attachments.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
        <Paperclip className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">No hay documentos adjuntos</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {attachments.map((att) => (
        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border p-4 hover:bg-muted">
          <Paperclip className="h-5 w-5 text-primary" />
          <p className="mt-1 text-sm font-medium truncate">{att.description || att.file_url.split('/').pop()}</p>
          <p className="text-xs text-muted-foreground">{att.file_type}</p>
        </a>
      ))}
    </div>
  );
}

/* ── Timeline Tab ─────────────────────────────────────────── */

function TimelineTab({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
        <Clock className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">No hay eventos en la línea de tiempo</p>
      </div>
    );
  }

  return (
    <div className="relative ml-4 space-y-0 border-l-2 border-border pl-6">
      {events.map((ev) => (
        <div key={ev.id} className="relative pb-6">
          <div className="absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-border bg-card">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</p>
          <p className="font-medium">{ev.title}</p>
          {ev.description && <p className="mt-0.5 text-sm text-muted-foreground">{ev.description}</p>}
          {ev.user_name && <p className="mt-0.5 text-xs text-muted-foreground">— {ev.user_name}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Lessons Tab ──────────────────────────────────────────── */

function LessonsTab({ incident }: { incident: ReturnType<typeof useIncident>['data'] }) {
  if (!incident) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <BookOpen className="h-5 w-5 text-primary" /> Lecciones aprendidas
      </h3>
      {incident.lessons_learned ? (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{incident.lessons_learned}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No se han documentado lecciones aprendidas aún.</p>
      )}
    </div>
  );
}

/* ── Info Card ────────────────────────────────────────────── */

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
