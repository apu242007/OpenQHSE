/**
 * OpenQHSE Mobile API Client
 *
 * Auth: expo-secure-store (native keychain) — NEVER AsyncStorage.
 * Offline: NetInfo connectivity check before each request.
 *          Mutations queued to WatermelonDB offline_queue table when offline.
 * Retry:   Automatic token refresh on 401, then retry once.
 *          On refresh failure → clearTokens() + navigate to /login.
 */

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// ── Constants ─────────────────────────────────────────────

const API_BASE: string =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiBaseUrl ??
  'http://localhost:8000/api/v1';

const TOKEN_KEY = 'openqhse_access_token';
const REFRESH_KEY = 'openqhse_refresh_token';

// ── Token helpers (SecureStore) ───────────────────────────

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// ── Errors ────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export class OfflineError extends Error {
  constructor() {
    super('No internet connection');
    this.name = 'OfflineError';
  }
}

// ── Connectivity check ────────────────────────────────────

async function assertOnline(): Promise<void> {
  const state = await NetInfo.fetch();
  if (!state.isConnected || !state.isInternetReachable) {
    throw new OfflineError();
  }
}

// ── Navigation callback (set by app bootstrap) ────────────

let _onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  _onSessionExpired = handler;
}

// ── Token refresh ─────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; refresh_token: string };
    await saveTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

// ── Core fetch wrapper ────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  _retry = true,
): Promise<T> {
  await assertOnline();

  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  // Auto-refresh on 401
  if (response.status === 401 && _retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(endpoint, options, false);
    }
    await clearTokens();
    _onSessionExpired?.();
    throw new ApiError(401, 'Session expired. Please sign in again.');
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

// ── File upload (FormData) ────────────────────────────────

export async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  await assertOnline();
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  // No Content-Type — fetch sets multipart/form-data boundary automatically

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new ApiError(response.status, (err as { detail: string }).detail);
  }
  return response.json() as Promise<T>;
}

// ── Offline Queue ─────────────────────────────────────────
// Queued requests are stored in WatermelonDB's offline_queue table.
// The SyncEngine processes them when connectivity is restored.

export interface QueuedRequest {
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotency_key: string;
  created_at: string;
  entity_type?: string;
  local_id?: string;
}

let _queueRequest: ((req: QueuedRequest) => Promise<void>) | null = null;

/** Register the WatermelonDB queue handler (called by SyncEngine at startup). */
export function setOfflineQueueHandler(
  handler: (req: QueuedRequest) => Promise<void>,
): void {
  _queueRequest = handler;
}

export async function queueRequest(request: QueuedRequest): Promise<void> {
  if (!_queueRequest) {
    // Fallback: persist to SecureStore as JSON list
    const existing = await SecureStore.getItemAsync('offline_queue');
    const queue: QueuedRequest[] = existing ? (JSON.parse(existing) as QueuedRequest[]) : [];
    queue.push(request);
    await SecureStore.setItemAsync('offline_queue', JSON.stringify(queue));
    return;
  }
  await _queueRequest(request);
}

// ── Mutation helper: online or queue ─────────────────────

async function mutateOrQueue<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  entityType?: string,
  localId?: string,
): Promise<T | null> {
  const netState = await NetInfo.fetch();
  const online = netState.isConnected && netState.isInternetReachable;

  if (online) {
    return apiFetch<T>(endpoint, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  // Offline — queue for later
  await queueRequest({
    endpoint,
    method,
    body,
    idempotency_key: `${method}-${endpoint}-${Date.now()}`,
    created_at: new Date().toISOString(),
    entity_type: entityType,
    local_id: localId,
  });
  return null;
}

// ── Auth ──────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const data = await apiFetch<{ access_token: string; refresh_token: string; expires_in: number }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    await saveTokens(data.access_token, data.refresh_token);
    return data;
  },

  logout: async (refreshToken: string) => {
    await apiFetch<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    await clearTokens();
  },

  me: () => apiFetch<Record<string, unknown>>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};

