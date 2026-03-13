'use client';

import { cn } from '@/lib/utils';
import { FieldWrapper } from './FieldWrapper';
import type { FieldComponentProps } from '@/types/forms';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed';

export function TextField({
  field,
  value,
  onChange,
  error,
  disabled,
  readOnly,
}: FieldComponentProps) {
  const strValue = (value as string) ?? '';

  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      helpText={field.help_text}
      error={error}
    >
      <input
        type="text"
        id={field.id}
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? ''}
        maxLength={field.max_length ?? undefined}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          inputClass,
          readOnly && 'bg-muted cursor-default',
          error && 'border-destructive focus:ring-destructive/50 focus:border-destructive',
        )}
      />
    </FieldWrapper>
  );
}
