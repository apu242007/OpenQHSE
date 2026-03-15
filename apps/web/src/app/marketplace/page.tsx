'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Star, Clock, FileText, Download, ArrowRight, ChevronRight,
  ShieldCheck, Flame, HardHat, Leaf, HeartPulse, FlaskConical,
  Cpu, Zap, Shield, Loader2, PackageOpen,
} from 'lucide-react';
import {
  useMarketplaceTemplates,
  useMarketplaceFeatured,
  useMarketplaceCategories,
  useMarketplacePopular,
} from '@/hooks/use-marketplace';
import type { MarketplaceTemplateList, CategoryInfo } from '@/types/marketplace';
import { cn } from '@/lib/utils';

// ─── Category icon mapping ────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  safety:      ShieldCheck,
  oil_and_gas: Flame,
  mining:      HardHat,
  construction:HardHat,
  environment: Leaf,
  health:      HeartPulse,
  quality:     FlaskConical,
  electrical:  Zap,
  manufacturing: Cpu,
  general:     Shield,
};

const CATEGORY_LABELS: Record<string, string> = {
  safety:       'Seguridad',
  oil_and_gas:  'Petróleo & Gas',
  mining:       'Minería',
  construction: 'Construcción',
  environment:  'Medio Ambiente',
  health:       'Salud Ocupacional',
  quality:      'Calidad',
  electrical:   'Eléctrico',
  manufacturing:'Manufactura',
  general:      'General',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ value, count }: { value: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3 w-3 fill-warning text-warning" />
      {value > 0 ? value.toFixed(1) : '—'}
      {count > 0 && <span>({count})</span>}
    </span>
  );
}

function TemplateBadge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'safe' | 'featured' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        variant === 'featured' && 'bg-warning/15 text-warning',
        variant === 'safe'     && 'bg-safe/15 text-safe',
        variant === 'default'  && 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

function TemplateCard({ tpl }: { tpl: MarketplaceTemplateList }) {
  const Icon = CATEGORY_ICONS[tpl.category] ?? Shield;
  const label = CATEGORY_LABELS[tpl.category] ?? tpl.category;

  return (
    <Link
      href={`/marketplace/${tpl.id}`}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Featured ribbon */}
      {tpl.is_featured && (
        <div className="absolute right-3 top-3">
          <TemplateBadge label="⭐ Destacado" variant="featured" />
        </div>
      )}

      {/* Icon + category */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <TemplateBadge label={label} variant="default" />
      </div>

      {/* Name + description */}
      <div className="flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
          {tpl.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {tpl.short_description}
        </p>
      </div>

      {/* Standards pills */}
      {tpl.standards.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tpl.standards.slice(0, 2).map((std) => (
            <TemplateBadge key={std} label={std} variant="safe" />
          ))}
          {tpl.standards.length > 2 && (
            <TemplateBadge label={`+${tpl.standards.length - 2}`} variant="default" />
          )}
        </div>
      )}

      {/* Metadata row */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> {tpl.question_count}p
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {tpl.estimated_duration_minutes}min
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" /> {tpl.import_count}
          </span>
        </div>
        <StarRating value={tpl.rating_average} count={tpl.rating_count} />
      </div>
    </Link>
  );
}

