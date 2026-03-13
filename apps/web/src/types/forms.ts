/**
 * TypeScript types for the Form Builder module.
 *
 * Matches backend JSON schema definition exactly.
 */

// ── Field Types ────────────────────────────────────────────

export const FIELD_TYPES = [
  'text', 'textarea', 'number', 'boolean', 'select', 'multi_select',
  'date', 'datetime', 'time', 'photo', 'video', 'audio',
  'signature', 'geolocation', 'qr_barcode', 'nfc',
  'slider', 'rating', 'matrix', 'checklist', 'risk_matrix',
  'instruction', 'section', 'table', 'drawing',
  'barcode_generate', 'lookup', 'calculated', 'temperature', 'weather',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

// ── Field Categories ───────────────────────────────────────

export interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: string;
  category: 'basic' | 'multimedia' | 'safety' | 'advanced';
  description: string;
}

export const FIELD_TYPE_CATALOG: FieldTypeInfo[] = [
  // Basic
  { type: 'text', label: 'Texto corto', icon: 'Type', category: 'basic', description: 'Campo de texto de una línea' },
  { type: 'textarea', label: 'Texto largo', icon: 'AlignLeft', category: 'basic', description: 'Área de texto multi-línea' },
  { type: 'number', label: 'Numérico', icon: 'Hash', category: 'basic', description: 'Número con min/max/decimales' },
  { type: 'boolean', label: 'Sí / No', icon: 'ToggleLeft', category: 'basic', description: 'Respuesta booleana' },
  { type: 'select', label: 'Desplegable', icon: 'ChevronDown', category: 'basic', description: 'Selección única de opciones' },
  { type: 'multi_select', label: 'Selección múltiple', icon: 'ListChecks', category: 'basic', description: 'Múltiples opciones con chips' },
  { type: 'date', label: 'Fecha', icon: 'Calendar', category: 'basic', description: 'Selector de fecha' },
  { type: 'datetime', label: 'Fecha y hora', icon: 'CalendarClock', category: 'basic', description: 'Fecha con hora' },
  { type: 'time', label: 'Hora', icon: 'Clock', category: 'basic', description: 'Solo hora' },
  { type: 'checklist', label: 'Lista de verificación', icon: 'CheckSquare', category: 'basic', description: 'Lista de ítems con check' },
  // Multimedia
  { type: 'photo', label: 'Foto', icon: 'Camera', category: 'multimedia', description: 'Captura o upload de foto' },
  { type: 'video', label: 'Video', icon: 'Video', category: 'multimedia', description: 'Captura o upload de video' },
  { type: 'audio', label: 'Audio', icon: 'Mic', category: 'multimedia', description: 'Grabación de audio' },
  { type: 'signature', label: 'Firma digital', icon: 'PenTool', category: 'multimedia', description: 'Firma en canvas' },
  { type: 'drawing', label: 'Anotación', icon: 'Pencil', category: 'multimedia', description: 'Dibujo sobre imagen' },
  // Safety
  { type: 'risk_matrix', label: 'Matriz de riesgo', icon: 'ShieldAlert', category: 'safety', description: 'Matriz 5×5 interactiva' },
  { type: 'geolocation', label: 'Ubicación GPS', icon: 'MapPin', category: 'safety', description: 'Captura GPS automática' },
  { type: 'temperature', label: 'Temperatura', icon: 'Thermometer', category: 'safety', description: 'Con unidad °C/°F' },
  { type: 'weather', label: 'Clima', icon: 'Cloud', category: 'safety', description: 'Condición climática' },
  { type: 'qr_barcode', label: 'QR / Código de barras', icon: 'ScanLine', category: 'safety', description: 'Escaneo de códigos' },
  { type: 'nfc', label: 'NFC', icon: 'Nfc', category: 'safety', description: 'Lectura NFC mobile' },
  // Advanced
  { type: 'slider', label: 'Deslizante', icon: 'SlidersHorizontal', category: 'advanced', description: 'Escala numérica deslizante' },
  { type: 'rating', label: 'Calificación', icon: 'Star', category: 'advanced', description: 'Rating con estrellas' },
  { type: 'matrix', label: 'Tabla matriz', icon: 'Grid3x3', category: 'advanced', description: 'Filas × columnas' },
  { type: 'table', label: 'Tabla dinámica', icon: 'Table', category: 'advanced', description: 'Agregar filas dinámicamente' },
  { type: 'instruction', label: 'Instrucción', icon: 'Info', category: 'advanced', description: 'Texto instructivo (no respuesta)' },
  { type: 'section', label: 'Sección', icon: 'Minus', category: 'advanced', description: 'Separador de sección' },
  { type: 'barcode_generate', label: 'Generar código', icon: 'Barcode', category: 'advanced', description: 'Genera código de barras' },
  { type: 'lookup', label: 'Búsqueda BD', icon: 'Search', category: 'advanced', description: 'Buscar usuarios, equipos, etc.' },
  { type: 'calculated', label: 'Calculado', icon: 'Calculator', category: 'advanced', description: 'Campo con fórmula' },
];

