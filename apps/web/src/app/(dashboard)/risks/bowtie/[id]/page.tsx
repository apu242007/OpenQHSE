/**
 * Bow-Tie Detail — interactive SVG diagram with threats, barriers, consequences.
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, AlertTriangle, Zap } from 'lucide-react';
import { useBowTie } from '@/hooks/use-risks';
import type { BowTieThreat, BowTieConsequence, BowTieBarrier } from '@/types/risks';

/* ── Helpers ─────────────────────────────────────────────────── */
const BARRIER_COLORS: Record<string, string> = {
  prevention: '#3b82f6',
  mitigation: '#8b5cf6',
};

const EFFECTIVENESS_COLORS: Record<string, string> = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#dc2626',
};

/* ── SVG BowTie Diagram ─────────────────────────────────────── */
function BowTieDiagram({
  topEvent,
  hazard,
  threats,
  consequences,
  preventionBarriers,
  mitigationBarriers,
}: {
  topEvent: string;
  hazard: string;
  threats: BowTieThreat[];
  consequences: BowTieConsequence[];
  preventionBarriers: BowTieBarrier[];
  mitigationBarriers: BowTieBarrier[];
}) {
  const width = 1200;
  const centerX = width / 2;
  const centerY = 250;
  const topEventWidth = 160;
  const topEventHeight = 80;
  const threatX = 80;
  const consequenceX = width - 80;
  const barrierLeftX = centerX - 200;
  const barrierRightX = centerX + 200;

  const maxItems = Math.max(threats.length, consequences.length, 1);
  const height = Math.max(500, maxItems * 80 + 100);
  const itemSpacing = (height - 100) / Math.max(maxItems, 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ minHeight: 400 }}
    >
      {/* Background */}
      <rect width={width} height={height} fill="transparent" />

      {/* Top Event (center) */}
      <rect
        x={centerX - topEventWidth / 2}
        y={centerY - topEventHeight / 2}
        width={topEventWidth}
        height={topEventHeight}
        rx={8}
        fill="#dc2626"
        opacity={0.9}
      />
      <text
        x={centerX}
        y={centerY - 8}
        textAnchor="middle"
        fill="white"
        fontSize={11}
        fontWeight="bold"
      >
        EVENTO TOP
      </text>
      <text
        x={centerX}
        y={centerY + 12}
        textAnchor="middle"
        fill="white"
        fontSize={10}
        style={{ overflow: 'hidden' }}
      >
        {topEvent.length > 22 ? `${topEvent.slice(0, 22)}…` : topEvent}
      </text>

      {/* Hazard label */}
      <text
        x={centerX}
        y={centerY + topEventHeight / 2 + 20}
        textAnchor="middle"
        fill="#f59e0b"
        fontSize={10}
        fontWeight="600"
      >
        Peligro: {hazard.length > 30 ? `${hazard.slice(0, 30)}…` : hazard}
      </text>

      {/* Threats (left side) */}
      {threats.map((threat, idx) => {
        const y = 50 + idx * itemSpacing + itemSpacing / 2;
        return (
          <g key={threat.id ?? idx}>
            {/* Threat box */}
            <rect
              x={threatX - 60}
              y={y - 20}
              width={120}
              height={40}
              rx={6}
              fill="#ea580c"
              opacity={0.85}
            />
            <text
              x={threatX}
              y={y + 4}
              textAnchor="middle"
              fill="white"
              fontSize={9}
            >
              {threat.description.length > 18
                ? `${threat.description.slice(0, 18)}…`
                : threat.description}
            </text>
            {/* Line from threat to center */}
            <line
              x1={threatX + 60}
              y1={y}
              x2={centerX - topEventWidth / 2}
              y2={centerY}
              stroke="#ea580c"
              strokeWidth={1.5}
              opacity={0.5}
            />
          </g>
        );
      })}

      {/* Prevention Barriers (left of center) */}
      {preventionBarriers.map((barrier, idx) => {
        const y = 50 + idx * itemSpacing + itemSpacing / 2;
        const effColor = EFFECTIVENESS_COLORS[barrier.effectiveness] ?? '#6b7280';
        return (
          <g key={barrier.id ?? idx}>
            <rect
              x={barrierLeftX - 50}
              y={y - 15}
              width={100}
              height={30}
              rx={4}
              fill={effColor}
              opacity={0.25}
              stroke={effColor}
              strokeWidth={1.5}
            />
            <text
              x={barrierLeftX}
              y={y + 4}
              textAnchor="middle"
              fill={effColor}
              fontSize={8}
              fontWeight="600"
            >
              {barrier.description.length > 16
                ? `${barrier.description.slice(0, 16)}…`
                : barrier.description}
            </text>
          </g>
        );
      })}

      {/* Consequences (right side) */}
      {consequences.map((consequence, idx) => {
        const y = 50 + idx * itemSpacing + itemSpacing / 2;
        return (
          <g key={consequence.id ?? idx}>
            {/* Line from center to consequence */}
            <line
              x1={centerX + topEventWidth / 2}
              y1={centerY}
              x2={consequenceX - 60}
              y2={y}
              stroke="#8b5cf6"
              strokeWidth={1.5}
              opacity={0.5}
            />
            {/* Consequence box */}
            <rect
              x={consequenceX - 60}
              y={y - 20}
              width={120}
              height={40}
              rx={6}
              fill="#8b5cf6"
              opacity={0.85}
            />
            <text
              x={consequenceX}
              y={y + 4}
              textAnchor="middle"
              fill="white"
              fontSize={9}
            >
              {consequence.description.length > 18
                ? `${consequence.description.slice(0, 18)}…`
                : consequence.description}
            </text>
          </g>
        );
      })}

      {/* Mitigation Barriers (right of center) */}
      {mitigationBarriers.map((barrier, idx) => {
        const y = 50 + idx * itemSpacing + itemSpacing / 2;
        const effColor = EFFECTIVENESS_COLORS[barrier.effectiveness] ?? '#6b7280';
        return (
          <g key={barrier.id ?? idx}>
            <rect
              x={barrierRightX - 50}
              y={y - 15}
              width={100}
              height={30}
              rx={4}
              fill={effColor}
              opacity={0.25}
              stroke={effColor}
              strokeWidth={1.5}
            />
            <text
              x={barrierRightX}
              y={y + 4}
              textAnchor="middle"
              fill={effColor}
              fontSize={8}
              fontWeight="600"
            >
              {barrier.description.length > 16
                ? `${barrier.description.slice(0, 16)}…`
                : barrier.description}
            </text>
          </g>
        );
      })}

      {/* Labels */}
      <text x={threatX} y={30} textAnchor="middle" fill="#ea580c" fontSize={11} fontWeight="bold">
        AMENAZAS
      </text>
      <text x={barrierLeftX} y={30} textAnchor="middle" fill="#3b82f6" fontSize={11} fontWeight="bold">
        PREVENCIÓN
      </text>
      <text x={barrierRightX} y={30} textAnchor="middle" fill="#8b5cf6" fontSize={11} fontWeight="bold">
        MITIGACIÓN
      </text>
      <text x={consequenceX} y={30} textAnchor="middle" fill="#8b5cf6" fontSize={11} fontWeight="bold">
        CONSECUENCIAS
      </text>
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function BowTieDetailPage() {
  const params = useParams();
  const bowtieId = params.id as string;
  const { data: bt, isLoading } = useBowTie(bowtieId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!bt) {
    return <div className="text-center py-20 text-muted-foreground">Análisis no encontrado.</div>;
  }

  const threats = Array.isArray(bt.threats) ? bt.threats : [];
  const consequences = Array.isArray(bt.consequences) ? bt.consequences : [];
  const preventionBarriers = Array.isArray(bt.prevention_barriers) ? bt.prevention_barriers : [];
  const mitigationBarriers = Array.isArray(bt.mitigation_barriers) ? bt.mitigation_barriers : [];
  const criticalControls = Array.isArray(bt.critical_controls) ? bt.critical_controls : [];

  return (
    <div className="space-y-6">
      <Link
        href="/risks/bowtie"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Bow-Tie
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-foreground">{bt.top_event}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Peligro: {bt.hazard}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-orange-500" />
            {threats.length} amenazas
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-blue-500" />
            {preventionBarriers.length + mitigationBarriers.length} barreras
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-violet-500" />
            {consequences.length} consecuencias
          </span>
          {criticalControls.length > 0 && (
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-500" />
              {criticalControls.length} controles críticos
            </span>
          )}
        </div>
      </div>

      {/* Diagram */}
      <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
        <BowTieDiagram
          topEvent={bt.top_event}
          hazard={bt.hazard}
          threats={threats}
          consequences={consequences}
          preventionBarriers={preventionBarriers}
          mitigationBarriers={mitigationBarriers}
        />
      </div>

      {/* Critical Controls */}
      {criticalControls.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Controles Críticos</h2>
          <div className="space-y-2">
            {criticalControls.map((ctrl) => (
              <div key={ctrl.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <Shield className="mt-0.5 h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">{ctrl.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Verificación: {ctrl.verification_method} · Frecuencia: {ctrl.frequency}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
