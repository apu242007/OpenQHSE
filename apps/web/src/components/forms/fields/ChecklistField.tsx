'use client';

import { Check, Square } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

export function ChecklistField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const items = field.items ?? field.options?.map((o) => o.value) ?? [];
  const checked = Array.isArray(value) ? (value as string[]) : [];

  const toggle = (item: string) => {
    if (disabled || readOnly) return;
    onChange(checked.includes(item) ? checked.filter((c) => c !== item) : [...checked, item]);
  };

  const allChecked = items.length > 0 && checked.length === items.length;
  const progress = items.length > 0 ? Math.round((checked.length / items.length) * 100) : 0;

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{checked.length}/{items.length} completados</span>
          <div className="h-1.5 w-24 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const isChecked = checked.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item)}
                disabled={disabled || readOnly}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                  isChecked
                    ? 'border-primary/30 bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
                  isChecked ? 'border-primary bg-primary text-white' : 'border-muted-foreground/30'
                )}>
                  {isChecked && <Check className="h-3 w-3" />}
                </span>
                <span className={cn(isChecked && 'line-through opacity-70')}>{item}</span>
              </button>
            );
          })}
        </div>
      </div>
    </FieldWrapper>
  );
}
