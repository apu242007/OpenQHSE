'use client';

import { useFormBuilderStore } from '@/stores/form-builder-store';

export function FormSettingsPanel() {
  const { settings, setSettings } = useFormBuilderStore();

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <h4 className="text-sm font-semibold">Configuración general</h4>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={settings.allow_offline}
          onChange={(e) => setSettings({ allow_offline: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Permitir uso offline
      </label>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={settings.require_geolocation}
          onChange={(e) => setSettings({ require_geolocation: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Requerir geolocalización
      </label>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={settings.require_signature}
          onChange={(e) => setSettings({ require_signature: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Requerir firma al finalizar
      </label>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={settings.auto_create_actions_on_fail}
          onChange={(e) => setSettings({ auto_create_actions_on_fail: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Crear acciones automáticas al reprobar
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Horas de vigencia
        </label>
        <input
          type="number"
          min={1}
          value={settings.expiry_hours}
          onChange={(e) => setSettings({ expiry_hours: Number(e.target.value) })}
          title="Horas de vigencia"
          className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
