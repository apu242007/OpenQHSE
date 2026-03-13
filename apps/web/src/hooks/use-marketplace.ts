/**
 * React Query hooks for the Marketplace module.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  CategoryInfo,
  MarketplaceImportResult,
  MarketplaceSearchParams,
  MarketplaceTemplateList,
  MarketplaceTemplateRead,
  RatingCreate,
  RatingRead,
} from '@/types/marketplace';

// ── Public (no auth) ───────────────────────────────────────

export function useMarketplaceTemplates(params?: MarketplaceSearchParams) {
  const qs = params
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';

  return useQuery<MarketplaceTemplateList[]>({
    queryKey: ['marketplace', 'templates', params],
    queryFn: () => api.get<MarketplaceTemplateList[]>(`/marketplace/templates${qs}`),
    staleTime: 5 * 60 * 1000, // 5 min — public data, cache aggressively
  });
}

export function useMarketplaceTemplate(id: string | undefined) {
  return useQuery<MarketplaceTemplateRead>({
    queryKey: ['marketplace', 'templates', id],
    queryFn: () => api.get<MarketplaceTemplateRead>(`/marketplace/templates/${id}`),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketplaceFeatured() {
  return useQuery<MarketplaceTemplateList[]>({
    queryKey: ['marketplace', 'featured'],
    queryFn: () => api.get<MarketplaceTemplateList[]>('/marketplace/featured'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketplacePopular() {
  return useQuery<MarketplaceTemplateList[]>({
    queryKey: ['marketplace', 'popular'],
    queryFn: () => api.get<MarketplaceTemplateList[]>('/marketplace/popular'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarketplaceCategories() {
  return useQuery<CategoryInfo[]>({
    queryKey: ['marketplace', 'categories'],
    queryFn: () => api.get<CategoryInfo[]>('/marketplace/categories'),
    staleTime: 30 * 60 * 1000,
  });
}

// ── Authenticated ──────────────────────────────────────────

export function useImportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.post<MarketplaceImportResult>(`/marketplace/templates/${templateId}/import`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}

export function useRateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: RatingCreate }) =>
      api.post<RatingRead>(`/marketplace/templates/${templateId}/rate`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['marketplace', 'templates', variables.templateId] });
    },
  });
}

export function useSubmitTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<MarketplaceTemplateList>('/marketplace/submit', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}
