'use client';

import { Thermometer } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function TemperatureField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const num = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0);

  const convert = (v: number, to: 'C' | 'F') => to === 'F' ? (v * 9) / 5 + 32 : ((v - 32) * 5) / 9;

  const handleUnitChange = (newUnit: 'C' | 'F') => {
    if (newUnit === unit) return;
    const converted = convert(num, newUnit);
    setUnit(newUnit);
    onChange(Math.round(converted * 10) / 10);
  };

  const getColor = () => {
    const c = unit === 'C' ? num : convert(num, 'C');
    if (c < 0) return 'text-blue-500';
    if (c < 20) return 'text-cyan-500';
    if (c < 35) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <FieldWrapper field={field} error={error}>
      <div className="flex items-center gap-3">
        <Thermometer className={cn('h-6 w-6', getColor())} />
        <input
          type="number"
          value={num || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder="0"
          step={0.1}
          disabled={disabled}
          readOnly={readOnly}
          className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex rounded-lg border border-border">
          {(['C', 'F'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => handleUnitChange(u)}
              disabled={disabled || readOnly}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                unit === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                u === 'C' ? 'rounded-l-lg' : 'rounded-r-lg'
              )}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>
    </FieldWrapper>
  );
}
