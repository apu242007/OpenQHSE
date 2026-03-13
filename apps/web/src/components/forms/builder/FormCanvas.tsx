'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useFormBuilderStore } from '@/stores/form-builder-store';
import { SectionCard } from './SectionCard';
import type { FieldType } from '@/types/forms';

export function FormCanvas() {
  const {
    sections,
    selectedFieldId,
    selectedSectionId,
    addSection,
    updateSection,
    removeSection,
    duplicateSection,
    moveSection,
    addField,
    removeField,
    duplicateField,
    moveFieldWithinSection,
    selectField,
    selectSection,
  } = useFormBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Section reorder
    if (activeData?.type === 'section' && overData?.type === 'section') {
      const fromIdx = sections.findIndex((s) => s.id === active.id);
      const toIdx = sections.findIndex((s) => s.id === over.id);
      if (fromIdx !== -1 && toIdx !== -1) moveSection(fromIdx, toIdx);
      return;
    }

    // Field reorder within same section
    if (activeData?.type === 'field' && overData?.type === 'field') {
      for (const sec of sections) {
        const fromIdx = sec.fields.findIndex((f) => f.id === active.id);
        const toIdx = sec.fields.findIndex((f) => f.id === over.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          moveFieldWithinSection(sec.id, fromIdx, toIdx);
          return;
        }
      }
    }
  };

  const handleDropField = (type: FieldType, sectionId: string) => {
    addField(sectionId, type);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="mx-auto max-w-3xl space-y-4">
            {sections.map((section, idx) => (
              <SectionCard
                key={section.id}
                section={section}
                index={idx}
                isSelected={selectedSectionId === section.id}
                selectedFieldId={selectedFieldId}
                onSelectSection={() => selectSection(section.id)}
                onSelectField={(fid) => { selectField(fid); selectSection(section.id); }}
                onUpdateSection={(data) => updateSection(section.id, data)}
                onRemoveSection={() => removeSection(section.id)}
                onDuplicateSection={() => duplicateSection(section.id)}
                onRemoveField={(fid) => removeField(fid)}
                onDuplicateField={(fid) => duplicateField(fid)}
                onDropField={(type) => handleDropField(type, section.id)}
              />
            ))}

            <button
              type="button"
              onClick={addSection}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-5 w-5" />
              Agregar sección
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