// ── Option ─────────────────────────────────────────────────

export interface FieldOption {
  id: string;
  value: string;
  label: string;
  score?: number;
  color?: string;
  trigger_action?: boolean;
}

// ── Conditional Logic ──────────────────────────────────────

export type ConditionalOperator =
  | 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte'
  | 'contains' | 'not_empty' | 'empty';

export interface ConditionalRule {
  field_id: string;
  operator: ConditionalOperator;
  value: unknown;
}

// ── Scoring ────────────────────────────────────────────────

export interface FieldScoring {
  type: 'option_score' | 'boolean' | 'risk_matrix' | 'checklist' | 'rating';
  weight: number;
}

export interface ScoringConfig {
  enabled: boolean;
  pass_threshold: number;
  fail_threshold: number;
  show_score_to_inspector: boolean;
}

// ── Matrix / Table ─────────────────────────────────────────

export interface MatrixColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: FieldOption[];
}

export interface MatrixRow {
  id: string;
  label: string;
}

// ── Field Definition ───────────────────────────────────────

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  help_text?: string;

  // Type-specific properties
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  min_length?: number;
  max_length?: number;
  min_photos?: number;
  max_photos?: number;
  accept?: string;           // file types
  items?: string[];           // checklist items
  formula?: string;           // calculated field
  lookup_entity?: string;     // 'users' | 'equipment' | 'sites'
  lookup_display?: string;    // field to display
  unit?: string;              // temperature unit
  columns?: MatrixColumn[];   // matrix / table columns
  rows?: MatrixRow[];         // matrix rows
  default_value?: unknown;

  // Scoring
  scoring?: FieldScoring | null;

  // Conditional visibility
  conditional?: ConditionalRule | null;
}

// ── Section ────────────────────────────────────────────────

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
  conditional?: ConditionalRule | null;
}

// ── Form Schema ────────────────────────────────────────────

export interface FormSchema {
  id: string;
  version: number;
  sections: FormSection[];
  scoring_config: ScoringConfig;
  settings: FormSettings;
}

export interface FormSettings {
  allow_offline: boolean;
  require_geolocation: boolean;
  require_signature: boolean;
  auto_create_actions_on_fail: boolean;
  notify_on_critical_fail: string[];
  expiry_hours: number;
}

// ── Template ───────────────────────────────────────────────

export type FormStatus = 'draft' | 'published' | 'archived';

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: number;
  status: FormStatus;
  is_global: boolean;
  tags?: string[];
  schema_def: FormSchema;
  scoring_config?: ScoringConfig;
  organization_id: string;
  site_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateListItem {
  id: string;
  name: string;
  category: string;
  version: number;
  status: FormStatus;
  is_global: boolean;
  created_at: string;
}

// ── Submission ─────────────────────────────────────────────

export type SubmissionStatus = 'draft' | 'submitted' | 'synced';

export interface FieldAnswer {
  value: unknown;
  notes?: string;
  photos?: string[];
  flagged?: boolean;
}

export type SubmissionData = Record<string, FieldAnswer>;

export interface FormSubmission {
  id: string;
  template_id: string;
  organization_id: string;
  site_id: string;
  submitted_by: string;
  submitted_at?: string;
  data: SubmissionData;
  score?: number;
  max_score?: number;
  percentage?: number;
  status: SubmissionStatus;
  gps_latitude?: number;
  gps_longitude?: number;
  offline_id?: string;
  created_at: string;
}

export interface FormSubmissionListItem {
  id: string;
  template_id: string;
  status: SubmissionStatus;
  score?: number;
  percentage?: number;
  submitted_at?: string;
  created_at: string;
}

// ── Score Result ───────────────────────────────────────────

export interface ScoreResult {
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  grade: 'pass' | 'warning' | 'fail';
  failed_items: Array<{
    field_id: string;
    label: string;
    expected_score?: number;
    actual_score?: number;
    answer: unknown;
  }>;
}

// ── Builder DnD types ──────────────────────────────────────

export interface DragItem {
  type: 'field-library' | 'field-canvas' | 'section';
  fieldType?: FieldType;
  fieldId?: string;
  sectionId?: string;
}

// ── Field Component Props ──────────────────────────────────

export interface FieldComponentProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}
