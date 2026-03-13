/**
 * React Query hooks for the Equipment Management module.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  Equipment,
  EquipmentInspection,
  EquipmentListItem,
} from '@/types/equipment';

// ── Equipment ──────────────────────────────────────────────

export function useEquipmentList(params?: string) {
  return useQuery<EquipmentListItem[]>({
    queryKey: ['equipment', params],
    queryFn: () => api.get<EquipmentListItem[]>(`/equipment${params ? `?${params}` : ''}`),
  });
}

export function useEquipment(id: string | undefined) {
  return useQuery<Equipment>({
    queryKey: ['equipment', id],
    queryFn: () => api.get<Equipment>(`/equipment/${id}`),
    enabled: !!id,
  });
}

export function useEquipmentByCode(code: string | undefined) {
  return useQuery<Equipment>({
    queryKey: ['equipment', 'code', code],
    queryFn: () => api.get<Equipment>(`/equipment/by-code/${code}`),
    enabled: !!code,
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<Equipment>('/equipment', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<Equipment>(`/equipment/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/equipment/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });
}

// ── Inspections ────────────────────────────────────────────

export function useEquipmentInspections(
  equipmentId: string | undefined,
  params?: string,
) {
  return useQuery<EquipmentInspection[]>({
    queryKey: ['equipment', equipmentId, 'inspections', params],
    queryFn: () =>
      api.get<EquipmentInspection[]>(
        `/equipment/${equipmentId}/inspections${params ? `?${params}` : ''}`,
      ),
    enabled: !!equipmentId,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      equipmentId,
      data,
    }: {
      equipmentId: string;
      data: Record<string, unknown>;
    }) => api.post<EquipmentInspection>(`/equipment/${equipmentId}/inspections`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment', vars.equipmentId, 'inspections'] });
      qc.invalidateQueries({ queryKey: ['equipment', vars.equipmentId] });
    },
  });
}
