/**
 * Action Detail page — timeline, status controls, escalation, verification.
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  User,
  MessageSquare,
  Send,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useAction, useActionTimeline, useAddProgress, useRequestVerification, useEscalateAction, useVerifyAction, useEffectivenessCheck } from '@/hooks/use-actions';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/actions';
import type { ActionPriority, ActionStatus, ActionUpdateEntry } from '@/types/actions';

/* ── Timeline Entry ─────────────────────────────────────────── */
function TimelineEntry({ entry }: { entry: ActionUpdateEntry }) {
  return (
    <div className="flex gap-3 border-l-2 border-border pl-4 pb-4">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {new Date(entry.created_at).toLocaleString('es-CL')}
          </span>
          {entry.status_change && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              → {entry.status_change}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-foreground">{entry.comment}</p>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function ActionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const actionId = params.id as string;
  const { data: action, isLoading } = useAction(actionId);
  const { data: timeline } = useActionTimeline(actionId);
  const addProgress = useAddProgress();
  const requestVerification = useRequestVerification();
  const escalateAction = useEscalateAction();
  const verifyAction = useVerifyAction();
  const effectivenessCheck = useEffectivenessCheck();

  const [comment, setComment] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!action) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Acción no encontrada.
      </div>
    );
  }

  const priorityCfg = PRIORITY_CONFIG[action.priority as ActionPriority];
  const statusCfg = STATUS_CONFIG[action.status as ActionStatus];
  const isOverdue =
    action.due_date &&
    new Date(action.due_date) < new Date() &&
    !['completed', 'verified'].includes(action.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        href="/actions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al tablero
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${statusCfg?.color ?? '#6b7280'}20`, color: statusCfg?.color ?? '#6b7280' }}
              >
                {statusCfg?.label ?? action.status}
              </span>
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${priorityCfg?.color ?? '#6b7280'}20`, color: priorityCfg?.color ?? '#6b7280' }}
              >
                {priorityCfg?.label ?? action.priority}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-1 rounded bg-red-600/20 px-2 py-0.5 text-xs font-medium text-red-500">
                  <AlertTriangle className="h-3 w-3" />
                  Vencida
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">{action.title}</h1>
            <p className="text-sm text-muted-foreground">{action.description}</p>
          </div>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Creada: {new Date(action.created_at).toLocaleDateString('es-CL')}
            </div>
            {action.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                <Clock className="h-3 w-3" />
                Vence: {new Date(action.due_date).toLocaleDateString('es-CL')}
              </div>
            )}
            {action.completed_at && (
              <div className="flex items-center gap-1 text-green-500">
                <CheckCircle className="h-3 w-3" />
                Completada: {new Date(action.completed_at).toLocaleDateString('es-CL')}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-4">
          <div>
            <span className="text-muted-foreground">Tipo</span>
            <p className="font-medium text-foreground">
              {action.action_type === 'corrective' ? 'Correctiva' : 'Preventiva'}
            </p>
          </div>
          {action.incident_id && (
            <div>
              <span className="text-muted-foreground">Incidente</span>
              <Link href={`/incidents/${action.incident_id}`} className="block font-medium text-primary hover:underline">
                Ver incidente
              </Link>
            </div>
          )}
          {action.verification_notes && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Notas de verificación</span>
              <p className="font-medium text-foreground">{action.verification_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {action.status === 'in_progress' && (
          <button
            onClick={() => requestVerification.mutate(action.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            <CheckCircle className="h-4 w-4" />
            Solicitar verificación
          </button>
        )}
        {action.status === 'completed' && (
          <button
            onClick={() => setShowVerification(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Verificar
          </button>
        )}
        <button
          onClick={() => setShowEscalation(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-600/30 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-600/10"
        >
          <TrendingUp className="h-4 w-4" />
          Escalar
        </button>
      </div>

      {/* Escalation form */}
      {showEscalation && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Escalar acción</h3>
          <textarea
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
            placeholder="Razón de la escalación..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                escalateAction.mutate({ id: action.id, data: { reason: escalationReason } });
                setShowEscalation(false);
                setEscalationReason('');
              }}
              disabled={!escalationReason.trim()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Escalar
            </button>
            <button
              onClick={() => setShowEscalation(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Verification form */}
      {showVerification && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Verificar acción</h3>
          <textarea
            value={verificationNotes}
            onChange={(e) => setVerificationNotes(e.target.value)}
            placeholder="Notas de verificación..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                verifyAction.mutate({ id: action.id, data: { notes: verificationNotes, is_effective: true } });
                setShowVerification(false);
                setVerificationNotes('');
              }}
              disabled={!verificationNotes.trim()}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              ✓ Efectiva
            </button>
            <button
              onClick={() => {
                verifyAction.mutate({ id: action.id, data: { notes: verificationNotes, is_effective: false } });
                setShowVerification(false);
                setVerificationNotes('');
              }}
              disabled={!verificationNotes.trim()}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              ✗ No efectiva
            </button>
            <button
              onClick={() => setShowVerification(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Historial</h2>

        {/* Add comment */}
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Agregar actualización..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && comment.trim()) {
                addProgress.mutate({ id: action.id, data: { comment } });
                setComment('');
              }
            }}
          />
          <button
            onClick={() => {
              if (comment.trim()) {
                addProgress.mutate({ id: action.id, data: { comment } });
                setComment('');
              }
            }}
            disabled={!comment.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Timeline entries */}
        <div className="space-y-0">
          {timeline && timeline.length > 0 ? (
            timeline.map((entry) => (
              <TimelineEntry key={entry.id} entry={entry} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay actualizaciones aún.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
