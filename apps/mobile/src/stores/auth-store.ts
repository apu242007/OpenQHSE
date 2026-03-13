/**
 * Zustand store for authentication state (mobile).
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  site_id?: string;
  site_name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, access: string, refresh: string) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'openqhse_tokens';
const USER_KEY = 'openqhse_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, access, refresh) => {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify({ access, refresh }));
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  loadFromStorage: async () => {
    try {
      const tokensRaw = await SecureStore.getItemAsync(TOKEN_KEY);
      const userRaw = await SecureStore.getItemAsync(USER_KEY);

      if (tokensRaw && userRaw) {
        const tokens = JSON.parse(tokensRaw) as { access: string; refresh: string };
        const user = JSON.parse(userRaw) as User;
        set({
          user,
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
