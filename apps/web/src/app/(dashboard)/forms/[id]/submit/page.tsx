'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Save, WifiOff, MapPin,
} from 'lucide-react';
import { useFormTemplate, useCreateSubmission } from '@/hooks/use-forms';
import { FIELD_REGISTRY } from '@/components/forms/fields/index.ts';
import type { FormSection, FormField, SubmissionData, FieldAnswer } from '@/types/forms';
import { cn } from '@/lib/utils';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

export default function FormSubmitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params.id;

  const { data: template, isLoading } = useFormTemplate(templateId);
  const createSubmission = useCreateSubmission();

  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<SubmissionData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [autoSaved, setAutoSaved] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();

  const sections = template?.schema_def?.sections ?? [];
  const settings = template?.schema_def?.settings;
  const section = sections[currentSection];
  const totalSections = sections.length;

  // Online status
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  // Load draft from localStorage
  useEffect(() => {
    if (!templateId) return;
    const key = `form_draft_${templateId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SubmissionData;
        setAnswers(parsed);
      } catch { /* ignore */ }
    }
  }, [templateId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!templateId) return;
    autoSaveRef.current = setInterval(() => {
      const key = `form_draft_${templateId}`;
      localStorage.setItem(key, JSON.stringify(answers));
      setAutoSaved(new Date());
    }, AUTO_SAVE_INTERVAL);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [templateId, answers]);

  const setFieldValue = useCallback((fieldId: string, value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: { ...(prev[fieldId] ?? {}), value } as FieldAnswer,
    }));
    setErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e; });
  }, []);

  const validateSection = (sec: FormSection): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of sec.fields) {
      if (field.required) {
        const answer = answers[field.id];
        const val = answer?.value;
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.id] = 'Campo obligatorio';
        }
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!section) return;
    if (validateSection(section)) {
      setCurrentSection((c) => Math.min(totalSections - 1, c + 1));
    }
  };

  const handlePrev = () => setCurrentSection((c) => Math.max(0, c - 1));

  const handleSubmit = async () => {
    // Validate all sections
    let valid = true;
    for (const sec of sections) {
      if (!validateSection(sec)) valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        template_id: templateId,
        data: answers,
        status: 'submitted',
      };

      // Add geolocation if required
      if (settings?.require_geolocation && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }),
          );
          payload.gps_latitude = pos.coords.latitude;
          payload.gps_longitude = pos.coords.longitude;
        } catch { /* continue without GPS */ }
      }

      if (isOnline) {
        await createSubmission.mutateAsync(payload);
      } else {
        // Save to IndexedDB for offline sync
        const offlineId = crypto.randomUUID();
        const offlineSubmissions = JSON.parse(localStorage.getItem('offline_submissions') ?? '[]') as Record<string, unknown>[];
        offlineSubmissions.push({ ...payload, offline_id: offlineId, created_at: new Date().toISOString() });
        localStorage.setItem('offline_submissions', JSON.stringify(offlineSubmissions));
      }

      // Clear draft
      localStorage.removeItem(`form_draft_${templateId}`);
      router.push('/forms');
    } catch (e) {
      console.error('Error submitting form:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Formulario no encontrado</p>
      </div>
    );
  }

  const progress = totalSections > 0 ? Math.round(((currentSection + 1) / totalSections) * 100) : 0;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="rounded-md p-1.5 hover:bg-muted" title="Volver">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-semibold">{template.name}</h1>
              <p className="text-[11px] text-muted-foreground">{template.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1 rounded-md bg-warning/20 px-2 py-1 text-[10px] font-medium text-warning">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
            {autoSaved && (
              <span className="text-[10px] text-muted-foreground">
                <Save className="mr-0.5 inline h-3 w-3" />
                {autoSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Sección {currentSection + 1} de {totalSections}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Section tabs */}
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {sections.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setCurrentSection(idx)}
              className={cn(
                'whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                idx === currentSection ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                idx < currentSection && 'text-success',
              )}
            >
              {idx < currentSection && <Check className="mr-0.5 inline h-3 w-3" />}
              {sec.title || `Sección ${idx + 1}`}
            </button>
          ))}
        </div>
      </header>

      {/* Fields */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {section && (
          <>
            <div className="mb-2">
              <h2 className="text-lg font-bold">{section.title}</h2>
              {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
            </div>
            {section.fields.map((field) => {
              const Component = FIELD_REGISTRY[field.type];
              if (!Component) return null;
              return (
                <Component
                  key={field.id}
                  field={field}
                  value={answers[field.id]?.value}
                  onChange={(v: unknown) => setFieldValue(field.id, v)}
                  error={errors[field.id]}
                />
              );
            })}
          </>
        )}
      </main>

      {/* Footer navigation */}
      <footer className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSection === 0}
            className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </button>

          {currentSection < totalSections - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Siguiente <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enviar
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
