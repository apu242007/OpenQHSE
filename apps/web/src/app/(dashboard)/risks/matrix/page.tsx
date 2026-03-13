/**
 * 5×5 Risk Matrix — interactive heatmap visualization.
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRiskMatrix } from '@/hooks/use-risks';
import { LIKELIHOOD_LABELS, SEVERITY_LABELS, RISK_LEVEL_CONFIG } from '@/types/risks';
import type { RiskLevel, MatrixCell } from '@/types/risks';

const LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#ea580c',
  extreme: '#dc2626',
};

function cellLevel(likelihood: number, severity: number): RiskLevel {
  const rating = likelihood * severity;
  if (rating <= 4) return 'low';
  if (rating <= 9) return 'moderate';
  if (rating <= 16) return 'high';
  return 'extreme';
}

export default function RiskMatrixPage() {
  const { data: matrixData, isLoading } = useRiskMatrix();

  // Build a 5×5 lookup map
  const cellMap = new Map<string, MatrixCell>();
  if (matrixData) {
    for (const cell of matrixData.cells) {
      cellMap.set(`${cell.likelihood}-${cell.severity}`, cell);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/risks"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a riesgos
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Matriz de Riesgos 5×5</h1>
          <p className="text-sm text-muted-foreground">
            Visualización de riesgos residuales por probabilidad × severidad
            {matrixData && ` — ${matrixData.total_risks} riesgos`}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(Object.entries(RISK_LEVEL_CONFIG) as Array<[RiskLevel, { label: string; color: string }]>).map(([level, cfg]) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: cfg.color }}
            />
            <span className="text-sm text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block">
            {/* Y-axis label */}
            <div className="flex">
              <div className="flex w-32 items-end justify-center pb-2">
                <span className="text-xs font-semibold text-muted-foreground -rotate-90 origin-center whitespace-nowrap">
                  PROBABILIDAD →
                </span>
              </div>
              <div className="flex-1" />
            </div>

            <div className="flex">
              {/* Y-axis labels column */}
              <div className="flex w-32 flex-col-reverse gap-1">
                {LIKELIHOOD_LABELS.map((label, idx) => (
                  <div
                    key={idx}
                    className="flex h-20 items-center justify-end pr-3 text-xs font-medium text-muted-foreground"
                  >
                    <span className="text-right">
                      {idx + 1}. {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Matrix grid */}
              <div className="flex flex-col-reverse gap-1">
                {[1, 2, 3, 4, 5].map((likelihood) => (
                  <div key={likelihood} className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((severity) => {
                      const level = cellLevel(likelihood, severity);
                      const cell = cellMap.get(`${likelihood}-${severity}`);
                      const count = cell?.count ?? 0;
                      const color = LEVEL_COLORS[level];
                      const rating = likelihood * severity;

                      return (
                        <div
                          key={severity}
                          className="relative flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-white/10 transition-transform hover:scale-105 cursor-default"
                          style={{
                            backgroundColor: color,
                            opacity: count > 0 ? 1 : 0.4,
                          }}
                          title={`Prob: ${likelihood}, Sev: ${severity}, Rating: ${rating}, Riesgos: ${count}`}
                        >
                          <span className="text-lg font-bold text-white">{rating}</span>
                          {count > 0 && (
                            <span className="absolute bottom-1 right-1 rounded-full bg-white/30 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* X-axis labels */}
                <div className="flex gap-1 mt-2">
                  {SEVERITY_LABELS.map((label, idx) => (
                    <div
                      key={idx}
                      className="flex h-12 w-20 items-start justify-center text-center"
                    >
                      <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                        {idx + 1}. {label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    SEVERIDAD →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
