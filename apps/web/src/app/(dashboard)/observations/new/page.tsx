'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, CheckCircle2, MapPin, Send } from 'lucide-react';
import {
  useCreateObservation,
  OBSERVATION_TYPE_LABELS,
  OBSERVATION_CATEGORY_LABELS,
  type ObservationType,
  type ObservationCategory,
} from '@/hooks/use-observations';
import { cn } from '@/lib/utils';

const OBS_TYPES: ObservationType[] = ['SAFE', 'UNSAFE', 'NEAR_MISS_BEHAVIOR'];
const OBS_CATEGORIES: ObservationCategory[] = [
  'PPE', 'PROCEDURE', 'HOUSEKEEPING', 'TOOL_USE',
  'COMMUNICATION', 'ERGONOMICS', 'ENERGY_ISOLATION', 'OTHER',
];

const TYPE_BUTTON_STYLES: Record<ObservationType, string> = {
  SAFE: 'border-green-500 bg-green-50 text-green-700 ring-green-500',
  UNSAFE: 'border-red-500 bg-red-50 text-red-700 ring-red-500',
  NEAR_MISS_BEHAVIOR: 'border-amber-500 bg-amber-50 text-amber-700 ring-amber-500',
};

const TYPE_INACTIVE: Record<ObservationType, string> = {
  SAFE: 'border-gray-200 text-gray-600 hover:border-green-300',
  UNSAFE: 'border-gray-200 text-gray-600 hover:border-red-300',
  NEAR_MISS_BEHAVIOR: 'border-gray-200 text-gray-600 hover:border-amber-300',
};

