'use client';

import { useState } from 'react';
import {
  Search, GitBranch, Network, Shield, Binary, Loader2,
  ChevronRight, Plus, Trash2, CheckCircle2,
} from 'lucide-react';
import { useSubmitInvestigation } from '@/hooks/use-incidents';
import type {
  InvestigationMethodology, InvestigationData,
  FiveWhysData, IshikawaData, ICAMData, TripodBetaData, FaultTreeData, FaultTreeNode,
} from '@/types/incidents';
import { cn } from '@/lib/utils';

interface InvestigationWizardProps {
  incidentId: string;
  existingData?: InvestigationData;
}

const METHODOLOGIES: { key: InvestigationMethodology; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'five_whys', label: '5 Porqués', desc: 'Análisis de causa raíz iterativo', icon: Search },
  { key: 'ishikawa', label: 'Ishikawa (6M)', desc: 'Diagrama de causa-efecto', icon: GitBranch },
  { key: 'icam', label: 'ICAM', desc: 'Análisis de causa incidental', icon: Shield },
  { key: 'tripod_beta', label: 'Tripod Beta', desc: 'Fallas de barreras y precondiciones', icon: Network },
  { key: 'fault_tree', label: 'Árbol de fallas', desc: 'Análisis lógico top-down', icon: Binary },
];

export function InvestigationWizard({ incidentId, existingData }: InvestigationWizardProps) {
  const submitMutation = useSubmitInvestigation();
  const [methodology, setMethodology] = useState<InvestigationMethodology | null>(existingData?.methodology ?? null);
  const [data, setData] = useState<InvestigationData['data'] | null>(existingData?.data ?? null);

  const handleSubmit = async () => {
    if (!methodology || !data) return;
    await submitMutation.mutateAsync({
      id: incidentId,
      data: { investigation: { methodology, data, started_at: existingData?.started_at ?? new Date().toISOString(), completed_at: new Date().toISOString() } },
    });
  };

  // If no methodology selected, show selector
  if (!methodology) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Seleccionar metodología de investigación</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METHODOLOGIES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMethodology(m.key)}
              className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <m.icon className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setMethodology(null); setData(null); }}
            className="text-sm text-primary hover:underline"
          >
            ← Cambiar metodología
          </button>
          <span className="text-sm font-medium text-muted-foreground">|</span>
          <span className="text-sm font-semibold">{METHODOLOGIES.find((m) => m.key === methodology)?.label}</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitMutation.isPending || !data}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Guardar investigación
        </button>
      </div>

      {methodology === 'five_whys' && <FiveWhysDiagram data={data as FiveWhysData} onChange={setData} />}
      {methodology === 'ishikawa' && <IshikawaDiagram data={data as IshikawaData} onChange={setData} />}
      {methodology === 'icam' && <ICAMDiagram data={data as ICAMData} onChange={setData} />}
      {methodology === 'tripod_beta' && <TripodBetaDiagram data={data as TripodBetaData} onChange={setData} />}
      {methodology === 'fault_tree' && <FaultTreeDiagram data={data as FaultTreeData} onChange={setData} />}
    </div>
  );
}

/* ── 5 Whys ───────────────────────────────────────────────── */

