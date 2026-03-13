'use client';

import type { ScoringConfig as ScoringConfigType } from '@/types/forms';
import { useFormBuilderStore } from '@/stores/form-builder-store';

export function ScoringConfigPanel() {
  const { scoringConfig, setScoringConfig } = useFormBuilderStore();

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={scoringConfig.enabled}
          onChange={(e) => setScoringConfig({ enabled: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        Habilitar puntuación
      </label>

      {scoringConfig.enabled && (
        <div className="space-y-3 pl-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Umbral aprobación (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoringConfig.pass_threshold}
              onChange={(e) => setScoringConfig({ pass_threshold: Number(e.target.value) })}
              title="Umbral aprobación"
              className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Umbral reprobación (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoringConfig.fail_threshold}
              onChange={(e) => setScoringConfig({ fail_threshold: Number(e.target.value) })}
              title="Umbral reprobación"
              className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={scoringConfig.show_score_to_inspector}
              onChange={(e) => setScoringConfig({ show_score_to_inspector: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Mostrar puntaje al inspector
          </label>
        </div>
      )}
    </div>
  );
}
