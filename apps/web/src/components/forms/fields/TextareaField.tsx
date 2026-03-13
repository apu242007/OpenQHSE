'use client';

import { cn } from '@/lib/utils';
import { FieldWrapper } from './FieldWrapper';
import type { FieldComponentProps } from '@/types/forms';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed';

export function TextareaField({
  field,
  value,
  onChange,
  error,
  disabled,
  readOnly,
}: FieldComponentProps) {
  const strValue = (value as string) ?? '';
  const maxLen = field.max_length ?? undefined;

  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      helpText={field.help_text}
      error={error}
    >
      <div className="relative">
        <textarea
          id={field.id}
          rows={4}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          maxLength={maxLen}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            inputClass,
            'resize-y min-h-[80px]',
            readOnly && 'bg-muted cursor-default',
            error && 'border-destructive focus:ring-destructive/50 focus:border-destructive',
          )}
        />
        {maxLen && (
          <span
            className={cn(
              'absolute bottom-2 right-3 text-[10px] tabular-nums',
              strValue.length >= maxLen
                ? 'text-destructive'
                : 'text-muted-foreground/60',
            )}
          >
            {strValue.length}/{maxLen}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
}
