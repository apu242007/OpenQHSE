'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import type { FieldComponentProps } from '@/types/forms';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '@/lib/utils';

export function AudioField({ field, value, onChange, error, disabled, readOnly }: FieldComponentProps) {
  const audioUrl = typeof value === 'string' ? value : '';
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.ondataavailable = (e) => chunks.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => onChange(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Microphone not available
    }
  }, [onChange]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <FieldWrapper field={field} error={error}>
      <div className="space-y-3">
        {recording ? (
          <div className="flex items-center gap-3 rounded-lg border border-danger/50 bg-danger/5 p-4">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-danger" />
            </span>
            <span className="text-sm font-medium text-danger">Grabando {formatTime(duration)}</span>
            <button type="button" onClick={stopRecording} className="ml-auto rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90">
              <Square className="mr-1.5 inline h-3.5 w-3.5" /> Detener
            </button>
          </div>
        ) : audioUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
            <button
              type="button"
              onClick={() => {
                if (playing) { audioRef.current?.pause(); setPlaying(false); }
                else { audioRef.current?.play(); setPlaying(true); }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium">Audio grabado</p>
              <p className="text-xs text-muted-foreground">Listo para enviar</p>
            </div>
            {!readOnly && (
              <button type="button" onClick={() => onChange('')} title="Eliminar audio" className="text-muted-foreground hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled || readOnly}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Mic className="h-8 w-8" />
            <span className="text-sm font-medium">Grabar audio</span>
          </button>
        )}
      </div>
    </FieldWrapper>
  );
}
