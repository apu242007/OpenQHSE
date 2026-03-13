/**
 * React Query hooks for the CAPA module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  CorrectiveActionFull,
  ActionListItem,
  ActionUpdateEntry,
  KanbanBoard,
  ActionStatistics,
} from '@/types/actions';

// ── List / CRUD ────────────────────────────────────────────

export function useActions(params?: string) {
  return useQuery<ActionListItem[]>({
    queryKey: ['actions', params],
    queryFn: () =>
      api.get<ActionListItem[]>(`/actions${params ? `?${params}` : ''}`),
  });
}

export function useAction(id: string | undefined) {
  return useQuery<CorrectiveActionFull>({
    queryKey: ['actions', id],
    queryFn: () => api.get<CorrectiveActionFull>(`/actions/${id}`),
    enabled: !!id,
  });
}

export function useMyActions(params?: string) {
  return useQuery<ActionListItem[]>({
    queryKey: ['actions', 'my', params],
    queryFn: () =>
      api.get<ActionListItem[]>(`/actions/my-actions${params ? `?${params}` : ''}`),
  });
}

export function useOverdueActions(params?: string) {
  return useQuery<ActionListItem[]>({
    queryKey: ['actions', 'overdue', params],
    queryFn: () =>
      api.get<ActionListItem[]>(`/actions/overdue${params ? `?${params}` : ''}`),
  });
}

export function useCreateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<CorrectiveActionFull>('/actions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useUpdateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<CorrectiveActionFull>(`/actions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

// ── Kanban ─────────────────────────────────────────────────

export function useKanbanBoard() {
  return useQuery<KanbanBoard>({
    queryKey: ['actions', 'kanban'],
    queryFn: () => api.get<KanbanBoard>('/actions/kanban'),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function useActionStatistics() {
  return useQuery<ActionStatistics>({
    queryKey: ['actions', 'statistics'],
    queryFn: () => api.get<ActionStatistics>('/actions/statistics'),
  });
}

// ── Timeline ───────────────────────────────────────────────

export function useActionTimeline(actionId: string | undefined) {
  return useQuery<ActionUpdateEntry[]>({
    queryKey: ['actions', actionId, 'timeline'],
    queryFn: () => api.get<ActionUpdateEntry[]>(`/actions/${actionId}/timeline`),
    enabled: !!actionId,
  });
}

// ── Lifecycle ──────────────────────────────────────────────

export function useAssignAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      api.post<CorrectiveActionFull>(`/actions/${id}/assign?assigned_to_id=${assignedToId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useAddProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<ActionUpdateEntry>(`/actions/${id}/progress`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useRequestVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<CorrectiveActionFull>(`/actions/${id}/request-verification`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useVerifyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<CorrectiveActionFull>(`/actions/${id}/verify`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useEscalateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<CorrectiveActionFull>(`/actions/${id}/escalate`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useEffectivenessCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.post<CorrectiveActionFull>(`/actions/${id}/effectiveness-check`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useBulkAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { action_ids: string[]; assigned_to_id: string }) =>
      api.post<CorrectiveActionFull[]>('/actions/bulk-assign', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}
