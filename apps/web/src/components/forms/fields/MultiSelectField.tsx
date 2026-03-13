'use client';

import { cn } from '@/lib/utils';
import { FieldWrapper } from './FieldWrapper';
import type { FieldComponentProps } from '@/types/forms';

export function MultiSelectField({
  field,
  value,
  onChange,
  error,
  disabled,
  readOnly,
}: FieldComponentProps) {
  const selectedValues = Array.isArray(value) ? (value as string[]) : [];
  const options = field.options ?? [];

  const toggleOption = (optionValue: string) => {
    if (disabled || readOnly) return;

    const next = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];

    onChange(next);
  };

  return (
    <FieldWrapper
      label={field.label}
      required={field.required}
      description={field.description}
      helpText={field.help_text}
      error={error}
    >
      <div className="space-y-2">
        {/* Chips grid */}
        <div className="flex flex-wrap gap-2">
          {options.length === 0 && (
            <span className="text-sm text-muted-foreground">Sin opciones disponibles</span>
          )}
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.id ?? option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                disabled={disabled}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isSelected
                    ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/20'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                  readOnly && !isSelected && 'cursor-default hover:bg-background hover:text-muted-foreground',
                )}
              >
                {option.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                {option.label}
                {isSelected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Selection count */}
        {selectedValues.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {selectedValues.length} seleccionado{selectedValues.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </FieldWrapper>
  );
}
