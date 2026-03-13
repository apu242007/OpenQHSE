'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Save, Eye, Send, ArrowLeft, Settings, BarChart3, Loader2,
} from 'lucide-react';
import { useFormBuilderStore } from '@/stores/form-builder-store';
import { useFormTemplate, useCreateTemplate, useUpdateTemplate, usePublishTemplate } from '@/hooks/use-forms';
import { FieldLibrary } from '@/components/forms/builder/FieldLibrary';
import { FormCanvas } from '@/components/forms/builder/FormCanvas';
import { FieldProperties } from '@/components/forms/builder/FieldProperties';
import { FormPreview } from '@/components/forms/builder/FormPreview';
import { ScoringConfigPanel } from '@/components/forms/builder/ScoringConfigPanel';
import { FormSettingsPanel } from '@/components/forms/builder/FormSettingsPanel';
import { cn } from '@/lib/utils';
import type { FieldType } from '@/types/forms';

type RightPanel = 'properties' | 'scoring' | 'settings';

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';
  const templateId = isNew ? undefined : params.id;

  const [rightPanel, setRightPanel] = useState<RightPanel>('properties');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    templateName, setTemplateName,
    templateCategory, setTemplateCategory,
    templateDescription, setTemplateDescription,
    selectedFieldId, selectedSectionId,
    sections, isDirty,
    addField, getField, getSchema, loadSchema, resetBuilder,
    selectField, updateField,
  } = useFormBuilderStore();

  const { data: template, isLoading } = useFormTemplate(templateId);
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const publishMutation = usePublishTemplate();

  // Load template data into store
  useEffect(() => {
    if (template) {
      loadSchema(template.schema_def, {
        id: template.id,
        name: template.name,
        category: template.category,
        description: template.description,
        tags: template.tags,
        status: template.status,
      });
    } else if (isNew) {
      resetBuilder();
    }
  }, [template, isNew]);

  // Collect all fields for conditional references
  const allFields = sections.flatMap((s) => s.fields);
  const selectedField = selectedFieldId ? getField(selectedFieldId) : undefined;

  const handleSave = async () => {
    setSaving(true);
    try {
      const schema = getSchema();
      const payload = {
        name: templateName,
        category: templateCategory,
        description: templateDescription,
        schema_def: schema,
        scoring_config: schema.scoring_config,
      };

      if (templateId) {
        await updateMutation.mutateAsync({ id: templateId, data: payload });
      } else {
        const result = await createMutation.mutateAsync(payload);
        if (result && typeof result === 'object' && 'id' in result) {
          router.replace(`/forms/builder/${(result as { id: string }).id}`);
        }
      }
    } catch (e) {
      console.error('Error saving template:', e);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (templateId) {
      await handleSave();
      await publishMutation.mutateAsync(templateId);
    }
  };

  const handleAddField = (type: FieldType, sectionId: string) => {
    addField(sectionId, type);
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/forms')} className="rounded-md p-1.5 hover:bg-muted" title="Volver">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nombre del formulario"
              className="bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-2">
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                aria-label="Categoría del formulario"
                className="bg-transparent text-[11px] text-muted-foreground outline-none"
              >
                <option value="inspection">Inspección</option>
                <option value="audit">Auditoría</option>
                <option value="incident">Incidente</option>
                <option value="permit">Permiso</option>
                <option value="checklist">Checklist</option>
                <option value="risk">Riesgo</option>
                <option value="training">Capacitación</option>
                <option value="other">Otro</option>
              </select>
              {isDirty && <span className="rounded bg-warning/20 px-1.5 text-[10px] font-medium text-warning">Sin guardar</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" /> Vista previa
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={!templateId}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Publicar
          </button>
        </div>
      </header>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Field Library */}
        <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-card lg:block">
          <FieldLibrary onAddField={handleAddField} activeSectionId={selectedSectionId ?? sections[0]?.id ?? null} />
        </aside>

        {/* Center — Canvas */}
        <FormCanvas />

        {/* Right — Properties / Scoring / Settings */}
        <aside className="hidden w-72 flex-shrink-0 border-l border-border bg-card lg:flex lg:flex-col">
          <div className="flex border-b border-border">
            {([
              { key: 'properties' as const, icon: Settings, label: 'Propiedades' },
              { key: 'scoring' as const, icon: BarChart3, label: 'Puntuación' },
              { key: 'settings' as const, icon: Settings, label: 'Config' },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRightPanel(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  rightPanel === key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {rightPanel === 'properties' && (
              <FieldProperties
                field={selectedField}
                onUpdate={(data) => selectedFieldId && updateField(selectedFieldId, data)}
                allFields={allFields}
              />
            )}
            {rightPanel === 'scoring' && (
              <div className="p-3">
                <ScoringConfigPanel />
              </div>
            )}
            {rightPanel === 'settings' && (
              <div className="p-3">
                <FormSettingsPanel />
              </div>
            )}
          </div>
        </aside>
      </div>

      <FormPreview open={showPreview} onClose={() => setShowPreview(false)} />
    </div>
  );
}
