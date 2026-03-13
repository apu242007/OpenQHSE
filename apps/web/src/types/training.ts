/**
 * TypeScript types for the Training LMS module.
 */

export type CourseType =
  | 'induction'
  | 'refresher'
  | 'competency'
  | 'regulatory'
  | 'technical';

export type EnrollmentStatus =
  | 'enrolled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'expired';

export interface TrainingCourse {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string | null;
  course_type: CourseType;
  duration_hours: number;
  content: CourseModule[] | null;
  passing_score: number;
  validity_months: number | null;
  certificate_template_url: string | null;
  is_mandatory: boolean;
  applicable_roles: string[] | null;
  created_at: string;
}

export interface TrainingCourseListItem {
  id: string;
  title: string;
  category: string | null;
  course_type: CourseType;
  duration_hours: number;
  is_mandatory: boolean;
  created_at: string;
}

export interface CourseModule {
  module_title: string;
  slides: CourseSlide[];
}

export interface CourseSlide {
  title: string;
  content_type: 'text' | 'video' | 'pdf' | 'image';
  content_url?: string;
  content?: string;
}

export interface TrainingEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  site_id: string | null;
  status: EnrollmentStatus;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  expiry_date: string | null;
  score: number | null;
  attempts: number;
  certificate_url: string | null;
  assigned_by: string | null;
  created_at: string;
}

export interface TrainingEnrollmentListItem {
  id: string;
  course_id: string;
  user_id: string;
  status: EnrollmentStatus;
  score: number | null;
  enrolled_at: string;
  completed_at: string | null;
}

export interface TrainingAssessment {
  id: string;
  course_id: string;
  questions: AssessmentQuestion[];
  created_at: string;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'open';
  options: AssessmentOption[];
  points: number;
}

export interface AssessmentOption {
  text: string;
  is_correct: boolean;
}

export interface ComplianceMatrix {
  roles: string[];
  courses: { id: string; title: string }[];
  matrix: Record<string, Record<string, { enrolled: number; completed: number; expired: number; pct: number }>>;
  overall_pct: number;
}

export interface ComplianceSummary {
  overall_pct: number;
  by_role: { role: string; compliance_pct: number }[];
  total_courses: number;
}

export const COURSE_TYPE_CONFIG: Record<CourseType, { label: string; color: string }> = {
  induction:   { label: 'Inducción',        color: '#3B82F6' },
  refresher:   { label: 'Actualización',    color: '#10B981' },
  competency:  { label: 'Competencia',      color: '#8B5CF6' },
  regulatory:  { label: 'Regulatorio',      color: '#EF4444' },
  technical:   { label: 'Técnico',          color: '#F59E0B' },
};

export const ENROLLMENT_STATUS_CONFIG: Record<EnrollmentStatus, { label: string; bg: string; color: string; icon: string }> = {
  enrolled:    { label: 'Matriculado',  bg: 'bg-blue-100',   color: 'text-blue-800',   icon: '📋' },
  in_progress: { label: 'En curso',     bg: 'bg-yellow-100', color: 'text-yellow-800', icon: '▶️' },
  completed:   { label: 'Completado',   bg: 'bg-green-100',  color: 'text-green-800',  icon: '✅' },
  failed:      { label: 'Reprobado',    bg: 'bg-red-100',    color: 'text-red-800',    icon: '❌' },
  expired:     { label: 'Vencido',      bg: 'bg-gray-100',   color: 'text-gray-600',   icon: '⏰' },
};