// ── Inspections ───────────────────────────────────────────

export const inspectionsApi = {
  list: (params?: string) =>
    apiFetch<Record<string, unknown>>(`/inspections${params ? `?${params}` : ''}`),

  get: (id: string) => apiFetch<Record<string, unknown>>(`/inspections/${id}`),

  create: (data: Record<string, unknown>, localId?: string) =>
    mutateOrQueue('/inspections', 'POST', data, 'inspection', localId),

  update: (id: string, data: Record<string, unknown>) =>
    mutateOrQueue(`/inspections/${id}`, 'PATCH', data, 'inspection', id),

  delete: (id: string) =>
    mutateOrQueue(`/inspections/${id}`, 'DELETE', undefined, 'inspection', id),

  start: (id: string) =>
    apiFetch<Record<string, unknown>>(`/inspections/${id}/start`, { method: 'POST' }),

  complete: (id: string, data: Record<string, unknown>) =>
    mutateOrQueue(`/inspections/${id}/complete`, 'POST', data, 'inspection', id),

  cancel: (id: string, reason: string) =>
    mutateOrQueue(`/inspections/${id}/cancel`, 'POST', { reason }, 'inspection', id),

  getReport: (id: string) =>
    apiFetch<Blob>(`/inspections/${id}/report`),

  calendar: (start: string, end: string, siteId?: string) =>
    apiFetch<Record<string, unknown>[]>(
      `/inspections/calendar?start=${start}&end=${end}${siteId ? `&site_id=${siteId}` : ''}`,
    ),

  overdue: () => apiFetch<Record<string, unknown>[]>('/inspections/overdue'),

  scheduleBulk: (data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>[]>('/inspections/schedule-bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  byQr: (qr: string) =>
    apiFetch<Record<string, unknown>>(`/inspections/by-qr/${qr}`),

  findings: {
    list: (inspectionId: string) =>
      apiFetch<Record<string, unknown>[]>(`/inspections/${inspectionId}/findings`),

    create: (inspectionId: string, data: Record<string, unknown>, localId?: string) =>
      mutateOrQueue(
        `/inspections/${inspectionId}/findings`,
        'POST',
        data,
        'finding',
        localId,
      ),

    update: (findingId: string, data: Record<string, unknown>) =>
      mutateOrQueue(`/inspections/findings/${findingId}`, 'PATCH', data, 'finding', findingId),
  },
};

// ── Incidents ─────────────────────────────────────────────

export const incidentsApi = {
  list: (params?: string) =>
    apiFetch<Record<string, unknown>>(`/incidents${params ? `?${params}` : ''}`),

  get: (id: string) => apiFetch<Record<string, unknown>>(`/incidents/${id}`),

  create: (data: Record<string, unknown>, localId?: string) =>
    mutateOrQueue('/incidents', 'POST', data, 'incident', localId),

  update: (id: string, data: Record<string, unknown>) =>
    mutateOrQueue(`/incidents/${id}`, 'PATCH', data, 'incident', id),

  delete: (id: string) =>
    mutateOrQueue(`/incidents/${id}`, 'DELETE', undefined, 'incident', id),

  statistics: (params?: string) =>
    apiFetch<Record<string, unknown>>(`/incidents/statistics${params ? `?${params}` : ''}`),

  assignInvestigator: (id: string, investigatorId: string) =>
    apiFetch<Record<string, unknown>>(
      `/incidents/${id}/assign-investigator?investigator_id=${investigatorId}`,
      { method: 'POST' },
    ),

  submitInvestigation: (id: string, data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/incidents/${id}/submit-investigation`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  close: (id: string, data?: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/incidents/${id}/close`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  reopen: (id: string, reason: string) =>
    apiFetch<Record<string, unknown>>(`/incidents/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  addWitness: (id: string, data: Record<string, unknown>, localId?: string) =>
    mutateOrQueue(`/incidents/${id}/witnesses`, 'POST', data, 'witness', localId),

  addAttachment: (id: string, file: FormData) =>
    uploadFile<Record<string, unknown>>(`/incidents/${id}/attachments`, file),

  addTimelineEvent: (id: string, data: Record<string, unknown>, localId?: string) =>
    mutateOrQueue(`/incidents/${id}/timeline-event`, 'POST', data, 'timeline', localId),
};

// ── Permits ───────────────────────────────────────────────

export const permitsApi = {
  list: (params?: string) =>
    apiFetch<Record<string, unknown>>(`/permits${params ? `?${params}` : ''}`),

  get: (id: string) => apiFetch<Record<string, unknown>>(`/permits/${id}`),

  create: (data: Record<string, unknown>, localId?: string) =>
    mutateOrQueue('/permits', 'POST', data, 'permit', localId),

  update: (id: string, data: Record<string, unknown>) =>
    mutateOrQueue(`/permits/${id}`, 'PATCH', data, 'permit', id),

  submit: (id: string) =>
    apiFetch<Record<string, unknown>>(`/permits/${id}/submit`, { method: 'POST' }),

  approve: (id: string) =>
    apiFetch<Record<string, unknown>>(`/permits/${id}/approve`, { method: 'POST' }),

  reject: (id: string) =>
    apiFetch<Record<string, unknown>>(`/permits/${id}/reject`, { method: 'POST' }),

  activate: (id: string) =>
    apiFetch<Record<string, unknown>>(`/permits/${id}/activate`, { method: 'POST' }),

  suspend: (id: string) =>
    apiFetch<Record<string, unknown>>(`/permits/${id}/suspend`, { method: 'POST' }),

  close: (id: string) =>
    apiFetch<Record<string, unknown>>(`/permits/${id}/close`, { method: 'POST' }),

  validateQr: (ref: string, token: string) =>
    apiFetch<Record<string, unknown>>(`/permits/validate-qr/${ref}/${token}`),
};

// ── Corrective Actions ────────────────────────────────────

export const actionsApi = {
  list: (params?: string) =>
    apiFetch<Record<string, unknown>[]>(`/actions${params ? `?${params}` : ''}`),

  get: (id: string) => apiFetch<Record<string, unknown>>(`/actions/${id}`),

  create: (data: Record<string, unknown>, localId?: string) =>
    mutateOrQueue('/actions', 'POST', data, 'action', localId),

  update: (id: string, data: Record<string, unknown>) =>
    mutateOrQueue(`/actions/${id}`, 'PATCH', data, 'action', id),

  myActions: () => apiFetch<Record<string, unknown>[]>('/actions/my-actions'),

  addProgress: (id: string, data: Record<string, unknown>) =>
    mutateOrQueue(`/actions/${id}/progress`, 'POST', data, 'action', id),

  requestVerification: (id: string) =>
    apiFetch<Record<string, unknown>>(`/actions/${id}/request-verification`, { method: 'POST' }),

  verify: (id: string, data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/actions/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Observations (BBS) ────────────────────────────────────

export const observationsApi = {
  list: (params?: string) =>
    apiFetch<Record<string, unknown>>(`/observations${params ? `?${params}` : ''}`),

  create: (data: Record<string, unknown>, localId?: string) =>
    mutateOrQueue('/observations', 'POST', data, 'observation', localId),

  get: (id: string) => apiFetch<Record<string, unknown>>(`/observations/${id}`),
};

// ── Equipment ─────────────────────────────────────────────

export const equipmentApi = {
  getByQr: (tag: string) =>
    apiFetch<Record<string, unknown>>(`/equipment?asset_tag=${tag}`),

  get: (id: string) => apiFetch<Record<string, unknown>>(`/equipment/${id}`),
};
