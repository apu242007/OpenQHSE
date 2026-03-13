'use client';

import { useState } from 'react';
import { X, Eye } from 'lucide-react';
import { useFormBuilderStore } from '@/stores/form-builder-store';
import { FIELD_REGISTRY } from '@/components/forms/fields/index.ts';

export function FormPreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sections, templateName } = useFormBuilderStore();
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  if (!open) return null;

  const section = sections[currentSection];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Vista previa: {templateName || 'Sin nombre'}</h2>
          </div>
          <button type="button" onClick={onClose} title="Cerrar vista previa" className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
          {sections.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setCurrentSection(idx)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                idx === currentSection ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {idx + 1}. {sec.title || 'Sin título'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {section && (
            <>
              <div className="mb-2">
                <h3 className="text-lg font-bold">{section.title}</h3>
                {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
              </div>
              {section.fields.map((field) => {
                const Component = FIELD_REGISTRY[field.type];
                if (!Component) return null;
                return (
                  <Component
                    key={field.id}
                    field={field}
                    value={answers[field.id]}
                    onChange={(v: unknown) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setCurrentSection((c) => Math.max(0, c - 1))}
            disabled={currentSection === 0}
            className="rounded-md border border-border px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">{currentSection + 1} / {sections.length}</span>
          <button
            type="button"
            onClick={() => setCurrentSection((c) => Math.min(sections.length - 1, c + 1))}
            disabled={currentSection === sections.length - 1}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
