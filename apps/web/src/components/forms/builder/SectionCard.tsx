'use client';

import { GripVertical, Trash2, Copy, ChevronDown, ChevronUp, Plus, MoreHorizontal } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import type { FormSection, FieldType } from '@/types/forms';
import { cn } from '@/lib/utils';
import { FieldCard } from './FieldCard';
import { useState } from 'react';

interface SectionCardProps {
  section: FormSection;
  index: number;
  isSelected: boolean;
  selectedFieldId: string | null;
  onSelectSection: () => void;
  onSelectField: (fieldId: string) => void;
  onUpdateSection: (data: Partial<FormSection>) => void;
  onRemoveSection: () => void;
  onDuplicateSection: () => void;
  onRemoveField: (fieldId: string) => void;
  onDuplicateField: (fieldId: string) => void;
  onDropField: (type: FieldType) => void;
}

export function SectionCard({
  section,
  index,
  isSelected,
  selectedFieldId,
  onSelectSection,
  onSelectField,
  onUpdateSection,
  onRemoveSection,
  onDuplicateSection,
  onRemoveField,
  onDuplicateField,
  onDropField,
}: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: sortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: { type: 'section', section },
  });

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `section-drop-${section.id}`,
    data: { type: 'section-drop', sectionId: section.id },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={sortableRef}
      style={style}
      className={cn(
        'rounded-xl border-2 bg-card transition-all',
        isSelected ? 'border-primary/50 shadow-md' : 'border-border',
        isDragging && 'opacity-50',
        isOver && 'border-primary border-dashed',
      )}
    >
      {/* Section Header */}
      <div
        className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5 rounded-t-xl cursor-pointer"
        onClick={onSelectSection}
      >
        <button title="Reordenar sección" className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </span>

        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdateSection({ title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Nombre de la sección"
          className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
        />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            title="Opciones de sección"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-border bg-popover py-1 shadow-lg">
              <button
                type="button"
                onClick={() => { onDuplicateSection(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Copy className="h-3 w-3" /> Duplicar
              </button>
              <button
                type="button"
                onClick={() => { onRemoveSection(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fields List */}
      {!collapsed && (
        <div
          ref={dropRef}
          className="space-y-1.5 p-3"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('field-type');
            if (type) onDropField(type as FieldType);
          }}
        >
          <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            {section.fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onSelectField(field.id)}
                onRemove={() => onRemoveField(field.id)}
                onDuplicate={() => onDuplicateField(field.id)}
              />
            ))}
          </SortableContext>

          {section.fields.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground">
              <Plus className="h-6 w-6" />
              <p className="text-xs">Arrastra campos aquí o usa el panel izquierdo</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
