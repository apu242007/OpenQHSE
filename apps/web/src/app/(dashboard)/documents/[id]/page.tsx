'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileText, CheckCircle, Clock, User, Calendar,
  History, Download, Eye, Users, ChevronDown, ChevronUp,
  Send, Loader2, AlertTriangle, ExternalLink, Tag,
} from 'lucide-react';
import {
  useDocument,
  useDocumentVersions,
  useDocumentAcknowledgments,
  useSubmitForApproval,
  useApproveDocument,
  useAcknowledgeDocument,
} from '@/hooks/use-documents';
import { DOC_TYPE_CONFIG, DOC_STATUS_CONFIG } from '@/types/documents';
import type { DocumentStatus } from '@/types/documents';
import { cn, formatDate } from '@/lib/utils';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showPdf, setShowPdf] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showAcknowledgments, setShowAcknowledgments] = useState(false);

  const { data: doc, isLoading } = useDocument(id);
  const { data: versions = [] } = useDocumentVersions(showVersions ? id : undefined);
  const { data: acks = [] } = useDocumentAcknowledgments(showAcknowledgments ? id : undefined);

  const submitForApproval = useSubmitForApproval();
  const approveDoc = useApproveDocument();
  const acknowledgeDoc = useAcknowledgeDocument();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Documento no encontrado</p>
        <button type="button" onClick={() => router.push('/documents')} className="text-sm text-primary hover:underline">
          Volver al repositorio
        </button>
      </div>
    );
  }

  const typeConf = DOC_TYPE_CONFIG[doc.doc_type];
  const statusConf = DOC_STATUS_CONFIG[doc.status as DocumentStatus];
  const isPdf = doc.file_type.includes('pdf') || doc.file_url.endsWith('.pdf');
  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
  const isExpiringSoon = doc.expiry_date &&
    new Date(doc.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && !isExpired;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => router.push('/documents')}
          className="mt-1 rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{doc.code}</span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ color: typeConf?.color, backgroundColor: `${typeConf?.color}20` }}
            >
              {typeConf?.label ?? doc.doc_type}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusConf?.bg, statusConf?.color)}>
              {statusConf?.label ?? doc.status}
            </span>
            {isExpired && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Vencido
              </span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Por vencer
              </span>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold">{doc.title}</h1>
          {doc.description && (
            <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
        {doc.status === 'draft' && (
          <button
            type="button"
            onClick={() => submitForApproval.mutate(doc.id)}
            disabled={submitForApproval.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {submitForApproval.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar para aprobación
          </button>
        )}
        {doc.status === 'under_review' && (
          <button
            type="button"
            onClick={() => approveDoc.mutate(doc.id)}
            disabled={approveDoc.isPending}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            {approveDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Aprobar documento
          </button>
        )}
        {doc.status === 'approved' && (
          <button
            type="button"
            onClick={() => acknowledgeDoc.mutate({ docId: doc.id })}
            disabled={acknowledgeDoc.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            {acknowledgeDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Confirmar lectura
          </button>
        )}
        <a
          href={doc.file_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Download className="h-4 w-4" /> Descargar
        </a>
        {isPdf && (
          <button
            type="button"
            onClick={() => setShowPdf((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Eye className="h-4 w-4" /> {showPdf ? 'Ocultar' : 'Vista previa'}
          </button>
        )}
      </div>

      {/* PDF Preview */}
      {showPdf && isPdf && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-b border-border">
            <span className="text-sm font-medium">Vista previa del documento</span>
            <a href={doc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Abrir en nueva pestaña <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <iframe
            src={doc.file_url}
            className="w-full"
            style={{ height: '70vh' }}
            title={doc.title}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — Metadata */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Información del documento
            </h2>
            <InfoRow icon={FileText} label="Tipo" value={typeConf?.label ?? doc.doc_type} />
            <InfoRow icon={Tag} label="Versión" value={`v${doc.version}`} />
            <InfoRow icon={Tag} label="Categoría" value={doc.category ?? '—'} />
            <InfoRow icon={User} label="Propietario" value={doc.owner_id} mono />
            {doc.approver_id && (
              <InfoRow icon={CheckCircle} label="Aprobador" value={doc.approver_id} mono />
            )}
            <InfoRow
              icon={Calendar}
              label="Fecha efectiva"
              value={doc.effective_date ? formatDate(doc.effective_date) : '—'}
            />
            <InfoRow
              icon={Clock}
              label="Fecha revisión"
              value={doc.review_date ? formatDate(doc.review_date) : '—'}
              highlight={!!isExpiringSoon}
            />
            {doc.expiry_date && (
              <InfoRow
                icon={AlertTriangle}
                label="Vencimiento"
                value={formatDate(doc.expiry_date)}
                highlight={!!isExpired}
                danger={!!isExpired}
              />
            )}
          </div>

          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Etiquetas</h2>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Versions + Acknowledgments */}
        <div className="space-y-4 lg:col-span-2">
          {/* Version History */}
          <Collapsible
            icon={History}
            title="Historial de versiones"
            isOpen={showVersions}
            onToggle={() => setShowVersions((v) => !v)}
            badge={doc.version > 1 ? String(doc.version) : undefined}
          >
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay versiones anteriores registradas.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((ver) => (
                  <div key={ver.id} className="flex items-start justify-between rounded-lg border border-border p-3">
                    <div>
                      <span className="font-mono text-sm font-medium">v{ver.version}</span>
                      {ver.changes_summary && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{ver.changes_summary}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(ver.created_at)}</p>
                    </div>
                    <a
                      href={ver.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" /> Descargar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Collapsible>

          {/* Acknowledgments */}
          <Collapsible
            icon={Users}
            title="Confirmaciones de lectura"
            isOpen={showAcknowledgments}
            onToggle={() => setShowAcknowledgments((v) => !v)}
            badge={acks.length > 0 ? String(acks.length) : undefined}
          >
            {acks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nadie ha confirmado lectura aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="pb-2 pr-4">Usuario</th>
                      <th className="pb-2 pr-4">Fecha de confirmación</th>
                      <th className="pb-2">Firma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {acks.map((ack) => (
                      <tr key={ack.id}>
                        <td className="py-2 pr-4 font-mono text-xs">{ack.user_id}</td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {formatDate(ack.acknowledged_at)}
                        </td>
                        <td className="py-2">
                          {ack.signature_url ? (
                            <a href={ack.signature_url} target="_blank" rel="noreferrer"
                              className="text-xs text-primary hover:underline">Ver firma</a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Collapsible>

          {/* Distribution List */}
          {doc.distribution_list && (doc.distribution_list as unknown as Array<{user_id?: string; role?: string; required?: boolean}>).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                Lista de distribución
              </h2>
              <div className="space-y-2">
                {(doc.distribution_list as unknown as Array<{user_id?: string; role?: string; required?: boolean}>).map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-2">
                    <span className="font-mono text-xs">{String(entry.user_id ?? '—')}</span>
                    <div className="flex items-center gap-2">
                      {entry.role && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{String(entry.role)}</span>
                      )}
                      {entry.required && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Obligatorio</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function InfoRow({
  icon: Icon, label, value, mono, highlight, danger,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn(
          'text-sm',
          mono && 'font-mono text-xs',
          highlight && 'font-medium text-amber-600',
          danger && 'font-medium text-red-600',
        )}>{value}</p>
      </div>
    </div>
  );
}

function Collapsible({
  icon: Icon, title, isOpen, onToggle, children, badge,
}: {
  icon: React.ElementType;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-sm font-semibold hover:bg-muted/50 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          {badge && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {badge}
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="border-t border-border p-4">
          {children}
        </div>
      )}
    </div>
  );
}
