'use client';

import { useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle,
  Circle,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  useKPIAlertRules,
  useKPIAlerts,
  useCreateKPIAlertRule,
  useUpdateKPIAlertRule,
  useDeleteKPIAlertRule,
  useAcknowledgeKPIAlert,
  useResolveKPIAlert,
  KPI_NAME_LABELS,
  ALERT_CONDITION_LABELS,
  ALERT_STATUS_COLOR,
  ALERT_SEVERITY_COLOR,
  type KPIAlertRule,
  type KPIAlert,
  type KPIName,
  type AlertCondition,
  type AlertPeriod,
} from '@/hooks/use-kpi-alerts';
import { cn } from '@/lib/utils';

const KPI_NAMES: KPIName[] = [
  'TRIR', 'LTIF', 'DART', 'FAR', 'SEVERITY_RATE',
  'ACTIONS_OVERDUE', 'ACTIONS_OPEN', 'INSPECTIONS_OVERDUE',
  'TRAINING_COMPLIANCE', 'PERMIT_COMPLIANCE', 'NEAR_MISS_RATE',
  'OBSERVATION_RATE', 'CONTRACTOR_INCIDENTS',
];

const CONDITIONS: AlertCondition[] = [
  'GREATER_THAN', 'LESS_THAN', 'EQUALS',
  'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL',
];

const PERIODS: AlertPeriod[] = ['REAL_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'];

// ── Rule Form Dialog ───────────────────────────────────────────────────────

