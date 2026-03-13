'use client';

import { useRef, useCallback } from 'react';
import { Camera, X, Plus, ImageIcon } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

export function PhotoField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const photos = Array.isArray(value) ? (value as string[]) : [];
  const inputRef = useRef<HTMLInputElement>(null);
  const maxPhotos = field.max_photos ?? 10;
  const minPhotos = field.min_photos ?? 0;

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = maxPhotos - photos.length;
      const toProcess = Array.from(files).slice(0, remaining);
      toProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          onChange([...photos, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    },
    [photos, maxPhotos, onChange],
  );

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const canAdd = photos.length < maxPhotos && !disabled && !readOnly;

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    title="Eliminar foto"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Drop zone / add button */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-primary');
              handleFiles(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Camera className="h-8 w-8" />
            <span className="text-sm font-medium">Agregar foto</span>
            <span className="text-xs">{photos.length}/{maxPhotos} fotos</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          title="Seleccionar fotos"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />

        {minPhotos > 0 && photos.length < minPhotos && (
          <p className="text-xs text-warning">Mínimo {minPhotos} foto(s) requerida(s)</p>
        )}
      </div>
    </FieldWrapper>
  );
}
