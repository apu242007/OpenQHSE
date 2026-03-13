'use client';

import { Calculator } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function CalculatedField({ field, value, onChange, error }: FieldComponentProps) {
  const display = value !== undefined && value !== null ? String(value) : '—';

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <Calculator className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <span className="text-lg font-semibold">{display}</span>
          {field.unit && <span className="ml-1 text-sm text-muted-foreground">{field.unit}</span>}
        </div>
      </div>
      {field.formula && (
        <p className="mt-1 text-xs text-muted-foreground font-mono">Fórmula: {field.formula}</p>
      )}
    </FieldWrapper>
  );
}
