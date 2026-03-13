'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  FileText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import {
  useContractor,
  useContractorWorkers,
  useContractorCompliance,
  useApproveContractor,
  useSuspendContractor,
  useReactivateContractor,
  useAddWorker,
  useRecordInduction,
  type ContractorWorker,
} from '@/hooks/use-contractors';
import { cn } from '@/lib/utils';

type Tab = 'info' | 'documents' | 'workers' | 'compliance';

// ── AddWorker Dialog ───────────────────────────────────────────────────────

function AddWorkerDialog({ contractorId, onClose }: { contractorId: string; onClose: () => void }) {
  const add = useAddWorker(contractorId);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    position: '',
    induction_completed: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await add.mutateAsync({
      first_name: form.first_name,
      last_name: form.last_name,
      id_number: form.id_number,
      position: form.position || null,
      induction_completed: form.induction_completed,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Agregar Trabajador</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre *</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Apellido *</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">RUT / ID *</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.id_number}
              onChange={(e) => setForm({ ...form, id_number: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="inducted"
              checked={form.induction_completed}
              onChange={(e) => setForm({ ...form, induction_completed: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="inducted" className="text-sm text-gray-700">Inducción completada</label>
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
              disabled={add.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {add.isPending ? 'Agregando…' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Workers Tab ────────────────────────────────────────────────────────────

function WorkersTab({ contractorId }: { contractorId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: workers = [], isLoading } = useContractorWorkers(contractorId);
  const recordInduction = useRecordInduction(contractorId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">{workers.length} trabajadores registrados</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserRound size={14} />
          Agregar
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : workers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay trabajadores registrados</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUT / ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inducción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workers.map((w: ContractorWorker) => (
                <tr key={w.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {w.first_name} {w.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{w.id_number}</td>
                  <td className="px-4 py-3 text-gray-600">{w.position ?? '—'}</td>
                  <td className="px-4 py-3">
                    {w.induction_completed ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle size={12} />
                        Completada
                      </span>
                    ) : (
                      <button
                        onClick={() => recordInduction.mutate(w.id)}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
                      >
                        <ShieldAlert size={12} />
                        Pendiente
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {w.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddWorkerDialog contractorId={contractorId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ── Compliance Tab ─────────────────────────────────────────────────────────

function ComplianceTab({ contractorId }: { contractorId: string }) {
  const { data: report, isLoading } = useContractorCompliance(contractorId);

  if (isLoading) return <p className="text-sm text-gray-500">Cargando reporte…</p>;
  if (!report) return null;

  const scoreColor =
    report.compliance_score >= 80
      ? 'text-green-600'
      : report.compliance_score >= 50
        ? 'text-amber-600'
        : 'text-red-600';

  const insColor =
    report.insurance_status === 'valid'
      ? 'text-green-600 bg-green-100'
      : report.insurance_status === 'expiring_soon'
        ? 'text-amber-600 bg-amber-100'
        : 'text-red-600 bg-red-100';

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="flex items-center gap-6 rounded-xl bg-gray-50 p-5">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Score de Cumplimiento</p>
          <p className={cn('text-5xl font-bold', scoreColor)}>{report.compliance_score}</p>
          <p className="text-xs text-gray-400">/100</p>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          {[
            { label: 'Trabajadores activos', value: `${report.active_workers}/${report.total_workers}` },
            { label: 'Inducción', value: `${report.induction_pct}%` },
            { label: 'Cert. vigentes', value: report.certifications_valid },
            { label: 'Cert. por vencer', value: report.certifications_expiring },
            { label: 'Incidentes YTD', value: report.incident_count_ytd },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-lg font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insurance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Seguro de Responsabilidad</h3>
        <div className="rounded-xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {report.insurance_expiry
                ? `Vence: ${new Date(report.insurance_expiry).toLocaleDateString('es-CL')}`
                : 'Sin seguro registrado'}
            </p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', insColor)}>
            {report.insurance_status === 'valid'
              ? 'Vigente'
              : report.insurance_status === 'expiring_soon'
                ? 'Por vencer'
                : report.insurance_status === 'expired'
                  ? 'Vencido'
                  : 'Sin seguro'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ContractorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  const { data: contractor, isLoading } = useContractor(params.id);
  const approve = useApproveContractor();
  const suspend = useSuspendContractor();
  const reactivate = useReactivateContractor();

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Cargando contratista…</p>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">Contratista no encontrado.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Información', icon: Building2 },
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'workers', label: 'Personal', icon: Users },
    { id: 'compliance', label: 'Cumplimiento', icon: ShieldCheck },
  ];

  async function handleSuspend() {
    if (!suspendReason.trim()) return;
    await suspend.mutateAsync({ id: contractor!.id, reason: suspendReason });
    setShowSuspendModal(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Back + header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Volver
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Building2 size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{contractor.name}</h1>
              <p className="text-sm text-gray-500">
                {contractor.rut_tax_id ?? 'Sin RUT'} · {contractor.country}
              </p>
            </div>
          </div>
          {/* Status actions */}
          <div className="flex gap-2">
            {contractor.status === 'PENDING' && (
              <button
                onClick={() => approve.mutate(contractor.id)}
                disabled={approve.isPending}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                <ShieldCheck size={15} />
                Aprobar
              </button>
            )}
            {contractor.status === 'APPROVED' && (
              <button
                onClick={() => setShowSuspendModal(true)}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <ShieldAlert size={15} />
                Suspender
              </button>
            )}
            {contractor.status === 'SUSPENDED' && (
              <button
                onClick={() => reactivate.mutate(contractor.id)}
                disabled={reactivate.isPending}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <RefreshCw size={15} />
                Reactivar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'info' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: 'Estado', value: contractor.status },
              { label: 'País', value: contractor.country },
              { label: 'Contacto', value: contractor.contact_name ?? '—' },
              { label: 'Email', value: contractor.contact_email ?? '—' },
              { label: 'Teléfono', value: contractor.contact_phone ?? '—' },
              {
                label: 'Seguro (vence)',
                value: contractor.insurance_expiry
                  ? new Date(contractor.insurance_expiry).toLocaleDateString('es-CL')
                  : '—',
              },
              {
                label: 'Aprobado por',
                value: contractor.approved_by
                  ? `${new Date(contractor.approved_at!).toLocaleDateString('es-CL')}`
                  : 'No aprobado',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{item.value}</p>
              </div>
            ))}
            {contractor.suspension_reason && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100 sm:col-span-2">
                <p className="text-xs font-medium text-red-600">Motivo de suspensión</p>
                <p className="mt-1 text-sm text-red-700">{contractor.suspension_reason}</p>
              </div>
            )}
          </div>
        )}
        {tab === 'documents' && (
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              Gestión de documentos disponible próximamente.
            </p>
          </div>
        )}
        {tab === 'workers' && <WorkersTab contractorId={contractor.id} />}
        {tab === 'compliance' && <ComplianceTab contractorId={contractor.id} />}
      </div>

      {/* Suspend modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Suspender Contratista</h2>
            <p className="mb-3 text-sm text-gray-600">
              Ingresa el motivo de la suspensión (mínimo 10 caracteres):
            </p>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Motivo de la suspensión…"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspendReason.trim().length < 10 || suspend.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {suspend.isPending ? 'Suspendiendo…' : 'Confirmar Suspensión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
