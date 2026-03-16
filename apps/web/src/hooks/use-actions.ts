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
import { DEMO_ACTIONS_LIST, DEMO_ACTION_STATISTICS, DEMO_KANBAN } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── List / CRUD ────────────────────────────────────────────

export function useActions(params?: string) {
  return useQuery<ActionListItem[]>({
    queryKey: ['actions', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_ACTIONS_LIST as unknown as ActionListItem[])
      : api.get<ActionListItem[]>(`/actions${params ? `?${params}` : ''}`),
  });
}

export function useAction(id: string | undefined) {
  return useQuery<CorrectiveActionFull>({
    queryKey: ['actions', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_ACTIONS_LIST.find(a => a.id === id) ?? DEMO_ACTIONS_LIST[0]) as unknown as CorrectiveActionFull)
      : api.get<CorrectiveActionFull>(`/actions/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useMyActions(params?: string) {
  return useQuery<ActionListItem[]>({
    queryKey: ['actions', 'my', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_ACTIONS_LIST.slice(0, 3) as unknown as ActionListItem[])
      : api.get<ActionListItem[]>(`/actions/my-actions${params ? `?${params}` : ''}`),
  });
}

export function useOverdueActions(params?: string) {
  return useQuery<ActionListItem[]>({
    queryKey: ['actions', 'overdue', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_ACTIONS_LIST.filter(a => a.status === 'OVERDUE') as unknown as ActionListItem[])
      : api.get<ActionListItem[]>(`/actions/overdue${params ? `?${params}` : ''}`),
  });
}

export function useCreateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as CorrectiveActionFull);
      return api.post<CorrectiveActionFull>('/actions', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useUpdateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as CorrectiveActionFull);
      return api.patch<CorrectiveActionFull>(`/actions/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

// ── Kanban ─────────────────────────────────────────────────

export function useKanbanBoard() {
  return useQuery<KanbanBoard>({
    queryKey: ['actions', 'kanban'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_KANBAN as unknown as KanbanBoard)
      : api.get<KanbanBoard>('/actions/kanban'),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function useActionStatistics() {
  return useQuery<ActionStatistics>({
    queryKey: ['actions', 'statistics'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_ACTION_STATISTICS as unknown as ActionStatistics)
      : api.get<ActionStatistics>('/actions/statistics'),
  });
}

// ── Timeline ───────────────────────────────────────────────

export function useActionTimeline(actionId: string | undefined) {
  return useQuery<ActionUpdateEntry[]>({
    queryKey: ['actions', actionId, 'timeline'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as ActionUpdateEntry[])
      : api.get<ActionUpdateEntry[]>(`/actions/${actionId}/timeline`),
    enabled: AUTH_DISABLED ? true : !!actionId,
  });
}

// ── Lifecycle ──────────────────────────────────────────────

export function useAssignAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, assignedToId } as unknown as CorrectiveActionFull);
      return api.post<CorrectiveActionFull>(`/actions/${id}/assign?assigned_to_id=${assignedToId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useAddProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as ActionUpdateEntry);
      return api.post<ActionUpdateEntry>(`/actions/${id}/progress`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useRequestVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id } as unknown as CorrectiveActionFull);
      return api.post<CorrectiveActionFull>(`/actions/${id}/request-verification`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useVerifyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as CorrectiveActionFull);
      return api.post<CorrectiveActionFull>(`/actions/${id}/verify`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useEscalateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as CorrectiveActionFull);
      return api.post<CorrectiveActionFull>(`/actions/${id}/escalate`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useEffectivenessCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as CorrectiveActionFull);
      return api.post<CorrectiveActionFull>(`/actions/${id}/effectiveness-check`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}

export function useBulkAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { action_ids: string[]; assigned_to_id: string }) => {
      if (AUTH_DISABLED) return Promise.resolve([] as CorrectiveActionFull[]);
      return api.post<CorrectiveActionFull[]>('/actions/bulk-assign', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  });
}
