/**
 * React Query hooks for the KPI Alert System.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { DEMO_KPI_ALERT_RULES, DEMO_KPI_ALERTS } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Types ──────────────────────────────────────────────────

export type KPIName =
  | 'TRIR' | 'LTIF' | 'DART' | 'FAR' | 'SEVERITY_RATE'
  | 'ACTIONS_OVERDUE' | 'ACTIONS_OPEN' | 'INSPECTIONS_OVERDUE'
  | 'TRAINING_COMPLIANCE' | 'PERMIT_COMPLIANCE' | 'NEAR_MISS_RATE'
  | 'OBSERVATION_RATE' | 'CONTRACTOR_INCIDENTS';

export type AlertCondition =
  | 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS'
  | 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN_OR_EQUAL';

export type AlertPeriod = 'REAL_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface KPIAlertRule {
  id: string;
  organization_id: string;
  site_id: string | null;
  name: string;
  description: string | null;
  kpi_name: KPIName;
  condition: AlertCondition;
  threshold: number;
  period: AlertPeriod;
  channels: Record<string, boolean>;
  recipients: Record<string, unknown>;
  escalation_rules: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KPIAlert {
  id: string;
  organization_id: string;
  site_id: string | null;
  rule_id: string;
  kpi_name: KPIName;
  condition: AlertCondition;
  threshold_value: number;
  current_value: number;
  period: AlertPeriod;
  status: AlertStatus;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  escalation_count: number;
  notes: string | null;
  rule_name: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ── Alert Rules ────────────────────────────────────────────

export function useKPIAlertRules(isActive?: boolean) {
  const params = isActive !== undefined ? `is_active=${isActive}` : undefined;
  return useQuery<KPIAlertRule[]>({
    queryKey: ['kpi-alert-rules', isActive],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(
          (isActive !== undefined
            ? DEMO_KPI_ALERT_RULES.filter(r => r.is_active === isActive)
            : DEMO_KPI_ALERT_RULES) as unknown as KPIAlertRule[]
        )
      : api.analytics.kpiAlertRules.list(params) as unknown as Promise<KPIAlertRule[]>,
  });
}

export function useCreateKPIAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() });
      return api.analytics.kpiAlertRules.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-alert-rules'] }),
  });
}

export function useUpdateKPIAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data });
      return api.analytics.kpiAlertRules.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-alert-rules'] }),
  });
}

export function useDeleteKPIAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve() as Promise<void>;
      return api.analytics.kpiAlertRules.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-alert-rules'] }),
  });
}

// ── Alert Instances ────────────────────────────────────────

export function useKPIAlerts(params?: string) {
  return useQuery<KPIAlert[]>({
    queryKey: ['kpi-alerts', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_KPI_ALERTS as unknown as KPIAlert[])
      : api.analytics.kpiAlerts.list(params) as unknown as Promise<KPIAlert[]>,
  });
}

export function useAcknowledgeKPIAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, notes });
      return api.analytics.kpiAlerts.acknowledge(id, notes);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-alerts'] }),
  });
}

export function useResolveKPIAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id });
      return api.analytics.kpiAlerts.resolve(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi-alerts'] }),
  });
}

// ── Labels / display helpers ───────────────────────────────

export const KPI_NAME_LABELS: Record<KPIName, string> = {
  TRIR: 'TRIR',
  LTIF: 'LTIF',
  DART: 'DART',
  FAR: 'FAR',
  SEVERITY_RATE: 'Tasa de Severidad',
  ACTIONS_OVERDUE: 'Acciones Vencidas',
  ACTIONS_OPEN: 'Acciones Abiertas',
  INSPECTIONS_OVERDUE: 'Inspecciones Vencidas',
  TRAINING_COMPLIANCE: 'Cumplimiento Capacitación',
  PERMIT_COMPLIANCE: 'Cumplimiento Permisos',
  NEAR_MISS_RATE: 'Tasa Cuasi-accidentes',
  OBSERVATION_RATE: 'Tasa Observaciones BBS',
  CONTRACTOR_INCIDENTS: 'Incidentes Contratistas',
};

export const ALERT_CONDITION_LABELS: Record<AlertCondition, string> = {
  GREATER_THAN: '>',
  LESS_THAN: '<',
  EQUALS: '=',
  GREATER_THAN_OR_EQUAL: '≥',
  LESS_THAN_OR_EQUAL: '≤',
};

export const ALERT_STATUS_COLOR: Record<AlertStatus, string> = {
  ACTIVE: 'text-blue-600 bg-blue-100',
  TRIGGERED: 'text-red-600 bg-red-100',
  ACKNOWLEDGED: 'text-amber-600 bg-amber-100',
  RESOLVED: 'text-green-600 bg-green-100',
};

export const ALERT_SEVERITY_COLOR: Record<KPIAlert['severity'], string> = {
  low: 'text-blue-600 bg-blue-50 border-blue-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
};
