'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, PlusCircle } from 'lucide-react';
import type { FormField, FieldOption, ConditionalRule, FieldScoring, MatrixColumn, MatrixRow } from '@/types/forms';
import { FIELD_TYPE_CATALOG } from '@/types/forms';
import { cn } from '@/lib/utils';

interface FieldPropertiesProps {
  field: FormField | undefined;
  onUpdate: (data: Partial<FormField>) => void;
  allFields: FormField[];
}

export function FieldProperties({ field, onUpdate, allFields }: FieldPropertiesProps) {
  if (!field) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-xs text-muted-foreground">
          Selecciona un campo para editar sus propiedades
        </p>
      </div>
    );
  }

  const catalog = FIELD_TYPE_CATALOG.find((c) => c.type === field.type);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Propiedades
        </h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{catalog?.label}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Label */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Etiqueta</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Nombre del campo"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Descripción</label>
          <textarea
            value={field.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Texto de ayuda"
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Placeholder */}
        {['text', 'textarea', 'number'].includes(field.type) && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Placeholder</label>
            <input
              type="text"
              value={field.placeholder ?? ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="Texto de ayuda"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Required */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            title="Obligatorio"
            className="h-4 w-4 rounded border-border"
          />
          Obligatorio
        </label>

        {/* Options for select/multi_select */}
        {(field.type === 'select' || field.type === 'multi_select') && (
          <OptionsEditor
            options={field.options ?? []}
            onChange={(options) => onUpdate({ options })}
          />
        )}

        {/* Number min/max/step */}
        {(field.type === 'number' || field.type === 'slider') && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Mín</label>
              <input type="number" value={field.min ?? ''} onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Máx</label>
              <input type="number" value={field.max ?? ''} onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Paso</label>
              <input type="number" value={field.step ?? ''} onChange={(e) => onUpdate({ step: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        )}

        {/* Rating max */}
        {field.type === 'rating' && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Estrellas máx</label>
            <input type="number" min={1} max={10} value={field.max ?? 5} onChange={(e) => onUpdate({ max: Number(e.target.value) })} placeholder="5" className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
          </div>
        )}

        {/* Photo min/max */}
        {field.type === 'photo' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Fotos mín</label>
              <input type="number" min={0} value={field.min_photos ?? 0} onChange={(e) => onUpdate({ min_photos: Number(e.target.value) })} placeholder="0" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Fotos máx</label>
              <input type="number" min={1} value={field.max_photos ?? 5} onChange={(e) => onUpdate({ max_photos: Number(e.target.value) })} placeholder="5" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        )}

        {/* Checklist items */}
        {field.type === 'checklist' && (
          <ChecklistEditor
            items={field.items ?? []}
            onChange={(items) => onUpdate({ items })}
          />
        )}

        {/* Formula (calculated) */}
        {field.type === 'calculated' && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Fórmula</label>
            <input
              type="text"
              value={field.formula ?? ''}
              onChange={(e) => onUpdate({ formula: e.target.value })}
              placeholder="field_1 + field_2 * 0.5"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-mono outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Lookup entity */}
        {field.type === 'lookup' && (
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Entidad</label>
            <select
              value={field.lookup_entity ?? 'users'}
              onChange={(e) => onUpdate({ lookup_entity: e.target.value })}
              aria-label="Entidad de búsqueda"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="users">Usuarios</option>
              <option value="equipment">Equipos</option>
              <option value="sites">Ubicaciones</option>
            </select>
          </div>
        )}

        {/* Conditional Logic */}
        <ConditionalEditor
          conditional={field.conditional ?? null}
          onChange={(conditional) => onUpdate({ conditional })}
          allFields={allFields.filter((f) => f.id !== field.id)}
        />

        {/* Scoring */}
        <ScoringEditor
          scoring={field.scoring ?? null}
          fieldType={field.type}
          onChange={(scoring) => onUpdate({ scoring })}
        />

        {/* Help text */}
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Texto de ayuda</label>
          <input
            type="text"
            value={field.help_text ?? ''}
            onChange={(e) => onUpdate({ help_text: e.target.value })}
            placeholder="Tooltip informativo"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-editors ────────────────────────────────────────────

function OptionsEditor({ options, onChange }: { options: FieldOption[]; onChange: (o: FieldOption[]) => void }) {
  const addOption = () => {
    const n = options.length + 1;
    onChange([...options, { id: crypto.randomUUID().slice(0, 8), value: `option_${n}`, label: `Opción ${n}` }]);
  };

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Opciones</label>
      <div className="space-y-1">
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-1">
            <input
              type="text"
              value={opt.label}
              onChange={(e) => {
                const updated = [...options];
                updated[idx] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                onChange(updated);
              }}
              placeholder="Opción"
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="number"
              value={opt.score ?? ''}
              onChange={(e) => {
                const updated = [...options];
                updated[idx] = { ...opt, score: e.target.value ? Number(e.target.value) : undefined };
                onChange(updated);
              }}
              placeholder="Pts"
              className="w-14 rounded border border-border bg-background px-1 py-1 text-center text-xs outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="button" title="Eliminar opción" onClick={() => onChange(options.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-danger">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addOption} className="mt-1.5 flex items-center gap-1 text-[11px] text-primary hover:underline">
        <PlusCircle className="h-3 w-3" /> Agregar opción
      </button>
    </div>
  );
}

