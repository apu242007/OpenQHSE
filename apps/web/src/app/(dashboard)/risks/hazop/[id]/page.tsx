/**
 * HAZOP Study Detail — worksheet with nodes and inline editing.
 */

'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  FileText,
  Users,
  AlertTriangle,
  Shield,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useHazopStudy, useCreateHazopNode } from '@/hooks/use-risks';
import { HAZOP_GUIDE_WORDS } from '@/types/risks';
import type { HazopNode } from '@/types/risks';

function NodeRow({ node, index }: { node: HazopNode; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border">
      {/* Summary row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex-1">
          <span className="text-sm font-medium text-foreground">{node.node_name}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="rounded bg-violet-600/10 px-1.5 py-0.5 text-xs font-medium text-violet-400">
            {node.guide_word}
          </span>
          <span className="mx-2 text-muted-foreground">—</span>
          <span className="text-xs text-muted-foreground">{node.deviation}</span>
        </div>
        {node.risk_rating != null && (
          <span
            className="rounded px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: node.risk_rating > 15 ? '#dc262620' : node.risk_rating > 9 ? '#ea580c20' : '#22c55e20',
              color: node.risk_rating > 15 ? '#dc2626' : node.risk_rating > 9 ? '#ea580c' : '#22c55e',
            }}
          >
            R: {node.risk_rating}
          </span>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="grid gap-4 bg-muted/10 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <FileText className="h-3 w-3" /> Intención de diseño
            </h4>
            <p className="text-sm text-foreground">{node.design_intent}</p>
          </div>
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> Causas
            </h4>
            {Array.isArray(node.causes) ? (
              <ul className="list-disc pl-4 text-sm text-foreground">
                {node.causes.map((c, i) => (
                  <li key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <AlertTriangle className="h-3 w-3" /> Consecuencias
            </h4>
            {Array.isArray(node.consequences) ? (
              <ul className="list-disc pl-4 text-sm text-foreground">
                {node.consequences.map((c, i) => (
                  <li key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Shield className="h-3 w-3" /> Salvaguardas
            </h4>
            {Array.isArray(node.safeguards) ? (
              <ul className="list-disc pl-4 text-sm text-foreground">
                {node.safeguards.map((s, i) => (
                  <li key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Lightbulb className="h-3 w-3" /> Recomendaciones
            </h4>
            {Array.isArray(node.recommendations) ? (
              <ul className="list-disc pl-4 text-sm text-foreground">
                {node.recommendations.map((r, i) => (
                  <li key={i}>{typeof r === 'string' ? r : JSON.stringify(r)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HazopDetailPage() {
  const params = useParams();
  const studyId = params.id as string;
  const { data: study, isLoading } = useHazopStudy(studyId);
  const createNode = useCreateHazopNode();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    node_name: '',
    design_intent: '',
    guide_word: 'NO' as string,
    deviation: '',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!study) {
    return <div className="text-center py-20 text-muted-foreground">Estudio no encontrado.</div>;
  }

  const handleAddNode = () => {
    createNode.mutate({
      studyId: study.id,
      data: { study_id: study.id, ...form },
    });
    setForm({ node_name: '', design_intent: '', guide_word: 'NO', deviation: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/risks/hazop"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a HAZOP
      </Link>

      {/* Study header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{study.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{study.system_description}</p>
          </div>
          <span
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: study.status === 'approved' ? '#22c55e20' : '#3b82f620',
              color: study.status === 'approved' ? '#22c55e' : '#3b82f6',
            }}
          >
            {study.status}
          </span>
        </div>
        {study.team_members && Array.isArray(study.team_members) && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            Equipo: {study.team_members.map((m) => m.name).join(', ')}
          </div>
        )}
      </div>

      {/* Nodes */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            Nodos ({study.nodes?.length ?? 0})
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" />
            Agregar nodo
          </button>
        </div>

        {/* Quick add form */}
        {showForm && (
          <div className="border-b border-border bg-muted/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="text"
                placeholder="Nombre del nodo"
                value={form.node_name}
                onChange={(e) => setForm({ ...form, node_name: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Intención de diseño"
                value={form.design_intent}
                onChange={(e) => setForm({ ...form, design_intent: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <select
                value={form.guide_word}
                onChange={(e) => setForm({ ...form, guide_word: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {HAZOP_GUIDE_WORDS.map((gw) => (
                  <option key={gw} value={gw}>{gw}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Desviación"
                value={form.deviation}
                onChange={(e) => setForm({ ...form, deviation: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAddNode}
                disabled={!form.node_name || !form.design_intent || !form.deviation}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Agregar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Node list */}
        {study.nodes && study.nodes.length > 0 ? (
          study.nodes.map((node, idx) => (
            <NodeRow key={node.id} node={node} index={idx} />
          ))
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No hay nodos aún. Agrega el primer nodo al estudio.
          </div>
        )}
      </div>
    </div>
  );
}
