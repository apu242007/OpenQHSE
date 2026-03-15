'use client';

import { useState, useCallback } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  Eye, Download, FileText,
  ToggleLeft, Type, Hash, List, Camera, Calendar, PenLine,
  ClipboardList, ArrowUp, ArrowDown, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

const QUESTION_TYPES = [
  { value: 'yes_no',          label: 'Sí / No',        icon: ToggleLeft, color: 'text-green-500'  },
  { value: 'text',            label: 'Texto',           icon: Type,       color: 'text-blue-500'   },
  { value: 'number',          label: 'Número',          icon: Hash,       color: 'text-purple-500' },
  { value: 'multiple_choice', label: 'Opción múltiple', icon: List,       color: 'text-orange-500' },
  { value: 'date',            label: 'Fecha',           icon: Calendar,   color: 'text-teal-500'   },
  { value: 'photo',           label: 'Foto',            icon: Camera,     color: 'text-yellow-600' },
  { value: 'signature',       label: 'Firma',           icon: PenLine,    color: 'text-pink-500'   },
] as const;

type QuestionType = typeof QUESTION_TYPES[number]['value'];

interface BuilderQuestion {
  id: string;
  text: string;
  question_type: QuestionType;
  required: boolean;
  weight: number;
  guidance: string;
  options: string[];
}

interface BuilderSection {
  id: string;
  title: string;
  questions: BuilderQuestion[];
  collapsed: boolean;
}

interface BuilderTemplate {
  title: string;
  description: string;
  category: string;
  sections: BuilderSection[];
}

const CATEGORIES = [
  'Seguridad', 'Salud Ocupacional', 'Medio Ambiente', 'Calidad',
  'Petróleo & Gas', 'Minería', 'Construcción', 'Eléctrico', 'General',
];

type Selection =
  | { type: 'template' }
  | { type: 'section'; sectionId: string }
  | { type: 'question'; sectionId: string; questionId: string };

type Answers = Record<string, string | number>;

const uid = () => crypto.randomUUID();

const emptyQuestion = (): BuilderQuestion => ({
  id: uid(), text: 'Nueva pregunta', question_type: 'yes_no',
  required: true, weight: 1, guidance: '', options: [],
});

const emptySection = (): BuilderSection => ({
  id: uid(), title: 'Nueva sección', questions: [emptyQuestion()], collapsed: false,
});

// Pre-filled demo template so the page is not blank on first load
const INITIAL: BuilderTemplate = {
  title: '',
  description: '',
  category: 'Seguridad',
  sections: [
    {
      id: uid(),
      title: 'Condiciones generales del área',
      collapsed: false,
      questions: [
        { id: uid(), text: '¿El área de trabajo está limpia y ordenada?', question_type: 'yes_no', required: true, weight: 2, guidance: 'Verificar pisos, pasillos y zonas de almacenaje.', options: [] },
        { id: uid(), text: '¿Los equipos de protección personal están disponibles?', question_type: 'yes_no', required: true, weight: 2, guidance: 'Casco, chaleco reflectivo, guantes, lentes.', options: [] },
        { id: uid(), text: 'Nombre del inspector', question_type: 'text', required: true, weight: 0, guidance: '', options: [] },
        { id: uid(), text: 'Fecha de inspección', question_type: 'date', required: true, weight: 0, guidance: '', options: [] },
      ],
    },
    {
      id: uid(),
      title: 'Equipos y maquinaria',
      collapsed: false,
      questions: [
        { id: uid(), text: '¿Los equipos tienen revisión técnica al día?', question_type: 'yes_no', required: true, weight: 3, guidance: '', options: [] },
        { id: uid(), text: '¿Los extintores están cargados y accesibles?', question_type: 'yes_no', required: true, weight: 2, guidance: 'Verificar fecha de vencimiento.', options: [] },
        { id: uid(), text: 'Estado general de equipos', question_type: 'multiple_choice', required: true, weight: 0, guidance: '', options: ['Bueno', 'Regular', 'Deficiente', 'Fuera de servicio'] },
        { id: uid(), text: 'Observaciones adicionales', question_type: 'text', required: false, weight: 0, guidance: '', options: [] },
      ],
    },
  ],
};

