'use client';

import { cn } from '@/lib/utils';
import { FieldWrapper } from './FieldWrapper';
import type { FieldComponentProps } from '@/types/forms';

export function BooleanField({
  field,
  value,
  onChange,
  error,
  disabled,
  readOnly,
}: FieldComponentProps) {
  const boolValue = value as boolean | null | undefined;

  const handleSelect = (val: boolean) => {
    if (disabled || readOnly) return;
    // Toggle off if same value clicked
    onChange(boolValue === val ? null : val);
  };

  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      helpText={field.help_text}
      error={error}
    >
      <div className="flex gap-3">
        {/* Sí button */}
        <button
          type="button"
          onClick={() => handleSelect(true)}
          disabled={disabled}
          className={cn(
            'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            boolValue === true
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            readOnly && 'cursor-default hover:bg-background hover:text-muted-foreground',
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            Sí
          </span>
        </button>

        {/* No button */}
        <button
          type="button"
          onClick={() => handleSelect(false)}
          disabled={disabled}
          className={cn(
            'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            boolValue === false
              ? 'border-red-500 bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            readOnly && 'cursor-default hover:bg-background hover:text-muted-foreground',
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
            No
          </span>
        </button>
      </div>
    </FieldWrapper>
  );
}
