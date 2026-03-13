'use client';

import { QrCode } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function QrBarcodeField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const val = typeof value === 'string' ? value : '';

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <QrCode className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={val}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escanee o ingrese código"
            disabled={disabled}
            readOnly={readOnly}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {!readOnly && (
          <button
            type="button"
            disabled={disabled}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <QrCode className="h-6 w-6" />
            <span className="text-sm font-medium">Escanear QR / Código de barras</span>
          </button>
        )}
        {val && <p className="text-xs text-muted-foreground">Valor: {val}</p>}
      </div>
    </FieldWrapper>
  );
}
