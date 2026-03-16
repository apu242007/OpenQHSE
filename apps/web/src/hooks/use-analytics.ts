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
import {
  DEMO_KPIS, DEMO_INCIDENTS_TREND, DEMO_INSPECTIONS_COMPLIANCE,
  DEMO_ACTIONS_SUMMARY, DEMO_RISK_MATRIX, DEMO_TRAINING_COMPLIANCE,
  DEMO_WIDGETS, DEMO_SIDEBAR_BADGES,
} from '@/lib/demo-data';

// ── Constants ──────────────────────────────────────────────

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes auto-refresh
const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

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
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_KPIS) : api.analytics.kpis(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}

// ── Incidents Trend ────────────────────────────────────────

export function useIncidentsTrend(months = 12) {
  const siteParams = useSiteParams();
  const params = siteParams ? `${siteParams}&months=${months}` : `months=${months}`;
  return useQuery<AnyData>({
    queryKey: ['analytics', 'incidents-trend', params],
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_INCIDENTS_TREND) : api.analytics.incidentsTrend(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}

// ── Inspections Compliance ─────────────────────────────────

export function useInspectionsCompliance() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'inspections-compliance', params],
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_INSPECTIONS_COMPLIANCE) : api.analytics.inspectionsCompliance(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}

// ── Actions Summary ────────────────────────────────────────

export function useActionsSummary() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'actions-summary', params],
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_ACTIONS_SUMMARY) : api.analytics.actionsSummary(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}

// ── Risk Matrix ────────────────────────────────────────────

export function useRiskMatrix() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'risk-matrix', params],
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_RISK_MATRIX) : api.analytics.riskMatrix(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}

// ── Training Compliance ────────────────────────────────────

export function useTrainingCompliance() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'training-compliance', params],
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_TRAINING_COMPLIANCE) : api.analytics.trainingCompliance(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}

// ── Dashboard Widgets (lists) ──────────────────────────────

export function useWidgets() {
  const params = useSiteParams();
  return useQuery<AnyData>({
    queryKey: ['analytics', 'widgets', params],
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_WIDGETS) : api.analytics.widgets(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}

// ── Sidebar Badges ─────────────────────────────────────────

export function useSidebarBadges() {
  const params = useSiteParams();
  return useQuery<SidebarBadgesResponse>({
    queryKey: ['analytics', 'badges', params],
    queryFn: () => AUTH_DISABLED ? Promise.resolve(DEMO_SIDEBAR_BADGES as unknown as SidebarBadgesResponse) : api.analytics.badges(params),
    refetchInterval: AUTH_DISABLED ? false : REFETCH_INTERVAL,
  });
}
