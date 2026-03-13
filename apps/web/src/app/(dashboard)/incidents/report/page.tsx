'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, AlertTriangle, MapPin, Camera,
  Users, Shield, Loader2, CheckCircle2, Clock,
} from 'lucide-react';
import { useCreateIncident, useAddWitness } from '@/hooks/use-incidents';
import type { IncidentReportDraft, IncidentType, IncidentSeverity } from '@/types/incidents';
import { INCIDENT_TYPE_CONFIG, SEVERITY_CONFIG } from '@/types/incidents';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'type', label: '¿Qué pasó?', icon: AlertTriangle },
  { key: 'details', label: 'Detalles', icon: Clock },
  { key: 'location', label: 'Ubicación', icon: MapPin },
  { key: 'people', label: 'Personas', icon: Users },
  { key: 'confirm', label: 'Confirmar', icon: CheckCircle2 },
] as const;

export default function ReportIncidentPage() {
  const router = useRouter();
  const createMutation = useCreateIncident();
  const witnessMutation = useAddWitness();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<IncidentReportDraft>({
    injuries_count: 0,
    fatalities_count: 0,
    witnesses: [],
  });

  const update = (partial: Partial<IncidentReportDraft>) => setDraft((d) => ({ ...d, ...partial }));
  const canNext = () => {
    if (step === 0) return !!draft.incident_type;
    if (step === 1) return !!draft.title && !!draft.description;
    return true;
  };

  const handleSubmit = async () => {
    try {
      const res = await createMutation.mutateAsync({
        title: draft.title ?? 'Incidente sin título',
        description: draft.description ?? '',
        incident_type: draft.incident_type,
        severity: draft.severity ?? 'moderate',
        occurred_at: draft.occurred_at ?? new Date().toISOString(),
        location_description: draft.location_description,
        gps_latitude: draft.gps_latitude,
        gps_longitude: draft.gps_longitude,
        injuries_count: draft.injuries_count ?? 0,
        fatalities_count: draft.fatalities_count ?? 0,
        immediate_actions: draft.immediate_actions,
      }) as unknown as { id: string };

      // Add witnesses
      if (draft.witnesses?.length) {
        for (const w of draft.witnesses) {
          await witnessMutation.mutateAsync({
            incidentId: res.id,
            data: { name: w.name, contact: w.contact, statement: w.statement },
          });
        }
      }

      router.push('/incidents');
    } catch {
      // error handled by react-query
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-lg p-2 hover:bg-muted" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-danger">Reportar Incidente</h1>
          <p className="text-sm text-muted-foreground">Complete los datos del incidente</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, idx) => (
          <div key={s.key} className="flex flex-1 items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                idx <= step ? 'bg-danger text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {idx + 1}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn('mx-1 h-0.5 flex-1', idx < step ? 'bg-danger' : 'bg-muted')} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-medium">{STEPS[step]?.label}</p>

      {/* Step Content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {step === 0 && <StepType draft={draft} update={update} />}
        {step === 1 && <StepDetails draft={draft} update={update} />}
        {step === 2 && <StepLocation draft={draft} update={update} />}
        {step === 3 && <StepPeople draft={draft} update={update} />}
        {step === 4 && <StepConfirm draft={draft} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
          >
            Siguiente <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-danger px-6 py-2 text-sm font-bold text-white hover:bg-danger/90 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            ENVIAR REPORTE
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Step: Type ───────────────────────────────────────────── */

function StepType({ draft, update }: { draft: IncidentReportDraft; update: (p: Partial<IncidentReportDraft>) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Seleccione el tipo de incidente</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(Object.entries(INCIDENT_TYPE_CONFIG) as [IncidentType, typeof INCIDENT_TYPE_CONFIG[IncidentType]][]).map(
          ([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ incident_type: key })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all',
                draft.incident_type === key
                  ? 'border-danger bg-danger/5 ring-1 ring-danger'
                  : 'border-border hover:border-danger/50',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${cfg.color}20` }}>
                <AlertTriangle className="h-5 w-5" style={{ color: cfg.color }} />
              </div>
              <span className="text-xs font-medium">{cfg.label}</span>
            </button>
          ),
        )}
      </div>

      {/* Severity */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium">Severidad</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(SEVERITY_CONFIG) as [IncidentSeverity, typeof SEVERITY_CONFIG[IncidentSeverity]][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => update({ severity: key })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  draft.severity === key
                    ? `${cfg.bg} border-current`
                    : 'border-border hover:bg-muted',
                )}
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step: Details ────────────────────────────────────────── */

function StepDetails({ draft, update }: { draft: IncidentReportDraft; update: (p: Partial<IncidentReportDraft>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="inc-title" className="mb-1 block text-sm font-medium">Título *</label>
        <input
          id="inc-title"
          type="text"
          value={draft.title ?? ''}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Breve descripción del incidente"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label htmlFor="inc-desc" className="mb-1 block text-sm font-medium">Descripción *</label>
        <textarea
          id="inc-desc"
          value={draft.description ?? ''}
          onChange={(e) => update({ description: e.target.value })}
          rows={4}
          placeholder="¿Qué sucedió? ¿Cómo ocurrió? ¿Qué se estaba haciendo?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="occurred-at" className="mb-1 block text-sm font-medium">Fecha y hora del incidente</label>
          <input
            id="occurred-at"
            type="datetime-local"
            value={draft.occurred_at ?? ''}
            onChange={(e) => update({ occurred_at: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="immediate-actions" className="mb-1 block text-sm font-medium">Acciones inmediatas tomadas</label>
          <input
            id="immediate-actions"
            type="text"
            value={draft.immediate_actions ?? ''}
            onChange={(e) => update({ immediate_actions: e.target.value })}
            placeholder="Ej: Se evacuó el área, se prestó primeros auxilios..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Step: Location ───────────────────────────────────────── */

function StepLocation({ draft, update }: { draft: IncidentReportDraft; update: (p: Partial<IncidentReportDraft>) => void }) {
  const requestGPS = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => update({ gps_latitude: pos.coords.latitude, gps_longitude: pos.coords.longitude }),
        () => { /* permission denied or error */ },
      );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="location-desc" className="mb-1 block text-sm font-medium">Descripción del lugar</label>
        <input
          id="location-desc"
          type="text"
          value={draft.location_description ?? ''}
          onChange={(e) => update({ location_description: e.target.value })}
          placeholder="Ej: Planta A, nivel 2, zona de almacenamiento"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Coordenadas GPS</p>
        <button
          type="button"
          onClick={requestGPS}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          <MapPin className="h-4 w-4" /> Obtener ubicación actual
        </button>
        {draft.gps_latitude && (
          <p className="mt-2 text-xs text-muted-foreground">
            📍 {draft.gps_latitude.toFixed(6)}, {draft.gps_longitude?.toFixed(6)}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Evidencia fotográfica</p>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
        >
          <Camera className="h-4 w-4" /> Tomar foto / Adjuntar imagen
        </button>
      </div>
    </div>
  );
}

/* ── Step: People ─────────────────────────────────────────── */

function StepPeople({ draft, update }: { draft: IncidentReportDraft; update: (p: Partial<IncidentReportDraft>) => void }) {
  const addWitness = () => {
    update({ witnesses: [...(draft.witnesses ?? []), { name: '', contact: '', statement: '' }] });
  };
  const updateWitness = (idx: number, field: string, value: string) => {
    const witnesses = [...(draft.witnesses ?? [])];
    const existing = witnesses[idx];
    if (existing) witnesses[idx] = { ...existing, [field]: value };
    update({ witnesses });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="injuries" className="mb-1 block text-sm font-medium">Nº de lesionados</label>
          <input
            id="injuries"
            type="number"
            min={0}
            value={draft.injuries_count ?? 0}
            onChange={(e) => update({ injuries_count: Number(e.target.value) })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="fatalities" className="mb-1 block text-sm font-medium">Nº de fatalidades</label>
          <input
            id="fatalities"
            type="number"
            min={0}
            value={draft.fatalities_count ?? 0}
            onChange={(e) => update({ fatalities_count: Number(e.target.value) })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Testigos</p>
          <button type="button" onClick={addWitness} className="text-xs text-primary hover:underline">+ Agregar testigo</button>
        </div>
        <div className="mt-2 space-y-3">
          {(draft.witnesses ?? []).map((w, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
              <input
                type="text"
                value={w.name}
                onChange={(e) => updateWitness(idx, 'name', e.target.value)}
                placeholder="Nombre"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none"
              />
              <input
                type="text"
                value={w.contact ?? ''}
                onChange={(e) => updateWitness(idx, 'contact', e.target.value)}
                placeholder="Teléfono / Email"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none"
              />
              <input
                type="text"
                value={w.statement ?? ''}
                onChange={(e) => updateWitness(idx, 'statement', e.target.value)}
                placeholder="Declaración breve"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step: Confirm ────────────────────────────────────────── */

function StepConfirm({ draft }: { draft: IncidentReportDraft }) {
  const typeConfig = draft.incident_type ? INCIDENT_TYPE_CONFIG[draft.incident_type] : null;
  const sevConfig = draft.severity ? SEVERITY_CONFIG[draft.severity] : null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Resumen del reporte</h3>
      <div className="grid gap-3 text-sm">
        <Row label="Tipo" value={typeConfig?.label ?? '—'} />
        <Row label="Severidad" value={sevConfig?.label ?? '—'} />
        <Row label="Título" value={draft.title ?? '—'} />
        <Row label="Descripción" value={draft.description ?? '—'} />
        <Row label="Ubicación" value={draft.location_description ?? '—'} />
        <Row label="Lesionados" value={String(draft.injuries_count ?? 0)} />
        <Row label="Fatalidades" value={String(draft.fatalities_count ?? 0)} />
        <Row label="Testigos" value={String(draft.witnesses?.length ?? 0)} />
      </div>
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
        <p className="text-xs text-warning-foreground">
          ⚠️ Al enviar este reporte, se notificará automáticamente al equipo de seguridad y se iniciará el proceso de investigación.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
