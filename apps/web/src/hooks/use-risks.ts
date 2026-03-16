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
import {
  DEMO_RISKS_LIST, DEMO_RISK_STATISTICS, DEMO_RISK_MATRIX_DATA,
  DEMO_HAZOP_STUDIES, DEMO_BOWTIE_ANALYSES,
} from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Risk Register ──────────────────────────────────────────

export function useRisks(params?: string) {
  return useQuery<RiskRegisterListItem[]>({
    queryKey: ['risks', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_RISKS_LIST as unknown as RiskRegisterListItem[])
      : api.get<RiskRegisterListItem[]>(`/risks${params ? `?${params}` : ''}`),
  });
}

export function useRisk(id: string | undefined) {
  return useQuery<RiskRegister>({
    queryKey: ['risks', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_RISKS_LIST.find(r => r.id === id) ?? DEMO_RISKS_LIST[0]) as unknown as RiskRegister)
      : api.get<RiskRegister>(`/risks/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as RiskRegister);
      return api.post<RiskRegister>('/risks', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
  });
}

export function useUpdateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as RiskRegister);
      return api.patch<RiskRegister>(`/risks/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
  });
}

// ── 5×5 Matrix ─────────────────────────────────────────────

export function useRiskMatrix() {
  return useQuery<RiskMatrixData>({
    queryKey: ['risks', 'matrix'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_RISK_MATRIX_DATA as unknown as RiskMatrixData)
      : api.get<RiskMatrixData>('/risks/matrix'),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function useRiskStatistics() {
  return useQuery<RiskStatistics>({
    queryKey: ['risks', 'statistics'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_RISK_STATISTICS as unknown as RiskStatistics)
      : api.get<RiskStatistics>('/risks/statistics'),
  });
}

// ── HAZOP ──────────────────────────────────────────────────

export function useHazopStudies(params?: string) {
  return useQuery<HazopStudy[]>({
    queryKey: ['risks', 'hazop', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_HAZOP_STUDIES as unknown as HazopStudy[])
      : api.get<HazopStudy[]>(`/risks/hazop${params ? `?${params}` : ''}`),
  });
}

export function useHazopStudy(id: string | undefined) {
  return useQuery<HazopStudy>({
    queryKey: ['risks', 'hazop', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_HAZOP_STUDIES.find(h => h.id === id) ?? DEMO_HAZOP_STUDIES[0]) as unknown as HazopStudy)
      : api.get<HazopStudy>(`/risks/hazop/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateHazopStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as HazopStudy);
      return api.post<HazopStudy>('/risks/hazop', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'hazop'] }),
  });
}

export function useUpdateHazopStudy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as HazopStudy);
      return api.patch<HazopStudy>(`/risks/hazop/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'hazop'] }),
  });
}

export function useCreateHazopNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studyId, data }: { studyId: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ studyId, ...data, id: 'demo-' + Date.now() } as unknown as HazopNode);
      return api.post<HazopNode>(`/risks/hazop/${studyId}/nodes`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'hazop'] }),
  });
}

// ── Bow-Tie ────────────────────────────────────────────────

export function useBowTies(params?: string) {
  return useQuery<BowTieAnalysis[]>({
    queryKey: ['risks', 'bowtie', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_BOWTIE_ANALYSES as unknown as BowTieAnalysis[])
      : api.get<BowTieAnalysis[]>(`/risks/bowtie${params ? `?${params}` : ''}`),
  });
}

export function useBowTie(id: string | undefined) {
  return useQuery<BowTieAnalysis>({
    queryKey: ['risks', 'bowtie', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_BOWTIE_ANALYSES.find(b => b.id === id) ?? DEMO_BOWTIE_ANALYSES[0]) as unknown as BowTieAnalysis)
      : api.get<BowTieAnalysis>(`/risks/bowtie/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateBowTie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as BowTieAnalysis);
      return api.post<BowTieAnalysis>('/risks/bowtie', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'bowtie'] }),
  });
}

export function useUpdateBowTie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as BowTieAnalysis);
      return api.patch<BowTieAnalysis>(`/risks/bowtie/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', 'bowtie'] }),
  });
}
