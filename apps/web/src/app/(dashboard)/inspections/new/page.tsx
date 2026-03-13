'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardCheck, Loader2, Calendar, User, MapPin, Repeat } from 'lucide-react';
import { useInspectionTemplates, useCreateInspection } from '@/hooks/use-inspections';
import type { InspectionTemplate, RecurrenceFrequency } from '@/types/inspections';
import { cn } from '@/lib/utils';

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'once', label: 'Una sola vez' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
];

export default function NewInspectionPage() {
  const router = useRouter();
  const { data: templates, isLoading: loadingTemplates } = useInspectionTemplates();
  const createMutation = useCreateInspection();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [inspectorId, setInspectorId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('once');
  const [notes, setNotes] = useState('');

  const selectedTpl = templates?.find((t) => t.id === selectedTemplate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !title) return;

    try {
      await createMutation.mutateAsync({
        title,
        template_id: selectedTemplate,
        scheduled_date: scheduledDate || undefined,
        inspector_id: inspectorId || undefined,
        site_id: siteId || undefined,
        area_id: areaId || undefined,
        notes: notes || undefined,
      });
      router.push('/inspections');
    } catch {
      // error handled by react-query
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 hover:bg-muted" aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Inspección</h1>
          <p className="text-sm text-muted-foreground">Selecciona una plantilla y programa la inspección</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Template Selection */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Plantilla de inspección
          </h2>

          {loadingTemplates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(templates ?? []).filter((t) => t.is_published).map((tpl) => (
                <button
                  type="button"
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplate(tpl.id);
                    if (!title) setTitle(tpl.title);
                  }}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-all',
                    selectedTemplate === tpl.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <p className="font-medium">{tpl.title}</p>
                  {tpl.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">{tpl.category}</span>
                    <span>v{tpl.version}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Details */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5 text-primary" /> Detalles de la inspección
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="mb-1 block text-sm font-medium">Título *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="Inspección de seguridad — Área norte"
              />
            </div>

            <div>
              <label htmlFor="scheduled_date" className="mb-1 block text-sm font-medium">Fecha programada</label>
              <input
                id="scheduled_date"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="frequency" className="mb-1 block text-sm font-medium">
                <Repeat className="mr-1 inline h-4 w-4" /> Recurrencia
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="inspector" className="mb-1 block text-sm font-medium">
                <User className="mr-1 inline h-4 w-4" /> Inspector
              </label>
              <input
                id="inspector"
                type="text"
                value={inspectorId}
                onChange={(e) => setInspectorId(e.target.value)}
                placeholder="ID del inspector"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="site" className="mb-1 block text-sm font-medium">
                <MapPin className="mr-1 inline h-4 w-4" /> Sitio
              </label>
              <input
                id="site"
                type="text"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="ID del sitio"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-sm font-medium">Notas</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !selectedTemplate || !title}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear inspección
          </button>
        </div>
      </form>
    </div>
  );
}
