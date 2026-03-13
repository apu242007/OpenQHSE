'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { FormField } from '@/types/forms';

export interface FieldWrapperProps {
  /** Pass a FormField object to auto-extract label, required, description, helpText */
  field?: FormField;
  label?: string;
  required?: boolean;
  description?: string;
  helpText?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FieldWrapper({
  field,
  label: labelProp,
  required: requiredProp,
  description: descProp,
  helpText: helpProp,
  error,
  className,
  children,
}: FieldWrapperProps) {
  const label = labelProp ?? field?.label;
  const required = requiredProp ?? field?.required;
  const description = descProp ?? field?.description;
  const helpText = helpProp ?? field?.help_text;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || helpText) && (
        <div className="flex items-center gap-1.5">
          {label && (
            <label className="block text-sm font-medium text-foreground">
              {label}
              {required && (
                <span className="ml-0.5 text-destructive">*</span>
              )}
            </label>
          )}
          {helpText && (
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 text-[10px] font-bold leading-none"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip((prev) => !prev)}
                aria-label="Ayuda"
              >
                ?
              </button>
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-normal rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md border border-border max-w-[220px] text-center">
                  {helpText}
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {children}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5 flex-shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
