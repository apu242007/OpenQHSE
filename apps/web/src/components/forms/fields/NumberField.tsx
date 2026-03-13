'use client';

import { cn } from '@/lib/utils';
import { FieldWrapper } from './FieldWrapper';
import type { FieldComponentProps } from '@/types/forms';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed';

export function NumberField({
  field,
  value,
  onChange,
  error,
  disabled,
  readOnly,
}: FieldComponentProps) {
  const numValue = value !== undefined && value !== null && value !== '' ? value : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(null);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      if (field.decimals !== undefined && field.decimals !== null && field.decimals >= 0) {
        onChange(parseFloat(parsed.toFixed(field.decimals)));
      } else {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    if (
      numValue !== '' &&
      numValue !== null &&
      field.decimals !== undefined &&
      field.decimals !== null &&
      field.decimals >= 0
    ) {
      const formatted = parseFloat(Number(numValue).toFixed(field.decimals));
      onChange(formatted);
    }
  };

  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      helpText={field.help_text}
      error={error}
    >
      <div className="relative">
        <input
          type="number"
          id={field.id}
          value={numValue as string | number}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={field.placeholder ?? ''}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          step={field.step ?? (field.decimals != null ? Math.pow(10, -field.decimals) : undefined)}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            inputClass,
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            field.unit && 'pr-12',
            readOnly && 'bg-muted cursor-default',
            error && 'border-destructive focus:ring-destructive/50 focus:border-destructive',
          )}
        />
        {field.unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {field.unit}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
}
