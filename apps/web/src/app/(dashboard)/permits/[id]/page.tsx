/**
 * Permit Detail — Full permit view with workflow actions, QR, extensions.
 */

'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  QrCode,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Play,
  Send,
  Plus,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  usePermit,
  useSubmitPermit,
  useApprovePermit,
  useRejectPermit,
  useActivatePermit,
  useSuspendPermit,
  useClosePermit,
  usePermitExtensions,
  useCreateExtension,
  usePermitQR,
} from '@/hooks/use-permits';
import {
  PERMIT_STATUS_CONFIG,
  PERMIT_TYPE_CONFIG,
  type PermitStatus,
  type PermitType,
} from '@/types/permits';

/* ── Workflow buttons config ─────────────────────────────── */
type TransitionConfig = {
  label: string;
  icon: React.ReactNode;
  color: string;
  hook: () => { mutate: (id: string) => void; isPending: boolean };
};

const TRANSITIONS: Record<string, TransitionConfig[]> = {
  draft: [
    {
      label: 'Enviar a aprobación',
      icon: <Send className="h-4 w-4" />,
      color: '#f59e0b',
      hook: useSubmitPermit,
    },
  ],
  pending_approval: [
    {
      label: 'Aprobar',
      icon: <CheckCircle className="h-4 w-4" />,
      color: '#22c55e',
      hook: useApprovePermit,
    },
    {
      label: 'Rechazar',
      icon: <XCircle className="h-4 w-4" />,
      color: '#dc2626',
      hook: useRejectPermit,
    },
  ],
  approved: [
    {
      label: 'Activar',
      icon: <Play className="h-4 w-4" />,
      color: '#22c55e',
      hook: useActivatePermit,
    },
  ],
  active: [
    {
      label: 'Suspender',
      icon: <PauseCircle className="h-4 w-4" />,
      color: '#ea580c',
      hook: useSuspendPermit,
    },
    {
      label: 'Cerrar',
      icon: <XCircle className="h-4 w-4" />,
      color: '#6b7280',
      hook: useClosePermit,
    },
  ],
  suspended: [
    {
      label: 'Reactivar',
      icon: <Play className="h-4 w-4" />,
      color: '#22c55e',
      hook: useActivatePermit,
    },
    {
      label: 'Cerrar',
      icon: <XCircle className="h-4 w-4" />,
      color: '#6b7280',
      hook: useClosePermit,
    },
  ],
};

/* ── Workflow action button ──────────────────────────────── */
function WorkflowButton({
  config,
  permitId,
}: {
  config: TransitionConfig;
  permitId: string;
}) {
  const mutation = config.hook();
  return (
    <button
      type="button"
      onClick={() => mutation.mutate(permitId)}
      disabled={mutation.isPending}
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      style={{ backgroundColor: config.color }}
    >
      {mutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        config.icon
      )}
      {config.label}
    </button>
  );
}

/* ── Extension form ──────────────────────────────────────── */
function ExtensionForm({ permitId }: { permitId: string }) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const createExt = useCreateExtension();

  const handleSubmit = useCallback(() => {
    if (!endDate || !reason) return;
    createExt.mutate(
      { permitId, data: { new_end_datetime: endDate, reason } },
      { onSuccess: () => { setOpen(false); setEndDate(''); setReason(''); } },
    );
  }, [endDate, reason, permitId, createExt]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Plus className="h-3 w-3" />
        Solicitar extensión
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Nueva fecha fin
        </label>
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Razón</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createExt.isPending || !endDate || !reason}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {createExt.isPending ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : null}
          Enviar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ── QR Section ──────────────────────────────────────────── */
function QRSection({ permitId }: { permitId: string }) {
  const { data: qr, isLoading } = usePermitQR(permitId);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!qr) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <QrCode className="mx-auto h-16 w-16 text-primary mb-2" />
      <p className="text-xs text-muted-foreground mb-1">Escanear para validar</p>
      <p className="font-mono text-xs text-foreground break-all">{qr.validation_token.slice(0, 24)}…</p>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function PermitDetailPage() {
  const params = useParams();
  const permitId = params.id as string;
  const { data: permit, isLoading } = usePermit(permitId);
  const { data: extensions } = usePermitExtensions(permitId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!permit) {
    return <div className="text-center py-20 text-muted-foreground">Permiso no encontrado.</div>;
  }

  const statusCfg = PERMIT_STATUS_CONFIG[permit.status];
  const typeCfg = PERMIT_TYPE_CONFIG[permit.permit_type];
  const transitions = TRANSITIONS[permit.status] ?? [];
  const isExpired =
    permit.status === 'active' && new Date(permit.valid_until) < new Date();

  return (
    <div className="space-y-6">
      <Link
        href="/permits"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a permisos
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{permit.title}</h1>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
            >
              {isExpired ? 'Expirado' : statusCfg.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{permit.reference_number}</span>
            <span style={{ color: typeCfg.color }}>{typeCfg.label}</span>
          </div>
        </div>

        {/* QR */}
        <QRSection permitId={permitId} />
      </div>

      {/* Workflow actions */}
      {transitions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {transitions.map((t) => (
            <WorkflowButton key={t.label} config={t} permitId={permitId} />
          ))}
        </div>
      )}

      {/* Expired warning */}
      {isExpired && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4" />
          Este permiso ha expirado. Ciérrelo o solicite una extensión.
        </div>
      )}

      {/* Details grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left — info */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
              Información
            </h2>
            <p className="text-sm text-muted-foreground">{permit.description}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
              Vigencia
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                {new Date(permit.valid_from).toLocaleString('es-CL')}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground">
                {new Date(permit.valid_until).toLocaleString('es-CL')}
              </span>
            </div>
          </div>

          {/* Hazards */}
          {permit.hazards_identified && permit.hazards_identified.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
                Peligros identificados
              </h2>
              <div className="flex flex-wrap gap-2">
                {permit.hazards_identified.map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-500"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PPE */}
          {permit.ppe_required && permit.ppe_required.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
                EPP requerido
              </h2>
              <div className="flex flex-wrap gap-2">
                {permit.ppe_required.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-500"
                  >
                    <Shield className="inline h-3 w-3 mr-1" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — precautions, extensions */}
        <div className="space-y-4">
          {/* Precautions */}
          {permit.precautions && permit.precautions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
                Precauciones
              </h2>
              <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                {permit.precautions.map((pr) => (
                  <li key={pr}>{pr}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist data */}
          {permit.checklist_data && Object.keys(permit.checklist_data).length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
                Checklist completado
              </h2>
              <div className="space-y-1">
                {Object.entries(permit.checklist_data).map(([item, checked]) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    {checked ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extensions */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Extensiones
            </h2>
            {extensions?.length ? (
              <div className="space-y-2">
                {extensions.map((ext) => (
                  <div
                    key={ext.id}
                    className="rounded-lg border border-border bg-muted/20 p-3 text-sm"
                  >
                    <p className="text-foreground">
                      Nueva fecha fin:{' '}
                      <span className="font-medium">
                        {new Date(ext.new_end_datetime).toLocaleString('es-CL')}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{ext.reason}</p>
                    {ext.approved_at && (
                      <p className="text-xs text-green-500 mt-1">
                        Aprobado: {new Date(ext.approved_at).toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin extensiones.</p>
            )}

            {(permit.status === 'active' || permit.status === 'approved') && (
              <ExtensionForm permitId={permitId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
