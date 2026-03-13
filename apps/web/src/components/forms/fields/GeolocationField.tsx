'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapPin, Loader2, RefreshCw } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

interface GeoValue { latitude: number; longitude: number; accuracy: number; timestamp: string; }

export function GeolocationField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const geo = value as GeoValue | null;
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const capture = useCallback(() => {
    if (!navigator.geolocation) { setGeoError('Geolocalización no soportada'); return; }
    setLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: new Date().toISOString() });
        setLoading(false);
      },
      (err) => {
        setGeoError(err.code === 1 ? 'Permiso denegado' : err.code === 2 ? 'Posición no disponible' : 'Tiempo de espera agotado');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [onChange]);

  useEffect(() => {
    if (!geo && field.required && !readOnly) capture();
  }, []);

  return (
    <FieldWrapper field={field} error={error}>
      {geo ? (
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Ubicación capturada</p>
              <p className="text-xs text-muted-foreground">Lat: {geo.latitude.toFixed(6)} · Lon: {geo.longitude.toFixed(6)}</p>
              <p className="text-xs text-muted-foreground">Precisión: ±{Math.round(geo.accuracy)} m</p>
              <p className="text-xs text-muted-foreground">{new Date(geo.timestamp).toLocaleString()}</p>
            </div>
            {!readOnly && (
              <button type="button" onClick={capture} disabled={loading} title="Actualizar ubicación" className="rounded-md p-2 text-muted-foreground hover:bg-muted">
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button" onClick={capture} disabled={disabled || readOnly || loading}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <MapPin className="h-8 w-8" />}
            <span className="text-sm font-medium">{loading ? 'Obteniendo ubicación...' : 'Capturar ubicación GPS'}</span>
          </button>
          {geoError && <p className="text-center text-xs text-danger">{geoError}</p>}
        </div>
      )}
    </FieldWrapper>
  );
}
