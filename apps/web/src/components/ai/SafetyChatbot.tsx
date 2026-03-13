/**
 * SafetyChatbot — floating chat FAB that expands into a conversational panel.
 *
 * Uses the /ai/safety-chat endpoint via useSafetyChat hook.
 * Maintains conversation history and suggests example questions.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useSafetyChat } from '@/hooks/use-ai';
import type { ChatMessage } from '@/types/ai';
import { cn } from '@/lib/utils';

const EXAMPLE_QUESTIONS = [
  '¿Cuáles son los requisitos de ISO 45001 para la gestión de riesgos?',
  '¿Cómo implementar un programa de observaciones de seguridad?',
  '¿Qué EPP se requiere para trabajos en altura?',
  '¿Cuáles son las mejores prácticas para investigación de incidentes?',
  '¿Cómo calcular el TRIR (Total Recordable Incident Rate)?',
  '¿Qué normativa OSHA aplica para espacios confinados?',
];

interface LocalMessage {
  role: 'user' | 'assistant';
  content: string;
  references?: string[];
  suggestedActions?: string[];
}

export function SafetyChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useSafetyChat();

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || chatMutation.isPending) return;

      const userMsg: LocalMessage = { role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');

      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      chatMutation.mutate(
        { message: text.trim(), history },
        {
          onSuccess: (data) => {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: data.response,
                references: data.references,
                suggestedActions: data.suggested_actions,
              },
            ]);
          },
          onError: () => {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu consulta. Intenta nuevamente.',
              },
            ]);
          },
        },
      );
    },
    [chatMutation, messages],
  );

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[32rem] w-96 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:right-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Asistente QHSE</p>
                <p className="text-[11px] text-muted-foreground">ISO 45001 · ISO 14001 · OSHA</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Pregúntame sobre seguridad, salud y medio ambiente
                </div>
                <div className="grid gap-2">
                  {EXAMPLE_QUESTIONS.slice(0, 4).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="rounded-lg border border-border px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.references && msg.references.length > 0 && (
                    <div className="mt-2 border-t border-border/40 pt-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Referencias
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {msg.references.map((ref, j) => (
                          <li key={j} className="text-[11px] text-muted-foreground">
                            • {ref}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-2 border-t border-border/40 pt-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Acciones sugeridas
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {msg.suggestedActions.map((action, j) => (
                          <li key={j} className="text-[11px] text-muted-foreground">
                            → {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Analizando…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu consulta…"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={chatMutation.isPending}
              />
              <button
                type="submit"
                disabled={!input.trim() || chatMutation.isPending}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 sm:right-6',
          open
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {open ? <ChevronDown className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </>
  );
}
