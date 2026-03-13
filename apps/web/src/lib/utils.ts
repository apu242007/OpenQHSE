import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely with clsx + tailwind-merge. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a date string to a localized readable format. */
export function formatDate(date: string | Date, locale = 'es'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Format a number as a percentage. */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Truncate text to a maximum length with ellipsis. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

/** Get initials from a full name (e.g., "John Doe" → "JD"). */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Map severity levels to Tailwind color classes. */
export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: 'bg-danger text-danger-foreground',
    high: 'bg-orange-500 text-white',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-primary-200 text-primary-800',
    observation: 'bg-muted text-muted-foreground',
  };
  return map[severity] ?? 'bg-muted text-muted-foreground';
}

/** Map status to badge color classes. */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    in_progress: 'bg-primary/20 text-primary',
    completed: 'bg-safe/20 text-safe-700',
    reviewed: 'bg-safe text-safe-foreground',
    open: 'bg-warning/20 text-warning-700',
    resolved: 'bg-safe/20 text-safe-700',
    closed: 'bg-muted text-muted-foreground',
    reported: 'bg-danger/20 text-danger-700',
    under_investigation: 'bg-warning/20 text-warning-700',
    active: 'bg-safe/20 text-safe-700',
    pending_approval: 'bg-warning/20 text-warning-700',
    approved: 'bg-primary/20 text-primary',
    overdue: 'bg-danger text-danger-foreground',
  };
  return map[status] ?? 'bg-muted text-muted-foreground';
}
