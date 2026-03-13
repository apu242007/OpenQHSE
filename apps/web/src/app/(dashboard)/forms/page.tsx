'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Filter, MoreHorizontal, FileText, Copy,
  Trash2, Send, Archive, Eye, Edit3, Loader2,
} from 'lucide-react';
import {
  useFormTemplates, useDeleteTemplate, useDuplicateTemplate,
  usePublishTemplate, useArchiveTemplate,
} from '@/hooks/use-forms';
import type { FormTemplateListItem, FormStatus } from '@/types/forms';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

const STATUS_BADGE: Record<FormStatus, { label: string; cls: string }> = {
  draft: { label: 'Borrador', cls: 'bg-muted text-muted-foreground' },
  published: { label: 'Publicado', cls: 'bg-success/20 text-success' },
  archived: { label: 'Archivado', cls: 'bg-warning/20 text-warning' },
};

const CATEGORIES: Record<string, string> = {
  inspection: 'Inspección',
  audit: 'Auditoría',
  incident: 'Incidente',
  permit: 'Permiso',
  checklist: 'Checklist',
  risk: 'Riesgo',
  training: 'Capacitación',
  other: 'Otro',
};

export default function FormsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);

  const { data: templates, isLoading } = useFormTemplates(params.toString() || undefined);
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();
  const publishMutation = usePublishTemplate();
  const archiveMutation = useArchiveTemplate();

  const filtered = (templates ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Formularios</h1>
          <p className="text-sm text-muted-foreground">Gestiona las plantillas de formularios</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/forms/builder/new')}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo formulario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar formularios..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <FileText className="h-12 w-12" />
          <p className="text-sm font-medium">No hay formularios</p>
          <button
            type="button"
            onClick={() => router.push('/forms/builder/new')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Crear primer formulario
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tmpl) => {
            const status = STATUS_BADGE[tmpl.status] ?? STATUS_BADGE.draft;
            return (
              <div
                key={tmpl.id}
                className="group relative rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-semibold">{tmpl.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {CATEGORIES[tmpl.category] ?? tmpl.category}
                    </p>
                  </div>
                  <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', status.cls)}>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>v{tmpl.version}</span>
                  <span>{formatDate(tmpl.created_at)}</span>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-1">
                  {tmpl.status === 'published' && (
                    <button
                      type="button"
                      onClick={() => router.push(`/forms/${tmpl.id}/submit`)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary/10 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      <Edit3 className="h-3 w-3" /> Responder
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(`/forms/builder/${tmpl.id}`)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Eye className="h-3 w-3" /> Editar
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(menuOpen === tmpl.id ? null : tmpl.id)}
                      className="rounded-md border border-border p-1.5 hover:bg-muted"
                      title="Más opciones"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {menuOpen === tmpl.id && (
                      <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-border bg-popover py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => { duplicateMutation.mutate(tmpl.id); setMenuOpen(null); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                        >
                          <Copy className="h-3 w-3" /> Duplicar
                        </button>
                        {tmpl.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => { publishMutation.mutate(tmpl.id); setMenuOpen(null); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                          >
                            <Send className="h-3 w-3" /> Publicar
                          </button>
                        )}
                        {tmpl.status === 'published' && (
                          <button
                            type="button"
                            onClick={() => { archiveMutation.mutate(tmpl.id); setMenuOpen(null); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                          >
                            <Archive className="h-3 w-3" /> Archivar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { deleteMutation.mutate(tmpl.id); setMenuOpen(null); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