function ChecklistEditor({ items, onChange }: { items: string[]; onChange: (i: string[]) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Ítems</label>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <input
              type="text"
              value={item}
              onChange={(e) => { const u = [...items]; u[idx] = e.target.value; onChange(u); }}
              placeholder="Nombre del ítem"
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="button" title="Eliminar ítem" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-danger">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, `Ítem ${items.length + 1}`])} className="mt-1.5 flex items-center gap-1 text-[11px] text-primary hover:underline">
        <PlusCircle className="h-3 w-3" /> Agregar ítem
      </button>
    </div>
  );
}

function ConditionalEditor({
  conditional,
  onChange,
  allFields,
}: {
  conditional: ConditionalRule | null;
  onChange: (c: ConditionalRule | null) => void;
  allFields: FormField[];
}) {
  const [enabled, setEnabled] = useState(!!conditional);

  return (
    <div className="rounded-lg border border-border p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            if (!e.target.checked) onChange(null);
            else onChange({ field_id: '', operator: 'eq', value: '' });
          }}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Lógica condicional
      </label>
      {enabled && conditional && (
        <div className="mt-2 space-y-2">
          <select
            value={conditional.field_id}
            onChange={(e) => onChange({ ...conditional, field_id: e.target.value })}
            aria-label="Campo condicional"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
          >
            <option value="">Seleccionar campo...</option>
            {allFields.map((f) => (
              <option key={f.id} value={f.id}>{f.label || f.id}</option>
            ))}
          </select>
          <select
            value={conditional.operator}
            onChange={(e) => onChange({ ...conditional, operator: e.target.value as ConditionalRule['operator'] })}
            aria-label="Operador"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
          >
            <option value="eq">Igual a</option>
            <option value="neq">Distinto de</option>
            <option value="gt">Mayor que</option>
            <option value="lt">Menor que</option>
            <option value="contains">Contiene</option>
            <option value="not_empty">No vacío</option>
            <option value="empty">Vacío</option>
          </select>
          {!['not_empty', 'empty'].includes(conditional.operator) && (
            <input
              type="text"
              value={String(conditional.value ?? '')}
              onChange={(e) => onChange({ ...conditional, value: e.target.value })}
              placeholder="Valor"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ScoringEditor({
  scoring,
  fieldType,
  onChange,
}: {
  scoring: FieldScoring | null;
  fieldType: string;
  onChange: (s: FieldScoring | null) => void;
}) {
  const [enabled, setEnabled] = useState(!!scoring);

  const scoringTypes = ['option_score', 'boolean', 'risk_matrix', 'checklist', 'rating'] as const;

  return (
    <div className="rounded-lg border border-border p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            if (!e.target.checked) onChange(null);
            else onChange({ type: 'option_score', weight: 1 });
          }}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Puntuación
      </label>
      {enabled && scoring && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-0.5 block text-[10px] text-muted-foreground">Tipo</label>
            <select
              value={scoring.type}
              onChange={(e) => onChange({ ...scoring, type: e.target.value as FieldScoring['type'] })}
              aria-label="Tipo de puntuación"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
            >
              {scoringTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-muted-foreground">Peso</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={scoring.weight}
              onChange={(e) => onChange({ ...scoring, weight: Number(e.target.value) })}
              placeholder="1"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
