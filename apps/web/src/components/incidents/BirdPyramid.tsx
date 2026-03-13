'use client';

import type { BirdPyramidData } from '@/types/incidents';
import { cn } from '@/lib/utils';

interface BirdPyramidProps {
  data: BirdPyramidData;
  animated?: boolean;
}

const LAYERS: { key: keyof BirdPyramidData; label: string; color: string; bgColor: string }[] = [
  { key: 'fatalities', label: 'Fatalidades', color: '#991b1b', bgColor: 'bg-red-900' },
  { key: 'serious_injuries', label: 'Lesiones graves', color: '#dc2626', bgColor: 'bg-red-600' },
  { key: 'minor_injuries', label: 'Lesiones menores', color: '#f59e0b', bgColor: 'bg-amber-500' },
  { key: 'near_misses', label: 'Casi accidentes', color: '#3b82f6', bgColor: 'bg-blue-500' },
  { key: 'unsafe_behaviors', label: 'Comportamientos inseguros', color: '#6b7280', bgColor: 'bg-gray-500' },
];

/**
 * Animated Heinrich/Bird safety pyramid.
 * Renders a proportional trapezoid for each layer with animated reveal.
 */
export function BirdPyramid({ data, animated = true }: BirdPyramidProps) {
  const total = LAYERS.reduce((sum, l) => sum + (data[l.key] ?? 0), 0);

  return (
    <div className="flex flex-col items-center gap-1">
      {LAYERS.map((layer, idx) => {
        const count = data[layer.key] ?? 0;
        // Width: top layer is narrowest, bottom is widest
        const widthPercent = 30 + (idx / (LAYERS.length - 1)) * 70;
        const delay = animated ? `${idx * 150}ms` : '0ms';

        return (
          <div
            key={layer.key}
            className={cn(
              'relative flex items-center justify-center rounded-sm py-3 text-white font-bold text-sm transition-all',
              animated && 'animate-in fade-in slide-in-from-top-2',
            )}
            style={{
              width: `${widthPercent}%`,
              backgroundColor: layer.color,
              animationDelay: delay,
              animationDuration: '500ms',
              animationFillMode: 'both',
            }}
          >
            <span className="text-lg font-black">{count}</span>
            <span className="absolute bottom-0.5 text-[10px] font-normal opacity-80">{layer.label}</span>
          </div>
        );
      })}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
        {LAYERS.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-muted-foreground">{l.label}: <strong className="text-foreground">{data[l.key]}</strong></span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-foreground/20" />
          <span className="text-muted-foreground">Total: <strong className="text-foreground">{total}</strong></span>
        </div>
      </div>

      {/* Ratio indicator */}
      {total > 0 && data.fatalities === 0 && (
        <div className="mt-2 rounded-lg border border-safe/30 bg-safe/5 px-3 py-1.5 text-center text-xs text-safe">
          ✅ 0 fatalidades — Ratio 1:{data.near_misses > 0 ? Math.round(data.near_misses / Math.max(data.serious_injuries + data.minor_injuries, 1)) : '—'} (lesiones:casi accidentes)
        </div>
      )}
    </div>
  );
}
