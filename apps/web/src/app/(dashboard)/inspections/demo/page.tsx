'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, FileDown, CheckCircle2, Loader2, FlaskConical,
} from 'lucide-react';
import { DEMO_TEMPLATE } from '@/lib/demo-inspection-template';
import type { TemplateSection } from '@/types/inspections';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

type Responses = Record<string, string | number>;

// ── Score calculation ──────────────────────────────────────

function calcScore(sections: TemplateSection[], responses: Responses) {
  let score = 0;
  let maxScore = 0;
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (q.question_type === 'yes_no' && q.weight > 0) {
        maxScore += q.weight;
        if (responses[q.id] === 'yes') score += q.weight;
      }
    }
  }
  return { score, maxScore };
}

// ── Page ───────────────────────────────────────────────────

export default function DemoInspectionPage() {
  const router = useRouter();
  const { title, description, schema_definition } = DEMO_TEMPLATE;
  const sections = schema_definition.sections;

  const [responses, setResponses]       = useState<Responses>({});
  const [inspectorName, setInspectorName] = useState('');
  const [siteName, setSiteName]           = useState('');
  const [pdfLoading, setPdfLoading]       = useState(false);

  const setResponse = useCallback(
    (qId: string, value: string | number) =>
      setResponses((prev) => ({ ...prev, [qId]: value })),
    [],
  );

  const { score, maxScore } = calcScore(sections, responses);
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const requiredIds = sections
    .flatMap((s) => s.questions)
    .filter((q) => q.required && q.question_type === 'yes_no')
    .map((q) => q.id);
  const allAnswered = requiredIds.every((id) => responses[id] !== undefined);

  // ── PDF generation (fully client-side) ────────────────────
  const handleDownloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      const [{ createElement }, { pdf }, { InspectionPDFDocument }] =
        await Promise.all([
          import('react'),
          import('@react-pdf/renderer'),
          import('@/components/inspections/pdf-report'),
        ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = createElement(InspectionPDFDocument as any, {
        title,
        inspector: inspectorName || 'Sin especificar',
        site:      siteName      || 'Sin especificar',
        date:      new Date(),
        sections,
        responses: responses as Record<string, string | number | undefined>,
        score,
        maxScore,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(doc as any).toBlob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `inspeccion-demo-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setPdfLoading(false);
    }
  }, [title, inspectorName, siteName, sections, responses, score, maxScore]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-1 rounded-lg p-2 hover:bg-muted"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <FlaskConical className="h-3 w-3" /> DEMO — sin backend
          </span>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Meta fields */}
      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border bg-card p-4">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Inspector</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Nombre del inspector"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Sitio / Área</span>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Planta Norte, Bodega 2, etc."
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
        </label>
      </div>

      {/* Live score + download button */}
      <div className="flex items-center gap-6 rounded-xl border border-border bg-card p-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle
              cx="18" cy="18" r="15.9"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              className="text-muted"
            />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${pct} ${100 - pct}`}
              className={cn(
                pct >= 80 ? 'text-safe' : pct >= 60 ? 'text-warning' : 'text-danger',
              )}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
            {pct}%
          </span>
        </div>

        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{score} / {maxScore} puntos</p>
          <p className={cn(
            'mt-0.5 text-sm font-semibold',
            pct >= 80 ? 'text-safe' : pct >= 60 ? 'text-warning' : 'text-danger',
          )}>
            {pct >= 80 ? 'Conforme ✓' : pct >= 60 ? 'Atención requerida ⚠' : 'No conforme ✗'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={pdfLoading || !allAnswered}
          title={!allAnswered ? 'Responde todas las preguntas obligatorias (*)' : ''}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {pdfLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando…</>
            : <><FileDown className="h-4 w-4" /> Descargar PDF</>
          }
        </button>
      </div>

      {/* Sections */}
      {sections.map((section, si) => (
        <div key={section.id} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {si + 1}
            </span>
            <h2 className="font-semibold">{section.title}</h2>
          </div>

          <div className="divide-y divide-border">
            {section.questions.map((q, qi) => (
              <div key={q.id} className="space-y-3 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {qi + 1}.&nbsp;{q.text}
                      {q.required && <span className="ml-1 text-danger">*</span>}
                    </p>
                    {q.guidance && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{q.guidance}</p>
                    )}
                  </div>

                  {q.question_type === 'yes_no' && (
                    <div className="flex shrink-0 gap-2">
                      {(['yes', 'no'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setResponse(q.id, v)}
                          className={cn(
                            'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                            responses[q.id] === v
                              ? v === 'yes'
                                ? 'border-safe bg-safe/20 text-safe'
                                : 'border-danger bg-danger/20 text-danger'
                              : 'border-border hover:bg-muted',
                          )}
                        >
                          {v === 'yes' ? 'Sí' : 'No'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {q.question_type === 'text' && (
                  <textarea
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Escribe tus observaciones…"
                    value={(responses[q.id] as string) ?? ''}
                    onChange={(e) => setResponse(q.id, e.target.value)}
                  />
                )}

                {q.question_type === 'number' && (
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                    value={(responses[q.id] as number) ?? ''}
                    onChange={(e) => setResponse(q.id, e.target.valueAsNumber)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Bottom CTA */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={pdfLoading || !allAnswered}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {pdfLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando PDF…</>
            : <><CheckCircle2 className="h-4 w-4" /> Finalizar y Descargar PDF</>
          }
        </button>
      </div>
    </div>
  );
}