function RuleFormDialog({
  rule,
  onClose,
}: {
  rule?: KPIAlertRule;
  onClose: () => void;
}) {
  const create = useCreateKPIAlertRule();
  const update = useUpdateKPIAlertRule();
  const isEdit = !!rule;

  const [form, setForm] = useState({
    name: rule?.name ?? '',
    description: rule?.description ?? '',
    kpi_name: rule?.kpi_name ?? ('TRIR' as KPIName),
    condition: rule?.condition ?? ('GREATER_THAN' as AlertCondition),
    threshold: rule?.threshold ?? 0,
    period: rule?.period ?? ('MONTHLY' as AlertPeriod),
    channels_email: rule?.channels?.email ?? true,
    channels_in_app: rule?.channels?.in_app ?? true,
    is_active: rule?.is_active ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description || null,
      kpi_name: form.kpi_name,
      condition: form.condition,
      threshold: Number(form.threshold),
      period: form.period,
      channels: { email: form.channels_email, in_app: form.channels_in_app },
      is_active: form.is_active,
    };
    if (isEdit && rule) {
      await update.mutateAsync({ id: rule.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  }

  const pending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {isEdit ? 'Editar Regla de Alerta' : 'Nueva Regla de Alerta KPI'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">KPI</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.kpi_name}
                onChange={(e) => setForm({ ...form, kpi_name: e.target.value as KPIName })}
              >
                {KPI_NAMES.map((k) => (
                  <option key={k} value={k}>
                    {KPI_NAME_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Condición</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as AlertCondition })}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {ALERT_CONDITION_LABELS[c]} ({c.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Umbral</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Período</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value as AlertPeriod })}
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canales de notificación</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.channels_email}
                  onChange={(e) => setForm({ ...form, channels_email: e.target.checked })}
                  className="rounded"
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.channels_in_app}
                  onChange={(e) => setForm({ ...form, channels_in_app: e.target.checked })}
                  className="rounded"
                />
                In-app
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Regla activa
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear Regla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Acknowledge Dialog ─────────────────────────────────────────────────────

function AckDialog({ alert, onClose }: { alert: KPIAlert; onClose: () => void }) {
  const ack = useAcknowledgeKPIAlert();
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await ack.mutateAsync({ id: alert.id, notes: notes || undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Reconocer Alerta</h2>
        <p className="mb-4 text-sm text-gray-600">
          KPI: <span className="font-medium">{KPI_NAME_LABELS[alert.kpi_name]}</span> — Valor:{' '}
          <span className="font-medium">{alert.current_value}</span> / Umbral:{' '}
          <span className="font-medium">{alert.threshold_value}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Acciones tomadas, comentarios…"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={ack.isPending}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {ack.isPending ? 'Procesando…' : 'Reconocer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function KPIAlertsPage() {
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editRule, setEditRule] = useState<KPIAlertRule | undefined>();
  const [ackAlert, setAckAlert] = useState<KPIAlert | undefined>();

  const rulesQuery = useKPIAlertRules();
  const alertsQuery = useKPIAlerts('status=TRIGGERED');
  const deleteRule = useDeleteKPIAlertRule();
  const resolveAlert = useResolveKPIAlert();

  const triggeredCount = alertsQuery.data?.filter((a) => a.status === 'TRIGGERED').length ?? 0;

  function handleDeleteRule(id: string) {
    if (confirm('¿Eliminar esta regla de alerta?')) {
      deleteRule.mutate(id);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas KPI</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configuración de umbrales y monitoreo de indicadores críticos
          </p>
        </div>
        {tab === 'rules' && (
          <button
            onClick={() => {
              setEditRule(undefined);
              setShowRuleForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Nueva Regla
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Alertas Activas</p>
          <p className={cn('mt-1 text-3xl font-bold', triggeredCount > 0 ? 'text-red-600' : 'text-green-600')}>
            {alertsQuery.isLoading ? '…' : triggeredCount}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Reglas Configuradas</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {rulesQuery.isLoading ? '…' : (rulesQuery.data?.length ?? 0)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Reglas Activas</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">
            {rulesQuery.isLoading ? '…' : (rulesQuery.data?.filter((r) => r.is_active).length ?? 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setTab('alerts')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'alerts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
          )}
        >
          Alertas Disparadas
          {triggeredCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
              {triggeredCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('rules')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'rules' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
          )}
        >
          Reglas de Alerta
        </button>
      </div>

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alertsQuery.isLoading && (
            <p className="text-sm text-gray-500">Cargando alertas…</p>
          )}
          {!alertsQuery.isLoading && (alertsQuery.data?.length ?? 0) === 0 && (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm border border-gray-100">
              <CheckCircle className="mx-auto mb-2 h-10 w-10 text-green-400" />
              <p className="text-gray-600">No hay alertas activas. Todos los KPIs están dentro de los umbrales.</p>
            </div>
          )}
          {alertsQuery.data?.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'rounded-xl border bg-white p-4 shadow-sm',
                ALERT_SEVERITY_COLOR[alert.severity],
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ALERT_STATUS_COLOR[alert.status])}>
                      {alert.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.triggered_at).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{KPI_NAME_LABELS[alert.kpi_name]}</p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    Valor actual: <strong>{alert.current_value}</strong>{' '}
                    {ALERT_CONDITION_LABELS[alert.condition]}{' '}
                    umbral: <strong>{alert.threshold_value}</strong>
                  </p>
                  {alert.notes && (
                    <p className="mt-1 text-xs text-gray-500">{alert.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {alert.status === 'TRIGGERED' && (
                    <button
                      onClick={() => setAckAlert(alert)}
                      className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                    >
                      <Circle size={12} />
                      Reconocer
                    </button>
                  )}
                  {(alert.status === 'TRIGGERED' || alert.status === 'ACKNOWLEDGED') && (
                    <button
                      onClick={() => resolveAlert.mutate(alert.id)}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      <CheckCircle size={12} />
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules Tab */}
      {tab === 'rules' && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          {rulesQuery.isLoading ? (
            <p className="p-6 text-sm text-gray-500">Cargando reglas…</p>
          ) : (rulesQuery.data?.length ?? 0) === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-gray-500">No hay reglas configuradas aún.</p>
              <button
                onClick={() => setShowRuleForm(true)}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Crear primera regla
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KPI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rulesQuery.data?.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{rule.name}</p>
                      {rule.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{rule.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{KPI_NAME_LABELS[rule.kpi_name]}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {ALERT_CONDITION_LABELS[rule.condition]} {rule.threshold}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{rule.period}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          rule.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {rule.is_active ? <Bell size={10} /> : <BellOff size={10} />}
                        {rule.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditRule(rule);
                            setShowRuleForm(true);
                          }}
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Dialogs */}
      {showRuleForm && (
        <RuleFormDialog
          rule={editRule}
          onClose={() => {
            setShowRuleForm(false);
            setEditRule(undefined);
          }}
        />
      )}
      {ackAlert && (
        <AckDialog alert={ackAlert} onClose={() => setAckAlert(undefined)} />
      )}
    </div>
  );
}
