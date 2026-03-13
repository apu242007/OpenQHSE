'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Pen, RotateCcw, Check } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

export function SignatureField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const sigUrl = typeof value === 'string' ? value : '';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] || e.changedTouches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || readOnly || sigUrl) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [disabled, readOnly, sigUrl]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  }, []);

  const endDraw = useCallback(() => { drawing.current = false; }, []);

  const clearCanvas = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (ctx) { ctx.clearRect(0, 0, cv.width, cv.height); }
    setHasStrokes(false);
    onChange('');
  }, [onChange]);

  const confirmSignature = useCallback(() => {
    if (!canvasRef.current || !hasStrokes) return;
    onChange(canvasRef.current.toDataURL('image/png'));
  }, [hasStrokes, onChange]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cv.offsetWidth;
    cv.height = cv.offsetHeight;
  }, []);

  return (
    <FieldWrapper field={field} error={error}>
      {sigUrl ? (
        <div className="relative rounded-lg border border-border bg-white p-2">
          <img src={sigUrl} alt="Firma" className="mx-auto h-32 object-contain" />
          {!readOnly && (
            <button type="button" onClick={clearCanvas} title="Limpiar firma" className="absolute right-2 top-2 rounded-md bg-muted p-1.5 text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-lg border-2 border-dashed border-border bg-white">
            <canvas
              ref={canvasRef}
              className="h-40 w-full cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasStrokes && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Pen className="mr-2 h-5 w-5" /> Firme aquí
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={clearCanvas} disabled={!hasStrokes} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40">
              <RotateCcw className="mr-1 inline h-3 w-3" /> Limpiar
            </button>
            <button type="button" onClick={confirmSignature} disabled={!hasStrokes} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
              <Check className="mr-1 inline h-3 w-3" /> Confirmar firma
            </button>
          </div>
        </div>
      )}
    </FieldWrapper>
  );
}
