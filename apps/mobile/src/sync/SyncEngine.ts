/**
 * SyncEngine — bidirectional offline sync between WatermelonDB and the API.
 *
 * Strategy
 * --------
 * 1. On reconnect  → verify token validity → push pending → pull fresh data
 * 2. Session check → if token expired while offline, sets `requiresReLogin`
 *                    flag so the router can redirect to /login before syncing
 * 3. Conflict resolution (per entity type):
 *    - Forms/templates : last-write-wins  (server timestamp wins ties)
 *    - Incidents       : merge strategy   (local data is NEVER discarded)
 *    - Permits/perms   : server-wins      (server is always source of truth)
 *    - Actions         : merge updates    (latest progress_notes accumulate)
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import { database, SubmissionQueue, IncidentQueue } from '../db';
import { api, ApiError } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';
import { useSyncStore } from '../stores/sync-store';

// ── Types ──────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

/** Determines how conflicts are resolved for each entity type. */
type ConflictStrategy =
  | 'last-write-wins'   // compare updated_at; server wins on tie
  | 'server-wins'       // remote always overwrites local
  | 'merge-incident'    // local data preserved; server data supplements
  | 'merge-actions';    // progress_notes arrays are concatenated

/** Maps table names to their conflict strategy. */
const TABLE_CONFLICT_STRATEGY: Record<string, ConflictStrategy> = {
  forms_cache: 'last-write-wins',
  inspections_cache: 'last-write-wins',
  incidents_queue: 'merge-incident',
  permits_cache: 'server-wins',
  actions_cache: 'merge-actions',
  equipment_cache: 'server-wins',
};

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

// ── Helpers ────────────────────────────────────────────────

function now() {
  return Date.now();
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
}

/** Returns true when a token is still valid by probing /auth/me. */
async function isSessionValid(): Promise<boolean> {
  try {
    await api.auth.me();
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return false;
    // Network error — we can't tell, assume valid to avoid unnecessary logouts
    return true;
  }
}

// ── Engine ─────────────────────────────────────────────────

class _SyncEngine {
  private _syncing = false;
  private _unsubscribe: (() => void) | null = null;

