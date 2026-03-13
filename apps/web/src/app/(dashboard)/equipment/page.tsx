'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench, Search, Plus, Filter, QrCode, Loader2, Eye,
  AlertTriangle, Clock, CheckCircle, XCircle, Activity,
} from 'lucide-react';
import { useEquipmentList } from '@/hooks/use-equipment';
import { EQUIPMENT_STATUS_CONFIG } from '@/types/equipment';
import type { EquipmentStatus } from '@/types/equipment';
import { cn, formatDate } from '@/lib/utils';

const CATEGORIES = [
  'Vehículos', 'Herramientas', 'EPP', 'Maquinaria', 'Instrumentos',
  'Extintores', 'Escaleras', 'Andamios', 'Grúas', 'Otro',
];

export default function EquipmentPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [qrMode, setQrMode] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const qrRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (categoryFilter) params.set('category', categoryFilter);
  if (statusFilter) params.set('equip_status', statusFilter);

  const { data: equipment = [], isLoading } = useEquipmentList(params.toString() || undefined);

  const statusCounts = equipment.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleQrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    router.push(`/equipment/by-code/${encodeURIComponent(qrInput.trim())}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Equipos</h1>
          <p className="text-sm text-muted-foreground">Registro, inspecciones y certificaciones de activos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setQrMode((v) => !v); setTimeout(() => qrRef.current?.focus(), 100); }}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors',
              qrMode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-muted',
            )}
          >
            <QrCode className="h-4 w-4" /> Buscar por QR
          </button>
          <button
            type="button"
            onClick={() => router.push('/equipment/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Registrar equipo
          </button>
        </div>
      </div>

      {/* QR Scanner Input */}
      {qrMode && (
        <form onSubmit={handleQrSearch} className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 p-4">
          <QrCode className="h-5 w-5 shrink-0 text-primary" />
          <input
            ref={qrRef}
            type="text"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Escanea o ingresa el código QR del equipo..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Buscar
          </button>
        </form>
      )}

      {/* Status KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(Object.entries(EQUIPMENT_STATUS_CONFIG) as [EquipmentStatus, typeof EQUIPMENT_STATUS_CONFIG[EquipmentStatus]][]).map(
          ([key, conf]) => {
            const icons: Record<EquipmentStatus, React.ElementType> = {
              active: CheckCircle,
              maintenance: Wrench,
              out_of_service: XCircle,
              decommissioned: AlertTriangle,
            };
            const Icon = icons[key];
            const count = statusCounts[key] ?? 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all hover:shadow-md',
                  statusFilter === key ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', conf.dot)} />
                  <span className="text-xs text-muted-foreground">{conf.label}</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{count}</p>
              </button>
            );
          },
        )}
      </div>

      {/* Upcoming inspections alert */}
      {equipment.filter((e) => {
        if (!e.next_inspection_date) return false;
        const days = Math.ceil((new Date(e.next_inspection_date).getTime() - Date.now()) / 86400000);
        return days <= 7 && days >= 0;
      }).length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Inspecciones próximas esta semana
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-500">
              {equipment.filter((e) => {
                if (!e.next_inspection_date) return false;
                const days = Math.ceil((new Date(e.next_inspection_date).getTime() - Date.now()) / 86400000);
                return days <= 7 && days >= 0;
              }).length} equipos requieren inspección en los próximos 7 días
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filtrar por categoría"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por estado"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(EQUIPMENT_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !equipment.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Wrench className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No hay equipos registrados</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {equipment.map((equip) => {
            const statusConf = EQUIPMENT_STATUS_CONFIG[equip.status as EquipmentStatus];
            const hasInspectionSoon = equip.next_inspection_date &&
              Math.ceil((new Date(equip.next_inspection_date).getTime() - Date.now()) / 86400000) <= 14;
            const isOverdue = equip.next_inspection_date && new Date(equip.next_inspection_date) < new Date();

            return (
              <button
                key={equip.id}
                type="button"
                onClick={() => router.push(`/equipment/${equip.id}`)}
                className="group rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
              >
                {/* Photo */}
                <div className="relative h-36 w-full bg-muted">
                  {equip.photo_url ? (
                    <img
                      src={equip.photo_url}
                      alt={equip.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Wrench className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <div className="absolute bottom-2 left-2">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      statusConf?.bg, statusConf?.color,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusConf?.dot)} />
                      {statusConf?.label ?? equip.status}
                    </span>
                  </div>
                  {isOverdue && (
                    <div className="absolute top-2 right-2">
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                        Vencido
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="font-mono text-xs text-muted-foreground">{equip.code}</p>
                  <h3 className="mt-0.5 font-semibold leading-tight group-hover:text-primary transition-colors">
                    {equip.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{equip.category}</p>
                  {equip.location && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{equip.location}</p>
                  )}
                  {equip.next_inspection_date && (
                    <div className={cn(
                      'mt-2 flex items-center gap-1 text-xs',
                      isOverdue ? 'text-red-600' : hasInspectionSoon ? 'text-amber-600' : 'text-muted-foreground',
                    )}>
                      <Clock className="h-3 w-3" />
                      Próx. inspección: {formatDate(equip.next_inspection_date)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