function CategoryCard({ cat, active, onClick }: { cat: CategoryInfo; active: boolean; onClick: () => void }) {
  const Icon = CATEGORY_ICONS[cat.value] ?? Shield;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-center text-xs leading-tight">{cat.label}</span>
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {cat.template_count}
      </span>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="mb-1 h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted" />
      <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Hero / stats strip ───────────────────────────────────────────────────────

const STATS = [
  { label: 'Templates listos', value: '30+' },
  { label: 'Estándares cubiertos', value: '15+' },
  { label: 'Industrias', value: '8' },
  { label: '100% gratuito', value: 'MIT' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');

  // Compose query string
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search)   p.set('q', search);
    if (category) p.set('category', category);
    return p.toString();
  }, [search, category]);

  const { data: featured,   isLoading: loadFeatured }    = useMarketplaceFeatured();
  const { data: popular,    isLoading: loadPopular }     = useMarketplacePopular();
  const { data: categories, isLoading: loadCategories }  = useMarketplaceCategories();
  const { data: templates,  isLoading: loadTemplates }   = useMarketplaceTemplates(
    qs ? { q: search || undefined, category: category || undefined } : undefined
  );

  const isFiltering = !!(search || category);

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background px-4 pb-16 pt-20 text-center sm:px-6">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <PackageOpen className="h-3.5 w-3.5" />
            30 templates certificados · 100% gratuitos
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Marketplace de Templates{' '}
            <span className="text-primary">QHSE</span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground">
            Checklists e inspecciones certificadas para industria pesada.
            Listos para importar en un clic y adaptables a tu operación.
          </p>

          {/* Search bar */}
          <div className="relative mt-8">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, estándar o industria… (ej: ISO 45001, altura, LOTO)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="text-2xl font-extrabold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* ── Categories ─────────────────────────────── */}
        <section className="py-10">
          <h2 className="mb-5 text-lg font-bold">Explorar por categoría</h2>
          {loadCategories ? (
            <div className="flex h-20 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
              {categories?.map((cat) => (
                <CategoryCard
                  key={cat.value}
                  cat={{ ...cat, label: CATEGORY_LABELS[cat.value] ?? cat.label }}
                  active={category === cat.value}
                  onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Featured (shown when not filtering) ────── */}
        {!isFiltering && (
          <section className="py-4">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">⭐ Destacados</h2>
              <button
                type="button"
                onClick={() => {}}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadFeatured ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {featured?.slice(0, 8).map((tpl) => (
                  <TemplateCard key={tpl.id} tpl={tpl} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Popular (shown when not filtering) ─────── */}
        {!isFiltering && (
          <section className="py-10">
            <h2 className="mb-5 text-lg font-bold">🔥 Más usados</h2>
            {loadPopular ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {popular?.slice(0, 4).map((tpl) => (
                  <TemplateCard key={tpl.id} tpl={tpl} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── All / Search results ────────────────────── */}
        <section className="py-4 pb-20">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {isFiltering
                ? `Resultados${search ? ` para "${search}"` : ''}${category ? ` en ${CATEGORY_LABELS[category] ?? category}` : ''}`
                : 'Todos los templates'}
            </h2>
            {isFiltering && (
              <button
                type="button"
                onClick={() => { setSearch(''); setCategory(''); }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Limpiar filtros ×
              </button>
            )}
          </div>

          {loadTemplates ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((tpl) => (
                <TemplateCard key={tpl.id} tpl={tpl} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
              <Search className="h-10 w-10 opacity-30" />
              <p className="text-sm">
                {isFiltering
                  ? 'No se encontraron templates con esos filtros.'
                  : 'No hay templates disponibles.'}
              </p>
              {isFiltering && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setCategory(''); }}
                  className="text-sm text-primary hover:underline"
                >
                  Ver todos los templates
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Standards section ───────────────────────── */}
        <section id="standards" className="border-t border-border py-16 text-center">
          <h2 className="mb-3 text-2xl font-bold">Estándares internacionales incluidos</h2>
          <p className="mb-8 text-muted-foreground">
            Todos los templates están alineados a normas industriales reconocidas globalmente.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'ISO 45001', 'ISO 14001', 'ISO 9001', 'OSHA 1926', 'OSHA 1910',
              'API RP 75', 'ASME B31.8S', 'MSHA 30 CFR', 'NFPA 51B',
              'EPA/SPCC', 'RCRA', 'ASME B30.5', 'IADC/API', 'ACGIH TLV', 'ISO 11228',
            ].map((std) => (
              <span
                key={std}
                className="rounded-full border border-safe/30 bg-safe/10 px-3 py-1 text-sm font-semibold text-safe"
              >
                {std}
              </span>
            ))}
          </div>
        </section>

        {/* ── CTA strip ───────────────────────────────── */}
        <section className="mb-20 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">¿Listo para digitalizar tu gestión QHSE?</h2>
          <p className="mb-6 text-muted-foreground">
            Crea una cuenta gratuita e importa cualquier template en segundos.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {process.env.NEXT_PUBLIC_DISABLE_AUTH !== 'true' && (
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Crear cuenta gratis <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            <a
              href="https://github.com/apu242007/OpenQHSE"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Ver en GitHub
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
