/**
 * OpenQHSE shared configuration constants.
 *
 * Centralised design tokens, role definitions, and app-wide constants
 * consumed by web, mobile, and packages.
 */

// ── Design Tokens ──────────────────────────────────────────

export const colors = {
  primary: {
    50: '#E6F0FF',
    100: '#CCE0FF',
    200: '#99C2FF',
    300: '#66A3FF',
    400: '#3385FF',
    500: '#0066FF',
    600: '#0052CC',
    700: '#003D99',
    800: '#002966',
    900: '#001433',
  },
  safe: {
    50: '#E6FFF7',
    100: '#CCFFEF',
    200: '#99FFE0',
    300: '#66FFD0',
    400: '#33FFC0',
    500: '#00E5A0',
    600: '#00B880',
    700: '#008A60',
    800: '#005C40',
    900: '#002E20',
  },
  warning: {
    50: '#FFF8E6',
    100: '#FFF1CC',
    200: '#FFE299',
    300: '#FFD466',
    400: '#FFC533',
    500: '#FFAA00',
    600: '#CC8800',
    700: '#996600',
    800: '#664400',
    900: '#332200',
  },
  danger: {
    50: '#FFE6E6',
    100: '#FFCCCC',
    200: '#FF9999',
    300: '#FF6666',
    400: '#FF4444',
    500: '#FF4444',
    600: '#CC3636',
    700: '#992929',
    800: '#661B1B',
    900: '#330E0E',
  },
  dark: {
    background: '#090B0E',
    surface: '#141921',
    surfaceAlt: '#1E2530',
    border: '#2A3441',
    muted: '#8899AA',
    foreground: '#F1F5F9',
  },
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    muted: '#64748B',
    foreground: '#0F172A',
  },
} as const;

// ── Role hierarchy (lower index = higher privilege) ────────

export const ROLE_HIERARCHY = [
  'super_admin',
  'org_admin',
  'manager',
  'supervisor',
  'inspector',
  'worker',
  'viewer',
] as const;

export type RoleKey = (typeof ROLE_HIERARCHY)[number];

export const ROLE_LABELS: Record<RoleKey, { en: string; es: string; pt: string }> = {
  super_admin: { en: 'Super Admin', es: 'Super Administrador', pt: 'Super Admin' },
  org_admin: { en: 'Organisation Admin', es: 'Admin. Organización', pt: 'Admin. Organização' },
  manager: { en: 'Manager', es: 'Gerente', pt: 'Gerente' },
  supervisor: { en: 'Supervisor', es: 'Supervisor', pt: 'Supervisor' },
  inspector: { en: 'Inspector', es: 'Inspector', pt: 'Inspetor' },
  worker: { en: 'Worker', es: 'Trabajador', pt: 'Trabalhador' },
  viewer: { en: 'Viewer', es: 'Visualizador', pt: 'Visualizador' },
};

/**
 * Returns true if roleA has equal or higher privilege than roleB.
 */
export function hasPermission(roleA: RoleKey, roleB: RoleKey): boolean {
  return ROLE_HIERARCHY.indexOf(roleA) <= ROLE_HIERARCHY.indexOf(roleB);
}

// ── Severity configuration ─────────────────────────────────

export const SEVERITY_CONFIG = {
  critical: { color: '#FF4444', bgClass: 'bg-danger/10', textClass: 'text-danger', order: 0 },
  high: { color: '#FF8C00', bgClass: 'bg-orange-500/10', textClass: 'text-orange-500', order: 1 },
  medium: { color: '#FFAA00', bgClass: 'bg-warning/10', textClass: 'text-warning', order: 2 },
  low: { color: '#0066FF', bgClass: 'bg-primary/10', textClass: 'text-primary', order: 3 },
  observation: { color: '#8899AA', bgClass: 'bg-gray-500/10', textClass: 'text-gray-500', order: 4 },
} as const;

// ── Incident types ─────────────────────────────────────────

export const INCIDENT_TYPE_LABELS: Record<string, { en: string; es: string; pt: string }> = {
  near_miss: { en: 'Near Miss', es: 'Casi accidente', pt: 'Quase acidente' },
  first_aid: { en: 'First Aid', es: 'Primeros auxilios', pt: 'Primeiros socorros' },
  medical_treatment: { en: 'Medical Treatment', es: 'Tratamiento médico', pt: 'Tratamento médico' },
  lost_time: { en: 'Lost Time', es: 'Tiempo perdido', pt: 'Tempo perdido' },
  fatality: { en: 'Fatality', es: 'Fatalidad', pt: 'Fatalidade' },
  property_damage: { en: 'Property Damage', es: 'Daño a la propiedad', pt: 'Dano à propriedade' },
  environmental: { en: 'Environmental', es: 'Ambiental', pt: 'Ambiental' },
  fire: { en: 'Fire', es: 'Incendio', pt: 'Incêndio' },
  spill: { en: 'Spill', es: 'Derrame', pt: 'Derramamento' },
  other: { en: 'Other', es: 'Otro', pt: 'Outro' },
};

// ── Permit types ───────────────────────────────────────────

export const PERMIT_TYPE_LABELS: Record<string, { en: string; es: string; pt: string }> = {
  hot_work: { en: 'Hot Work', es: 'Trabajo en caliente', pt: 'Trabalho a quente' },
  confined_space: { en: 'Confined Space', es: 'Espacio confinado', pt: 'Espaço confinado' },
  working_at_height: { en: 'Working at Height', es: 'Trabajo en alturas', pt: 'Trabalho em altura' },
  electrical: { en: 'Electrical', es: 'Eléctrico', pt: 'Elétrico' },
  excavation: { en: 'Excavation', es: 'Excavación', pt: 'Escavação' },
  lifting: { en: 'Lifting', es: 'Izaje', pt: 'Elevação' },
  chemical_handling: { en: 'Chemical Handling', es: 'Manejo químico', pt: 'Manuseio químico' },
  general: { en: 'General', es: 'General', pt: 'Geral' },
};

// ── Application constants ──────────────────────────────────

export const APP_NAME = 'OpenQHSE';
export const APP_VERSION = '0.1.0';
export const DEFAULT_LOCALE = 'es';
export const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;
