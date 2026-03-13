/**
 * Zod validation schemas for all forms.
 * Shared between frontend forms and API request validation.
 */

import { z } from 'zod';

// ── Auth ───────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  first_name: z.string().min(1, 'El nombre es requerido').max(100),
  last_name: z.string().min(1, 'El apellido es requerido').max(100),
  phone: z.string().max(20).optional(),
  organization_name: z
    .string()
    .min(2, 'El nombre de la organización es requerido')
    .max(255),
  language: z.enum(['es', 'en', 'pt']).default('es'),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una minúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_password: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'La contraseña actual es requerida'),
    new_password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una minúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_password: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const profileUpdateSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  last_name: z.string().min(1, 'El apellido es requerido').max(100).optional(),
  phone: z.string().max(20).optional(),
  language: z.enum(['es', 'en', 'pt']).optional(),
});
export type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

// ── Inspections ────────────────────────────────────────────

export const inspectionCreateSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255),
  template_id: z.string().uuid('Seleccione una plantilla'),
  site_id: z.string().uuid('Seleccione un sitio'),
  area_id: z.string().uuid().optional(),
  scheduled_date: z.string().optional(),
  notes: z.string().optional(),
});
export type InspectionCreateFormValues = z.infer<typeof inspectionCreateSchema>;

// ── Incidents ──────────────────────────────────────────────

export const incidentCreateSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  incident_type: z.enum([
    'near_miss',
    'first_aid',
    'medical_treatment',
    'lost_time',
    'fatality',
    'property_damage',
    'environmental',
    'fire',
    'spill',
    'other',
  ]),
  severity: z.enum(['catastrophic', 'critical', 'serious', 'moderate', 'minor']),
  occurred_at: z.string().min(1, 'La fecha es requerida'),
  site_id: z.string().uuid('Seleccione un sitio'),
  area_id: z.string().uuid().optional(),
  location_description: z.string().optional(),
  gps_latitude: z.number().optional(),
  gps_longitude: z.number().optional(),
  injuries_count: z.number().int().min(0).default(0),
  fatalities_count: z.number().int().min(0).default(0),
  immediate_actions: z.string().optional(),
});
export type IncidentCreateFormValues = z.infer<typeof incidentCreateSchema>;

// ── Users ──────────────────────────────────────────────────

export const userCreateSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  first_name: z.string().min(1, 'El nombre es requerido').max(100),
  last_name: z.string().min(1, 'El apellido es requerido').max(100),
  phone: z.string().max(20).optional(),
  role: z.enum([
    'super_admin',
    'org_admin',
    'manager',
    'supervisor',
    'inspector',
    'worker',
    'viewer',
  ]),
  language: z.enum(['es', 'en', 'pt']).default('es'),
});
export type UserCreateFormValues = z.infer<typeof userCreateSchema>;

// ── Sites ──────────────────────────────────────────────────

export const siteCreateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  code: z.string().min(1, 'El código es requerido').max(50),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type SiteCreateFormValues = z.infer<typeof siteCreateSchema>;

// ── Findings ───────────────────────────────────────────────

export const findingCreateSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255),
  description: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'observation']).default('medium'),
  due_date: z.string().optional(),
  assigned_to_id: z.string().uuid().optional(),
  inspection_id: z.string().uuid(),
});
export type FindingCreateFormValues = z.infer<typeof findingCreateSchema>;

// ── Work Permits ───────────────────────────────────────────

export const permitCreateSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255),
  permit_type: z.enum([
    'hot_work',
    'confined_space',
    'working_at_height',
    'electrical',
    'excavation',
    'lifting',
    'chemical_handling',
    'general',
  ]),
  description: z.string().min(1, 'La descripción es requerida'),
  site_id: z.string().uuid('Seleccione un sitio'),
  area_id: z.string().uuid().optional(),
  hazards_identified: z.array(z.string()).optional(),
  precautions: z.array(z.string()).optional(),
  ppe_required: z.array(z.string()).optional(),
  valid_from: z.string().min(1, 'Fecha de inicio requerida'),
  valid_until: z.string().min(1, 'Fecha de fin requerida'),
});
export type PermitCreateFormValues = z.infer<typeof permitCreateSchema>;

// ── Forms / Checklists ─────────────────────────────────────