  /** Start listening for connectivity changes. */
  start() {
    this._unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const store = useSyncStore.getState();
      if (state.isConnected && state.isInternetReachable) {
        if (store.status === 'offline') {
          store.setStatus('idle');
          // Auto-sync on reconnect — session check happens inside
          this.syncOnConnect();
        }
      } else {
        store.setStatus('offline');
      }
    });
  }

  /** Stop listening. */
  stop() {
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  // ── Full sync on reconnect ─────────────────────────────

  async syncOnConnect(): Promise<SyncResult> {
    if (this._syncing) return { pushed: 0, pulled: 0, errors: ['Sync already in progress'] };

    const store = useSyncStore.getState();
    const auth = useAuthStore.getState();

    // ── Session expiry check ───────────────────────────────
    // If the user was offline for a long time the access token may have
    // expired.  We check silently; if expired we trigger re-login instead of
    // showing a generic 401 error mid-sync.
    if (auth.isAuthenticated) {
      const valid = await isSessionValid();
      if (!valid) {
        store.setStatus('error');
        store.setError('session_expired');
        // Logout clears the token but keeps local WatermelonDB data intact
        // so the user does not lose any offline work.
        await auth.logout();
        return { pushed: 0, pulled: 0, errors: ['session_expired'] };
      }
    }

    this._syncing = true;
    store.setStatus('syncing');
    store.setProgress(0);

    const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };

    try {
      // Step 1: push pending submissions
      const pushResult = await this.pushPendingSubmissions();
      result.pushed = pushResult.pushed;
      result.errors.push(...pushResult.errors);
      store.setProgress(40);

      // Step 2: push pending incidents
      const incidentResult = await this.pushPendingIncidents();
      result.pushed += incidentResult.pushed;
      result.errors.push(...incidentResult.errors);
      store.setProgress(60);

      // Step 3: pull latest server data
      const pullResult = await this.pullLatestData();
      result.pulled = pullResult.pulled;
      result.errors.push(...pullResult.errors);
      store.setProgress(100);

      store.setStatus(result.errors.length > 0 ? 'error' : 'idle');
      store.setLastSynced(now());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown sync error';
      result.errors.push(msg);
      store.setStatus('error');
      store.setError(msg);
    } finally {
      this._syncing = false;
    }

    return result;
  }

  // ── Push submissions ───────────────────────────────────

  async pushPendingSubmissions(): Promise<{ pushed: number; errors: string[] }> {
    const pushed: string[] = [];
    const errors: string[] = [];

    const pendingSubmissions = await database
      .get<SubmissionQueue>('submissions_queue')
      .query()
      .fetch();

    const pending = pendingSubmissions.filter((s: SubmissionQueue) => s.pendingSync);

    for (const submission of pending) {
      try {
        // Upload attachments first
        const attachments = submission.attachmentsJson ?? [];
        const uploadedUrls: string[] = [];
        for (const localUri of attachments) {
          if (localUri.startsWith('http')) {
            uploadedUrls.push(localUri);
            continue;
          }
          try {
            const uploadResult = await api.uploadFile(localUri);
            uploadedUrls.push(uploadResult.url);
          } catch {
            uploadedUrls.push(localUri); // keep local URI, will retry next sync
          }
        }

        const payload = {
          template_id: submission.formServerId,
          answers: submission.answersJson,
          attachments: uploadedUrls,
          latitude: submission.latitude,
          longitude: submission.longitude,
          started_at: new Date(submission.startedAt).toISOString(),
          completed_at: submission.completedAt
            ? new Date(submission.completedAt).toISOString()
            : undefined,
        };

        const result = await api.post('/forms/submissions', payload);

        await database.write(async () => {
          await submission.update((s: SubmissionQueue) => {
            s.serverId = (result as { id: string }).id;
            s.pendingSync = false;
            s.syncedAt = now();
            s.syncError = '';
          });
        });

        pushed.push(submission.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        errors.push(`Submission ${submission.id}: ${msg}`);

        await database.write(async () => {
          await submission.update((s: SubmissionQueue) => {
            s.syncError = msg;
          });
        });
      }
    }

    useSyncStore.getState().setPendingCount(
      (await database.get<SubmissionQueue>('submissions_queue').query().fetch())
        .filter((s: SubmissionQueue) => s.pendingSync).length,
    );

    return { pushed: pushed.length, errors };
  }

  // ── Push incidents ─────────────────────────────────────

  async pushPendingIncidents(): Promise<{ pushed: number; errors: string[] }> {
    const pushed: string[] = [];
    const errors: string[] = [];

    const allIncidents = await database
      .get<IncidentQueue>('incidents_queue')
      .query()
      .fetch();

    const pending = allIncidents.filter((i: IncidentQueue) => i.pendingSync);

    for (const incident of pending) {
      try {
        // Upload photos
        const photos = incident.photosJson ?? [];
        const uploadedUrls: string[] = [];
        for (const localUri of photos) {
          if (localUri.startsWith('http')) {
            uploadedUrls.push(localUri);
            continue;
          }
          try {
            const uploadResult = await api.uploadFile(localUri);
            uploadedUrls.push(uploadResult.url);
          } catch {
            uploadedUrls.push(localUri);
          }
        }

        const payload = {
          title: incident.title,
          description: incident.description,
          incident_type: incident.incidentType,
          severity: incident.severity,
          location: incident.location,
          area: incident.area,
          latitude: incident.latitude,
          longitude: incident.longitude,
          photos: uploadedUrls,
          audio_url: incident.audioUri,
          occurred_at: new Date(incident.occurredAt).toISOString(),
        };

        const result = await api.post('/incidents', payload);

        await database.write(async () => {
          await incident.update((i: IncidentQueue) => {
            i.serverId = (result as { id: string }).id;
            i.pendingSync = false;
            i.syncedAt = now();
            i.syncError = '';
          });
        });

        pushed.push(incident.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        errors.push(`Incident ${incident.id}: ${msg}`);

        await database.write(async () => {
          await incident.update((i: IncidentQueue) => {
            i.syncError = msg;
          });
        });
      }
    }

    return { pushed: pushed.length, errors };
  }

  // ── Pull latest data ───────────────────────────────────

  async pullLatestData(): Promise<{ pulled: number; errors: string[] }> {
    let pulled = 0;
    const errors: string[] = [];

    try {
      // Pull form templates
      const templates = await api.get<{
        id: string;
        title: string;
        description: string;
        category: string;
        fields: unknown[];
        version: number;
      }[]>('/forms/templates?is_active=true');

      for (const t of templates) {
        await this._upsertCache('forms_cache', t.id, {
          server_id: t.id,
          title: t.title,
          description: t.description ?? '',
          category: t.category ?? '',
          schema_json: JSON.stringify(t.fields ?? []),
          version: t.version ?? 1,
          is_active: true,
          synced_at: now(),
          updated_at: now(),
        });
        pulled++;
      }
    } catch (err) {
      errors.push(`Forms pull: ${err instanceof Error ? err.message : 'failed'}`);
    }

    try {
      // Pull active permits
      const permits = await api.get<Record<string, unknown>[]>('/permits?status=active');
      for (const p of permits) {
        await this._upsertCache('permits_cache', p.id as string, {
          server_id: p.id as string,
          permit_number: (p.permit_number ?? '') as string,
          permit_type: (p.permit_type ?? '') as string,
          title: (p.title ?? '') as string,
          status: (p.status ?? '') as string,
          location: (p.location ?? '') as string,
          valid_from: p.valid_from
            ? new Date(p.valid_from as string).getTime()
            : now(),
          valid_until: p.valid_until
            ? new Date(p.valid_until as string).getTime()
            : now(),
          issued_to_name: (p.issued_to_name ?? '') as string,
          workers_json: JSON.stringify(p.authorized_workers ?? []),
          qr_token: (p.qr_token ?? '') as string,
          checklist_json: JSON.stringify(p.checklist ?? []),
          synced_at: now(),
          updated_at: now(),
        });
        pulled++;
      }
    } catch (err) {
      errors.push(`Permits pull: ${err instanceof Error ? err.message : 'failed'}`);
    }

    try {
      // Pull my actions
      const actions = await api.get<Record<string, unknown>[]>('/actions/my-actions');
      for (const a of actions) {
        await this._upsertCache('actions_cache', a.id as string, {
          server_id: a.id as string,
          title: (a.title ?? '') as string,
          description: (a.description ?? '') as string,
          status: (a.status ?? '') as string,
          priority: (a.priority ?? 'medium') as string,
          due_date: a.due_date
            ? new Date(a.due_date as string).getTime()
            : null,
          assigned_to_name: (a.assigned_to_name ?? '') as string,
          source_type: (a.source_type ?? '') as string,
          source_id: (a.source_id ?? '') as string,
          progress_notes_json: JSON.stringify(a.progress_notes ?? []),
          pending_sync: false,
          synced_at: now(),
          updated_at: now(),
        });
        pulled++;
      }
    } catch (err) {
      errors.push(`Actions pull: ${err instanceof Error ? err.message : 'failed'}`);
    }

    return { pulled, errors };
  }

  // ── Pending count helper ───────────────────────────────

  async getPendingCount(): Promise<number> {
    const submissions = await database
      .get<SubmissionQueue>('submissions_queue')
      .query()
      .fetch();
    const incidents = await database
      .get<IncidentQueue>('incidents_queue')
      .query()
      .fetch();
    return (
      submissions.filter((s: SubmissionQueue) => s.pendingSync).length +
      incidents.filter((i: IncidentQueue) => i.pendingSync).length
    );
  }

  // ── Conflict resolution ────────────────────────────────

  /**
   * Resolve a conflict between a local record and incoming server data.
   *
   * @param tableName     WatermelonDB table (drives strategy lookup)
   * @param localRecord   Current local record
   * @param serverData    Incoming data from the server
   * @returns Merged/resolved data that should be persisted, or `null` to skip update
   */
  resolveConflict(
    tableName: string,
    localRecord: Record<string, unknown>,
    serverData: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const strategy: ConflictStrategy =
      TABLE_CONFLICT_STRATEGY[tableName] ?? 'last-write-wins';

    switch (strategy) {
      // ── server-wins: always overwrite with server data ──────────────
      case 'server-wins':
        return serverData;

      // ── last-write-wins: compare updated_at timestamps ──────────────
      case 'last-write-wins': {
        const localTs = (localRecord.updated_at as number) ?? 0;
        const serverTs = (serverData.updated_at as number) ?? now();
        // Server wins on equal timestamps
        return serverTs >= localTs ? serverData : null;
      }

      // ── merge-incident: NEVER discard local incident data ───────────
      //    Server data supplements local: if a field is non-empty locally
      //    and empty on server, keep the local value.
      case 'merge-incident': {
        const merged: Record<string, unknown> = { ...serverData };
        for (const [key, localVal] of Object.entries(localRecord)) {
          const serverVal = serverData[key];
          // Keep local value when server is empty/null but local is not
          const serverEmpty =
            serverVal === null ||
            serverVal === undefined ||
            serverVal === '' ||
            serverVal === '[]';
          const localHasData =
            localVal !== null && localVal !== undefined && localVal !== '' && localVal !== '[]';
          if (serverEmpty && localHasData) {
            merged[key] = localVal;
          }
        }
        // Never overwrite pending_sync back to false if local has unsynced changes
        if (localRecord.pending_sync === true) {
          merged.pending_sync = true;
        }
        return merged;
      }

      // ── merge-actions: accumulate progress_notes from both sides ────
      case 'merge-actions': {
        const localNotes = _parseJsonArray(localRecord.progress_notes_json as string);
        const serverNotes = _parseJsonArray(serverData.progress_notes_json as string);

        // Deduplicate by id; server notes take precedence for same id
        const noteMap = new Map<string, unknown>();
        for (const note of localNotes) {
          noteMap.set(
            (note as Record<string, string>).id ?? String(Math.random()),
            note,
          );
        }
        for (const note of serverNotes) {
          noteMap.set(
            (note as Record<string, string>).id ?? String(Math.random()),
            note,
          );
        }

        const mergedNotes = Array.from(noteMap.values()).sort((a, b) => {
          const ta = (a as Record<string, number>).created_at ?? 0;
          const tb = (b as Record<string, number>).created_at ?? 0;
          return ta - tb;
        });

        return {
          ...serverData,
          progress_notes_json: JSON.stringify(mergedNotes),
          // Preserve local pending flag if action has unsynced updates
          pending_sync:
            (localRecord.pending_sync as boolean) || (serverData.pending_sync as boolean) || false,
        };
      }
    }
  }

  // ── Internal: upsert cache record ──────────────────────

  private async _upsertCache(
    tableName: string,
    serverId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const collection = database.get(tableName);
    const existing = await collection.query().fetch();
    const match = existing.find(
      (r: Record<string, unknown>) =>
        (r as unknown as { serverId: string }).serverId === serverId,
    );

    await database.write(async () => {
      if (match) {
        const localRecord: Record<string, unknown> = {};
        // Snapshot local record fields
        for (const key of Object.keys(data)) {
          const snakeKey = key;
          const camelKey = _snakeToCamel(snakeKey);
          localRecord[snakeKey] =
            (match as unknown as Record<string, unknown>)[camelKey] ??
            (match as unknown as Record<string, unknown>)[snakeKey];
        }

        const resolved = this.resolveConflict(tableName, localRecord, data);
        if (resolved === null) return; // local is newer — skip

        await (
          match as {
            update: (fn: (r: Record<string, unknown>) => void) => Promise<void>;
          }
        ).update((record: Record<string, unknown>) => {
          Object.entries(resolved).forEach(([key, val]) => {
            record[key] = val;
          });
        });
      } else {
        await collection.create((record: Record<string, unknown>) => {
          Object.entries(data).forEach(([key, val]) => {
            record[key] = val;
          });
        });
      }
    });
  }
}

// ── Module-level helpers ───────────────────────────────────

function _parseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Convert snake_case to camelCase for WatermelonDB property access. */
function _snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export const SyncEngine = new _SyncEngine();

import { database, SubmissionQueue, IncidentQueue } from '../db';
import { api } from '../lib/api';
import { useSyncStore } from '../stores/sync-store';

// ── Types ──────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

// ── Helpers ────────────────────────────────────────────────

function now() {
  return Date.now();
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
}

// ── Engine ─────────────────────────────────────────────────

class _SyncEngine {
  private _syncing = false;
  private _unsubscribe: (() => void) | null = null;

  /** Start listening for connectivity changes. */
  start() {
    this._unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const store = useSyncStore.getState();
      if (state.isConnected && state.isInternetReachable) {
        if (store.status === 'offline') {
          store.setStatus('idle');
          // Auto-sync on reconnect
          this.syncOnConnect();
        }
      } else {
        store.setStatus('offline');
      }
    });
  }

  /** Stop listening. */
  stop() {
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  // ── Full sync on reconnect ─────────────────────────────

  async syncOnConnect(): Promise<SyncResult> {
    if (this._syncing) return { pushed: 0, pulled: 0, errors: ['Sync already in progress'] };

    const store = useSyncStore.getState();
    this._syncing = true;
    store.setStatus('syncing');
    store.setProgress(0);

    const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };

    try {
      // Step 1: push pending
      const pushResult = await this.pushPendingSubmissions();
      result.pushed = pushResult.pushed;
      result.errors.push(...pushResult.errors);
      store.setProgress(40);

      const incidentResult = await this.pushPendingIncidents();
      result.pushed += incidentResult.pushed;
      result.errors.push(...incidentResult.errors);
      store.setProgress(60);

      // Step 2: pull latest
      const pullResult = await this.pullLatestData();
      result.pulled = pullResult.pulled;
      result.errors.push(...pullResult.errors);
      store.setProgress(100);

      store.setStatus(result.errors.length > 0 ? 'error' : 'idle');
      store.setLastSynced(now());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown sync error';
      result.errors.push(msg);
      store.setStatus('error');
      store.setError(msg);
    } finally {
      this._syncing = false;
    }

    return result;
  }

  // ── Push submissions ───────────────────────────────────

  async pushPendingSubmissions(): Promise<{ pushed: number; errors: string[] }> {
    const pushed: string[] = [];
    const errors: string[] = [];

    const pendingSubmissions = await database
      .get<SubmissionQueue>('submissions_queue')
      .query()
      .fetch();

    const pending = pendingSubmissions.filter((s: SubmissionQueue) => s.pendingSync);

    for (const submission of pending) {
      try {
        // Upload attachments first
        const attachments = submission.attachmentsJson ?? [];
        const uploadedUrls: string[] = [];
        for (const localUri of attachments) {
          if (localUri.startsWith('http')) {
            uploadedUrls.push(localUri);
            continue;
          }
          try {
            const uploadResult = await api.uploadFile(localUri);
            uploadedUrls.push(uploadResult.url);
          } catch {
            uploadedUrls.push(localUri); // keep local URI, will retry
          }
        }

        // Submit to server
        const payload = {
          template_id: submission.formServerId,
          answers: submission.answersJson,
          attachments: uploadedUrls,
          latitude: submission.latitude,
          longitude: submission.longitude,
          started_at: new Date(submission.startedAt).toISOString(),
          completed_at: submission.completedAt
            ? new Date(submission.completedAt).toISOString()
            : undefined,
        };

        const result = await api.post('/forms/submissions', payload);

        // Mark as synced
        await database.write(async () => {
          await submission.update((s: SubmissionQueue) => {
            s.serverId = (result as { id: string }).id;
            s.pendingSync = false;
            s.syncedAt = now();
            s.syncError = '';
          });
        });

        pushed.push(submission.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        errors.push(`Submission ${submission.id}: ${msg}`);

        await database.write(async () => {
          await submission.update((s: SubmissionQueue) => {
            s.syncError = msg;
          });
        });
      }
    }

    useSyncStore.getState().setPendingCount(
      (await database.get<SubmissionQueue>('submissions_queue').query().fetch())
        .filter((s: SubmissionQueue) => s.pendingSync).length,
    );

    return { pushed: pushed.length, errors };
  }

  // ── Push incidents ─────────────────────────────────────

  async pushPendingIncidents(): Promise<{ pushed: number; errors: string[] }> {
    const pushed: string[] = [];
    const errors: string[] = [];

    const allIncidents = await database
      .get<IncidentQueue>('incidents_queue')
      .query()
      .fetch();

    const pending = allIncidents.filter((i: IncidentQueue) => i.pendingSync);

    for (const incident of pending) {
      try {
        // Upload photos
        const photos = incident.photosJson ?? [];
        const uploadedUrls: string[] = [];
        for (const localUri of photos) {
          if (localUri.startsWith('http')) {
            uploadedUrls.push(localUri);
            continue;
          }
          try {
            const uploadResult = await api.uploadFile(localUri);
            uploadedUrls.push(uploadResult.url);
          } catch {
            uploadedUrls.push(localUri);
          }
        }

        const payload = {
          title: incident.title,
          description: incident.description,
          incident_type: incident.incidentType,
          severity: incident.severity,
          location: incident.location,
          area: incident.area,
          latitude: incident.latitude,
          longitude: incident.longitude,
          photos: uploadedUrls,
          audio_url: incident.audioUri,
          occurred_at: new Date(incident.occurredAt).toISOString(),
        };

        const result = await api.post('/incidents', payload);

        await database.write(async () => {
          await incident.update((i: IncidentQueue) => {
            i.serverId = (result as { id: string }).id;
            i.pendingSync = false;
            i.syncedAt = now();
            i.syncError = '';
          });
        });

        pushed.push(incident.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        errors.push(`Incident ${incident.id}: ${msg}`);

        await database.write(async () => {
          await incident.update((i: IncidentQueue) => {
            i.syncError = msg;
          });
        });
      }
    }

    return { pushed: pushed.length, errors };
  }

  // ── Pull latest data ───────────────────────────────────

  async pullLatestData(): Promise<{ pulled: number; errors: string[] }> {
    let pulled = 0;
    const errors: string[] = [];

    try {
      // Pull form templates
      const templates = await api.get<{ id: string; title: string; description: string; category: string; fields: unknown[]; version: number }[]>(
        '/forms/templates?is_active=true',
      );
      for (const t of templates) {
        await this._upsertCache('forms_cache', t.id, {
          server_id: t.id,
          title: t.title,
          description: t.description ?? '',
          category: t.category ?? '',
          schema_json: JSON.stringify(t.fields ?? []),
          version: t.version ?? 1,
          is_active: true,
          synced_at: now(),
          updated_at: now(),
        });
        pulled++;
      }
    } catch (err) {
      errors.push(`Forms pull: ${err instanceof Error ? err.message : 'failed'}`);
    }

    try {
      // Pull active permits
      const permits = await api.get<Record<string, unknown>[]>('/permits?status=active');
      for (const p of permits) {
        await this._upsertCache('permits_cache', p.id as string, {
          server_id: p.id as string,
          permit_number: (p.permit_number ?? '') as string,
          permit_type: (p.permit_type ?? '') as string,
          title: (p.title ?? '') as string,
          status: (p.status ?? '') as string,
          location: (p.location ?? '') as string,
          valid_from: p.valid_from ? new Date(p.valid_from as string).getTime() : now(),
          valid_until: p.valid_until ? new Date(p.valid_until as string).getTime() : now(),
          issued_to_name: (p.issued_to_name ?? '') as string,
          workers_json: JSON.stringify(p.authorized_workers ?? []),
          qr_token: (p.qr_token ?? '') as string,
          checklist_json: JSON.stringify(p.checklist ?? []),
          synced_at: now(),
          updated_at: now(),
        });
        pulled++;
      }
    } catch (err) {
      errors.push(`Permits pull: ${err instanceof Error ? err.message : 'failed'}`);
    }

    try {
      // Pull my actions
      const actions = await api.get<Record<string, unknown>[]>('/actions/my-actions');
      for (const a of actions) {
        await this._upsertCache('actions_cache', a.id as string, {
          server_id: a.id as string,
          title: (a.title ?? '') as string,
          description: (a.description ?? '') as string,
          status: (a.status ?? '') as string,
          priority: (a.priority ?? 'medium') as string,
          due_date: a.due_date ? new Date(a.due_date as string).getTime() : null,
          assigned_to_name: (a.assigned_to_name ?? '') as string,
          source_type: (a.source_type ?? '') as string,
          source_id: (a.source_id ?? '') as string,
          progress_notes_json: JSON.stringify(a.progress_notes ?? []),
          pending_sync: false,
          synced_at: now(),
          updated_at: now(),
        });
        pulled++;
      }
    } catch (err) {
      errors.push(`Actions pull: ${err instanceof Error ? err.message : 'failed'}`);
    }

    return { pulled, errors };
  }

  // ── Conflict resolution (last-write-wins) ──────────────

  resolveConflicts(localUpdatedAt: number, serverUpdatedAt: number): 'local' | 'server' {
    return serverUpdatedAt >= localUpdatedAt ? 'server' : 'local';
  }

  // ── Pending count helper ───────────────────────────────

  async getPendingCount(): Promise<number> {
    const submissions = await database
      .get<SubmissionQueue>('submissions_queue')
      .query()
      .fetch();
    const incidents = await database
      .get<IncidentQueue>('incidents_queue')
      .query()
      .fetch();
    return (
      submissions.filter((s: SubmissionQueue) => s.pendingSync).length +
      incidents.filter((i: IncidentQueue) => i.pendingSync).length
    );
  }

  // ── Internal: upsert cache record ──────────────────────

  private async _upsertCache(
    tableName: string,
    serverId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const collection = database.get(tableName);
    const existing = await collection.query().fetch();
    const match = existing.find(
      (r: Record<string, unknown>) => (r as unknown as { serverId: string }).serverId === serverId,
    );

    await database.write(async () => {
      if (match) {
        const localUpdated = (match as unknown as { updatedAt: number }).updatedAt ?? 0;
        const serverUpdated = (data.updated_at as number) ?? now();
        if (this.resolveConflicts(localUpdated, serverUpdated) === 'server') {
          await (match as { update: (fn: (r: Record<string, unknown>) => void) => Promise<void> }).update((record: Record<string, unknown>) => {
            Object.entries(data).forEach(([key, val]) => {
              record[key] = val;
            });
          });
        }
      } else {
        await collection.create((record: Record<string, unknown>) => {
          Object.entries(data).forEach(([key, val]) => {
            record[key] = val;
          });
        });
      }
    });
  }
}

export const SyncEngine = new _SyncEngine();
