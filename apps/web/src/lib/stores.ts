/**
 * Zustand stores for global state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth Store ─────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id: string;
  avatar_url: string | null;
  language: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'openqhse-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

// ── UI Store ───────────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  locale: 'es' | 'en' | 'pt';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLocale: (locale: 'es' | 'en' | 'pt') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      locale: 'es',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'openqhse-ui',
    },
  ),
);

// ── Notification Store ─────────────────────────────────────

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      const notifications = [newNotification, ...state.notifications].slice(0, 50);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),
  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

// ── Offline Sync Store ─────────────────────────────────────

interface OfflineAction {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  createdAt: string;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: OfflineAction[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  setOnline: (online: boolean) => void;
  enqueue: (action: Omit<OfflineAction, 'id' | 'createdAt' | 'retryCount'>) => void;
  dequeue: (id: string) => void;
  incrementRetry: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (syncing: boolean) => void;
  setLastSync: (date: string) => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      queue: [],
      isSyncing: false,
      lastSyncAt: null,
      setOnline: (isOnline) => set({ isOnline }),
      enqueue: (action) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...action,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              retryCount: 0,
            },
          ],
        })),
      dequeue: (id) =>
        set((state) => ({
          queue: state.queue.filter((a) => a.id !== id),
        })),
      incrementRetry: (id) =>
        set((state) => ({
          queue: state.queue.map((a) =>
            a.id === id ? { ...a, retryCount: a.retryCount + 1 } : a,
          ),
        })),
      clearQueue: () => set({ queue: [] }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      setLastSync: (lastSyncAt) => set({ lastSyncAt }),
    }),
    {
      name: 'openqhse-offline',
    },
  ),
);

// ── Global Filters Store ───────────────────────────────────

interface FiltersState {
  selectedSiteId: string | null;
  selectedAreaId: string | null;
  dateRange: { from: string | null; to: string | null };
  searchQuery: string;
  setSite: (siteId: string | null) => void;
  setArea: (areaId: string | null) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
}

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      selectedSiteId: null,
      selectedAreaId: null,
      dateRange: { from: null, to: null },
      searchQuery: '',
      setSite: (selectedSiteId) => set({ selectedSiteId, selectedAreaId: null }),
      setArea: (selectedAreaId) => set({ selectedAreaId }),
      setDateRange: (from, to) => set({ dateRange: { from, to } }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      clearFilters: () =>
        set({
          selectedSiteId: null,
          selectedAreaId: null,
          dateRange: { from: null, to: null },
          searchQuery: '',
        }),
    }),
    {
      name: 'openqhse-filters',
    },
  ),
);
