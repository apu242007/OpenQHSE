/**
 * React Query hooks for the Training LMS module.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  ComplianceMatrix,
  ComplianceSummary,
  TrainingAssessment,
  TrainingCourse,
  TrainingCourseListItem,
  TrainingEnrollment,
  TrainingEnrollmentListItem,
} from '@/types/training';
import {
  DEMO_COURSES_LIST, DEMO_ENROLLMENTS_LIST, DEMO_COMPLIANCE_SUMMARY,
} from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Courses ────────────────────────────────────────────────

export function useCourses(params?: string) {
  return useQuery<TrainingCourseListItem[]>({
    queryKey: ['training', 'courses', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_COURSES_LIST as unknown as TrainingCourseListItem[])
      : api.get<TrainingCourseListItem[]>(`/training/courses${params ? `?${params}` : ''}`),
  });
}

export function useCourse(id: string | undefined) {
  return useQuery<TrainingCourse>({
    queryKey: ['training', 'courses', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_COURSES_LIST.find(c => c.id === id) ?? DEMO_COURSES_LIST[0]) as unknown as TrainingCourse)
      : api.get<TrainingCourse>(`/training/courses/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as TrainingCourse);
      return api.post<TrainingCourse>('/training/courses', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'courses'] }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as TrainingCourse);
      return api.patch<TrainingCourse>(`/training/courses/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'courses'] }),
  });
}

// ── Enrollments ────────────────────────────────────────────

export function useEnrollments(params?: string) {
  return useQuery<TrainingEnrollmentListItem[]>({
    queryKey: ['training', 'enrollments', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_ENROLLMENTS_LIST as unknown as TrainingEnrollmentListItem[])
      : api.get<TrainingEnrollmentListItem[]>(`/training/enrollments${params ? `?${params}` : ''}`),
  });
}

export function useMyEnrollments(userId: string | undefined) {
  return useQuery<TrainingEnrollmentListItem[]>({
    queryKey: ['training', 'enrollments', 'mine', userId],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_ENROLLMENTS_LIST as unknown as TrainingEnrollmentListItem[])
      : api.get<TrainingEnrollmentListItem[]>(`/training/enrollments?user_id=${userId}`),
    enabled: AUTH_DISABLED ? true : !!userId,
  });
}

export function useEnrollUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ courseId, ...data, id: 'demo-' + Date.now() } as unknown as TrainingEnrollment);
      return api.post<TrainingEnrollment>(`/training/courses/${courseId}/enroll`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training'] }),
  });
}

export function useBulkEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      role,
      siteId,
    }: {
      courseId: string;
      role?: string;
      siteId?: string;
    }) => {
      if (AUTH_DISABLED) return Promise.resolve({ enrolled: 0, skipped: 0 });
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (siteId) params.set('site_id', siteId);
      return api.post<{ enrolled: number; skipped: number }>(
        `/training/courses/${courseId}/enroll-bulk?${params.toString()}`,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training'] }),
  });
}

export function useCompleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, score }: { enrollmentId: string; score: number }) => {
      if (AUTH_DISABLED) return Promise.resolve({ enrollmentId, score } as unknown as TrainingEnrollment);
      return api.post<TrainingEnrollment>(`/training/enrollments/${enrollmentId}/complete?score=${score}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training'] }),
  });
}

export function useUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as TrainingEnrollment);
      return api.patch<TrainingEnrollment>(`/training/enrollments/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training'] }),
  });
}

// ── Assessments ────────────────────────────────────────────

export function useAssessments(courseId: string | undefined) {
  return useQuery<TrainingAssessment[]>({
    queryKey: ['training', 'assessments', courseId],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as TrainingAssessment[])
      : api.get<TrainingAssessment[]>(`/training/assessments/${courseId}`),
    enabled: AUTH_DISABLED ? true : !!courseId,
  });
}

export function useSubmitAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      answers,
      enrollmentId,
    }: {
      courseId: string;
      answers: Array<{ question_id: string; answer: string }>;
      enrollmentId?: string;
    }) => {
      if (AUTH_DISABLED) {
        return Promise.resolve({ score: 80, passed: true, results: answers.map(a => ({ question_id: a.question_id, correct: true, points_earned: 1 })) });
      }
      const params = enrollmentId ? `?enrollment_id=${enrollmentId}` : '';
      return api.post<{
        score: number;
        passed: boolean;
        results: Array<{ question_id: string; correct: boolean; points_earned: number }>;
      }>(`/training/assessments/${courseId}/submit${params}`, answers);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training'] }),
  });
}

// ── Certificates ───────────────────────────────────────────

export function useDownloadCertificate() {
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      if (AUTH_DISABLED) {
        throw new Error('Descarga de certificados no disponible en modo demo. Requiere backend.');
      }
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const accessToken = session?.accessToken ?? '';
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${API_BASE}/training/certificates/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${accessToken ?? ''}` },
      });
      if (!res.ok) throw new Error('Error al descargar certificado');
      return res.blob();
    },
  });
}

// ── Compliance & Matrix ────────────────────────────────────

export function useComplianceMatrix() {
  return useQuery<ComplianceMatrix>({
    queryKey: ['training', 'matrix'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve({ employees: [], courses: [] } as unknown as ComplianceMatrix)
      : api.get<ComplianceMatrix>('/training/matrix'),
  });
}

export function useComplianceSummary() {
  return useQuery<ComplianceSummary>({
    queryKey: ['training', 'compliance'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_COMPLIANCE_SUMMARY as unknown as ComplianceSummary)
      : api.get<ComplianceSummary>('/training/compliance'),
  });
}

export function useExpiringCertifications(days = 30) {
  return useQuery<Array<{ enrollment_id: string; user_id: string; course_id: string; expiry_date: string; days_remaining: number }>>({
    queryKey: ['training', 'expiring', days],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([])
      : api.get(`/training/expiring?days=${days}`),
  });
}