export default function NewObservationPage() {
  const router = useRouter();
  const create = useCreateObservation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    type: undefined as ObservationType | undefined,
    category: undefined as ObservationCategory | undefined,
    description: '',
    area: '',
    task_being_performed: '',
    positive_feedback: '',
    improvement_feedback: '',
    is_anonymous: false,
    useGps: false,
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [submitted, setSubmitted] = useState(false);

  // Step 1 → 2 validation
  function step1Valid() {
    return form.type !== undefined && form.category !== undefined;
  }

  // Step 2 → 3 validation
  function step2Valid() {
    return form.description.trim().length >= 10;
  }

  function handleGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({
        ...f,
        useGps: true,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }));
    });
  }

  async function handleSubmit() {
    if (!form.type || !form.category) return;
    await create.mutateAsync({
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      area: form.area.trim() || null,
      task_being_performed: form.task_being_performed.trim() || null,
      positive_feedback: form.positive_feedback.trim() || null,
      improvement_feedback: form.improvement_feedback.trim() || null,
      is_anonymous: form.is_anonymous,
      latitude: form.useGps ? form.latitude : null,
      longitude: form.useGps ? form.longitude : null,
      photos: [],
    });
    setSubmitted(true);
  }

  // ── Success screen ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900">¡Observación registrada!</h2>
        <p className="mt-2 text-sm text-gray-600">
          Tu observación ha sido enviada correctamente. Gracias por contribuir a un ambiente de
          trabajo más seguro.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setForm({
                type: undefined, category: undefined, description: '', area: '',
                task_being_performed: '', positive_feedback: '', improvement_feedback: '',
                is_anonymous: false, useGps: false, latitude: undefined, longitude: undefined,
              });
              setStep(1);
              setSubmitted(false);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Nueva observación
          </button>
          <button
            onClick={() => router.push('/observations')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ver todas
          </button>
        </div>
      </div>
    );
  }

  // ── Step indicator ─────────────────────────────────────────────────────

  const steps = [
    { n: 1, label: 'Clasificar' },
    { n: 2, label: 'Describir' },
    { n: 3, label: 'Confirmar' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => (step > 1 ? setStep((s) => (s - 1) as typeof step) : router.back())}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-900">Nueva Observación BBS</h1>
          <p className="text-xs text-gray-500">Paso {step} de 3 — {steps[step - 1]?.label}</p>
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5">
          {steps.map((s) => (
            <div
              key={s.n}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                s.n === step ? 'bg-blue-600' : s.n < step ? 'bg-green-500' : 'bg-gray-200',
              )}
            />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-24">
        {/* ── STEP 1: Type + Category ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 mt-4">
            {/* Type */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">¿Qué tipo de comportamiento observaste?</h2>
              <div className="space-y-2">
                {OBS_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={cn(
                      'w-full rounded-xl border-2 p-4 text-left text-sm font-medium transition-all',
                      form.type === t
                        ? `${TYPE_BUTTON_STYLES[t]} ring-2`
                        : TYPE_INACTIVE[t],
                    )}
                  >
                    {OBSERVATION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Categoría</h2>
              <div className="grid grid-cols-2 gap-2">
                {OBS_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, category: c })}
                    className={cn(
                      'rounded-xl border p-3 text-center text-sm transition-all',
                      form.category === c
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-blue-200',
                    )}
                  >
                    {OBSERVATION_CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Description ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Descripción *
                <span className="ml-1 font-normal text-gray-500">(mínimo 10 caracteres)</span>
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe detalladamente lo que observaste…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-400">{form.description.length} caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área / Ubicación</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Bodega Sur, Nivel 3, Zona A…"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarea que se realizaba</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Carga de camión, soldadura, etc."
                value={form.task_being_performed}
                onChange={(e) => setForm({ ...form, task_being_performed: e.target.value })}
              />
            </div>

            {/* Feedback based on type */}
            {form.type === 'SAFE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Qué hizo bien el trabajador?
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Refuerzo positivo…"
                  value={form.positive_feedback}
                  onChange={(e) => setForm({ ...form, positive_feedback: e.target.value })}
                />
              </div>
            )}

            {(form.type === 'UNSAFE' || form.type === 'NEAR_MISS_BEHAVIOR') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Qué debe mejorar?
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Retroalimentación constructiva…"
                  value={form.improvement_feedback}
                  onChange={(e) => setForm({ ...form, improvement_feedback: e.target.value })}
                />
              </div>
            )}

            {/* GPS */}
            <button
              type="button"
              onClick={handleGps}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl border p-3 text-sm transition-colors',
                form.useGps
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              <MapPin size={16} />
              {form.useGps
                ? `GPS capturado (${form.latitude?.toFixed(4)}, ${form.longitude?.toFixed(4)})`
                : 'Agregar ubicación GPS'}
            </button>

            {/* Anonymous */}
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-gray-200 p-3">
              <input
                type="checkbox"
                checked={form.is_anonymous}
                onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Observación anónima</p>
                <p className="text-xs text-gray-500">No se mostrará el nombre del observado en reportes</p>
              </div>
            </label>
          </div>
        )}

        {/* ── STEP 3: Confirm ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4 mt-4">
            <h2 className="text-base font-semibold text-gray-900">Confirma tu observación</h2>
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
              {[
                { label: 'Tipo', value: OBSERVATION_TYPE_LABELS[form.type!] },
                { label: 'Categoría', value: OBSERVATION_CATEGORY_LABELS[form.category!] },
                { label: 'Área', value: form.area || '—' },
                { label: 'Descripción', value: form.description },
                { label: 'Anónimo', value: form.is_anonymous ? 'Sí' : 'No' },
                ...(form.useGps
                  ? [{ label: 'GPS', value: `${form.latitude?.toFixed(4)}, ${form.longitude?.toFixed(4)}` }]
                  : []),
              ].map((item) => (
                <div key={item.label} className="flex justify-between gap-4 px-4 py-3">
                  <span className="text-xs text-gray-500 shrink-0">{item.label}</span>
                  <span className="text-sm text-gray-800 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 max-w-lg mx-auto">
        {step < 3 && (
          <button
            onClick={() => setStep((s) => (s + 1) as typeof step)}
            disabled={step === 1 ? !step1Valid() : !step2Valid()}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        )}
        {step === 3 && (
          <button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {create.isPending ? (
              'Enviando…'
            ) : (
              <>
                <Send size={16} />
                Enviar Observación
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
