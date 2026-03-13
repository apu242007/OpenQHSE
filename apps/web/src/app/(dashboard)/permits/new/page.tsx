/**
 * New Permit — Multi-step wizard.
 * Step 1: Basic info + type
 * Step 2: Safety checklist (per type)
 * Step 3: Gas readings (confined_space)
 * Step 4: Review & submit
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  useCreatePermit,
  useSafetyChecklist,
  useGasLimits,
  useValidateGasReadings,
} from '@/hooks/use-permits';
import { PERMIT_TYPE_CONFIG, type PermitType } from '@/types/permits';

/* ── Types ───────────────────────────────────────────────── */
interface FormData {
  title: string;
  permit_type: PermitType | '';
  description: string;
  site_id: string;
  area_id: string;
  hazards_identified: string;
  precautions: string;
  ppe_required: string;
  valid_from: string;
  valid_until: string;
}

interface ChecklistState {
  [item: string]: boolean;
}

interface GasEntry {
  gas: string;
  value: string;
}

const INITIAL_FORM: FormData = {
  title: '',
  permit_type: '',
  description: '',
  site_id: '',
  area_id: '',
  hazards_identified: '',
  precautions: '',
  ppe_required: '',
  valid_from: '',
  valid_until: '',
};

const INITIAL_GASES: GasEntry[] = [
  { gas: 'O2', value: '' },
  { gas: 'LEL', value: '' },
  { gas: 'H2S', value: '' },
  { gas: 'CO', value: '' },
];

