/**
 * Type-safe API client for the OpenQHSE backend.
 *
 * Auth strategy:
 *   - Server components / Route handlers: call `auth()` from next-auth to get
 *     the session, then pass `session.accessToken` as a Bearer header.
 *   - Client components: use `getSession()` from next-auth/react (reads the
 *     httpOnly session cookie — never touches localStorage).
 *
 * NEVER use localStorage for tokens. All token storage is handled by NextAuth's
 * encrypted JWT in an httpOnly cookie.
 */

import { getSession } from "next-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const AI_BASE = process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8100";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// ── Response Types ─────────────────────────────────────────

export interface SidebarBadgesResponse {
  inspections: number;
  incidents: number;
  actions: number;
  permits: number;
  risks: number;
  documents: number;
  audits: number;
  training: number;
  equipment: number;
  notifications: number;
}

// ── Auth header helper ──────────────────────────────────────

/**
 * Obtains the access token from the NextAuth session (httpOnly cookie).
 * Works in client components only. For server components use `auth()` directly.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session?.accessToken) return {};
  return { Authorization: `Bearer ${session.accessToken}` };
}

/**
 * Pass a pre-fetched token from a server component (e.g. obtained via `auth()`).
 * This avoids a redundant getSession() call from within a server context.
 */
export function bearerHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// ── Core request ───────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const authHeaders = accessToken
    ? bearerHeaders(accessToken)
    : await getAuthHeaders();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    // Network-level failure (backend down, CORS preflight blocked, etc.)
    throw new ApiError(0, `Network error — cannot reach API at ${API_BASE}${endpoint}. Is the backend running?`);
  }

  if (response.status === 401) {
    // NextAuth will handle token refresh automatically on the next session read.
    // Redirect to login if we're in a browser context.
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ detail: "Unknown error" }))) as {
      detail: string;
    };
    throw new ApiError(response.status, error.detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Request helper for the AI Engine (separate service). */
async function aiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${AI_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ detail: "AI service error" }))) as {
      detail: string;
    };
    throw new ApiError(response.status, error.detail);
  }

  return response.json() as Promise<T>;
}

/** Multipart file upload — auth via session cookie, no localStorage. */
async function uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: authHeaders, // No Content-Type — browser sets multipart boundary
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new ApiError(response.status, (err as { detail: string }).detail);
  }

  return response.json() as Promise<T>;
}

