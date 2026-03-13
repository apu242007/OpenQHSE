/**
 * React Query hooks for the Permits (PTW) module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  WorkPermit,
  WorkPermitListItem,
  PermitExtension,
  PermitQRData,
  PermitStatistics,
  SafetyChecklistItem,
  GasReading,
  GasLimits,
} from '@/types/permits';

// ── List / CRUD ────────────────────────────────────────────

export function usePermits(params?: string) {
  return useQuery<WorkPermitListItem[]>({
    queryKey: ['permits', params],
    queryFn: () =>
      api.get<WorkPermitListItem[]>(`/permits${params ? `?${params}` : ''}`),
    refetchInterval: 30_000, // Auto-refresh every 30s
  });
}

export function usePermit(id: string | undefined) {
  return useQuery<WorkPermit>({
    queryKey: ['permits', id],
    queryFn: () => api.get<WorkPermit>(`/permits/${id}`),
    enabled: !!id,
  });
}

export function useCreatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<WorkPermit>('/permits', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

export function useUpdatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<WorkPermit>(`/permits/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

// ── Workflow Transitions ───────────────────────────────────

export function useSubmitPermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<WorkPermit>(`/permits/${id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

export function useApprovePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<WorkPermit>(`/permits/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

export function useRejectPermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<WorkPermit>(`/permits/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

export function useActivatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<WorkPermit>(`/permits/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

export function useSuspendPermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<WorkPermit>(`/permits/${id}/suspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

export function useClosePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<WorkPermit>(`/permits/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

// ── Extensions ─────────────────────────────────────────────

export function usePermitExtensions(permitId: string | undefined) {
  return useQuery<PermitExtension[]>({
    queryKey: ['permits', permitId, 'extensions'],
    queryFn: () => api.get<PermitExtension[]>(`/permits/${permitId}/extensions`),
    enabled: !!permitId,
  });
}

export function useCreateExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ permitId, data }: { permitId: string; data: Record<string, unknown> }) =>
      api.post<PermitExtension>(`/permits/${permitId}/extensions`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permits'] }),
  });
}

// ── QR Code ────────────────────────────────────────────────

export function usePermitQR(permitId: string | undefined) {
  return useQuery<PermitQRData>({
    queryKey: ['permits', permitId, 'qr'],
    queryFn: () => api.get<PermitQRData>(`/permits/${permitId}/qr`),
    enabled: !!permitId,
  });
}

export function useValidateQR() {
  return useMutation({
    mutationFn: ({ referenceNumber, token }: { referenceNumber: string; token: string }) =>
      api.get<{ valid: boolean; permit: WorkPermit }>(
        `/permits/validate-qr/${referenceNumber}/${token}`
      ),
  });
}

// ── Checklists & Gas ───────────────────────────────────────

export function useSafetyChecklist(permitType: string | undefined) {
  return useQuery<SafetyChecklistItem[]>({
    queryKey: ['permits', 'checklist', permitType],
    queryFn: () =>
      api.get<SafetyChecklistItem[]>(`/permits/checklists/${permitType}`),
    enabled: !!permitType,
  });
}

export function useGasLimits() {
  return useQuery<GasLimits>({
    queryKey: ['permits', 'gas-limits'],
    queryFn: () => api.get<GasLimits>('/permits/gas-limits'),
  });
}

export function useValidateGasReadings() {
  return useMutation({
    mutationFn: (readings: Array<{ gas: string; value: number }>) =>
      api.post<GasReading[]>('/permits/validate-gas-readings', readings),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function usePermitStatistics() {
  return useQuery<PermitStatistics>({
    queryKey: ['permits', 'statistics'],
    queryFn: () => api.get<PermitStatistics>('/permits/statistics'),
  });
}

// ── Conflict Check ─────────────────────────────────────────

export function useCheckConflicts(
  siteId: string,
  validFrom: string,
  validUntil: string,
  areaId?: string,
  excludeId?: string,
) {
  const params = new URLSearchParams({
    site_id: siteId,
    valid_from: validFrom,
    valid_until: validUntil,
  });
  if (areaId) params.set('area_id', areaId);
  if (excludeId) params.set('exclude_id', excludeId);

  return useQuery<WorkPermitListItem[]>({
    queryKey: ['permits', 'conflicts', siteId, validFrom, validUntil, areaId],
    queryFn: () =>
      api.get<WorkPermitListItem[]>(`/permits/check-conflicts?${params.toString()}`),
    enabled: !!siteId && !!validFrom && !!validUntil,
  });
}
