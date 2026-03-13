'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import {
  useContractors,
  useCreateContractor,
  type Contractor,
} from '@/hooks/use-contractors';
import { cn } from '@/lib/utils';

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Contractor['status'], { label: string; className: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-700', icon: ShieldCheck },
  SUSPENDED: { label: 'Suspendido', className: 'bg-red-100 text-red-700', icon: ShieldAlert },
  BLACKLISTED: { label: 'Lista negra', className: 'bg-gray-800 text-white', icon: XCircle },
};

function StatusBadge({ status }: { status: Contractor['status'] }) {
  const { label, className, icon: Icon } = STATUS_STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function InsuranceBadge({ expiry }: { expiry: string | null }) {
  if (!expiry)
    return <span className="text-xs text-gray-400">Sin seguro</span>;
  const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0)
    return <span className="text-xs font-medium text-red-600">Vencido</span>;
  if (days <= 30)
    return <span className="text-xs font-medium text-amber-600">Vence en {days}d</span>;
  return <span className="text-xs text-green-600">Vigente</span>;
}

// ── Create Contractor Dialog ───────────────────────────────────────────────

function CreateContractorDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateContractor();
  const [form, setForm] = useState({
    name: '',
    rut_tax_id: '',
    country: 'CL',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      name: form.name,
      rut_tax_id: form.rut_tax_id || null,
      country: form.country,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Registrar Contratista</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Razón Social *</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">RUT / Tax ID</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.rut_tax_id}
                onChange={(e) => setForm({ ...form, rut_tax_id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">País</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                <option value="CL">🇨🇱 Chile</option>
                <option value="PE">🇵🇪 Perú</option>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="MX">🇲🇽 México</option>
                <option value="BR">🇧🇷 Brasil</option>
                <option value="AR">🇦🇷 Argentina</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre de contacto</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="tel"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
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
              disabled={create.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {create.isPending ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ContractorsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading } = useContractors(params.toString() || undefined);
  const contractors = data?.items ?? [];

  const stats = {
    total: data?.total ?? 0,
    approved: contractors.filter((c) => c.status === 'APPROVED').length,
    pending: contractors.filter((c) => c.status === 'PENDING').length,
    suspended: contractors.filter((c) => c.status === 'SUSPENDED').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratistas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestión de empresas contratistas y control de acceso
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Registrar Contratista
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Aprobados', value: stats.approved, color: 'text-green-600' },
          { label: 'Pendientes', value: stats.pending, color: 'text-amber-600' },
          { label: 'Suspendidos', value: stats.suspended, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={cn('mt-1 text-3xl font-bold', s.color)}>
              {isLoading ? '…' : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="APPROVED">Aprobado</option>
          <option value="SUSPENDED">Suspendido</option>
          <option value="BLACKLISTED">Lista negra</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando contratistas…</div>
        ) : contractors.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="mx-auto mb-2 h-10 w-10 text-gray-300" />
            <p className="text-gray-500">No se encontraron contratistas.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Registrar primer contratista
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trabajadores</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seguro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cumplimiento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contractors.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.rut_tax_id ?? c.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700">
                      <UserRound size={14} className="text-gray-400" />
                      <span>{c.active_worker_count}/{c.worker_count}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <InsuranceBadge expiry={c.insurance_expiry} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            c.compliance_pct >= 80
                              ? 'bg-green-500'
                              : c.compliance_pct >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500',
                          )}
                          style={{ width: `${c.compliance_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{c.compliance_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/contractors/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Ver <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateContractorDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
