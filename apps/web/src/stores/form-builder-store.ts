/**
 * Zustand store for the Form Builder — manages the entire builder state.
 */

import { create } from 'zustand';

import type {
  FormSchema,
  FormSection,
  FormField,
  FieldType,
  ScoringConfig,
  FormSettings,
  FieldOption,
  ConditionalRule,
} from '@/types/forms';

// ── Helpers ────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function createDefaultField(type: FieldType): FormField {
  const base: FormField = {
    id: genId('fld'),
    type,
    label: '',
    required: false,
  };

  switch (type) {
    case 'select':
    case 'multi_select':
      base.options = [
        { id: genId('opt'), value: 'option_1', label: 'Opción 1' },
        { id: genId('opt'), value: 'option_2', label: 'Opción 2' },
      ];
      break;
    case 'number':
    case 'slider':
      base.min = 0;
      base.max = 100;
      base.step = 1;
      break;
    case 'rating':
      base.max = 5;
      break;
    case 'photo':
      base.min_photos = 0;
      base.max_photos = 5;
      break;
    case 'checklist':
      base.items = ['Ítem 1', 'Ítem 2', 'Ítem 3'];
      break;
    case 'temperature':
      base.unit = 'C';
      break;
    case 'matrix':
      base.columns = [
        { id: genId('col'), label: 'Columna 1', type: 'text' },
        { id: genId('col'), label: 'Columna 2', type: 'text' },
      ];
      base.rows = [
        { id: genId('row'), label: 'Fila 1' },
        { id: genId('row'), label: 'Fila 2' },
      ];
      break;
    case 'table':
      base.columns = [
        { id: genId('col'), label: 'Columna 1', type: 'text' },
        { id: genId('col'), label: 'Columna 2', type: 'number' },
      ];
      break;
    case 'lookup':
      base.lookup_entity = 'users';
      base.lookup_display = 'name';
      break;
    case 'calculated':
      base.formula = '';
      break;
    default:
      break;
  }

  return base;
}

function createDefaultSection(): FormSection {
  return {
    id: genId('sec'),
    title: 'Nueva sección',
    description: '',
    order: 0,
    fields: [],
  };
}

// ── Store Types ────────────────────────────────────────────

interface BuilderState {
  // Template metadata
  templateId: string | null;
  templateName: string;
  templateCategory: string;
  templateDescription: string;
  templateTags: string[];
  templateStatus: 'draft' | 'published' | 'archived';

  // Schema
  sections: FormSection[];
  scoringConfig: ScoringConfig;
  settings: FormSettings;

  // UI state
  selectedFieldId: string | null;
  selectedSectionId: string | null;
  isDirty: boolean;

  // Actions — Template metadata
  setTemplateId: (id: string | null) => void;
  setTemplateName: (name: string) => void;
  setTemplateCategory: (cat: string) => void;
  setTemplateDescription: (desc: string) => void;
  setTemplateTags: (tags: string[]) => void;
  setTemplateStatus: (status: 'draft' | 'published' | 'archived') => void;

  // Actions — Sections
  addSection: () => void;
  updateSection: (sectionId: string, data: Partial<FormSection>) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  duplicateSection: (sectionId: string) => void;

  // Actions — Fields
  addField: (sectionId: string, fieldType: FieldType, index?: number) => void;
  updateField: (fieldId: string, data: Partial<FormField>) => void;
  removeField: (fieldId: string) => void;
  moveFieldWithinSection: (sectionId: string, fromIndex: number, toIndex: number) => void;
  moveFieldBetweenSections: (fromSectionId: string, toSectionId: string, fromIndex: number, toIndex: number) => void;
  duplicateField: (fieldId: string) => void;

  // Actions — Selection
  selectField: (fieldId: string | null) => void;
  selectSection: (sectionId: string | null) => void;

  // Actions — Scoring & Settings
  setScoringConfig: (config: Partial<ScoringConfig>) => void;
  setSettings: (settings: Partial<FormSettings>) => void;

  // Actions — Full schema
  loadSchema: (schema: FormSchema, meta?: { id?: string; name?: string; category?: string; description?: string; tags?: string[]; status?: string }) => void;
  getSchema: () => FormSchema;
  resetBuilder: () => void;

  // Helpers
  getField: (fieldId: string) => FormField | undefined;
  getFieldSection: (fieldId: string) => FormSection | undefined;
}

