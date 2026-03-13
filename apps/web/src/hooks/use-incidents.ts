/**
 * React Query hooks for the Incidents module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  Incident,
  IncidentListResponse,
  IncidentStatistics,
  CorrectiveAction,
} from '@/types/incidents';

// ── Incidents ──────────────────────────────────────────────

export function useIncidents(params?: string) {
  return useQuery<IncidentListResponse>({
    queryKey: ['incidents', params],
    queryFn: () => api.incidents.list(params) as unknown as Promise<IncidentListResponse>,
  });
}

export function useIncident(id: string | undefined) {
  return useQuery<Incident>({
    queryKey: ['incidents', id],
    queryFn: () => api.incidents.get(id!) as unknown as Promise<Incident>,
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.incidents.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.incidents.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/incidents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function useIncidentStatistics(params?: string) {
  return useQuery<IncidentStatistics>({
    queryKey: ['incidents', 'statistics', params],
    queryFn: () => api.get<IncidentStatistics>(`/incidents/statistics${params ? `?${params}` : ''}`),
  });
}

// ── Lifecycle ──────────────────────────────────────────────

export function useAssignInvestigator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, investigatorId }: { id: string; investigatorId: string }) =>
      api.post<Incident>(`/incidents/${id}/assign-investigator?investigator_id=${investigatorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useSubmitInvestigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<Incident>(`/incidents/${id}/submit-investigation`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useCloseIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Incident>(`/incidents/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useReopenIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Incident>(`/incidents/${id}/reopen`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

// ── Corrective Actions ─────────────────────────────────────

export function useIncidentActions(incidentId: string | undefined) {
  return useQuery<CorrectiveAction[]>({
    queryKey: ['incidents', incidentId, 'actions'],
    queryFn: () => api.incidents.actions.list(incidentId!) as unknown as Promise<CorrectiveAction[]>,
    enabled: !!incidentId,
  });
}

export function useCreateCorrectiveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: Record<string, unknown> }) =>
      api.incidents.actions.create(incidentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

// ── Witnesses ──────────────────────────────────────────────

export function useAddWitness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: Record<string, unknown> }) =>
      api.post(`/incidents/${incidentId}/witnesses`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

// ── Attachments ────────────────────────────────────────────

export function useAddAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: Record<string, unknown> }) =>
      api.post(`/incidents/${incidentId}/attachments`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

// ── Timeline ───────────────────────────────────────────────

export function useAddTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: Record<string, unknown> }) =>
      api.post(`/incidents/${incidentId}/timeline-event`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

// ── PDF Report ─────────────────────────────────────────────

export function useDownloadIncidentReport() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/incidents/${id}/report`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
          },
        },
      );
      if (!res.ok) throw new Error('Error al descargar reporte');
      return res.blob();
    },
  });
}
