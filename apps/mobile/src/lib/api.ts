/**
 * Mobile API client — mirrors the web api-client but for React Native.
 * Uses SecureStore tokens and handles refresh.
 */

import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

import { useAuthStore } from '../stores/auth-store';

const API_BASE: string =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiBaseUrl ??
  'http://localhost:8000/api/v1';

// ── Error class ────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

// ── Request core ───────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const { accessToken, refreshToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Token refresh
  if (response.status === 401 && retry && refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshRes.ok) {
        const data = (await refreshRes.json()) as {
          access_token: string;
          refresh_token: string;
        };
        const { user, setAuth } = useAuthStore.getState();
        if (user) {
          await setAuth(user, data.access_token, data.refresh_token);
        }
        return request<T>(endpoint, options, false);
      }
    } catch {
      // refresh failed — logout
    }
    await useAuthStore.getState().logout();
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ detail: 'Unknown error' }))) as {
      detail: string;
    };
    throw new ApiError(response.status, error.detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ── File upload helper ─────────────────────────────────────

async function uploadFile(localUri: string): Promise<{ url: string }> {
  const { accessToken } = useAuthStore.getState();

  const result = await FileSystem.uploadAsync(`${API_BASE}/uploads`, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (result.status !== 200 && result.status !== 201) {
    throw new ApiError(result.status, 'File upload failed');
  }

  return JSON.parse(result.body) as { url: string };
}

// ── Public API ─────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  uploadFile,

  // ── Auth shortcuts ───────────────────────────────────────
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; refresh_token: string; expires_in: number }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    me: () => request<Record<string, unknown>>('/auth/me'),
  },

  // ── Permits (QR validate) ────────────────────────────────
  permits: {
    validateQr: (qrToken: string) =>
      request<Record<string, unknown>>(`/permits/validate-qr/${qrToken}`),
    get: (id: string) =>
      request<Record<string, unknown>>(`/permits/${id}`),
  },

  // ── Equipment ────────────────────────────────────────────
  equipment: {
    getByTag: (tag: string) =>
      request<Record<string, unknown>>(`/equipment?asset_tag=${tag}`),
    get: (id: string) =>
      request<Record<string, unknown>>(`/equipment/${id}`),
  },
};
