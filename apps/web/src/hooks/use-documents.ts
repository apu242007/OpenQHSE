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
import { DEMO_DOCUMENTS_LIST } from '@/lib/demo-data';

const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

// ── Documents ──────────────────────────────────────────────

export function useDocuments(params?: string) {
  return useQuery<DocumentListItem[]>({
    queryKey: ['documents', params],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_DOCUMENTS_LIST as unknown as DocumentListItem[])
      : api.get<DocumentListItem[]>(`/documents${params ? `?${params}` : ''}`),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery<Document>({
    queryKey: ['documents', id],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve((DEMO_DOCUMENTS_LIST.find(d => d.id === id) ?? DEMO_DOCUMENTS_LIST[0]) as unknown as Document)
      : api.get<Document>(`/documents/${id}`),
    enabled: AUTH_DISABLED ? true : !!id,
  });
}

export function useExpiringDocuments(days = 30) {
  return useQuery<DocumentListItem[]>({
    queryKey: ['documents', 'expiring', days],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve(DEMO_DOCUMENTS_LIST.filter(d => d.status === 'EXPIRING_SOON') as unknown as DocumentListItem[])
      : api.get<DocumentListItem[]>(`/documents/expiring?days=${days}`),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (AUTH_DISABLED) return Promise.resolve({ ...data, id: 'demo-' + Date.now() } as unknown as Document);
      return api.post<Document>('/documents', data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ id, ...data } as unknown as Document);
      return api.patch<Document>(`/documents/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id } as unknown as Document);
      return api.post<Document>(`/documents/${id}/submit-for-approval`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useApproveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({ id } as unknown as Document);
      return api.post<Document>(`/documents/${id}/approve`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (AUTH_DISABLED) return Promise.resolve({});
      return api.delete(`/documents/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

// ── Versions ───────────────────────────────────────────────

export function useDocumentVersions(docId: string | undefined) {
  return useQuery<DocumentVersion[]>({
    queryKey: ['documents', docId, 'versions'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as DocumentVersion[])
      : api.get<DocumentVersion[]>(`/documents/${docId}/versions`),
    enabled: AUTH_DISABLED ? true : !!docId,
  });
}

export function useCreateDocumentVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ docId, ...data, id: 'demo-' + Date.now() } as unknown as DocumentVersion);
      return api.post<DocumentVersion>(`/documents/${docId}/versions`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

// ── Acknowledgments ────────────────────────────────────────

export function useDocumentAcknowledgments(docId: string | undefined) {
  return useQuery<DocumentAcknowledgment[]>({
    queryKey: ['documents', docId, 'acknowledgments'],
    queryFn: () => AUTH_DISABLED
      ? Promise.resolve([] as DocumentAcknowledgment[])
      : api.get<DocumentAcknowledgment[]>(`/documents/${docId}/acknowledgments`),
    enabled: AUTH_DISABLED ? true : !!docId,
  });
}

export function useAcknowledgeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data?: Record<string, unknown> }) => {
      if (AUTH_DISABLED) return Promise.resolve({ docId, ...data } as unknown as DocumentAcknowledgment);
      return api.post<DocumentAcknowledgment>(`/documents/${docId}/acknowledge`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

// ── Report ─────────────────────────────────────────────────

export function useDownloadDocumentReport() {
  return useMutation({
    mutationFn: async (params?: string) => {
      if (AUTH_DISABLED) {
        throw new Error('Descarga de reportes no disponible en modo demo. Requiere backend.');
      }
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const accessToken = session?.accessToken ?? '';
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
