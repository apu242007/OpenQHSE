/**
 * React Query hooks for the Contractors module.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { DEMO_CONTRACTORS_LIST } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Types ──────────────────────────────────────────────────

export interface ContractorWorker {
  id: string;
  contractor_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  position: string | null;
  photo_url: string | null;
  certifications: Record<string, unknown>[];
  induction_completed: boolean;
  induction_date: string | null;
  access_sites: string[];
  is_active: boolean;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  id: string;
  organization_id: string;
  name: string;
  rut_tax_id: string | null;
  country: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'BLACKLISTED';
  insurance_expiry: string | null;
  insurance_url: string | null;
  certifications: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  approved_by: string | null;
  approved_at: string | null;
  suspension_reason: string | null;
  worker_count: number;
  active_worker_count: number;
  incident_count: number;
  compliance_pct: number;
  created_at: string;
  updated_at: string;
}

export interface ContractorListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Contractor[];
}

export interface ContractorComplianceReport {
  contractor_id: string;
  contractor_name: string;
  status: Contractor['status'];
  total_workers: number;
  active_workers: number;
  inducted_workers: number;
  induction_pct: number;
  certifications_valid: number;
  certifications_expiring: number;
  insurance_expiry: string | null;
  insurance_status: 'valid' | 'expiring_soon' | 'expired' | 'missing';
  incident_count_ytd: number;
  compliance_score: number;
}

// ── Contractors ────────────────────────────────────────────

export function useContractors(params?: string) {
  return useQuery<ContractorListResponse>({
    queryKey: ['contractors', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_CONTRACTORS_LIST as unknown as ContractorListResponse)
      : api.contractors.list(params) as unknown as Promise<ContractorListResponse>,
  });
}

export function useContractor(id: string | undefined) {
  return useQuery<Contractor>({
    queryKey: ['contractors', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_CONTRACTORS_LIST.items.find(c => c.id === id) ?? DEMO_CONTRACTORS_LIST.items[0]) as unknown as Contractor)
      : api.contractors.get(id!) as unknown as Promise<Contractor>,
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useCreateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      AUTH_DISABLED
        ? Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as Record<string, unknown>)
        : api.contractors.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractors'] }),
  });
}

export function useUpdateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      AUTH_DISABLED
        ? Promise.resolve({ id, ...data } as Record<string, unknown>)
        : api.contractors.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['contractors'] });
      qc.invalidateQueries({ queryKey: ['contractors', id] });
    },
  });
}

export function useApproveContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      AUTH_DISABLED
        ? Promise.resolve({ id } as Record<string, unknown>)
        : api.contractors.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractors'] }),
  });
}

export function useSuspendContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      AUTH_DISABLED
        ? Promise.resolve({ id, reason } as Record<string, unknown>)
        : api.contractors.suspend(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractors'] }),
  });
}

export function useReactivateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      AUTH_DISABLED
        ? Promise.resolve({ id } as Record<string, unknown>)
        : api.contractors.reactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractors'] }),
  });
}

// ── Workers ────────────────────────────────────────────────

export function useContractorWorkers(contractorId: string | undefined, params?: string) {
  return useQuery<ContractorWorker[]>({
    queryKey: ['contractors', contractorId, 'workers', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as ContractorWorker[])
      : api.contractors.workers.list(contractorId!, params) as unknown as Promise<ContractorWorker[]>,
    enabled: AUTH_DISABLED ? true : !!contractorId,
  });
}

export function useAddWorker(contractorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ contractorId, ...data, id: 'demo-' + Date.now() });
      return api.contractors.workers.add(contractorId, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractors', contractorId, 'workers'] }),
  });
}

export function useUpdateWorker(contractorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, data }: { workerId: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ contractorId, workerId, ...data });
      return api.contractors.workers.update(contractorId, workerId, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractors', contractorId, 'workers'] }),
  });
}

export function useRecordInduction(contractorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workerId: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ contractorId, workerId });
      return api.contractors.workers.recordInduction(contractorId, workerId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractors', contractorId, 'workers'] }),
  });
}

// ── Compliance ─────────────────────────────────────────────

export function useContractorCompliance(id: string | undefined) {
  return useQuery<ContractorComplianceReport>({
    queryKey: ['contractors', id, 'compliance'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve({
          contractor_id: id ?? '',
          contractor_name: DEMO_CONTRACTORS_LIST.items.find(c => c.id === id)?.name ?? 'Demo',
          status: 'APPROVED' as const,
          total_workers: 20,
          active_workers: 18,
          inducted_workers: 15,
          induction_pct: 83,
          certifications_valid: 12,
          certifications_expiring: 2,
          insurance_expiry: '2025-06-30T00:00:00Z',
          insurance_status: 'valid' as const,
          incident_count_ytd: 0,
          compliance_score: 92,
        } as ContractorComplianceReport)
      : api.contractors.complianceReport(id!) as unknown as Promise<ContractorComplianceReport>,
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useExpiringDocuments(days?: number) {
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['contractors', 'expiring-documents', days],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([])
      : api.contractors.expiringDocuments(days),
  });
}
