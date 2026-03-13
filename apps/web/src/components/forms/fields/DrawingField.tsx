'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Paintbrush, RotateCcw, Download, Palette } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';

const COLORS = ['#1a1a1a', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
const SIZES = [2, 4, 8];

export function DrawingField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const drawingUrl = typeof value === 'string' ? value : '';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState<string>(COLORS[0] ?? '#1a1a1a');
  const [size, setSize] = useState<number>(SIZES[1] ?? 4);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const t = 'touches' in e ? e.touches[0] || e.changedTouches[0] : null;
    return { x: (t ? t.clientX : (e as React.MouseEvent).clientX) - rect.left, y: (t ? t.clientY : (e as React.MouseEvent).clientY) - rect.top };
  };

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || readOnly) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [disabled, readOnly]);

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }, [color, size]);

  const end = useCallback(() => {
    drawing.current = false;
    if (hasDrawn && canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'));
  }, [hasDrawn, onChange]);

  const clear = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
    setHasDrawn(false);
    onChange('');
  }, [onChange]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cv.offsetWidth;
    cv.height = cv.offsetHeight;
    if (drawingUrl) {
      const img = new Image();
      img.onload = () => cv.getContext('2d')?.drawImage(img, 0, 0);
      img.src = drawingUrl;
    }
  }, []);

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-border bg-muted/50 px-3 py-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} title={'Color ' + c} className="h-5 w-5 rounded-full border-2 transition-transform" style={{ backgroundColor: c, borderColor: c === color ? '#fff' : 'transparent', transform: c === color ? 'scale(1.2)' : 'scale(1)' }} />
          ))}
          <span className="mx-2 h-4 w-px bg-border" />
          {SIZES.map((s) => (
            <button key={s} type="button" onClick={() => setSize(s)} title={'Tamaño ' + s + 'px'} className={`flex h-6 w-6 items-center justify-center rounded ${s === size ? 'bg-primary/20' : ''}`}>
              <span className="rounded-full bg-foreground" style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" onClick={clear} disabled={!hasDrawn} title="Limpiar dibujo" className="text-muted-foreground hover:text-foreground disabled:opacity-40">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-b-lg border border-border bg-white">
          <canvas
            ref={canvasRef}
            className="h-64 w-full cursor-crosshair touch-none"
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          />
        </div>
        {!hasDrawn && !drawingUrl && (
          <p className="text-center text-xs text-muted-foreground"><Paintbrush className="mr-1 inline h-3.5 w-3.5" /> Dibuje sobre el lienzo</p>
        )}
      </div>
    </FieldWrapper>
  );
}
