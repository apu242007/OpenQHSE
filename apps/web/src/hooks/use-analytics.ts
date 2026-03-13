/**
 * React Query hooks for the Executive Dashboard.
 *
 * Each hook wraps an analytics API call with proper caching,
 * auto-refresh, and error handling.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { api, type SidebarBadgesResponse } from '@/lib/api-client';
import { useFiltersStore } from '@/lib/stores';

// ── Constants ──────────────────────────────────────────────

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes auto-refresh

/** Build the query params string from the global site filter. */
function useSiteParams(): string {
  const { selectedSiteId } = useFiltersStore();
  return selectedSiteId ? `site_id=${selectedSiteId}` : '';
}

// ── Response type aliases (match backend schemas) ──────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyData = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── KPIs ───────────────────────────────────────────────────

export function useKPIs() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'kpis', params],
    queryFn: () => api.analytics.kpis(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ── Incidents Trend ────────────────────────────────────────

export function useIncidentsTrend(months = 12) {
  const siteParams = useSiteParams();
  const params = siteParams ? `${siteParams}&months=${months}` : `months=${months}`;
  return useQuery<AnyData>({
    queryKey: ['analytics', 'incidents-trend', params],
    queryFn: () => api.analytics.incidentsTrend(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ── Inspections Compliance ─────────────────────────────────

export function useInspectionsCompliance() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'inspections-compliance', params],
    queryFn: () => api.analytics.inspectionsCompliance(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ── Actions Summary ────────────────────────────────────────

export function useActionsSummary() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'actions-summary', params],
    queryFn: () => api.analytics.actionsSummary(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ── Risk Matrix ────────────────────────────────────────────

export function useRiskMatrix() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'risk-matrix', params],
    queryFn: () => api.analytics.riskMatrix(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ── Training Compliance ────────────────────────────────────

export function useTrainingCompliance() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'training-compliance', params],
    queryFn: () => api.analytics.trainingCompliance(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ── Dashboard Widgets (lists) ──────────────────────────────

export function useWidgets() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'widgets', params],
    queryFn: () => api.analytics.widgets(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ── Sidebar Badges ─────────────────────────────────────────

export function useSidebarBadges() {
  const params = useSiteParams();
  return useQuery<SidebarBadgesResponse>({
    queryKey: ['analytics', 'badges', params],
    queryFn: () => api.analytics.badges(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}
