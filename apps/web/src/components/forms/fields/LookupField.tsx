'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

export function LookupField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const val = value as { id: string; label: string } | null;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Placeholder results — in production, this would call an API based on field.lookup_entity
  const results = query.length >= 2
    ? [
        { id: '1', label: `${field.lookup_entity ?? 'Item'} - ${query} (1)` },
        { id: '2', label: `${field.lookup_entity ?? 'Item'} - ${query} (2)` },
        { id: '3', label: `${field.lookup_entity ?? 'Item'} - ${query} (3)` },
      ]
    : [];

  return (
    <FieldWrapper field={field} error={error}>
      <div className="relative">
        {val ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
            <span className="text-sm">{val.label}</span>
            {!readOnly && (
              <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-foreground">Cambiar</button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={`Buscar ${field.lookup_entity ?? 'registro'}...`}
                disabled={disabled}
                readOnly={readOnly}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {open && results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { onChange(r); setOpen(false); setQuery(''); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