/* ── Step indicator ──────────────────────────────────────── */
function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, idx) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              idx < current
                ? 'bg-green-600 text-white'
                : idx === current
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {idx < current ? <Check className="h-4 w-4" /> : idx + 1}
          </div>
          <span
            className={`hidden sm:inline text-xs ${
              idx === current ? 'text-foreground font-medium' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
          {idx < steps.length - 1 && (
            <div className="h-px w-6 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function NewPermitPage() {
  const router = useRouter();
  const createPermit = useCreatePermit();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [gasEntries, setGasEntries] = useState<GasEntry[]>(INITIAL_GASES);
  const [gasResults, setGasResults] = useState<
    Array<{ gas: string; value: number; is_safe: boolean }> | null
  >(null);

  const needsGas = form.permit_type === 'confined_space';

  const steps = needsGas
    ? ['Información', 'Checklist', 'Lecturas de gas', 'Revisión']
    : ['Información', 'Checklist', 'Revisión'];

  /* Safety checklist query */
  const { data: checklistItems } = useSafetyChecklist(
    form.permit_type || undefined,
  );
  const { data: gasLimitsData } = useGasLimits();
  const validateGas = useValidateGasReadings();

  /* Reset checklist when type changes */
  useEffect(() => {
    setChecklist({});
  }, [form.permit_type]);

  const updateForm = useCallback(
    (key: keyof FormData, value: string) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const allRequiredChecked = checklistItems
    ? checklistItems
        .filter((c) => c.required)
        .every((c) => checklist[c.item])
    : true;

  /* Gas validation */
  const handleValidateGas = useCallback(() => {
    const readings = gasEntries
      .filter((g) => g.value !== '')
      .map((g) => ({ gas: g.gas, value: parseFloat(g.value) }));

    validateGas.mutate(readings, {
      onSuccess: (data) => setGasResults(data as Array<{ gas: string; value: number; is_safe: boolean }>),
    });
  }, [gasEntries, validateGas]);

  /* Submit */
  const handleSubmit = useCallback(() => {
    const body: Record<string, unknown> = {
      title: form.title,
      permit_type: form.permit_type,
      description: form.description,
      site_id: form.site_id,
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      hazards_identified: form.hazards_identified
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      precautions: form.precautions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      ppe_required: form.ppe_required
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      checklist_data: checklist,
    };
    if (form.area_id) body['area_id'] = form.area_id;

    createPermit.mutate(body, {
      onSuccess: (data) => {
        const permitData = data as { id?: string };
        router.push(permitData.id ? `/permits/${permitData.id}` : '/permits');
      },
    });
  }, [form, checklist, createPermit, router]);

  /* Navigation guards */
  const canNext = () => {
    if (step === 0) {
      return (
        form.title &&
        form.permit_type &&
        form.description &&
        form.site_id &&
        form.valid_from &&
        form.valid_until
      );
    }
    if (step === 1) return allRequiredChecked;
    if (needsGas && step === 2) return true; // gas is advisory
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/permits"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        <h1 className="text-xl font-bold text-foreground">Nuevo Permiso de Trabajo</h1>

        <StepIndicator steps={steps} current={step} />

        {/* ── Step 0: Basic Info ─────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
              <input
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Trabajo en caliente — Área de soldadura"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo de permiso *
              </label>
              <select
                value={form.permit_type}
                onChange={(e) => updateForm('permit_type', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Seleccionar tipo</option>
                {Object.entries(PERMIT_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Descripción *</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Site ID *</label>
                <input
                  value={form.site_id}
                  onChange={(e) => updateForm('site_id', e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Área ID</label>
                <input
                  value={form.area_id}
                  onChange={(e) => updateForm('area_id', e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Válido desde *</label>
                <input
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(e) => updateForm('valid_from', e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Válido hasta *</label>
                <input
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) => updateForm('valid_until', e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Peligros identificados (separados por coma)
              </label>
              <input
                value={form.hazards_identified}
                onChange={(e) => updateForm('hazards_identified', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Incendio, Quemaduras, Gases tóxicos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Precauciones (separadas por coma)
              </label>
              <input
                value={form.precautions}
                onChange={(e) => updateForm('precautions', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Extintor a mano, Vigía de fuego"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                EPP requerido (separado por coma)
              </label>
              <input
                value={form.ppe_required}
                onChange={(e) => updateForm('ppe_required', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Casco, Guantes, Gafas, Arnés"
              />
            </div>
          </div>
        )}

        {/* ── Step 1: Checklist ──────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Checklist de seguridad — {PERMIT_TYPE_CONFIG[form.permit_type as PermitType]?.label}
            </h2>
            {checklistItems?.length ? (
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <label
                    key={item.item}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      checked={!!checklist[item.item]}
                      onChange={(e) =>
                        setChecklist((prev) => ({
                          ...prev,
                          [item.item]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-border"
                    />
                    <div>
                      <p className="text-sm text-foreground">{item.item}</p>
                      {item.required && (
                        <span className="text-[10px] text-red-500 font-medium">
                          Obligatorio
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay checklist disponible para este tipo de permiso.
              </p>
            )}
            {!allRequiredChecked && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <AlertTriangle className="h-3 w-3" />
                Debe completar todos los ítems obligatorios.
              </p>
            )}
          </div>
        )}

        {/* ── Step 2 (conditional): Gas readings ─────────── */}
        {needsGas && step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Lecturas de gas</h2>
            <p className="text-xs text-muted-foreground">
              Ingrese las lecturas atmosféricas antes de ingresar al espacio confinado.
            </p>

            {/* Limits info */}
            {gasLimitsData && (
              <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Límites seguros:</p>
                {Object.entries(gasLimitsData).map(([gas, limits]) => (
                  <span key={gas} className="inline-block mr-4">
                    {gas}: {limits.min}–{limits.max} {limits.unit}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {gasEntries.map((entry, idx) => (
                <div key={entry.gas} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-mono text-foreground">{entry.gas}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={entry.value}
                    onChange={(e) =>
                      setGasEntries((prev) =>
                        prev.map((g, i) =>
                          i === idx ? { ...g, value: e.target.value } : g,
                        ),
                      )
                    }
                    className="w-32 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                    placeholder="0.0"
                  />
                  {gasResults?.[idx] && (
                    <span className="flex items-center gap-1 text-xs">
                      {gasResults[idx]?.is_safe ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-green-500">Seguro</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">Fuera de rango</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleValidateGas}
              disabled={validateGas.isPending}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
            >
              {validateGas.isPending ? (
                <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
              ) : null}
              Validar lecturas
            </button>
          </div>
        )}

        {/* ── Review step ────────────────────────────────── */}
        {step === steps.length - 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Revisión</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Título</span>
                <span className="text-foreground font-medium">{form.title}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Tipo</span>
                <span className="text-foreground">
                  {PERMIT_TYPE_CONFIG[form.permit_type as PermitType]?.label ?? form.permit_type}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Desde</span>
                <span className="text-foreground">
                  {form.valid_from ? new Date(form.valid_from).toLocaleString('es-CL') : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Hasta</span>
                <span className="text-foreground">
                  {form.valid_until ? new Date(form.valid_until).toLocaleString('es-CL') : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Checklist</span>
                <span className="text-foreground">
                  {Object.values(checklist).filter(Boolean).length} ítems completados
                </span>
              </div>
              {form.hazards_identified && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Peligros</span>
                  <span className="text-foreground">{form.hazards_identified}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────── */}
        <div className="flex justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted/40 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createPermit.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createPermit.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Crear permiso
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