function FiveWhysDiagram({ data, onChange }: { data: FiveWhysData | null; onChange: (d: FiveWhysData) => void }) {
  const state: FiveWhysData = data ?? { problem: '', whys: [{ question: '¿Por qué?', answer: '' }], root_cause: '' };

  const update = (patch: Partial<FiveWhysData>) => onChange({ ...state, ...patch });
  const addWhy = () => update({ whys: [...state.whys, { question: '¿Por qué?', answer: '' }] });
  const updateWhy = (idx: number, field: 'question' | 'answer', value: string) => {
    const whys = [...state.whys];
    const existing = whys[idx];
    if (existing) whys[idx] = { ...existing, [field]: value };
    update({ whys });
  };
  const removeWhy = (idx: number) => update({ whys: state.whys.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="fw-problem" className="mb-1 block text-sm font-medium">Problema / Evento</label>
        <input
          id="fw-problem"
          type="text"
          value={state.problem}
          onChange={(e) => update({ problem: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="Describa el problema o evento a analizar"
        />
      </div>

      <div className="space-y-3">
        {state.whys.map((w, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {idx + 1}
            </div>
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={w.answer}
                onChange={(e) => updateWhy(idx, 'answer', e.target.value)}
                placeholder={`Respuesta al ¿Por qué? #${idx + 1}`}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {state.whys.length > 1 && (
              <button type="button" onClick={() => removeWhy(idx)} className="mt-1 rounded p-1 text-muted-foreground hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {idx < state.whys.length - 1 && (
              <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addWhy} className="flex items-center gap-1 text-sm text-primary hover:underline">
        <Plus className="h-4 w-4" /> Agregar otro ¿Por qué?
      </button>

      <div>
        <label htmlFor="fw-root" className="mb-1 block text-sm font-medium">Causa raíz</label>
        <textarea
          id="fw-root"
          value={state.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
          placeholder="Conclusión de la causa raíz identificada"
        />
      </div>
    </div>
  );
}

/* ── Ishikawa (Fishbone 6M) ──────────────────────────────── */

const ISHIKAWA_CATEGORIES: { key: keyof IshikawaData['categories']; label: string; color: string }[] = [
  { key: 'man', label: 'Mano de obra', color: '#ef4444' },
  { key: 'machine', label: 'Máquina', color: '#3b82f6' },
  { key: 'method', label: 'Método', color: '#22c55e' },
  { key: 'material', label: 'Material', color: '#f59e0b' },
  { key: 'measurement', label: 'Medición', color: '#8b5cf6' },
  { key: 'environment', label: 'Medio ambiente', color: '#06b6d4' },
];

function IshikawaDiagram({ data, onChange }: { data: IshikawaData | null; onChange: (d: IshikawaData) => void }) {
  const state: IshikawaData = data ?? {
    effect: '', root_cause: '',
    categories: { man: [], machine: [], method: [], material: [], measurement: [], environment: [] },
  };

  const update = (patch: Partial<IshikawaData>) => onChange({ ...state, ...patch });
  const addCause = (cat: keyof IshikawaData['categories']) => {
    const categories = { ...state.categories, [cat]: [...state.categories[cat], ''] };
    update({ categories });
  };
  const updateCause = (cat: keyof IshikawaData['categories'], idx: number, value: string) => {
    const list = [...state.categories[cat]];
    list[idx] = value;
    update({ categories: { ...state.categories, [cat]: list } });
  };
  const removeCause = (cat: keyof IshikawaData['categories'], idx: number) => {
    update({ categories: { ...state.categories, [cat]: state.categories[cat].filter((_, i) => i !== idx) } });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ish-effect" className="mb-1 block text-sm font-medium">Efecto (problema)</label>
        <input
          id="ish-effect"
          type="text"
          value={state.effect}
          onChange={(e) => update({ effect: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="Describa el efecto observado"
        />
      </div>

      {/* SVG Fishbone preview */}
      <div className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-4">
        <svg viewBox="0 0 800 300" className="w-full" style={{ minWidth: 600 }}>
          {/* Main spine */}
          <line x1="50" y1="150" x2="750" y2="150" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          {/* Effect box */}
          <rect x="680" y="125" width="110" height="50" rx="6" className="fill-danger/20 stroke-danger" strokeWidth="2" />
          <text x="735" y="155" textAnchor="middle" className="fill-danger text-xs font-bold">{state.effect || 'Efecto'}</text>
          {/* Category branches */}
          {ISHIKAWA_CATEGORIES.map((cat, idx) => {
            const x = 100 + idx * 100;
            const top = idx % 2 === 0;
            const y1 = top ? 30 : 270;
            return (
              <g key={cat.key}>
                <line x1={x} y1={y1} x2={x + 50} y2={150} stroke={cat.color} strokeWidth="2" />
                <text x={x} y={top ? 20 : 290} textAnchor="middle" fill={cat.color} className="text-[10px] font-bold">
                  {cat.label}
                </text>
                {state.categories[cat.key].map((cause, ci) => (
                  <text key={ci} x={x - 10} y={top ? 40 + ci * 14 : 255 - ci * 14} className="text-[8px] fill-muted-foreground">
                    • {cause || '...'}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Category inputs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ISHIKAWA_CATEGORIES.map((cat) => (
          <div key={cat.key} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: cat.color }}>{cat.label}</span>
              <button type="button" onClick={() => addCause(cat.key)} className="text-xs text-primary hover:underline">+ Agregar</button>
            </div>
            <div className="space-y-1.5">
              {state.categories[cat.key].map((cause, ci) => (
                <div key={ci} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={cause}
                    onChange={(e) => updateCause(cat.key, ci, e.target.value)}
                    placeholder="Causa..."
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button" onClick={() => removeCause(cat.key, ci)} className="text-muted-foreground hover:text-danger">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {!state.categories[cat.key].length && (
                <p className="text-xs text-muted-foreground italic">Sin causas</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="ish-root" className="mb-1 block text-sm font-medium">Causa raíz</label>
        <textarea
          id="ish-root"
          value={state.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
    </div>
  );
}

/* ── ICAM ─────────────────────────────────────────────────── */

const ICAM_SECTIONS: { key: keyof Omit<ICAMData, 'root_cause'>; label: string; color: string }[] = [
  { key: 'absent_defenses', label: 'Defensas ausentes/fallidas', color: '#ef4444' },
  { key: 'individual_actions', label: 'Acciones individuales', color: '#f59e0b' },
  { key: 'task_conditions', label: 'Condiciones de la tarea', color: '#3b82f6' },
  { key: 'organizational_factors', label: 'Factores organizacionales', color: '#8b5cf6' },
];

function ICAMDiagram({ data, onChange }: { data: ICAMData | null; onChange: (d: ICAMData) => void }) {
  const state: ICAMData = data ?? { absent_defenses: [], individual_actions: [], task_conditions: [], organizational_factors: [], root_cause: '' };
  const update = (patch: Partial<ICAMData>) => onChange({ ...state, ...patch });

  const addItem = (key: keyof Omit<ICAMData, 'root_cause'>) => update({ [key]: [...state[key], ''] });
  const updateItem = (key: keyof Omit<ICAMData, 'root_cause'>, idx: number, value: string) => {
    const list = [...state[key]];
    list[idx] = value;
    update({ [key]: list });
  };
  const removeItem = (key: keyof Omit<ICAMData, 'root_cause'>, idx: number) => {
    update({ [key]: state[key].filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {ICAM_SECTIONS.map((sec) => (
          <div key={sec.key} className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: sec.color }}>{sec.label}</span>
              <button type="button" onClick={() => addItem(sec.key)} className="text-xs text-primary hover:underline">+ Agregar</button>
            </div>
            <div className="space-y-2">
              {state[sec.key].map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateItem(sec.key, idx, e.target.value)}
                    placeholder="Descripción..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button" onClick={() => removeItem(sec.key, idx)} className="text-muted-foreground hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!state[sec.key].length && <p className="text-xs text-muted-foreground italic">Sin elementos</p>}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="icam-root" className="mb-1 block text-sm font-medium">Causa raíz</label>
        <textarea
          id="icam-root"
          value={state.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
    </div>
  );
}

/* ── Tripod Beta ──────────────────────────────────────────── */

function TripodBetaDiagram({ data, onChange }: { data: TripodBetaData | null; onChange: (d: TripodBetaData) => void }) {
  const state: TripodBetaData = data ?? { event: '', barriers: [], preconditions: [], latent_failures: [], root_cause: '' };
  const update = (patch: Partial<TripodBetaData>) => onChange({ ...state, ...patch });

  const addBarrier = () => {
    const id = crypto.randomUUID().slice(0, 8);
    update({ barriers: [...state.barriers, { id, name: '', failed: false }] });
  };
  const updateBarrier = (id: string, patch: Partial<TripodBetaData['barriers'][0]>) => {
    update({ barriers: state.barriers.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  };
  const addPrecondition = (barrierId: string) => {
    const id = crypto.randomUUID().slice(0, 8);
    update({ preconditions: [...state.preconditions, { id, description: '', barrier_id: barrierId }] });
  };
  const addLatentFailure = (preconditionId: string) => {
    const id = crypto.randomUUID().slice(0, 8);
    update({ latent_failures: [...state.latent_failures, { id, description: '', precondition_id: preconditionId }] });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="tb-event" className="mb-1 block text-sm font-medium">Evento</label>
        <input
          id="tb-event"
          type="text"
          value={state.event}
          onChange={(e) => update({ event: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="Evento/incidente a analizar"
        />
      </div>

      {/* Barriers */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-danger">Barreras</span>
          <button type="button" onClick={addBarrier} className="text-xs text-primary hover:underline">+ Barrera</button>
        </div>
        <div className="space-y-3">
          {state.barriers.map((b) => {
            const precs = state.preconditions.filter((p) => p.barrier_id === b.id);
            return (
              <div key={b.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => updateBarrier(b.id, { name: e.target.value })}
                    placeholder="Nombre de la barrera"
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm outline-none"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={b.failed} onChange={(e) => updateBarrier(b.id, { failed: e.target.checked })} />
                    Falló
                  </label>
                </div>
                {b.failed && (
                  <input
                    type="text"
                    value={b.failure_reason ?? ''}
                    onChange={(e) => updateBarrier(b.id, { failure_reason: e.target.value })}
                    placeholder="Razón de la falla..."
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none"
                  />
                )}
                {/* Preconditions */}
                <div className="mt-2 ml-4 space-y-1">
                  {precs.map((p) => {
                    const lfs = state.latent_failures.filter((l) => l.precondition_id === p.id);
                    return (
                      <div key={p.id}>
                        <input
                          type="text"
                          value={p.description}
                          onChange={(e) => {
                            update({ preconditions: state.preconditions.map((pc) => (pc.id === p.id ? { ...pc, description: e.target.value } : pc)) });
                          }}
                          placeholder="Precondición..."
                          className="w-full rounded border border-border/50 bg-background px-2 py-1 text-xs outline-none"
                        />
                        {/* Latent failures */}
                        <div className="ml-4 mt-1 space-y-1">
                          {lfs.map((lf) => (
                            <input
                              key={lf.id}
                              type="text"
                              value={lf.description}
                              onChange={(e) => {
                                update({ latent_failures: state.latent_failures.map((l) => (l.id === lf.id ? { ...l, description: e.target.value } : l)) });
                              }}
                              placeholder="Falla latente..."
                              className="w-full rounded border border-border/30 bg-background px-2 py-1 text-xs outline-none"
                            />
                          ))}
                          <button type="button" onClick={() => addLatentFailure(p.id)} className="text-[10px] text-primary hover:underline">+ Falla latente</button>
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => addPrecondition(b.id)} className="text-[10px] text-primary hover:underline">+ Precondición</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="tb-root" className="mb-1 block text-sm font-medium">Causa raíz</label>
        <textarea
          id="tb-root"
          value={state.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
    </div>
  );
}

/* ── Fault Tree ───────────────────────────────────────────── */

function FaultTreeDiagram({ data, onChange }: { data: FaultTreeData | null; onChange: (d: FaultTreeData) => void }) {
  const state: FaultTreeData = data ?? {
    top_event: '',
    tree: { id: '1', label: 'Evento principal', type: 'event', children: [] },
    root_cause: '',
  };
  const update = (patch: Partial<FaultTreeData>) => onChange({ ...state, ...patch });

  const addChild = (parentId: string, type: FaultTreeNode['type']) => {
    const newNode: FaultTreeNode = { id: crypto.randomUUID().slice(0, 8), label: '', type, children: type === 'basic_event' ? undefined : [] };
    const addToTree = (node: FaultTreeNode): FaultTreeNode => {
      if (node.id === parentId) return { ...node, children: [...(node.children ?? []), newNode] };
      return { ...node, children: node.children?.map(addToTree) };
    };
    update({ tree: addToTree(state.tree) });
  };

  const updateLabel = (nodeId: string, label: string) => {
    const updateNode = (node: FaultTreeNode): FaultTreeNode => {
      if (node.id === nodeId) return { ...node, label };
      return { ...node, children: node.children?.map(updateNode) };
    };
    update({ tree: updateNode(state.tree) });
  };

  const renderNode = (node: FaultTreeNode, depth = 0): React.ReactNode => {
    const gateSymbol = node.type === 'and_gate' ? 'AND' : node.type === 'or_gate' ? 'OR' : node.type === 'basic_event' ? '●' : '◇';
    const borderColor = node.type === 'and_gate' ? 'border-blue-500' : node.type === 'or_gate' ? 'border-amber-500' : node.type === 'basic_event' ? 'border-red-500' : 'border-border';

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div className={cn('rounded-lg border-2 p-2 text-center', borderColor)} style={{ minWidth: 120 }}>
          <span className="mb-1 block text-[10px] font-bold text-muted-foreground">{gateSymbol}</span>
          <input
            type="text"
            value={node.label}
            onChange={(e) => updateLabel(node.id, e.target.value)}
            placeholder="Descripción..."
            className="w-full bg-transparent text-center text-xs outline-none"
          />
          {node.type !== 'basic_event' && (
            <div className="mt-1 flex justify-center gap-1">
              <button type="button" onClick={() => addChild(node.id, 'and_gate')} className="text-[9px] text-blue-500 hover:underline">+AND</button>
              <button type="button" onClick={() => addChild(node.id, 'or_gate')} className="text-[9px] text-amber-500 hover:underline">+OR</button>
              <button type="button" onClick={() => addChild(node.id, 'basic_event')} className="text-[9px] text-red-500 hover:underline">+Básico</button>
            </div>
          )}
        </div>
        {node.children && node.children.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex gap-4">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ft-top" className="mb-1 block text-sm font-medium">Evento principal (Top Event)</label>
        <input
          id="ft-top"
          type="text"
          value={state.top_event}
          onChange={(e) => update({ top_event: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="Evento no deseado a analizar"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-muted/20 p-6">
        {renderNode(state.tree)}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-blue-500" /> AND Gate</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-amber-500" /> OR Gate</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-red-500" /> Evento básico</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-border" /> Evento intermedio</span>
      </div>

      <div>
        <label htmlFor="ft-root" className="mb-1 block text-sm font-medium">Causa raíz</label>
        <textarea
          id="ft-root"
          value={state.root_cause}
          onChange={(e) => update({ root_cause: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
    </div>
  );
}
