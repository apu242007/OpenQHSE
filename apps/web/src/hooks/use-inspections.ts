/**
 * React Query hooks for the Inspections module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  Inspection,
  InspectionTemplate,
  InspectionListResponse,
  InspectionKPIs,
  InspectionCalendarEvent,
  Finding,
  BulkScheduleRequest,
} from '@/types/inspections';

// ── Templates ──────────────────────────────────────────────

export function useInspectionTemplates(params?: string) {
  return useQuery<InspectionTemplate[]>({
    queryKey: ['inspections', 'templates', params],
    queryFn: () => api.inspections.templates.list(params) as unknown as Promise<InspectionTemplate[]>,
  });
}

export function useCreateInspectionTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.inspections.templates.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', 'templates'] }),
  });
}

// ── Inspections ────────────────────────────────────────────

export function useInspections(params?: string) {
  return useQuery<InspectionListResponse>({
    queryKey: ['inspections', params],
    queryFn: () => api.inspections.list(params) as unknown as Promise<InspectionListResponse>,
  });
}

export function useInspection(id: string | undefined) {
  return useQuery<Inspection>({
    queryKey: ['inspections', id],
    queryFn: () => api.inspections.get(id!) as unknown as Promise<Inspection>,
    enabled: !!id,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.inspections.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useUpdateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.inspections.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

// ── KPIs ───────────────────────────────────────────────────

export function useInspectionKPIs() {
  return useQuery<InspectionKPIs>({
    queryKey: ['inspections', 'kpis'],
    queryFn: () => api.get<InspectionKPIs>('/inspections/kpis'),
  });
}

// ── Calendar ───────────────────────────────────────────────

export function useInspectionCalendar(month?: string) {
  return useQuery<InspectionCalendarEvent[]>({
    queryKey: ['inspections', 'calendar', month],
    queryFn: () =>
      api.get<InspectionCalendarEvent[]>(`/inspections/calendar${month ? `?month=${month}` : ''}`),
  });
}

// ── Overdue ────────────────────────────────────────────────

export function useOverdueInspections() {
  return useQuery<Inspection[]>({
    queryKey: ['inspections', 'overdue'],
    queryFn: () => api.get<Inspection[]>('/inspections/overdue'),
  });
}

// ── Bulk Schedule ──────────────────────────────────────────

export function useBulkScheduleInspections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkScheduleRequest) =>
      api.post<{ created: number }>('/inspections/schedule-bulk', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections'] });
      qc.invalidateQueries({ queryKey: ['inspections', 'calendar'] });
    },
  });
}

// ── Lifecycle ──────────────────────────────────────────────

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Inspection>(`/inspections/${id}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useCompleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Inspection>(`/inspections/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

// ── Findings ───────────────────────────────────────────────

export function useInspectionFindings(inspectionId: string | undefined) {
  return useQuery<Finding[]>({
    queryKey: ['inspections', inspectionId, 'findings'],
    queryFn: () => api.inspections.findings.list(inspectionId!) as unknown as Promise<Finding[]>,
    enabled: !!inspectionId,
  });
}

export function useCreateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, data }: { inspectionId: string; data: Record<string, unknown> }) =>
      api.inspections.findings.create(inspectionId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}
