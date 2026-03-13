'use client';

import { Barcode, Copy } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function BarcodeGenerateField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const val = typeof value === 'string' ? value : '';

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Barcode className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={val}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Valor para generar código"
            disabled={disabled}
            readOnly={readOnly}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {val && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-4 dark:bg-zinc-900">
            <div className="flex items-center gap-1">
              {val.split('').map((c, i) => (
                <div key={i} className="bg-foreground" style={{ width: Math.random() > 0.5 ? 2 : 1, height: 48 }} />
              ))}
            </div>
            <p className="font-mono text-xs text-muted-foreground">{val}</p>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
