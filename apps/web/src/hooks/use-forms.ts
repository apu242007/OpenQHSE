/**
 * React Query hooks for the Forms module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { FormTemplate, FormTemplateListItem, FormSubmission, FormSubmissionListItem } from '@/types/forms';

// ── Templates ──────────────────────────────────────────────

export function useFormTemplates(params?: string) {
  return useQuery<FormTemplateListItem[]>({
    queryKey: ['forms', 'templates', params],
    queryFn: () => api.forms.templates.list(params) as unknown as Promise<FormTemplateListItem[]>,
  });
}

export function useFormTemplate(id: string | undefined) {
  return useQuery<FormTemplate>({
    queryKey: ['forms', 'templates', id],
    queryFn: () => api.forms.templates.get(id!) as unknown as Promise<FormTemplate>,
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.forms.templates.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.forms.templates.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function usePublishTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/forms/templates/${id}/publish`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/forms/templates/${id}/duplicate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useArchiveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/forms/templates/${id}/archive`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/forms/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

// ── Submissions ────────────────────────────────────────────

export function useFormSubmissions(params?: string) {
  return useQuery<FormSubmissionListItem[]>({
    queryKey: ['forms', 'submissions', params],
    queryFn: () => api.forms.submissions.list(params) as unknown as Promise<FormSubmissionListItem[]>,
  });
}

export function useFormSubmission(id: string | undefined) {
  return useQuery<FormSubmission>({
    queryKey: ['forms', 'submissions', id],
    queryFn: () => api.forms.submissions.get(id!) as unknown as Promise<FormSubmission>,
    enabled: !!id,
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.forms.submissions.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'submissions'] }),
  });
}

export function useSyncSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>[]) => api.post('/forms/sync', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'submissions'] }),
  });
}
