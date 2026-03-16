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
import { DEMO_INCIDENTS_LIST, DEMO_INCIDENT_STATISTICS, DEMO_ACTIONS_LIST } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Incidents ──────────────────────────────────────────────

export function useIncidents(params?: string) {
  return useQuery<IncidentListResponse>({
    queryKey: ['incidents', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_INCIDENTS_LIST as unknown as IncidentListResponse)
      : api.incidents.list(params) as unknown as Promise<IncidentListResponse>,
  });
}

export function useIncident(id: string | undefined) {
  return useQuery<Incident>({
    queryKey: ['incidents', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_INCIDENTS_LIST.items.find(i => i.id === id) ?? DEMO_INCIDENTS_LIST.items[0]) as unknown as Incident)
      : api.incidents.get(id!) as unknown as Promise<Incident>,
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() });
      return api.incidents.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data });
      return api.incidents.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

export function useDeleteIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({});
      return api.delete(`/incidents/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function useIncidentStatistics(params?: string) {
  return useQuery<IncidentStatistics>({
    queryKey: ['incidents', 'statistics', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_INCIDENT_STATISTICS as unknown as IncidentStatistics)
      : api.get<IncidentStatistics>(`/incidents/statistics${params ? `?${params}` : ''}`),
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
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_ACTIONS_LIST as unknown as CorrectiveAction[])
      : api.incidents.actions.list(incidentId!) as unknown as Promise<CorrectiveAction[]>,
    enabled: AUTH_DISABLED ? true : !!incidentId,
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
      if (AUTH_DISABLED) throw new Error('Descarga de reportes no disponible en modo demo.');
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
