/**
 * Zustand store for sync state — drives OfflineIndicator & SyncProgressModal.
 */

import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  progress: number;          // 0–100
  pendingCount: number;
  lastSynced: number | null;  // timestamp
  error: string | null;

  setStatus: (s: SyncStatus) => void;
  setProgress: (p: number) => void;
  setPendingCount: (n: number) => void;
  setLastSynced: (t: number) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  progress: 0,
  pendingCount: 0,
  lastSynced: null,
  error: null,

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSynced: (lastSynced) => set({ lastSynced }),
  setError: (error) => set({ error }),
  reset: () => set({ status: 'idle', progress: 0, pendingCount: 0, error: null }),
}));