export const formTemplateCreateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().optional(),
  category: z.string().min(1, 'La categoría es requerida'),
  site_id: z.string().uuid().optional(),
  is_global: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  schema_def: z.record(z.unknown()),
});
export type FormTemplateCreateFormValues = z.infer<typeof formTemplateCreateSchema>;

export const formSubmissionCreateSchema = z.object({
  template_id: z.string().uuid('Seleccione un formulario'),
  site_id: z.string().uuid('Seleccione un sitio'),
  data: z.record(z.unknown()),
  gps_latitude: z.number().optional(),
  gps_longitude: z.number().optional(),
  offline_id: z.string().optional(),
});
export type FormSubmissionCreateFormValues = z.infer<typeof formSubmissionCreateSchema>;

// ── Risk Register ──────────────────────────────────────────

export const riskCreateSchema = z.object({
  site_id: z.string().uuid('Seleccione un sitio'),
  area: z.string().optional(),
  process: z.string().optional(),
  hazard_description: z.string().min(1, 'Descripción del peligro es requerida'),
  hazard_category: z.string().min(1, 'Categoría del peligro es requerida'),
  risk_type: z.enum(['safety', 'health', 'environment', 'quality', 'security']),
  inherent_likelihood: z.number().int().min(1).max(5),
  inherent_severity: z.number().int().min(1).max(5),
  controls: z
    .array(
      z.object({
        type: z.enum(['elimination', 'substitution', 'engineering', 'administrative', 'ppe']),
        description: z.string().min(1),
        effectiveness: z.string().optional(),
        responsible: z.string().optional(),
      }),
    )
    .default([]),
  residual_likelihood: z.number().int().min(1).max(5),
  residual_severity: z.number().int().min(1).max(5),
  risk_owner: z.string().uuid().optional(),
  review_date: z.string().optional(),
  legal_requirement: z.string().optional(),
  applicable_standard: z.string().optional(),
});
export type RiskCreateFormValues = z.infer<typeof riskCreateSchema>;

// ── Documents ──────────────────────────────────────────────

export const documentCreateSchema = z.object({
  doc_type: z.enum([
    'procedure',
    'instruction',
    'form',
    'record',
    'standard',
    'regulation',
    'plan',
    'other',
  ]),
  code: z.string().min(1, 'El código es requerido').max(50),
  title: z.string().min(1, 'El título es requerido').max(500),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  file_url: z.string().url('URL del archivo requerida'),
  file_size: z.number().int().min(0).default(0),
  file_type: z.string().min(1),
  site_id: z.string().uuid().optional(),
  approver_id: z.string().uuid().optional(),
  effective_date: z.string().optional(),
  review_date: z.string().optional(),
  expiry_date: z.string().optional(),
});
export type DocumentCreateFormValues = z.infer<typeof documentCreateSchema>;

// ── Training ───────────────────────────────────────────────

export const trainingCourseCreateSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(500),
  description: z.string().optional(),
  category: z.string().optional(),
  course_type: z.enum(['induction', 'refresher', 'competency', 'regulatory', 'technical']),
  duration_hours: z.number().min(0.5).default(1),
  passing_score: z.number().min(0).max(100).default(70),
  validity_months: z.number().int().optional(),
  is_mandatory: z.boolean().default(false),
  applicable_roles: z.array(z.string()).optional(),
});
export type TrainingCourseCreateFormValues = z.infer<typeof trainingCourseCreateSchema>;

export const trainingEnrollmentCreateSchema = z.object({
  course_id: z.string().uuid('Seleccione un curso'),
  user_id: z.string().uuid('Seleccione un usuario'),
  site_id: z.string().uuid().optional(),
  enrolled_at: z.string().min(1, 'Fecha de inscripción requerida'),
});
export type TrainingEnrollmentCreateFormValues = z.infer<typeof trainingEnrollmentCreateSchema>;

// ── Equipment ──────────────────────────────────────────────

export const equipmentCreateSchema = z.object({
  site_id: z.string().uuid('Seleccione un sitio'),
  name: z.string().min(1, 'El nombre es requerido').max(255),
  code: z.string().min(1, 'El código es requerido').max(100),
  description: z.string().optional(),
  category: z.string().min(1, 'La categoría es requerida'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  location: z.string().optional(),
  purchase_date: z.string().optional(),
  next_inspection_date: z.string().optional(),
});
export type EquipmentCreateFormValues = z.infer<typeof equipmentCreateSchema>;
