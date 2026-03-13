'use client';

import { useState } from 'react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

const RISK_LABELS_Y = ['Catastrófico', 'Mayor', 'Moderado', 'Menor', 'Insignificante'];
const RISK_LABELS_X = ['Raro', 'Improbable', 'Posible', 'Probable', 'Casi seguro'];

function getCellColor(row: number, col: number): string {
  const score = (5 - row) * (col + 1);
  if (score >= 15) return 'bg-red-500 hover:bg-red-600 text-white';
  if (score >= 10) return 'bg-orange-500 hover:bg-orange-600 text-white';
  if (score >= 5) return 'bg-yellow-400 hover:bg-yellow-500 text-black';
  return 'bg-green-500 hover:bg-green-600 text-white';
}

function getCellScore(row: number, col: number): number {
  return (5 - row) * (col + 1);
}

function getRiskLevel(score: number): string {
  if (score >= 15) return 'Extremo';
  if (score >= 10) return 'Alto';
  if (score >= 5) return 'Medio';
  return 'Bajo';
}

interface RiskValue { row: number; col: number; score: number; severity: string; likelihood: string; level: string; }

export function RiskMatrixField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const risk = value as RiskValue | null;

  const handleSelect = (row: number, col: number) => {
    if (disabled || readOnly) return;
    const score = getCellScore(row, col);
    onChange({
      row, col, score,
      severity: RISK_LABELS_Y[row],
      likelihood: RISK_LABELS_X[col],
      level: getRiskLevel(score),
    });
  };

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <div className="inline-flex items-end gap-1">
            <div className="flex flex-col items-end gap-1 pr-2">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground -rotate-0">Severidad</span>
              {RISK_LABELS_Y.map((l) => (
                <span key={l} className="flex h-12 items-center text-[11px] font-medium text-muted-foreground whitespace-nowrap">{l}</span>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-5 gap-1">
                {RISK_LABELS_Y.map((_, row) =>
                  RISK_LABELS_X.map((_, col) => {
                    const score = getCellScore(row, col);
                    const selected = risk?.row === row && risk?.col === col;
                    return (
                      <button
                        key={`${row}-${col}`}
                        type="button"
                        onClick={() => handleSelect(row, col)}
                        disabled={disabled || readOnly}
                        className={cn(
                          'flex h-12 w-14 items-center justify-center rounded text-xs font-bold transition-all',
                          getCellColor(row, col),
                          selected && 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105',
                          !selected && 'opacity-80'
                        )}
                      >
                        {score}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-1 grid grid-cols-5 gap-1">
                {RISK_LABELS_X.map((l) => (
                  <span key={l} className="text-center text-[10px] font-medium text-muted-foreground">{l}</span>
                ))}
              </div>
              <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Probabilidad</p>
            </div>
          </div>
        </div>

        {risk && (
          <div className={cn(
            'rounded-lg border p-3',
            risk.score >= 15 ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950' :
            risk.score >= 10 ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950' :
            risk.score >= 5 ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' :
            'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950'
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Nivel: {risk.level}</p>
                <p className="text-xs text-muted-foreground">{risk.severity} × {risk.likelihood}</p>
              </div>
              <span className="text-2xl font-black">{risk.score}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-500" /> Bajo (1-4)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-400" /> Medio (5-9)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-orange-500" /> Alto (10-14)</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" /> Extremo (15-25)</span>
        </div>
      </div>
    </FieldWrapper>
  );
}
