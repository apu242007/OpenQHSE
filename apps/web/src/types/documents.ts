/**
 * TypeScript types for the Document Management module.
 */

export type DocumentType =
  | 'procedure'
  | 'instruction'
  | 'form'
  | 'record'
  | 'standard'
  | 'regulation'
  | 'plan'
  | 'other';

export type DocumentStatus = 'draft' | 'under_review' | 'approved' | 'obsolete';

export interface Document {
  id: string;
  organization_id: string;
  site_id: string | null;
  doc_type: DocumentType;
  code: string;
  title: string;
  description: string | null;
  version: number;
  status: DocumentStatus;
  category: string | null;
  tags: string[] | null;
  file_url: string;
  file_size: number;
  file_type: string;
  owner_id: string;
  approver_id: string | null;
  effective_date: string | null;
  review_date: string | null;
  expiry_date: string | null;
  distribution_list: DistributionEntry[] | null;
  change_log: ChangeLogEntry[] | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListItem {
  id: string;
  doc_type: DocumentType;
  code: string;
  title: string;
  version: number;
  status: DocumentStatus;
  category: string | null;
  owner_id: string;
  review_date: string | null;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  file_url: string;
  changes_summary: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentAcknowledgment {
  id: string;
  document_id: string;
  user_id: string;
  acknowledged_at: string;
  signature_url: string | null;
  created_at: string;
}

export interface DistributionEntry {
  user_id: string;
  role?: string;
  required?: boolean;
  email?: string;
}

export interface ChangeLogEntry {
  version: number;
  date: string;
  author: string;
  summary: string;
}

export const DOC_TYPE_CONFIG: Record<DocumentType, { label: string; color: string }> = {
  procedure:    { label: 'Procedimiento',     color: '#3B82F6' },
  instruction:  { label: 'Instrucción',       color: '#8B5CF6' },
  form:         { label: 'Formulario',        color: '#10B981' },
  record:       { label: 'Registro',          color: '#F59E0B' },
  standard:     { label: 'Estándar',          color: '#EF4444' },
  regulation:   { label: 'Regulación',        color: '#EC4899' },
  plan:         { label: 'Plan',              color: '#06B6D4' },
  other:        { label: 'Otro',              color: '#6B7280' },
};

export const DOC_STATUS_CONFIG: Record<DocumentStatus, { label: string; bg: string; color: string }> = {
  draft:        { label: 'Borrador',          bg: 'bg-yellow-100',  color: 'text-yellow-800' },
  under_review: { label: 'En revisión',       bg: 'bg-blue-100',    color: 'text-blue-800'   },
  approved:     { label: 'Aprobado',          bg: 'bg-green-100',   color: 'text-green-800'  },
  obsolete:     { label: 'Obsoleto',          bg: 'bg-gray-100',    color: 'text-gray-500'   },
};