// ── Preview overlay ────────────────────────────────────────

function PreviewOverlay({ template, onClose }: { template: BuilderTemplate; onClose: () => void }) {
  const [answers, setAnswers] = useState<Answers>({});
  const setAns = (id: string, val: string | number) => setAnswers((p) => ({ ...p, [id]: val }));

  let score = 0, maxScore = 0;
  for (const sec of template.sections) {
    for (const q of sec.questions) {
      if (q.question_type === 'yes_no' && q.weight > 0) {
        maxScore += q.weight;
        if (answers[q.id] === 'yes') score += q.weight;
      }
    }
  }
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{template.title || 'Sin título'}</h2>
          {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
        </div>
        <div className="flex items-center gap-4">
          {pct !== null && (
            <div className={cn(
              'rounded-full px-3 py-1 text-sm font-bold',
              pct >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : pct >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
            )}>
              {pct}% ({score}/{maxScore} pts)
            </div>
          )}
          <button onClick={onClose} className="rounded-lg border border-border p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {template.sections.map((sec) => (
            <div key={sec.id} className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">{sec.title}</h3>
              <div className="space-y-5">
                {sec.questions.map((q) => {
                  const QIcon = QUESTION_TYPES.find((t) => t.value === q.question_type)?.icon ?? ToggleLeft;
                  return (
                    <div key={q.id} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <QIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">
                          {q.text}
                          {q.required && <span className="ml-1 text-destructive">*</span>}
                        </span>
                      </div>
                      {q.guidance && <p className="pl-6 text-xs text-muted-foreground">{q.guidance}</p>}
                      <div className="pl-6">
                        {q.question_type === 'yes_no' && (
                          <div className="flex gap-2">
                            {(['yes', 'no', 'na'] as const).map((v) => (
                              <button key={v} onClick={() => setAns(q.id, v)}
                                className={cn(
                                  'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                                  answers[q.id] === v
                                    ? v === 'yes' ? 'border-green-500 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                      : v === 'no' ? 'border-red-500 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                        : 'border-muted bg-muted text-muted-foreground'
                                    : 'border-border hover:bg-muted',
                                )}>
                                {v === 'yes' ? 'Sí' : v === 'no' ? 'No' : 'N/A'}
                              </button>
                            ))}
                          </div>
                        )}
                        {q.question_type === 'text' && (
                          <textarea rows={2} placeholder="Escribe aquí..."
                            value={(answers[q.id] as string) ?? ''}
                            onChange={(e) => setAns(q.id, e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                        )}
                        {q.question_type === 'number' && (
                          <input type="number" placeholder="0"
                            value={(answers[q.id] as number) ?? ''}
                            onChange={(e) => setAns(q.id, e.target.valueAsNumber)}
                            className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                        )}
                        {q.question_type === 'date' && (
                          <input type="date"
                            value={(answers[q.id] as string) ?? ''}
                            onChange={(e) => setAns(q.id, e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                        )}
                        {q.question_type === 'multiple_choice' && q.options.length > 0 && (
                          <div className="space-y-1.5">
                            {q.options.map((opt, i) => (
                              <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                                <input type="radio" name={q.id} value={opt}
                                  checked={answers[q.id] === opt}
                                  onChange={() => setAns(q.id, opt)}
                                  className="h-4 w-4 accent-primary" />
                                {opt}
                              </label>
                            ))}
                          </div>
                        )}
                        {q.question_type === 'photo' && (
                          <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                            <Camera className="h-4 w-4" /> Adjuntar foto (demo)
                          </div>
                        )}
                        {q.question_type === 'signature' && (
                          <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                            <PenLine className="h-4 w-4" /> Firma digital (demo)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Template metadata panel ────────────────────────────────

function TemplateMetaPanel({ template, onChange }: {
  template: BuilderTemplate;
  onChange: (patch: Partial<BuilderTemplate>) => void;
}) {
  const totalQ = template.sections.reduce((s, sec) => s + sec.questions.length, 0);
  const totalPts = template.sections.reduce(
    (s, sec) => s + sec.questions.reduce((a, q) => a + (q.question_type === 'yes_no' ? q.weight : 0), 0), 0);
  const required = template.sections.reduce(
    (s, sec) => s + sec.questions.filter((q) => q.required).length, 0);

  return (
    <div className="space-y-5 p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos de la plantilla</h3>
      <div className="space-y-1">
        <label className="text-sm font-medium">Título</label>
        <input type="text" placeholder="Ej: Inspección diaria de seguridad"
          value={template.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Descripción</label>
        <textarea rows={3} placeholder="Describe el propósito de esta plantilla..."
          value={template.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Categoría</label>
        <select value={template.category} onChange={(e) => onChange({ category: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="mt-2 rounded-xl bg-muted/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: template.sections.length, label: 'Secciones' },
            { value: totalQ,                   label: 'Preguntas'  },
            { value: totalPts,                  label: 'Puntos totales' },
            { value: required,                  label: 'Obligatorias'  },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-lg bg-card p-3 text-center">
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section editor panel ───────────────────────────────────

function SectionPanel({ section, onChange }: {
  section: BuilderSection;
  onChange: (patch: Partial<BuilderSection>) => void;
}) {
  return (
    <div className="space-y-4 p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar sección</h3>
      <div className="space-y-1">
        <label className="text-sm font-medium">Nombre de la sección</label>
        <input type="text"
          value={section.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
        Esta sección tiene <strong>{section.questions.length}</strong> pregunta(s).
        Haz clic en una pregunta a la izquierda para editarla, o usa <strong>+</strong> para añadir una nueva.
      </p>
    </div>
  );
}

// ── Question editor panel ──────────────────────────────────

function QuestionPanel({ question, onChange }: {
  question: BuilderQuestion;
  onChange: (patch: Partial<BuilderQuestion>) => void;
}) {
  const [newOpt, setNewOpt] = useState('');

  const addOption = () => {
    if (!newOpt.trim()) return;
    onChange({ options: [...question.options, newOpt.trim()] });
    setNewOpt('');
  };

  return (
    <div className="space-y-5 overflow-y-auto p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar pregunta</h3>

      {/* Text */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Enunciado</label>
        <textarea rows={2} value={question.text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {/* Type selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de respuesta</label>
        <div className="grid grid-cols-2 gap-2">
          {QUESTION_TYPES.map(({ value, label, icon: Icon, color }) => (
            <button key={value}
              onClick={() => onChange({ question_type: value as QuestionType })}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors text-left',
                question.question_type === value
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-border hover:bg-muted',
              )}>
              <Icon className={cn('h-4 w-4 shrink-0', color)} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Options for multiple_choice */}
      {question.question_type === 'multiple_choice' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Opciones</label>
          <div className="space-y-1.5">
            {question.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">{opt}</span>
                <button onClick={() => onChange({ options: question.options.filter((_, idx) => idx !== i) })}
                  className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Nueva opción..."
              value={newOpt}
              onChange={(e) => setNewOpt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOption()}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={addOption}
              className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Weight (yes_no only) */}
      {question.question_type === 'yes_no' && (
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Puntaje <span className="text-xs text-muted-foreground">(0 = sin puntaje)</span>
          </label>
          <input type="number" min={0} max={10}
            value={question.weight}
            onChange={(e) => onChange({ weight: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      )}

      {/* Required toggle */}
      <div className="flex items-center gap-3">
        <button onClick={() => onChange({ required: !question.required })}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors',
            question.required ? 'bg-primary' : 'bg-muted',
          )}>
          <span className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            question.required ? 'left-4' : 'left-0.5',
          )} />
        </button>
        <label className="text-sm font-medium">Respuesta obligatoria</label>
      </div>

      {/* Guidance */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Instrucción <span className="text-xs text-muted-foreground">(opcional)</span>
        </label>
        <textarea rows={2} placeholder="Descripción o ayuda para el inspector..."
          value={question.guidance}
          onChange={(e) => onChange({ guidance: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────

export default function TemplatesPage() {
  const [template, setTemplate] = useState<BuilderTemplate>(INITIAL);
  const [selection, setSelection] = useState<Selection>({ type: 'template' });
  const [previewOpen, setPreviewOpen] = useState(false);

  const patchTemplate = useCallback((patch: Partial<BuilderTemplate>) =>
    setTemplate((p) => ({ ...p, ...patch })), []);

  const patchSection = useCallback((sId: string, patch: Partial<BuilderSection>) =>
    setTemplate((p) => ({
      ...p,
      sections: p.sections.map((s) => s.id === sId ? { ...s, ...patch } : s),
    })), []);

  const patchQuestion = useCallback((sId: string, qId: string, patch: Partial<BuilderQuestion>) =>
    setTemplate((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id !== sId ? s : {
          ...s,
          questions: s.questions.map((q) => q.id === qId ? { ...q, ...patch } : q),
        }),
    })), []);

  const addSection = () => {
    const sec = emptySection();
    setTemplate((p) => ({ ...p, sections: [...p.sections, sec] }));
    setSelection({ type: 'section', sectionId: sec.id });
  };

  const deleteSection = (sId: string) => {
    setTemplate((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== sId) }));
    setSelection({ type: 'template' });
  };

  const addQuestion = (sId: string) => {
    const q = emptyQuestion();
    setTemplate((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id !== sId ? s : { ...s, questions: [...s.questions, q] }),
    }));
    setSelection({ type: 'question', sectionId: sId, questionId: q.id });
  };

  const deleteQuestion = (sId: string, qId: string) => {
    setTemplate((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id !== sId ? s : { ...s, questions: s.questions.filter((q) => q.id !== qId) }),
    }));
    setSelection({ type: 'section', sectionId: sId });
  };

  const moveQuestion = (sId: string, qId: string, dir: -1 | 1) =>
    setTemplate((p) => ({
      ...p,
      sections: p.sections.map((s) => {
        if (s.id !== sId) return s;
        const qs = [...s.questions];
        const idx = qs.findIndex((q) => q.id === qId);
        const next = idx + dir;
        if (next < 0 || next >= qs.length) return s;
        const tmp = qs[idx]!; qs[idx] = qs[next]!; qs[next] = tmp;
        return { ...s, questions: qs };
      }),
    }));

  const exportJSON = () => {
    const payload = {
      title: template.title || 'Plantilla sin título',
      description: template.description,
      category: template.category,
      schema_definition: {
        sections: template.sections.map((sec, si) => ({
          id: sec.id,
          title: sec.title,
          order: si,
          questions: sec.questions.map((q, qi) => ({
            id: q.id,
            text: q.text,
            question_type: q.question_type,
            required: q.required,
            weight: q.weight,
            guidance: q.guidance || undefined,
            options: q.options.length ? q.options : undefined,
            order: qi,
          })),
        })),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(template.title || 'plantilla').replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalQ = template.sections.reduce((s, sec) => s + sec.questions.length, 0);

  const renderPanel = () => {
    if (selection.type === 'template') {
      return <TemplateMetaPanel template={template} onChange={patchTemplate} />;
    }
    if (selection.type === 'section') {
      const sec = template.sections.find((s) => s.id === selection.sectionId);
      if (!sec) return null;
      return <SectionPanel section={sec} onChange={(p) => patchSection(sec.id, p)} />;
    }
    if (selection.type === 'question') {
      const sec = template.sections.find((s) => s.id === selection.sectionId);
      const q = sec?.questions.find((q) => q.id === selection.questionId);
      if (!sec || !q) return null;
      return <QuestionPanel question={q} onChange={(p) => patchQuestion(sec.id, q.id, p)} />;
    }
  };

  return (
    <>
      {previewOpen && <PreviewOverlay template={template} onClose={() => setPreviewOpen(false)} />}

      <div className="flex h-screen flex-col bg-background">
        {/* ── Top bar ── */}
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-5 py-3">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-base font-bold leading-tight">Constructor de Plantillas</h1>
              <p className="text-xs text-muted-foreground">OpenQHSE · modo demo — sin backend</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">DEMO</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              <Eye className="h-4 w-4" /> Vista previa
            </button>
            <button onClick={exportJSON}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4" /> Exportar JSON
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left tree */}
          <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
            {/* Template root */}
            <button
              onClick={() => setSelection({ type: 'template' })}
              className={cn(
                'flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium transition-colors',
                selection.type === 'template' ? 'bg-primary/5 text-primary' : 'hover:bg-muted',
              )}>
              <FileText className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">{template.title || 'Sin título'}</span>
              <span className="text-xs text-muted-foreground">{totalQ}p</span>
            </button>

            {/* Sections + questions */}
            <div className="flex-1 overflow-y-auto">
              {template.sections.map((sec, sIdx) => (
                <div key={sec.id} className="border-b border-border/50">
                  {/* Section row */}
                  <div className={cn(
                    'group flex items-center gap-1 px-3 py-2 transition-colors',
                    selection.type === 'section' && selection.sectionId === sec.id
                      ? 'bg-primary/5' : 'hover:bg-muted/50',
                  )}>
                    <button
                      onClick={() => patchSection(sec.id, { collapsed: !sec.collapsed })}
                      className="p-0.5 text-muted-foreground hover:text-foreground">
                      {sec.collapsed
                        ? <ChevronRight className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => setSelection({ type: 'section', sectionId: sec.id })}
                      className="flex-1 truncate text-left text-sm font-medium">
                      {sec.title}
                    </button>
                    <span className="text-xs text-muted-foreground">{sec.questions.length}</span>
                    <button onClick={() => addQuestion(sec.id)} title="Añadir pregunta"
                      className="ml-0.5 hidden rounded p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-primary group-hover:block">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteSection(sec.id)} title="Eliminar sección"
                      className="hidden rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Questions */}
                  {!sec.collapsed && (
                    <div className="pl-6">
                      {sec.questions.map((q, qIdx) => {
                        const QIcon = QUESTION_TYPES.find((t) => t.value === q.question_type)?.icon ?? ToggleLeft;
                        const isSelected =
                          selection.type === 'question' &&
                          selection.sectionId === sec.id &&
                          selection.questionId === q.id;
                        return (
                          <div key={q.id}
                            className={cn(
                              'group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
                              isSelected ? 'bg-primary/5' : 'hover:bg-muted/50',
                            )}>
                            <QIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <button
                              onClick={() => setSelection({ type: 'question', sectionId: sec.id, questionId: q.id })}
                              className="flex-1 truncate text-left text-xs">
                              {q.text}
                            </button>
                            <div className="hidden items-center gap-0.5 group-hover:flex">
                              <button onClick={() => moveQuestion(sec.id, q.id, -1)} disabled={qIdx === 0}
                                className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button onClick={() => moveQuestion(sec.id, q.id, 1)} disabled={qIdx === sec.questions.length - 1}
                                className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button onClick={() => deleteQuestion(sec.id, q.id)}
                                className="rounded p-0.5 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add section */}
            <div className="shrink-0 border-t border-border p-3">
              <button onClick={addSection}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="h-4 w-4" /> Añadir sección
              </button>
            </div>
          </aside>

          {/* Right editor */}
          <main className="flex-1 overflow-y-auto">
            {renderPanel()}
          </main>
        </div>
      </div>
    </>
  );
}