/** Binary download (PDF, blob). Returns a Blob. */
async function downloadBlob(endpoint: string): Promise<Blob> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}${endpoint}`, { headers: authHeaders });

  if (!response.ok) throw new ApiError(response.status, "Download failed");
  return response.blob();
}

// ── Public API surface ─────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, token?: string) => request<T>(endpoint, {}, token),
  post: <T>(endpoint: string, data?: unknown, token?: string) =>
    request<T>(endpoint, { method: "POST", body: data ? JSON.stringify(data) : undefined }, token),
  patch: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) }, token),
  put: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) }, token),
  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "DELETE" }, token),

  // ── Auth ─────────────────────────────────────────────────
  auth: {
    me: () => request<Record<string, unknown>>("/auth/me"),
    updateProfile: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
    changePassword: (data: { current_password: string; new_password: string }) =>
      request<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    logout: (refreshToken: string) =>
      request<{ message: string }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, newPassword: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      }),
  },

  // ── Users ────────────────────────────────────────────────
  users: {
    list: (params?: string) =>
      request<Record<string, unknown>>(`/users${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/users/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
    assignSites: (id: string, siteIds: string[]) =>
      request<{ message: string }>(`/users/${id}/assign-sites`, {
        method: "POST",
        body: JSON.stringify({ site_ids: siteIds }),
      }),
    setPermissions: (id: string, permissions: Record<string, string[]>) =>
      request<{ message: string }>(`/users/${id}/set-permissions`, {
        method: "POST",
        body: JSON.stringify({ permissions }),
      }),
    activity: (id: string, params?: string) =>
      request<Record<string, unknown>>(`/users/${id}/activity${params ? `?${params}` : ""}`),
    bulkImport: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadFile<Record<string, unknown>>("/users/bulk-import", formData);
    },
  },

  // ── Inspections ──────────────────────────────────────────
  inspections: {
    list: (params?: string) =>
      request<Record<string, unknown>>(`/inspections${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/inspections/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/inspections", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/inspections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/inspections/${id}`, { method: "DELETE" }),
    start: (id: string) =>
      request<Record<string, unknown>>(`/inspections/${id}/start`, { method: "POST" }),
    complete: (id: string) =>
      request<Record<string, unknown>>(`/inspections/${id}/complete`, { method: "POST" }),
    cancel: (id: string) =>
      request<Record<string, unknown>>(`/inspections/${id}/cancel`, { method: "POST" }),
    kpis: () => request<Record<string, unknown>>("/inspections/kpis"),
    calendar: (month?: string) =>
      request<Record<string, unknown>[]>(
        `/inspections/calendar${month ? `?month=${month}` : ""}`,
      ),
    overdue: () => request<Record<string, unknown>[]>("/inspections/overdue"),
    scheduleBulk: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/inspections/schedule-bulk", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    byQr: (qrCode: string) =>
      request<Record<string, unknown>>(`/inspections/by-qr/${qrCode}`),
    report: (id: string) => downloadBlob(`/inspections/${id}/report`),
    templates: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(`/inspections/templates${params ? `?${params}` : ""}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/inspections/templates", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/inspections/templates/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
    findings: {
      list: (inspectionId: string) =>
        request<Record<string, unknown>[]>(`/inspections/${inspectionId}/findings`),
      create: (inspectionId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/inspections/${inspectionId}/findings`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (findingId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/inspections/findings/${findingId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
  },

  // ── Incidents ────────────────────────────────────────────
  incidents: {
    list: (params?: string) =>
      request<Record<string, unknown>>(`/incidents${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/incidents/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/incidents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/incidents/${id}`, { method: "DELETE" }),
    statistics: (params?: string) =>
      request<Record<string, unknown>>(`/incidents/statistics${params ? `?${params}` : ""}`),
    assignInvestigator: (id: string, investigatorId: string) =>
      request<Record<string, unknown>>(
        `/incidents/${id}/assign-investigator?investigator_id=${investigatorId}`,
        { method: "POST" },
      ),
    submitInvestigation: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/incidents/${id}/submit-investigation`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    close: (id: string) =>
      request<Record<string, unknown>>(`/incidents/${id}/close`, { method: "POST" }),
    reopen: (id: string) =>
      request<Record<string, unknown>>(`/incidents/${id}/reopen`, { method: "POST" }),
    report: (id: string) => downloadBlob(`/incidents/${id}/report`),
    actions: {
      list: (incidentId: string) =>
        request<Record<string, unknown>[]>(`/incidents/${incidentId}/actions`),
      create: (incidentId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/incidents/${incidentId}/actions`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (actionId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/incidents/actions/${actionId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
    witnesses: {
      add: (incidentId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/incidents/${incidentId}/witnesses`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    attachments: {
      add: (incidentId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/incidents/${incidentId}/attachments`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    timeline: {
      add: (incidentId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/incidents/${incidentId}/timeline-event`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
  },

  // ── Corrective Actions (CAPA) ──────────────────────────
  actions: {
    list: (params?: string) =>
      request<Record<string, unknown>[]>(`/actions${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/actions/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/actions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/actions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    myActions: () => request<Record<string, unknown>[]>("/actions/my-actions"),
    overdue: () => request<Record<string, unknown>[]>("/actions/overdue"),
    kanban: () => request<Record<string, unknown>>("/actions/kanban"),
    statistics: () => request<Record<string, unknown>>("/actions/statistics"),
    timeline: (id: string) => request<Record<string, unknown>[]>(`/actions/${id}/timeline`),
    assign: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/actions/${id}/assign`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    addProgress: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/actions/${id}/progress`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    requestVerification: (id: string) =>
      request<Record<string, unknown>>(`/actions/${id}/request-verification`, { method: "POST" }),
    verify: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/actions/${id}/verify`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    escalate: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/actions/${id}/escalate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    effectivenessCheck: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/actions/${id}/effectiveness-check`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    bulkAssign: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/actions/bulk-assign", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // ── Permits ──────────────────────────────────────────────
  permits: {
    list: (params?: string) =>
      request<Record<string, unknown>[]>(`/permits${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/permits/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/permits", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/permits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    extensions: {
      list: (permitId: string) =>
        request<Record<string, unknown>[]>(`/permits/${permitId}/extensions`),
      create: (permitId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/permits/${permitId}/extensions`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    submit: (id: string) =>
      request<Record<string, unknown>>(`/permits/${id}/submit`, { method: "POST" }),
    approve: (id: string) =>
      request<Record<string, unknown>>(`/permits/${id}/approve`, { method: "POST" }),
    reject: (id: string) =>
      request<Record<string, unknown>>(`/permits/${id}/reject`, { method: "POST" }),
    activate: (id: string) =>
      request<Record<string, unknown>>(`/permits/${id}/activate`, { method: "POST" }),
    suspend: (id: string) =>
      request<Record<string, unknown>>(`/permits/${id}/suspend`, { method: "POST" }),
    close: (id: string) =>
      request<Record<string, unknown>>(`/permits/${id}/close`, { method: "POST" }),
    checklist: (permitType: string) =>
      request<Record<string, unknown>[]>(`/permits/checklists/${permitType}`),
    gasLimits: () => request<Record<string, unknown>>("/permits/gas-limits"),
    validateGasReadings: (data: unknown) =>
      request<Record<string, unknown>[]>("/permits/validate-gas-readings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    qr: (id: string) => request<Record<string, unknown>>(`/permits/${id}/qr`),
    validateQr: (ref: string, token: string) =>
      request<Record<string, unknown>>(`/permits/validate-qr/${ref}/${token}`),
    statistics: () => request<Record<string, unknown>>("/permits/statistics"),
    checkConflicts: (params: string) =>
      request<Record<string, unknown>[]>(`/permits/check-conflicts?${params}`),
  },

  // ── Forms ────────────────────────────────────────────────
  forms: {
    templates: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(`/forms/templates${params ? `?${params}` : ""}`),
      get: (id: string) => request<Record<string, unknown>>(`/forms/templates/${id}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/forms/templates", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/forms/templates/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
    submissions: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(`/forms/submissions${params ? `?${params}` : ""}`),
      get: (id: string) => request<Record<string, unknown>>(`/forms/submissions/${id}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/forms/submissions", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/forms/submissions/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      report: (id: string) => downloadBlob(`/forms/submissions/${id}/report`),
    },
  },

  // ── Risks ────────────────────────────────────────────────
  risks: {
    list: (params?: string) =>
      request<Record<string, unknown>[]>(`/risks${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/risks/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/risks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/risks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    matrix: () => request<Record<string, unknown>>("/risks/matrix"),
    statistics: () => request<Record<string, unknown>>("/risks/statistics"),
    hazop: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(`/risks/hazop${params ? `?${params}` : ""}`),
      get: (id: string) => request<Record<string, unknown>>(`/risks/hazop/${id}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/risks/hazop", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      addNode: (studyId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/risks/hazop/${studyId}/nodes`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    bowtie: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(`/risks/bowtie${params ? `?${params}` : ""}`),
      get: (id: string) => request<Record<string, unknown>>(`/risks/bowtie/${id}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/risks/bowtie", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/risks/bowtie/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
  },

  // ── Documents ────────────────────────────────────────────
  documents: {
    list: (params?: string) =>
      request<Record<string, unknown>[]>(`/documents${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/documents/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/documents", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    versions: {
      list: (docId: string) =>
        request<Record<string, unknown>[]>(`/documents/${docId}/versions`),
      create: (docId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/documents/${docId}/versions`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    acknowledge: (docId: string, data?: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/documents/${docId}/acknowledge`, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      }),
  },

  // ── Training ─────────────────────────────────────────────
  training: {
    courses: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(`/training/courses${params ? `?${params}` : ""}`),
      get: (id: string) => request<Record<string, unknown>>(`/training/courses/${id}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/training/courses", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/training/courses/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
    enrollments: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(`/training/enrollments${params ? `?${params}` : ""}`),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/training/enrollments", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/training/enrollments/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
    competencies: {
      list: () => request<Record<string, unknown>[]>("/training/competencies"),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/training/competencies", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/training/competencies/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
  },

  // ── Equipment ────────────────────────────────────────────
  equipment: {
    list: (params?: string) =>
      request<Record<string, unknown>[]>(`/equipment${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/equipment/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/equipment", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/equipment/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/equipment/${id}`, { method: "DELETE" }),
  },

  // ── Notifications ────────────────────────────────────────
  notifications: {
    list: (params?: string) =>
      request<Record<string, unknown>[]>(`/notifications${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/notifications/${id}`),
    markAsRead: (id: string) =>
      request<Record<string, unknown>>(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllAsRead: () => request<void>("/notifications/read-all", { method: "PATCH" }),
  },

  // ── KPIs ─────────────────────────────────────────────────
  kpis: {
    list: (params?: string) =>
      request<Record<string, unknown>[]>(`/kpis${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/kpis/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/kpis", { method: "POST", body: JSON.stringify(data) }),
  },

  // ── Dashboard ────────────────────────────────────────────
  dashboard: {
    get: () => request<Record<string, unknown>>("/dashboard"),
  },

  // ── Analytics ────────────────────────────────────────────
  analytics: {
    kpis: (params?: string) =>
      request<Record<string, unknown>>(`/analytics/kpis${params ? `?${params}` : ""}`),
    incidentsTrend: (params?: string) =>
      request<Record<string, unknown>>(`/analytics/incidents-trend${params ? `?${params}` : ""}`),
    inspectionsCompliance: (params?: string) =>
      request<Record<string, unknown>>(
        `/analytics/inspections-compliance${params ? `?${params}` : ""}`,
      ),
    actionsSummary: (params?: string) =>
      request<Record<string, unknown>>(
        `/analytics/actions-summary${params ? `?${params}` : ""}`,
      ),
    riskMatrix: (params?: string) =>
      request<Record<string, unknown>>(`/analytics/risk-matrix${params ? `?${params}` : ""}`),
    trainingCompliance: (params?: string) =>
      request<Record<string, unknown>>(
        `/analytics/training-compliance${params ? `?${params}` : ""}`,
      ),
    widgets: (params?: string) =>
      request<Record<string, unknown>>(`/analytics/widgets${params ? `?${params}` : ""}`),
    badges: (params?: string) =>
      request<SidebarBadgesResponse>(`/analytics/badges${params ? `?${params}` : ""}`),
    exportPdf: (params?: string) => downloadBlob(`/analytics/export-pdf${params ? `?${params}` : ""}`),
    // KPI Alert Rules
    kpiAlertRules: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(
          `/analytics/kpi-alert-rules${params ? `?${params}` : ""}`,
        ),
      create: (data: Record<string, unknown>) =>
        request<Record<string, unknown>>("/analytics/kpi-alert-rules", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/analytics/kpi-alert-rules/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<void>(`/analytics/kpi-alert-rules/${id}`, { method: "DELETE" }),
    },
    // KPI Alerts (triggered instances)
    kpiAlerts: {
      list: (params?: string) =>
        request<Record<string, unknown>[]>(
          `/analytics/kpi-alerts${params ? `?${params}` : ""}`,
        ),
      acknowledge: (id: string, notes?: string) =>
        request<Record<string, unknown>>(`/analytics/kpi-alerts/${id}/acknowledge`, {
          method: "POST",
          body: JSON.stringify({ notes }),
        }),
      resolve: (id: string) =>
        request<Record<string, unknown>>(`/analytics/kpi-alerts/${id}/resolve`, {
          method: "POST",
        }),
    },
  },

  // ── Contractors ──────────────────────────────────────────
  contractors: {
    list: (params?: string) =>
      request<Record<string, unknown>>(`/contractors${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/contractors/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/contractors", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/contractors/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/contractors/${id}`, { method: "DELETE" }),
    approve: (id: string) =>
      request<Record<string, unknown>>(`/contractors/${id}/approve`, { method: "POST" }),
    suspend: (id: string, reason: string) =>
      request<Record<string, unknown>>(
        `/contractors/${id}/suspend?reason=${encodeURIComponent(reason)}`,
        { method: "POST" },
      ),
    reactivate: (id: string) =>
      request<Record<string, unknown>>(`/contractors/${id}/reactivate`, { method: "POST" }),
    workers: {
      list: (contractorId: string, params?: string) =>
        request<Record<string, unknown>[]>(
          `/contractors/${contractorId}/workers${params ? `?${params}` : ""}`,
        ),
      add: (contractorId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/contractors/${contractorId}/workers`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (contractorId: string, workerId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/contractors/${contractorId}/workers/${workerId}`, {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      recordInduction: (contractorId: string, workerId: string) =>
        request<Record<string, unknown>>(
          `/contractors/${contractorId}/workers/${workerId}/induction`,
          { method: "POST" },
        ),
    },
    complianceReport: (id: string) =>
      request<Record<string, unknown>>(`/contractors/${id}/compliance-report`),
    expiringDocuments: (days?: number) =>
      request<Record<string, unknown>[]>(
        `/contractors/expiring-documents${days ? `?days=${days}` : ""}`,
      ),
  },

  // ── BBS Observations ─────────────────────────────────────
  observations: {
    list: (params?: string) =>
      request<Record<string, unknown>>(`/observations${params ? `?${params}` : ""}`),
    get: (id: string) => request<Record<string, unknown>>(`/observations/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Record<string, unknown>>("/observations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/observations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/observations/${id}`, { method: "DELETE" }),
    review: (id: string) =>
      request<Record<string, unknown>>(`/observations/${id}/review`, { method: "POST" }),
    close: (id: string) =>
      request<Record<string, unknown>>(`/observations/${id}/close`, { method: "POST" }),
    statistics: (params?: string) =>
      request<Record<string, unknown>>(
        `/observations/statistics${params ? `?${params}` : ""}`,
      ),
    unsafeTrends: (params?: string) =>
      request<Record<string, unknown>[]>(
        `/observations/unsafe-trends${params ? `?${params}` : ""}`,
      ),
  },

  // ── AI Engine ────────────────────────────────────────────
  ai: {
    analyzeIncident: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/analyze-incident", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    predictRisk: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/predict-risk", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    classifyFinding: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/classify-finding", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    generateReport: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/generate-report", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ocrEvidence: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadFile<Record<string, unknown>>("/ai/ocr-evidence", formData);
    },
    analyzePhoto: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadFile<Record<string, unknown>>("/ai/analyze-photo", formData);
    },
    safetyChat: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/safety-chat", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    recommendations: (siteId: string, data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>(`/ai/recommendations/${siteId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    suggestControls: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/suggest-controls", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    patterns: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/analytics/patterns", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    riskScore: (siteId: string, data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>(`/ai/analytics/risk-score/${siteId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    repeatIssues: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/analytics/repeat-issues", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    benchmark: (data: Record<string, unknown>) =>
      aiRequest<Record<string, unknown>>("/ai/analytics/benchmark", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
