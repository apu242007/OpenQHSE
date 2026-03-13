/**
 * Shared constants and colour helpers for the mobile app.
 */

export const Colors = {
  // Brand
  primary: '#3b82f6',
  primaryDark: '#2563eb',

  // Backgrounds
  background: '#0f172a',
  card: '#1e293b',
  surface: '#334155',
  border: '#475569',

  // Text
  foreground: '#f1f5f9',
  muted: '#94a3b8',
  mutedForeground: '#64748b',

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  // Sync indicators
  syncOk: '#22c55e',
  syncPending: '#f59e0b',
  syncOffline: '#ef4444',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;
