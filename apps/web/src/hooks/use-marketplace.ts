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
import { DEMO_MARKETPLACE_TEMPLATES } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

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
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_MARKETPLACE_TEMPLATES as unknown as MarketplaceTemplateList[])
      : api.get<MarketplaceTemplateList[]>(`/marketplace/templates${qs}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarketplaceTemplate(id: string | undefined) {
  return useQuery<MarketplaceTemplateRead>({
    queryKey: ['marketplace', 'templates', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_MARKETPLACE_TEMPLATES.find(t => t.id === id) ?? DEMO_MARKETPLACE_TEMPLATES[0]) as unknown as MarketplaceTemplateRead)
      : api.get<MarketplaceTemplateRead>(`/marketplace/templates/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketplaceFeatured() {
  return useQuery<MarketplaceTemplateList[]>({
    queryKey: ['marketplace', 'featured'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_MARKETPLACE_TEMPLATES.slice(0, 3) as unknown as MarketplaceTemplateList[])
      : api.get<MarketplaceTemplateList[]>('/marketplace/featured'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMarketplacePopular() {
  return useQuery<MarketplaceTemplateList[]>({
    queryKey: ['marketplace', 'popular'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([...DEMO_MARKETPLACE_TEMPLATES].sort((a, b) => b.downloads - a.downloads) as unknown as MarketplaceTemplateList[])
      : api.get<MarketplaceTemplateList[]>('/marketplace/popular'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarketplaceCategories() {
  return useQuery<CategoryInfo[]>({
    queryKey: ['marketplace', 'categories'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([
          { id: 'SAFETY', name: 'Seguridad', template_count: 12 },
          { id: 'ENVIRONMENTAL', name: 'Ambiental', template_count: 5 },
          { id: 'QUALITY', name: 'Calidad', template_count: 4 },
          { id: 'EQUIPMENT', name: 'Equipos', template_count: 6 },
          { id: 'RISK', name: 'Riesgos', template_count: 3 },
        ] as unknown as CategoryInfo[])
      : api.get<CategoryInfo[]>('/marketplace/categories'),
    staleTime: 30 * 60 * 1000,
  });
}

// ── Authenticated ──────────────────────────────────────────

export function useImportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ templateId, success: true } as unknown as MarketplaceImportResult);
      return api.post<MarketplaceImportResult>(`/marketplace/templates/${templateId}/import`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}

export function useRateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: RatingCreate }) => {
      if (AUTH_DISABLED) return Promise.resolve({ templateId, ...data, id: 'demo-' + Date.now() } as unknown as RatingRead);
      return api.post<RatingRead>(`/marketplace/templates/${templateId}/rate`, data);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['marketplace', 'templates', variables.templateId] });
    },
  });
}

export function useSubmitTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as MarketplaceTemplateList);
      return api.post<MarketplaceTemplateList>('/marketplace/submit', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}
