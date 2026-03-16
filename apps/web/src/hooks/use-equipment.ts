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
import { DEMO_EQUIPMENT_LIST } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Equipment ──────────────────────────────────────────────

export function useEquipmentList(params?: string) {
  return useQuery<EquipmentListItem[]>({
    queryKey: ['equipment', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_EQUIPMENT_LIST as unknown as EquipmentListItem[])
      : api.get<EquipmentListItem[]>(`/equipment${params ? `?${params}` : ''}`),
  });
}

export function useEquipment(id: string | undefined) {
  return useQuery<Equipment>({
    queryKey: ['equipment', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_EQUIPMENT_LIST.find(e => e.id === id) ?? DEMO_EQUIPMENT_LIST[0]) as unknown as Equipment)
      : api.get<Equipment>(`/equipment/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useEquipmentByCode(code: string | undefined) {
  return useQuery<Equipment>({
    queryKey: ['equipment', 'code', code],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_EQUIPMENT_LIST.find(e => e.code === code) ?? DEMO_EQUIPMENT_LIST[0]) as unknown as Equipment)
      : api.get<Equipment>(`/equipment/by-code/${code}`),
    enabled: AUTH_DISABLED ? true : !!code,
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as Equipment);
      return api.post<Equipment>('/equipment', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as Equipment);
      return api.patch<Equipment>(`/equipment/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({});
      return api.delete(`/equipment/${id}`);
    },
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
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as EquipmentInspection[])
      : api.get<EquipmentInspection[]>(
          `/equipment/${equipmentId}/inspections${params ? `?${params}` : ''}`,
        ),
    enabled: AUTH_DISABLED ? true : !!equipmentId,
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
    }) => {
      if (AUTH_DISABLED) return Promise.resolve({ equipmentId, ...data, id: 'demo-' + Date.now() } as unknown as EquipmentInspection);
      return api.post<EquipmentInspection>(`/equipment/${equipmentId}/inspections`, data);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment', vars.equipmentId, 'inspections'] });
      qc.invalidateQueries({ queryKey: ['equipment', vars.equipmentId] });
    },
  });
}
