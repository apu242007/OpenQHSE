'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Wrench, QrCode, Clock, Calendar, MapPin,
  Tag, FileText, Shield, Plus, Loader2, CheckCircle,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Download,
  Image as ImageIcon, Activity,
} from 'lucide-react';
import { useEquipment, useEquipmentInspections, useCreateInspection, useUpdateEquipment } from '@/hooks/use-equipment';
import {
  EQUIPMENT_STATUS_CONFIG,
  INSPECTION_RESULT_CONFIG,
} from '@/types/equipment';
import type { EquipmentStatus, InspectionResult } from '@/types/equipment';
import { cn, formatDate } from '@/lib/utils';

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showAllInspections, setShowAllInspections] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({
    inspected_at: new Date().toISOString().slice(0, 16),
    result: 'pass' as InspectionResult,
    notes: '',
    next_inspection_date: '',
  });

  const { data: equip, isLoading } = useEquipment(id);
  const { data: inspections = [] } = useEquipmentInspections(id);
  const createInspection = useCreateInspection();
  const updateEquipment = useUpdateEquipment();

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInspection.mutateAsync({
        equipmentId: id,
        data: {
          ...inspectionForm,
          inspected_at: new Date(inspectionForm.inspected_at).toISOString(),
          next_inspection_date: inspectionForm.next_inspection_date
            ? new Date(inspectionForm.next_inspection_date).toISOString()
            : null,
        },
      });
      setShowInspectionForm(false);
      setInspectionForm({
        inspected_at: new Date().toISOString().slice(0, 16),
        result: 'pass',
        notes: '',
        next_inspection_date: '',
      });
    } catch {
      // error handled
    }
  };

  const handleStatusChange = async (newStatus: EquipmentStatus) => {
    try {
      await updateEquipment.mutateAsync({ id, data: { status: newStatus } });
    } catch {
      // error handled
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!equip) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <Wrench className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Equipo no encontrado</p>
        <button type="button" onClick={() => router.push('/equipment')} className="text-sm text-primary hover:underline">
          Volver a equipos
        </button>
      </div>
    );
  }

  const statusConf = EQUIPMENT_STATUS_CONFIG[equip.status as EquipmentStatus];
  const isOverdue = equip.next_inspection_date && new Date(equip.next_inspection_date) < new Date();
  const certifications = equip.certifications as unknown as Array<Record<string, string>> ?? [];
  const documents = equip.documents as unknown as Array<Record<string, string>> ?? [];
  const visibleInspections = showAllInspections ? inspections : inspections.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => router.push('/equipment')}
          className="mt-1 rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{equip.code}</span>
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              statusConf?.bg, statusConf?.color,
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusConf?.dot)} />
              {statusConf?.label ?? equip.status}
            </span>
            {isOverdue && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Inspección vencida
              </span>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold">{equip.name}</h1>
          {equip.description && (
            <p className="mt-1 text-sm text-muted-foreground">{equip.description}</p>
          )}
        </div>
        {/* Quick status change */}
        <div className="flex items-center gap-2">
          {equip.status !== 'active' && (
            <button
              type="button"
              onClick={() => handleStatusChange('active')}
              className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              ✓ Operativo
            </button>
          )}
          {equip.status !== 'maintenance' && (
            <button
              type="button"
              onClick={() => handleStatusChange('maintenance')}
              className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
            >
              🔧 Mantenimiento
            </button>
          )}
          {equip.status !== 'out_of_service' && (
            <button
              type="button"
              onClick={() => handleStatusChange('out_of_service')}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              ✗ Fuera de servicio
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-1">
          {/* Photo */}
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            {equip.photo_url ? (
              <img src={equip.photo_url} alt={equip.name} className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* QR Code */}
          {equip.qr_code_url && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Código QR</span>
              </div>
              <div className="flex items-center gap-3">
                <img src={equip.qr_code_url} alt="QR Code" className="h-24 w-24 rounded border border-border" />
                <div className="text-xs text-muted-foreground">
                  <p>Escanea para ver este equipo</p>
                  <a href={equip.qr_code_url} download="qr_code.png"
                    className="mt-1 flex items-center gap-1 text-primary hover:underline">
                    <Download className="h-3 w-3" /> Imprimir QR
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Technical data */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Datos técnicos
            </h2>
            <InfoRow icon={Tag} label="Categoría" value={equip.category} />
            {equip.manufacturer && <InfoRow icon={Wrench} label="Fabricante" value={equip.manufacturer} />}
            {equip.model && <InfoRow icon={Tag} label="Modelo" value={equip.model} />}
            {equip.serial_number && <InfoRow icon={Tag} label="N° Serie" value={equip.serial_number} mono />}
            {equip.location && <InfoRow icon={MapPin} label="Ubicación" value={equip.location} />}
            {equip.purchase_date && (
              <InfoRow icon={Calendar} label="Fecha de compra" value={formatDate(equip.purchase_date)} />
            )}
            {equip.last_inspection_date && (
              <InfoRow icon={CheckCircle} label="Última inspección" value={formatDate(equip.last_inspection_date)} />
            )}
            {equip.next_inspection_date && (
              <InfoRow
                icon={Clock}
                label="Próxima inspección"
                value={formatDate(equip.next_inspection_date)}
                highlight={!!isOverdue}
                danger={!!isOverdue}
              />
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Quick inspection button */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Inspecciones ({inspections.length})</p>
                <p className="text-xs text-muted-foreground">Registra el estado del equipo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInspectionForm((v) => !v)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Nueva inspección
            </button>
          </div>

          {/* Inspection Form */}
          {showInspectionForm && (
            <form
              onSubmit={handleInspectionSubmit}
              className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
            >
              <h3 className="text-sm font-semibold">Registrar inspección</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Fecha y hora *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={inspectionForm.inspected_at}
                    onChange={(e) => setInspectionForm((f) => ({ ...f, inspected_at: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Resultado *
                  </label>
                  <select
                    required
                    value={inspectionForm.result}
                    onChange={(e) => setInspectionForm((f) => ({ ...f, result: e.target.value as InspectionResult }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="pass">Aprobado</option>
                    <option value="conditional">Condicional</option>
                    <option value="fail">Reprobado</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Observaciones
                  </label>
                  <textarea
                    value={inspectionForm.notes}
                    onChange={(e) => setInspectionForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Describe las condiciones encontradas..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Próxima inspección
                  </label>
                  <input
                    type="datetime-local"
                    value={inspectionForm.next_inspection_date}
                    onChange={(e) => setInspectionForm((f) => ({ ...f, next_inspection_date: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInspectionForm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createInspection.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  {createInspection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Guardar inspección
                </button>
              </div>
            </form>
          )}

          {/* Inspection History */}
          {inspections.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold">
                Historial de inspecciones
              </div>
              <div className="divide-y divide-border">
                {visibleInspections.map((insp) => {
                  const resultConf = INSPECTION_RESULT_CONFIG[insp.result as InspectionResult];
                  const findings = insp.findings as unknown as Array<Record<string, string>> ?? [];
                  return (
                    <div key={insp.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                            resultConf?.bg,
                          )}>
                            {insp.result === 'pass' ? (
                              <CheckCircle className={cn('h-4 w-4', resultConf?.color)} />
                            ) : insp.result === 'fail' ? (
                              <XCircle className={cn('h-4 w-4', resultConf?.color)} />
                            ) : (
                              <AlertTriangle className={cn('h-4 w-4', resultConf?.color)} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', resultConf?.bg, resultConf?.color)}>
                                {resultConf?.label ?? insp.result}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatDate(insp.inspected_at)}</span>
                            </div>
                            {insp.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">{insp.notes}</p>
                            )}
                            {findings.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {findings.map((f, fi) => (
                                  <div key={fi} className="flex items-start gap-1.5 text-xs">
                                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                                    <span>{String(f.description)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {insp.next_inspection_date && (
                          <div className="text-right text-xs text-muted-foreground">
                            <p>Próxima:</p>
                            <p className="font-medium">{formatDate(insp.next_inspection_date)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {inspections.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllInspections((v) => !v)}
                  className="flex w-full items-center justify-center gap-2 border-t border-border p-3 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  {showAllInspections ? (
                    <><ChevronUp className="h-3 w-3" /> Mostrar menos</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /> Ver todas ({inspections.length})</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Certificaciones y habilitaciones
              </h3>
              <div className="space-y-2">
                {certifications.map((cert, ci) => {
                  const expiry = cert.expiry_date ? new Date(cert.expiry_date) : null;
                  const isExpired = expiry && expiry < new Date();
                  const isExpiringSoon = expiry && !isExpired &&
                    expiry < new Date(Date.now() + 30 * 86400000);
                  return (
                    <div key={ci} className="flex items-start justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">{String(cert.name)}</p>
                        {cert.issuer && <p className="text-xs text-muted-foreground">{String(cert.issuer)}</p>}
                      </div>
                      <div className="text-right">
                        {cert.expiry_date && (
                          <p className={cn(
                            'text-xs font-medium',
                            isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground',
                          )}>
                            {isExpired ? '⚠ Vencido' : isExpiringSoon ? '⚠ Por vencer' : ''}
                            {cert.expiry_date ? ` ${formatDate(cert.expiry_date)}` : ''}
                          </p>
                        )}
                        {cert.file_url && (
                          <a href={String(cert.file_url)} target="_blank" rel="noreferrer"
                            className="text-xs text-primary hover:underline">
                            Ver certificado
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical Documents */}
          {documents.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Documentación técnica
              </h3>
              <div className="space-y-2">
                {documents.map((doc, di) => (
                  <a
                    key={di}
                    href={String(doc.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{String(doc.title)}</p>
                        {doc.type && <p className="text-xs text-muted-foreground">{String(doc.type)}</p>}
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
