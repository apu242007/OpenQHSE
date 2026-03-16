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
import {
  DEMO_INSPECTION_TEMPLATES, DEMO_INSPECTIONS_LIST, DEMO_INSPECTION_KPIS,
} from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Templates ──────────────────────────────────────────────

export function useInspectionTemplates(params?: string) {
  return useQuery<InspectionTemplate[]>({
    queryKey: ['inspections', 'templates', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_INSPECTION_TEMPLATES as unknown as InspectionTemplate[])
      : api.inspections.templates.list(params) as unknown as Promise<InspectionTemplate[]>,
  });
}

export function useCreateInspectionTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() });
      return api.inspections.templates.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', 'templates'] }),
  });
}

// ── Inspections ────────────────────────────────────────────

export function useInspections(params?: string) {
  return useQuery<InspectionListResponse>({
    queryKey: ['inspections', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_INSPECTIONS_LIST as unknown as InspectionListResponse)
      : api.inspections.list(params) as unknown as Promise<InspectionListResponse>,
  });
}

export function useInspection(id: string | undefined) {
  return useQuery<Inspection>({
    queryKey: ['inspections', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_INSPECTIONS_LIST.items.find(i => i.id === id) ?? DEMO_INSPECTIONS_LIST.items[0]) as unknown as Inspection)
      : api.inspections.get(id!) as unknown as Promise<Inspection>,
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() });
      return api.inspections.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useUpdateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data });
      return api.inspections.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

// ── KPIs ───────────────────────────────────────────────────

export function useInspectionKPIs() {
  return useQuery<InspectionKPIs>({
    queryKey: ['inspections', 'kpis'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_INSPECTION_KPIS as unknown as InspectionKPIs)
      : api.get<InspectionKPIs>('/inspections/kpis'),
  });
}

// ── Calendar ───────────────────────────────────────────────

export function useInspectionCalendar(month?: string) {
  return useQuery<InspectionCalendarEvent[]>({
    queryKey: ['inspections', 'calendar', month],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as InspectionCalendarEvent[])
      : api.get<InspectionCalendarEvent[]>(`/inspections/calendar${month ? `?month=${month}` : ''}`),
  });
}

// ── Overdue ────────────────────────────────────────────────

export function useOverdueInspections() {
  return useQuery<Inspection[]>({
    queryKey: ['inspections', 'overdue'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as Inspection[])
      : api.get<Inspection[]>('/inspections/overdue'),
  });
}

// ── Bulk Schedule ──────────────────────────────────────────

export function useBulkScheduleInspections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkScheduleRequest) => {
      if (AUTH_DISABLED) return Promise.resolve({ created: 0 });
      return api.post<{ created: number }>('/inspections/schedule-bulk', data);
    },
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
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id } as unknown as Inspection);
      return api.post<Inspection>(`/inspections/${id}/start`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

export function useCompleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id } as unknown as Inspection);
      return api.post<Inspection>(`/inspections/${id}/complete`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}

// ── Findings ───────────────────────────────────────────────

export function useInspectionFindings(inspectionId: string | undefined) {
  return useQuery<Finding[]>({
    queryKey: ['inspections', inspectionId, 'findings'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as Finding[])
      : api.inspections.findings.list(inspectionId!) as unknown as Promise<Finding[]>,
    enabled: AUTH_DISABLED ? true : !!inspectionId,
  });
}

export function useCreateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, data }: { inspectionId: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ inspectionId, ...data, id: 'demo-' + Date.now() });
      return api.inspections.findings.create(inspectionId, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
}
