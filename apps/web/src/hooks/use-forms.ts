/**
 * React Query hooks for the Forms module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { FormTemplate, FormTemplateListItem, FormSubmission, FormSubmissionListItem } from '@/types/forms';
import { DEMO_FORM_TEMPLATES } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Templates ──────────────────────────────────────────────

export function useFormTemplates(params?: string) {
  return useQuery<FormTemplateListItem[]>({
    queryKey: ['forms', 'templates', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_FORM_TEMPLATES as unknown as FormTemplateListItem[])
      : api.forms.templates.list(params) as unknown as Promise<FormTemplateListItem[]>,
  });
}

export function useFormTemplate(id: string | undefined) {
  return useQuery<FormTemplate>({
    queryKey: ['forms', 'templates', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_FORM_TEMPLATES.find(f => f.id === id) ?? DEMO_FORM_TEMPLATES[0]) as unknown as FormTemplate)
      : api.forms.templates.get(id!) as unknown as Promise<FormTemplate>,
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() });
      return api.forms.templates.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data });
      return api.forms.templates.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function usePublishTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id });
      return api.post(`/forms/templates/${id}/publish`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id: 'demo-' + Date.now() });
      return api.post(`/forms/templates/${id}/duplicate`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useArchiveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id });
      return api.post(`/forms/templates/${id}/archive`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({});
      return api.delete(`/forms/templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'templates'] }),
  });
}

// ── Submissions ────────────────────────────────────────────

export function useFormSubmissions(params?: string) {
  return useQuery<FormSubmissionListItem[]>({
    queryKey: ['forms', 'submissions', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as FormSubmissionListItem[])
      : api.forms.submissions.list(params) as unknown as Promise<FormSubmissionListItem[]>,
  });
}

export function useFormSubmission(id: string | undefined) {
  return useQuery<FormSubmission>({
    queryKey: ['forms', 'submissions', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve({ id } as unknown as FormSubmission)
      : api.forms.submissions.get(id!) as unknown as Promise<FormSubmission>,
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() });
      return api.forms.submissions.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'submissions'] }),
  });
}

export function useSyncSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>[]) => {
      if (AUTH_DISABLED) return Promise.resolve({ synced: 0 });
      return api.post('/forms/sync', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms', 'submissions'] }),
  });
}
