'use client';

import { useRef } from 'react';
import { Video, X, Upload } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function VideoField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const videoUrl = typeof value === 'string' ? value : '';
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <FieldWrapper field={field} error={error}>
      {videoUrl ? (
        <div className="relative rounded-lg border border-border overflow-hidden">
          <video src={videoUrl} controls className="w-full max-h-64 bg-black" />
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Eliminar video"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || readOnly}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Video className="h-8 w-8" />
          <span className="text-sm font-medium">Subir video</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        title="Seleccionar video"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled}
      />
    </FieldWrapper>
  );
}
