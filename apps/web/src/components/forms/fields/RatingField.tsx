'use client';

import { Star } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

export function RatingField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const max = field.max ?? 5;
  const current = typeof value === 'number' ? value : 0;

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => !disabled && !readOnly && onChange(n === current ? 0 : n)}
            disabled={disabled || readOnly}
            title={n + (n > 1 ? ' estrellas' : ' estrella')}
            className="group p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                n <= current
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground/40 group-hover:text-amber-300'
              )}
            />
          </button>
        ))}
        {current > 0 && (
          <span className="ml-2 text-sm font-medium text-muted-foreground">{current}/{max}</span>
        )}
      </div>
    </FieldWrapper>
  );
}
