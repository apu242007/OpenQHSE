/**
 * React Query hooks for the Risk Management module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  RiskRegister,
  RiskRegisterListItem,
  RiskMatrixData,
  RiskStatistics,
  HazopStudy,
  HazopNode,
  BowTieAnalysis,
} from '@/types/risks';

// ── Risk Register ──────────────────────────────────────────

export function useRisks(params?: string) {
  return useQuery<RiskRegisterListItem[]>({
    queryKey: ['risks', params],
    queryFn: () =>
      api.get<RiskRegisterListItem[]>(`/risks${params ? `?${params}` : ''}`),
  });
}

export function useRisk(id: string | undefined) {
  return useQuery<RiskRegister>({
    queryKey: ['risks', id],
    queryFn: () => api.get<RiskRegister>(`/risks/${id}`),
    enabled: !!id,
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<RiskRegister>('/risks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
  });
}

export function useUpdateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<RiskRegister>(`/risks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
  });
}

// ── 5×5 Matrix ─────────────────────────────────────────────

export function useRiskMatrix() {
  return useQuery<RiskMatrixData>({
    queryKey: ['risks', 'matrix'],
    queryFn: () => api.get<RiskMatrixData>('/risks/matrix'),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function useRiskStatistics() {
  return useQuery<RiskStatistics>({
    queryKey: ['risks', 'statistics'],
    queryFn: () => api.get<RiskStatistics>('/risks/statistics'),
  });
}

// ── HAZOP ──────────────────────────────────────────────────

export function useHazopStudies(params?: string) {
  return useQuery<HazopStudy[]>({
    queryKey: ['risks', 'hazop', params],
    queryFn: () =>
      api.get<HazopStudy[]>(`/risks/hazop${params ? `?${params}` : ''}`),
  });
}

export function useHazopStudy(id: string | undefined) {
  return useQuery<HazopStudy>({
    queryKey: ['risks', 'hazop', id],
    queryFn: () => api.get<HazopStudy>(`/risks/hazop/${id}`),
    enabled: !!id,
  });
}

export function useCreateHazopStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<HazopStudy>('/risks/hazop', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'hazop'] }),
  });
}

export function useUpdateHazopStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<HazopStudy>(`/risks/hazop/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'hazop'] }),
  });
}

export function useCreateHazopNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studyId, data }: { studyId: string; data: Record<string, unknown> }) =>
      api.post<HazopNode>(`/risks/hazop/${studyId}/nodes`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'hazop'] }),
  });
}

// ── Bow-Tie ────────────────────────────────────────────────

export function useBowTies(params?: string) {
  return useQuery<BowTieAnalysis[]>({
    queryKey: ['risks', 'bowtie', params],
    queryFn: () =>
      api.get<BowTieAnalysis[]>(`/risks/bowtie${params ? `?${params}` : ''}`),
  });
}

export function useBowTie(id: string | undefined) {
  return useQuery<BowTieAnalysis>({
    queryKey: ['risks', 'bowtie', id],
    queryFn: () => api.get<BowTieAnalysis>(`/risks/bowtie/${id}`),
    enabled: !!id,
  });
}

export function useCreateBowTie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<BowTieAnalysis>('/risks/bowtie', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'bowtie'] }),
  });
}

export function useUpdateBowTie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<BowTieAnalysis>(`/risks/bowtie/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'bowtie'] }),
  });
}
