/**
 * React Query hooks for the BBS Observations module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  DEMO_OBSERVATIONS_LIST, DEMO_OBSERVATIONS_TREND, DEMO_OBSERVATIONS_BY_CATEGORY,
} from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Types ──────────────────────────────────────────────────

export type ObservationType = 'SAFE' | 'UNSAFE' | 'NEAR_MISS_BEHAVIOR';
export type ObservationCategory =
  | 'PPE'
  | 'PROCEDURE'
  | 'HOUSEKEEPING'
  | 'TOOL_USE'
  | 'COMMUNICATION'
  | 'ERGONOMICS'
  | 'ENERGY_ISOLATION'
  | 'OTHER';
export type ObservationStatus = 'OPEN' | 'IN_REVIEW' | 'ACTION_ASSIGNED' | 'CLOSED';

export interface Observation {
  id: string;
  organization_id: string;
  site_id: string | null;
  type: ObservationType;
  category: ObservationCategory;
  description: string;
  area: string | null;
  task_being_performed: string | null;
  observer_id: string;
  is_anonymous: boolean;
  observed_person_id: string | null;
  observed_contractor_worker_id: string | null;
  positive_feedback: string | null;
  improvement_feedback: string | null;
  photos: string[];
  status: ObservationStatus;
  action_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Observation[];
}

export interface ObservationMonthlyTrend {
  month: string;
  label: string;
  safe: number;
  unsafe: number;
  near_miss: number;
  total: number;
  participation_rate: number;
}

export interface ObservationCategoryCount {
  category: ObservationCategory;
  safe_count: number;
  unsafe_count: number;
  near_miss_count: number;
  total: number;
}

export interface ObservationTopArea {
  area: string;
  total: number;
  unsafe_count: number;
  unsafe_pct: number;
}

export interface ObservationStats {
  total: number;
  safe_count: number;
  unsafe_count: number;
  near_miss_count: number;
  safe_pct: number;
  unsafe_pct: number;
  participation_index: number;
  monthly_trend: ObservationMonthlyTrend[];
  by_category: ObservationCategoryCount[];
  top_unsafe_areas: ObservationTopArea[];
  period_start: string;
  period_end: string;
}

// ── Observations ───────────────────────────────────────────

export function useObservations(params?: string) {
  return useQuery<ObservationListResponse>({
    queryKey: ['observations', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_OBSERVATIONS_LIST as unknown as ObservationListResponse)
      : api.observations.list(params) as unknown as Promise<ObservationListResponse>,
  });
}

export function useObservation(id: string | undefined) {
  return useQuery<Observation>({
    queryKey: ['observations', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_OBSERVATIONS_LIST.items.find(o => o.id === id) ?? DEMO_OBSERVATIONS_LIST.items[0]) as unknown as Observation)
      : api.observations.get(id!) as unknown as Promise<Observation>,
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() });
      return api.observations.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['observations'] });
      qc.invalidateQueries({ queryKey: ['observations-stats'] });
    },
  });
}

export function useUpdateObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data });
      return api.observations.update(id, data);
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['observations'] });
      qc.invalidateQueries({ queryKey: ['observations', id] });
    },
  });
}

export function useReviewObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id });
      return api.observations.review(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['observations'] }),
  });
}

export function useCloseObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id });
      return api.observations.close(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['observations'] }),
  });
}

// ── Statistics ─────────────────────────────────────────────

export function useObservationStats(params?: string) {
  return useQuery<ObservationStats>({
    queryKey: ['observations-stats', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve({
          total: DEMO_OBSERVATIONS_LIST.total,
          safe_count: DEMO_OBSERVATIONS_LIST.items.filter(o => o.type === 'SAFE').length,
          unsafe_count: DEMO_OBSERVATIONS_LIST.items.filter(o => o.type === 'UNSAFE').length,
          near_miss_count: DEMO_OBSERVATIONS_LIST.items.filter(o => o.type === 'NEAR_MISS_BEHAVIOR').length,
          safe_pct: 40,
          unsafe_pct: 40,
          participation_index: 75,
          monthly_trend: DEMO_OBSERVATIONS_TREND,
          by_category: DEMO_OBSERVATIONS_BY_CATEGORY,
          top_unsafe_areas: [
            { area: 'Taller Mecánico', total: 12, unsafe_count: 6, unsafe_pct: 50 },
            { area: 'Bodega Central', total: 8, unsafe_count: 3, unsafe_pct: 37.5 },
          ],
          period_start: '2024-07-01T00:00:00Z',
          period_end: '2025-01-05T23:59:59Z',
        } as ObservationStats)
      : api.observations.statistics(params) as unknown as Promise<ObservationStats>,
  });
}

export function useUnsafeTrends(params?: string) {
  return useQuery<{ category: string; count: number }[]>({
    queryKey: ['observations-unsafe-trends', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_OBSERVATIONS_BY_CATEGORY.map(c => ({ category: c.category, count: c.unsafe_count })))
      : api.observations.unsafeTrends(params) as unknown as Promise<{ category: string; count: number }[]>,
  });
}

// ── Labels / display helpers ───────────────────────────────

export const OBSERVATION_TYPE_LABELS: Record<ObservationType, string> = {
  SAFE: 'Comportamiento Seguro',
  UNSAFE: 'Comportamiento Inseguro',
  NEAR_MISS_BEHAVIOR: 'Cuasi-accidente de comportamiento',
};

export const OBSERVATION_CATEGORY_LABELS: Record<ObservationCategory, string> = {
  PPE: 'EPP',
  PROCEDURE: 'Procedimientos',
  HOUSEKEEPING: 'Orden y Limpieza',
  TOOL_USE: 'Herramientas / Equipos',
  COMMUNICATION: 'Comunicación',
  ERGONOMICS: 'Ergonomía',
  ENERGY_ISOLATION: 'Aislamiento de Energía (LOTO)',
  OTHER: 'Otro',
};

export const OBSERVATION_TYPE_COLOR: Record<ObservationType, string> = {
  SAFE: 'text-green-600 bg-green-100',
  UNSAFE: 'text-red-600 bg-red-100',
  NEAR_MISS_BEHAVIOR: 'text-amber-600 bg-amber-100',
};
