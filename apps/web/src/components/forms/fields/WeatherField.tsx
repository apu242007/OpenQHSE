'use client';

import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, CloudFog, CloudDrizzle } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

const WEATHER_OPTIONS = [
  { value: 'sunny', label: 'Soleado', Icon: Sun, color: 'text-amber-500' },
  { value: 'cloudy', label: 'Nublado', Icon: Cloud, color: 'text-gray-400' },
  { value: 'rainy', label: 'Lluvioso', Icon: CloudRain, color: 'text-blue-500' },
  { value: 'drizzle', label: 'Llovizna', Icon: CloudDrizzle, color: 'text-blue-300' },
  { value: 'storm', label: 'Tormenta', Icon: CloudLightning, color: 'text-purple-500' },
  { value: 'snow', label: 'Nieve', Icon: CloudSnow, color: 'text-sky-300' },
  { value: 'windy', label: 'Ventoso', Icon: Wind, color: 'text-teal-500' },
  { value: 'foggy', label: 'Neblina', Icon: CloudFog, color: 'text-gray-300' },
];

export function WeatherField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const selected = typeof value === 'string' ? value : '';

  return (
    <FieldWrapper field={field} error={error}>
      <div className="grid grid-cols-4 gap-2">
        {WEATHER_OPTIONS.map(({ value: v, label, Icon, color }) => (
          <button
            key={v}
            type="button"
            onClick={() => !disabled && !readOnly && onChange(v === selected ? '' : v)}
            disabled={disabled || readOnly}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all',
              selected === v
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-background hover:border-primary/40'
            )}
          >
            <Icon className={cn('h-7 w-7', selected === v ? color : 'text-muted-foreground')} />
            <span className={cn('text-[11px] font-medium', selected === v ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
          </button>
        ))}
      </div>
    </FieldWrapper>
  );
}
