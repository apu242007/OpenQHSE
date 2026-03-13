'use client';

import { GripVertical, Trash2, Copy, Settings2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '@/types/forms';
import { FIELD_TYPE_CATALOG } from '@/types/forms';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface FieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function FieldCard({ field, isSelected, onSelect, onRemove, onDuplicate }: FieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { type: 'field', field },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const catalog = FIELD_TYPE_CATALOG.find((c) => c.type === field.type);
  const IconComp = catalog
    ? (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[catalog.icon]
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 transition-all',
        isSelected
          ? 'border-primary ring-1 ring-primary/30 shadow-sm'
          : 'border-border hover:border-primary/40',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {IconComp ? <IconComp className="h-3.5 w-3.5" /> : null}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {field.label || <span className="italic text-muted-foreground">Sin título</span>}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {catalog?.label}
          {field.required && ' • Obligatorio'}
        </p>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Duplicar"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
