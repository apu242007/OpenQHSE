'use client';

import { Nfc } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function NfcField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const val = typeof value === 'string' ? value : '';

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        {val ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Nfc className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Tag NFC leído</p>
              <p className="text-xs text-muted-foreground font-mono">{val}</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || readOnly}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Nfc className="h-8 w-8" />
            <span className="text-sm font-medium">Acercar tag NFC</span>
            <span className="text-xs">Funcionalidad disponible en dispositivos compatibles</span>
          </button>
        )}
      </div>
    </FieldWrapper>
  );
}
