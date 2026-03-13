/**
 * React Query hooks for the Document Management module.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  Document,
  DocumentAcknowledgment,
  DocumentListItem,
  DocumentVersion,
} from '@/types/documents';

// ── Documents ──────────────────────────────────────────────

export function useDocuments(params?: string) {
  return useQuery<DocumentListItem[]>({
    queryKey: ['documents', params],
    queryFn: () => api.get<DocumentListItem[]>(`/documents${params ? `?${params}` : ''}`),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery<Document>({
    queryKey: ['documents', id],
    queryFn: () => api.get<Document>(`/documents/${id}`),
    enabled: !!id,
  });
}

export function useExpiringDocuments(days = 30) {
  return useQuery<DocumentListItem[]>({
    queryKey: ['documents', 'expiring', days],
    queryFn: () => api.get<DocumentListItem[]>(`/documents/expiring?days=${days}`),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<Document>('/documents', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<Document>(`/documents/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Document>(`/documents/${id}/submit-for-approval`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useApproveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Document>(`/documents/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

// ── Versions ───────────────────────────────────────────────

export function useDocumentVersions(docId: string | undefined) {
  return useQuery<DocumentVersion[]>({
    queryKey: ['documents', docId, 'versions'],
    queryFn: () => api.get<DocumentVersion[]>(`/documents/${docId}/versions`),
    enabled: !!docId,
  });
}

export function useCreateDocumentVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: Record<string, unknown> }) =>
      api.post<DocumentVersion>(`/documents/${docId}/versions`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

// ── Acknowledgments ────────────────────────────────────────

export function useDocumentAcknowledgments(docId: string | undefined) {
  return useQuery<DocumentAcknowledgment[]>({
    queryKey: ['documents', docId, 'acknowledgments'],
    queryFn: () => api.get<DocumentAcknowledgment[]>(`/documents/${docId}/acknowledgments`),
    enabled: !!docId,
  });
}

export function useAcknowledgeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data?: Record<string, unknown> }) =>
      api.post<DocumentAcknowledgment>(`/documents/${docId}/acknowledge`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

// ── Report ─────────────────────────────────────────────────

export function useDownloadDocumentReport() {
  return useMutation({
    mutationFn: async (params?: string) => {
      const { getTokens } = await import('@/lib/api-client');
      const { accessToken } = getTokens();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(
        `${API_BASE}/documents/report${params ? `?${params}` : ''}`,
        { headers: { Authorization: `Bearer ${accessToken ?? ''}` } },
      );
      if (!res.ok) throw new Error('Error al descargar reporte');
      return res.blob();
    },
  });
}