// ── Default values ─────────────────────────────────────────

const DEFAULT_SCORING: ScoringConfig = {
  enabled: false,
  pass_threshold: 80,
  fail_threshold: 60,
  show_score_to_inspector: true,
};

const DEFAULT_SETTINGS: FormSettings = {
  allow_offline: true,
  require_geolocation: false,
  require_signature: false,
  auto_create_actions_on_fail: false,
  notify_on_critical_fail: [],
  expiry_hours: 24,
};

// ── Store ──────────────────────────────────────────────────

export const useFormBuilderStore = create<BuilderState>((set, get) => ({
  templateId: null,
  templateName: '',
  templateCategory: 'inspection',
  templateDescription: '',
  templateTags: [],
  templateStatus: 'draft',

  sections: [createDefaultSection()],
  scoringConfig: { ...DEFAULT_SCORING },
  settings: { ...DEFAULT_SETTINGS },

  selectedFieldId: null,
  selectedSectionId: null,
  isDirty: false,

  // ── Template metadata ─────────────────────────────────
  setTemplateId: (id) => set({ templateId: id }),
  setTemplateName: (name) => set({ templateName: name, isDirty: true }),
  setTemplateCategory: (cat) => set({ templateCategory: cat, isDirty: true }),
  setTemplateDescription: (desc) => set({ templateDescription: desc, isDirty: true }),
  setTemplateTags: (tags) => set({ templateTags: tags, isDirty: true }),
  setTemplateStatus: (status) => set({ templateStatus: status }),

  // ── Sections ──────────────────────────────────────────
  addSection: () => set((s) => {
    const sec = createDefaultSection();
    sec.order = s.sections.length;
    return { sections: [...s.sections, sec], isDirty: true };
  }),

  updateSection: (sectionId, data) => set((s) => ({
    sections: s.sections.map((sec) =>
      sec.id === sectionId ? { ...sec, ...data } : sec,
    ),
    isDirty: true,
  })),

  removeSection: (sectionId) => set((s) => ({
    sections: s.sections.filter((sec) => sec.id !== sectionId),
    selectedSectionId: s.selectedSectionId === sectionId ? null : s.selectedSectionId,
    selectedFieldId: s.sections.find((sec) => sec.id === sectionId)?.fields.some((f) => f.id === s.selectedFieldId) ? null : s.selectedFieldId,
    isDirty: true,
  })),

  moveSection: (fromIndex, toIndex) => set((s) => {
    const arr = [...s.sections];
    const [moved] = arr.splice(fromIndex, 1);
    if (!moved) return {};
    arr.splice(toIndex, 0, moved);
    return { sections: arr.map((sec, i) => ({ ...sec, order: i })), isDirty: true };
  }),

  duplicateSection: (sectionId) => set((s) => {
    const original = s.sections.find((sec) => sec.id === sectionId);
    if (!original) return {};
    const clone: FormSection = {
      ...structuredClone(original),
      id: genId('sec'),
      title: `${original.title} (copia)`,
      fields: original.fields.map((f) => ({ ...structuredClone(f), id: genId('fld') })),
    };
    const idx = s.sections.findIndex((sec) => sec.id === sectionId);
    const arr = [...s.sections];
    arr.splice(idx + 1, 0, clone);
    return { sections: arr.map((sec, i) => ({ ...sec, order: i })), isDirty: true };
  }),

  // ── Fields ────────────────────────────────────────────
  addField: (sectionId, fieldType, index) => set((s) => {
    const field = createDefaultField(fieldType);
    return {
      sections: s.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const fields = [...sec.fields];
        if (index !== undefined) {
          fields.splice(index, 0, field);
        } else {
          fields.push(field);
        }
        return { ...sec, fields };
      }),
      selectedFieldId: field.id,
      isDirty: true,
    };
  }),

  updateField: (fieldId, data) => set((s) => ({
    sections: s.sections.map((sec) => ({
      ...sec,
      fields: sec.fields.map((f) =>
        f.id === fieldId ? { ...f, ...data } : f,
      ),
    })),
    isDirty: true,
  })),

  removeField: (fieldId) => set((s) => ({
    sections: s.sections.map((sec) => ({
      ...sec,
      fields: sec.fields.filter((f) => f.id !== fieldId),
    })),
    selectedFieldId: s.selectedFieldId === fieldId ? null : s.selectedFieldId,
    isDirty: true,
  })),

  moveFieldWithinSection: (sectionId, fromIndex, toIndex) => set((s) => ({
    sections: s.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const fields = [...sec.fields];
      const [moved] = fields.splice(fromIndex, 1);
      if (!moved) return sec;
      fields.splice(toIndex, 0, moved);
      return { ...sec, fields };
    }),
    isDirty: true,
  })),

  moveFieldBetweenSections: (fromSectionId, toSectionId, fromIndex, toIndex) => set((s) => {
    let movedField: FormField | undefined;
    const sections = s.sections.map((sec) => {
      if (sec.id === fromSectionId) {
        const fields = [...sec.fields];
        movedField = fields.splice(fromIndex, 1)[0];
        return { ...sec, fields };
      }
      return sec;
    });
    if (!movedField) return {};
    const finalField = movedField;
    return {
      sections: sections.map((sec) => {
        if (sec.id === toSectionId) {
          const fields = [...sec.fields];
          fields.splice(toIndex, 0, finalField);
          return { ...sec, fields };
        }
        return sec;
      }),
      isDirty: true,
    };
  }),

  duplicateField: (fieldId) => set((s) => ({
    sections: s.sections.map((sec) => {
      const idx = sec.fields.findIndex((f) => f.id === fieldId);
      if (idx === -1) return sec;
      const clone: FormField = { ...structuredClone(sec.fields[idx]) as FormField, id: genId('fld') };
      const fields = [...sec.fields];
      fields.splice(idx + 1, 0, clone);
      return { ...sec, fields };
    }),
    isDirty: true,
  })),

  // ── Selection ─────────────────────────────────────────
  selectField: (fieldId) => set({ selectedFieldId: fieldId }),
  selectSection: (sectionId) => set({ selectedSectionId: sectionId }),

  // ── Scoring & Settings ────────────────────────────────
  setScoringConfig: (config) => set((s) => ({
    scoringConfig: { ...s.scoringConfig, ...config },
    isDirty: true,
  })),

  setSettings: (settings) => set((s) => ({
    settings: { ...s.settings, ...settings },
    isDirty: true,
  })),

  // ── Schema operations ─────────────────────────────────
  loadSchema: (schema, meta) => {
    if (!schema || !schema.sections) {
      // schema_def is null/undefined — start fresh
      get().resetBuilder();
      if (meta?.name) set({ templateId: meta?.id ?? null, templateName: meta.name, templateStatus: (meta?.status as 'draft' | 'published' | 'archived') ?? 'draft' });
      return;
    }
    set({
      templateId: meta?.id ?? null,
      templateName: meta?.name ?? '',
      templateCategory: meta?.category ?? 'inspection',
      templateDescription: meta?.description ?? '',
      templateTags: meta?.tags ?? [],
      templateStatus: (meta?.status as 'draft' | 'published' | 'archived') ?? 'draft',
      sections: schema.sections,
      scoringConfig: schema.scoring_config ?? { ...DEFAULT_SCORING },
      settings: schema.settings ?? { ...DEFAULT_SETTINGS },
      selectedFieldId: null,
      selectedSectionId: null,
      isDirty: false,
    });
  },

  getSchema: () => {
    const s = get();
    return {
      id: s.templateId ?? genId('form'),
      version: 1,
      sections: s.sections,
      scoring_config: s.scoringConfig,
      settings: s.settings,
    };
  },

  resetBuilder: () => set({
    templateId: null,
    templateName: '',
    templateCategory: 'inspection',
    templateDescription: '',
    templateTags: [],
    templateStatus: 'draft',
    sections: [createDefaultSection()],
    scoringConfig: { ...DEFAULT_SCORING },
    settings: { ...DEFAULT_SETTINGS },
    selectedFieldId: null,
    selectedSectionId: null,
    isDirty: false,
  }),

  // ── Helpers ───────────────────────────────────────────
  getField: (fieldId) => {
    for (const sec of get().sections) {
      const f = sec.fields.find((f) => f.id === fieldId);
      if (f) return f;
    }
    return undefined;
  },

  getFieldSection: (fieldId) => {
    return get().sections.find((sec) => sec.fields.some((f) => f.id === fieldId));
  },
}));
