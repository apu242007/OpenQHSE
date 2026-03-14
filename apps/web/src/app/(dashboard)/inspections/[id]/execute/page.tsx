'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Save, CheckCircle2, Camera, AlertTriangle,
  Clock, ChevronLeft, ChevronRight, Flag, FileDown,
} from 'lucide-react';
import { useInspection, useUpdateInspection, useCompleteInspection, useCreateFinding } from '@/hooks/use-inspections';
import type { TemplateSection, TemplateQuestion, QuestionResponse, FindingSeverity } from '@/types/inspections';
import { cn } from '@/lib/utils';

export default function ExecuteInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: inspection, isLoading } = useInspection(id);
  const updateMutation = useUpdateInspection();
  const completeMutation = useCompleteInspection();
  const findingMutation = useCreateFinding();

  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showFindingModal, setShowFindingModal] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load existing responses
  useEffect(() => {
    if (inspection?.responses) {
      setResponses(inspection.responses);
    }
  }, [inspection]);

  // Auto-save every 30 seconds
  const autoSave = useCallback(() => {
    if (!id) return;
    updateMutation.mutate({ id, data: { responses } });
  }, [id, responses, updateMutation]);

  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(autoSave, 30000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [responses, autoSave]);

  if (isLoading || !inspection) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sections: TemplateSection[] = inspection.template?.schema_definition?.sections ?? [];
  const section = sections[currentSection];
  const totalSections = sections.length;

  const setResponse = (questionId: string, value: unknown) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], value },
    }));
  };

  const flagQuestion = (questionId: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], value: prev[questionId]?.value, flagged: !prev[questionId]?.flagged },
    }));
  };

  const handleComplete = async () => {
    await updateMutation.mutateAsync({ id, data: { responses } });
    await completeMutation.mutateAsync(id);
    router.push(`/inspections/${id}`);
  };

  const handleAddFinding = async (questionId: string, title: string, severity: FindingSeverity) => {
    await findingMutation.mutateAsync({
      inspectionId: id,
      data: { title, severity, description: `Hallazgo reportado desde pregunta en inspección` },
    });
    setShowFindingModal(null);
  };

  // Map QuestionResponse records → flat values for PDF
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const [{ createElement }, { pdf }, { InspectionPDFDocument }] = await Promise.all([
        import('react'),
        import('@react-pdf/renderer'),
        import('@/components/inspections/pdf-report'),
      ]);

      const pdfSections = sections;

      // Calculate score from current responses
      let score = 0; let maxScore = 0;
      for (const sec of pdfSections) {
        for (const q of sec.questions) {
          if (q.question_type === 'yes_no' && q.weight > 0) {
            maxScore += q.weight;
            const v = responses[q.id]?.value;
            if (v === 'Sí' || v === 'yes' || v === true) score += q.weight;
          }
        }
      }

      // Normalize to the string format the PDF component expects
      const pdfResponses: Record<string, string | number | undefined> = {};
      for (const [qId, resp] of Object.entries(responses)) {
        const v = resp?.value;
        if (v === 'Sí' || v === true)  pdfResponses[qId] = 'yes';
        else if (v === 'No' || v === false) pdfResponses[qId] = 'no';
        else pdfResponses[qId] = v as string | number | undefined;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = createElement(InspectionPDFDocument as any, {
        title:     inspection.title,
        inspector: inspection.inspector_id ?? '—',
        site:      inspection.site_id      ?? '—',
        date:      new Date(),
        sections:  pdfSections,
        responses: pdfResponses,
        score,
        maxScore,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(doc as any).toBlob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `inspeccion-${inspection.reference_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(responses).length;
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Salir
        </button>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> {formatTime(elapsed)}
          </span>
          <button
            type="button"
            onClick={autoSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Save className="h-4 w-4" /> Guardar
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1 rounded-lg border border-border bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {pdfLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            PDF
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>{answeredCount} / {totalQuestions} preguntas</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <span className="text-sm font-medium">
          Sección {currentSection + 1} de {totalSections}
        </span>
        <button
          type="button"
          onClick={() => setCurrentSection(Math.min(totalSections - 1, currentSection + 1))}
          disabled={currentSection === totalSections - 1}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-30"
        >
          Siguiente <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Section Content */}
      {section && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{section.title}</h2>
          <div className="space-y-6">
            {section.questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                response={responses[q.id]}
                onChange={(val) => setResponse(q.id, val)}
                onFlag={() => flagQuestion(q.id)}
                onAddFinding={() => setShowFindingModal(q.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Complete Button */}
      {currentSection === totalSections - 1 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-safe px-6 py-3 text-sm font-medium text-white hover:bg-safe/90 disabled:opacity-50"
          >
            {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Completar inspección
          </button>
        </div>
      )}

      {/* Finding Modal */}
      {showFindingModal && (
        <FindingModal
          questionId={showFindingModal}
          onSubmit={handleAddFinding}
          onClose={() => setShowFindingModal(null)}
        />
      )}
    </div>
  );
}

/* ── Question Field ───────────────────────────────────────── */

function QuestionField({
  question,
  response,
  onChange,
  onFlag,
  onAddFinding,
}: {
  question: TemplateQuestion;
  response?: QuestionResponse;
  onChange: (val: unknown) => void;
  onFlag: () => void;
  onAddFinding: () => void;
}) {
  const isFlagged = response?.flagged;

  return (
    <div className={cn('rounded-lg border p-4 transition-colors', isFlagged ? 'border-warning bg-warning/5' : 'border-border')}>
      <div className="mb-2 flex items-start justify-between">
        <label className="text-sm font-medium">
          {question.text}
          {question.required && <span className="ml-1 text-danger">*</span>}
        </label>
        <div className="flex gap-1">
          <button type="button" onClick={onFlag} className={cn('rounded p-1', isFlagged ? 'text-warning' : 'text-muted-foreground hover:text-warning')} aria-label="Marcar">
            <Flag className="h-4 w-4" />
          </button>
          <button type="button" onClick={onAddFinding} className="rounded p-1 text-muted-foreground hover:text-danger" aria-label="Reportar hallazgo">
            <AlertTriangle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {question.guidance && (
        <p className="mb-2 text-xs text-muted-foreground">{question.guidance}</p>
      )}

      {question.question_type === 'text' && (
        <textarea
          value={(response?.value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      )}

      {question.question_type === 'number' && (
        <input
          type="number"
          value={(response?.value as number) ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {question.question_type === 'yes_no' && (
        <div className="flex gap-2">
          {['Sí', 'No', 'N/A'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                response?.value === opt
                  ? opt === 'Sí'
                    ? 'border-safe bg-safe/10 text-safe'
                    : opt === 'No'
                      ? 'border-danger bg-danger/10 text-danger'
                      : 'border-muted-foreground bg-muted'
                  : 'border-border hover:bg-muted',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.question_type === 'multiple_choice' && (
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                response?.value === opt
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.question_type === 'date' && (
        <input
          type="date"
          value={(response?.value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {question.question_type === 'photo' && (
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
        >
          <Camera className="h-4 w-4" /> Tomar foto / Adjuntar imagen
        </button>
      )}
    </div>
  );
}

/* ── Finding Modal ────────────────────────────────────────── */

function FindingModal({
  questionId,
  onSubmit,
  onClose,
}: {
  questionId: string;
  onSubmit: (questionId: string, title: string, severity: FindingSeverity) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<FindingSeverity>('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(questionId, title, severity);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Reportar hallazgo</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="finding-title" className="mb-1 block text-sm font-medium">Título</label>
            <input
              id="finding-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="finding-severity" className="mb-1 block text-sm font-medium">Severidad</label>
            <select
              id="finding-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as FindingSeverity)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="critical">Crítico</option>
              <option value="high">Alto</option>
              <option value="medium">Medio</option>
              <option value="low">Bajo</option>
              <option value="observation">Observación</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !title}
            className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Reportar
          </button>
        </div>
      </form>
    </div>
  );
}
