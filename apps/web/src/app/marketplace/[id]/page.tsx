'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Star, Clock, FileText, Download, ChevronDown, ChevronUp,
  ShieldCheck, CheckCircle2, XCircle, AlertCircle, List, BarChart3,
  Loader2, ExternalLink, LogIn, ChevronRight, Copy, Check,
} from 'lucide-react';
import { useMarketplaceTemplate, useImportTemplate, useRateTemplate } from '@/hooks/use-marketplace';
import type { MarketplaceSection, MarketplaceQuestion } from '@/types/marketplace';
import { cn } from '@/lib/utils';

// ─── Question type badge ──────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<string, string> = {
  yes_no:          'Sí / No',
  multiple_choice: 'Opción múltiple',
  text:            'Texto libre',
  number:          'Numérico',
  photo:           'Foto',
  rating:          'Puntuación',
  signature:       'Firma',
  date:            'Fecha',
  checkbox:        'Casilla',
};

const QUESTION_TYPE_COLORS: Record<string, string> = {
  yes_no:          'bg-safe/10 text-safe',
  multiple_choice: 'bg-primary/10 text-primary',
  text:            'bg-muted text-muted-foreground',
  number:          'bg-warning/10 text-warning',
  photo:           'bg-purple-500/10 text-purple-400',
  rating:          'bg-orange-500/10 text-orange-400',
  signature:       'bg-cyan-500/10 text-cyan-400',
};

function QuestionTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', QUESTION_TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground')}>
      {QUESTION_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ─── Section accordion ───────────────────────────────────────────────────────

function SectionAccordion({ section, index }: { section: MarketplaceSection; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 bg-card px-4 py-3 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <span className="font-semibold">{section.title}</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="text-xs">{section.questions.length} preguntas</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-border bg-background">
          {section.questions.map((q: MarketplaceQuestion, qi: number) => (
            <div key={q.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                {qi + 1}
              </span>
              <div className="flex-1 space-y-1">
                <p className="text-sm">{q.text}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <QuestionTypeBadge type={q.type} />
                  {q.required && (
                    <span className="text-[10px] font-semibold text-danger">Requerida</span>
                  )}
                  {q.weight > 0 && (
                    <span className="text-[10px] text-muted-foreground">Peso: {q.weight}</span>
                  )}
                  {q.options && q.options.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      Opciones: {q.options.join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scoring config display ───────────────────────────────────────────────────

function ScoringPanel({ config }: { config: Record<string, unknown> | null }) {
  if (!config) return null;

  const bands = (config.color_bands as Array<{ min: number; max: number; color: string; label: string }>) ?? [];
  const threshold = (config.pass_threshold as number) ?? 0;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <BarChart3 className="h-4 w-4 text-primary" /> Configuración de puntuación
      </h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Método</span>
          <p className="font-medium capitalize">{String(config.method ?? 'Porcentaje')}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Umbral de aprobación</span>
          <p className="font-medium text-safe">{threshold}%</p>
        </div>
      </div>
      {bands.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Bandas de calificación</p>
          {bands.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-sm">{b.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{b.min}% – {b.max}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Star selector ────────────────────────────────────────────────────────────

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              (hovered || value) >= n ? 'fill-warning text-warning' : 'text-muted-foreground',
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Import success / error toast ────────────────────────────────────────────

function ImportResult({ state }: { state: 'success' | 'error' | 'auth' | null }) {
  if (!state) return null;
  const map = {
    success: { icon: CheckCircle2, msg: 'Template importado a tus formularios.', cls: 'border-safe/30 bg-safe/10 text-safe' },
    error:   { icon: XCircle,     msg: 'Error al importar. Inténtalo de nuevo.',  cls: 'border-danger/30 bg-danger/10 text-danger' },
    auth:    { icon: AlertCircle, msg: 'Inicia sesión para importar este template.', cls: 'border-warning/30 bg-warning/10 text-warning' },
  } as const;
  const { icon: Icon, msg, cls } = map[state];
  return (
    <div className={cn('mt-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium', cls)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{msg}</span>
      {state === 'auth' && (
        <Link href="/dashboard" className="ml-auto flex items-center gap-1 underline">
          Ir al dashboard <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────

export default function MarketplaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;

  const { data: tpl, isLoading, error } = useMarketplaceTemplate(id);
  const { mutate: importTemplate, isPending: importing } = useImportTemplate();
  const { mutate: rateTemplate, isPending: rating }      = useRateTemplate();

  const [importState, setImportState] = useState<'success' | 'error' | 'auth' | null>(null);
  const [ratingValue, setRatingValue]  = useState(0);
  const [review, setReview]            = useState('');
  const [ratedOk, setRatedOk]          = useState(false);
  const [tab, setTab]                  = useState<'preview' | 'schema'>('preview');
  const [copied, setCopied]            = useState(false);
  const [expandAll, setExpandAll]      = useState(false);

  function handleImport() {
    if (!tpl) return;
    importTemplate(tpl.id, {
      onSuccess: () => setImportState('success'),
      onError:   (e: unknown) => {
        const err = e as { status?: number };
        setImportState(err?.status === 401 ? 'auth' : 'error');
      },
    });
  }

  function handleCopySchema() {
    if (!tpl) return;
    const text = JSON.stringify(tpl.schema_json, null, 2);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    } else {
      // Fallback for browsers without Clipboard API (e.g. VS Code Simple Browser)
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        console.warn('Copy to clipboard not supported in this browser');
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRate() {
    if (!tpl || ratingValue === 0) return;
    rateTemplate(
      { templateId: tpl.id, data: { score: ratingValue, review: review || undefined } },
      {
        onSuccess: () => setRatedOk(true),
        onError:   () => setImportState('auth'),
      },
    );
  }

  // ── Loading state ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando template…</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────
  if (error || !tpl) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Template no encontrado.</p>
        <Link href="/marketplace" className="text-sm text-primary hover:underline">
          ← Volver al marketplace
        </Link>
      </div>
    );
  }

  const sections = tpl.schema_json?.sections ?? [];
  const totalQuestions = sections.reduce((sum: number, s: MarketplaceSection) => sum + s.questions.length, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* ── Breadcrumb ──────────────────────────────── */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/marketplace" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Marketplace
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{tpl.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ── LEFT: content ─────────────────────────── */}
        <div className="space-y-8">

          {/* Header card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            {tpl.is_featured && (
              <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                ⭐ Template destacado
              </div>
            )}
            <h1 className="text-2xl font-extrabold leading-snug">{tpl.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{tpl.description}</p>

            {/* Meta pills */}
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> {totalQuestions} preguntas
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground">
                <List className="h-3.5 w-3.5" /> {sections.length} secciones
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {tpl.estimated_duration_minutes} min
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> {tpl.import_count} importaciones
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                {tpl.rating_average > 0 ? tpl.rating_average.toFixed(1) : '—'}
                {tpl.rating_count > 0 && <span className="text-muted-foreground">({tpl.rating_count})</span>}
              </span>
            </div>

            {/* Standards */}
            {tpl.standards.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tpl.standards.map((std) => (
                  <span key={std} className="rounded-full border border-safe/30 bg-safe/10 px-3 py-0.5 text-xs font-semibold text-safe">
                    {std}
                  </span>
                ))}
              </div>
            )}

            {/* Tags */}
            {tpl.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tpl.tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex rounded-xl border border-border p-1">
            {(['preview', 'schema'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'preview' ? '📋 Vista previa' : '{ } Esquema JSON'}
              </button>
            ))}
          </div>

          {/* Tab: Preview */}
          {tab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {sections.length} secciones · {totalQuestions} preguntas
                </p>
                <button
                  type="button"
                  onClick={() => setExpandAll(!expandAll)}
                  className="text-xs text-primary hover:underline"
                >
                  {expandAll ? 'Colapsar todo' : 'Expandir todo'}
                </button>
              </div>

              {sections.map((section: MarketplaceSection, i: number) => (
                <SectionAccordion key={section.title} section={section} index={i} />
              ))}
            </div>
          )}

          {/* Tab: Schema JSON */}
          {tab === 'schema' && (
            <div className="relative">
              <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-border bg-muted/50 px-4 py-2">
                <span className="text-xs font-mono text-muted-foreground">schema_json</span>
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <pre className="max-h-[500px] overflow-auto rounded-b-xl border border-border bg-background p-4 text-xs leading-relaxed text-foreground">
                {JSON.stringify(tpl.schema_json, null, 2)}
              </pre>
            </div>
          )}

          {/* Scoring */}
          <ScoringPanel config={tpl.scoring_config as Record<string, unknown> | null} />

          {/* Rating widget */}
          {!ratedOk ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 font-semibold">Califica este template</h3>
              <StarSelector value={ratingValue} onChange={setRatingValue} />
              <textarea
                rows={2}
                placeholder="Comentario opcional…"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                disabled={ratingValue === 0 || rating}
                onClick={handleRate}
                className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
              >
                {rating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Enviar calificación
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-safe/30 bg-safe/10 px-4 py-3 text-sm font-medium text-safe">
              <CheckCircle2 className="h-4 w-4" /> ¡Gracias por tu calificación!
            </div>
          )}
        </div>

        {/* ── RIGHT: sidebar ────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">

          {/* Import card */}
          <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-lg shadow-primary/5">
            <div className="mb-1 text-xl font-extrabold text-safe">Gratis</div>
            <p className="mb-5 text-xs text-muted-foreground">
              Importa este template a tu cuenta y personalízalo para tu operación.
            </p>
            <button
              type="button"
              disabled={importing}
              onClick={handleImport}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {importing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando…</>
                : <><Download className="h-4 w-4" /> Importar template</>
              }
            </button>
            <ImportResult state={importState} />
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LogIn className="h-3.5 w-3.5" />
              <span>
                Necesitas{' '}
                <Link href="/dashboard" className="text-primary hover:underline">ir al dashboard</Link>
                {' '}para importar.
              </span>
            </div>
          </div>

          {/* Meta info */}
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <h3 className="mb-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Información
            </h3>
            <dl className="space-y-2">
              {[
                { label: 'Versión',       value: tpl.version },
                { label: 'Idioma',        value: tpl.language === 'es' ? 'Español' : tpl.language },
                { label: 'Categoría',     value: tpl.category },
                { label: 'Industria',     value: tpl.industry },
                { label: 'Contribuido por', value: tpl.contributor_name },
                { label: 'Organización',  value: tpl.contributor_org ?? '—' },
                { label: 'Creado',        value: new Date(tpl.created_at).toLocaleDateString('es-ES') },
                { label: 'Actualizado',   value: new Date(tpl.updated_at).toLocaleDateString('es-ES') },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* View on GitHub */}
          <a
            href={`https://github.com/apu242007/OpenQHSE/tree/main/scripts/templates`}
            target="_blank"
            rel="noopener"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Ver fuente en GitHub
          </a>

          {/* Back to marketplace */}
          <Link
            href="/marketplace"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al marketplace
          </Link>
        </aside>
      </div>
    </main>
  );
}
