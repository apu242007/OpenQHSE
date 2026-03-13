'use client';

import { useState } from 'react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function SliderField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const current = typeof value === 'number' ? value : min;
  const pct = ((current - min) / (max - min)) * 100;

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3 px-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span className="text-lg font-bold text-foreground">{current}</span>
          <span>{max}</span>
        </div>
        <div className="relative">
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            readOnly={readOnly}
            title={field.label}
            className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
        {field.unit && <p className="text-right text-xs text-muted-foreground">{field.unit}</p>}
      </div>
    </FieldWrapper>
  );
}
