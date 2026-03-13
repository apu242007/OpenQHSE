/**
 * OpenQHSE Service Worker
 * ========================
 * Strategy:
 *   - Static assets (JS, CSS, fonts, icons) → Cache First (long TTL)
 *   - API calls (/api/v1/*) → Network First (fall back to cache for GET)
 *   - Navigation requests → Network First (fallback to offline.html)
 *   - Background sync → replay failed POST/PATCH when back online
 *
 * Cache names follow a versioned convention so old caches are purged on activation.
 */

/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;

// Background Sync API is not in the standard webworker lib typings yet
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}

// ─── Cache config ─────────────────────────────────────────────────────────────

const VERSION            = 'v1';
const CACHE_STATIC       = `openqhse-static-${VERSION}`;
const CACHE_API          = `openqhse-api-${VERSION}`;
const CACHE_PAGES        = `openqhse-pages-${VERSION}`;
const OFFLINE_URL        = '/offline.html';
const SYNC_TAG           = 'openqhse-sync-queue';

const STATIC_ASSETS: string[] = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const API_CACHE_SAFE_PATHS = [
  '/api/v1/marketplace',
  '/api/v1/inspections/kpis',
  '/api/v1/incidents/statistics',
];

// ─── Install: pre-cache static shell ──────────────────────────────────────────

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);
      // Best-effort — don't fail install if some assets are missing in dev
      await Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

// ─── Activate: remove stale caches ────────────────────────────────────────────

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const currentCaches = new Set([CACHE_STATIC, CACHE_API, CACHE_PAGES]);
      const keyList = await caches.keys();
      await Promise.all(
        keyList
          .filter((k) => !currentCaches.has(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ─── Fetch: routing strategies ────────────────────────────────────────────────

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET that we don't cache (let pass-through; they're queued separately)
  if (request.method !== 'GET') return;

  // ── 1. Static assets → Cache First ──────────────────
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── 2. Safe API paths → Network First w/ cache fallback ──
  if (isCacheableApiPath(url)) {
    event.respondWith(networkFirst(request, CACHE_API));
    return;
  }

  // ── 3. Same-origin navigation → Network First w/ offline fallback ──
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(navigateWithFallback(request));
    return;
  }

  // Everything else: plain network
});

// ─── Background sync: replay queued mutations ─────────────────────────────────

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueue());
  }
});

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; icon?: string };
  try {
    payload = event.data.json() as typeof payload;
  } catch {
    payload = { title: 'OpenQHSE', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'OpenQHSE', {
      body:   payload.body   ?? '',
      icon:   payload.icon   ?? '/icons/icon-192x192.png',
      badge:  '/icons/icon-72x72.png',
      data:   { url: payload.url ?? '/dashboard' },
      vibrate: [100, 50, 100],
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl: string = (event.notification.data as { url?: string }).url ?? '/dashboard';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isStaticAsset(url: URL): boolean {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/screenshots/') ||
    /\.(woff2?|ttf|otf|eot)$/.test(url.pathname)
  );
}

function isCacheableApiPath(url: URL): boolean {
  return API_CACHE_SAFE_PATHS.some((p) => url.pathname.startsWith(p));
}

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    void cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ detail: 'Offline — cached data unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function navigateWithFallback(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_PAGES);
      void cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache  = await caches.open(CACHE_PAGES);
    const cached = await cache.match(request);
    if (cached) return cached;

    // Return offline shell
    const offlineCache = await caches.open(CACHE_STATIC);
    const offline      = await offlineCache.match(OFFLINE_URL);
    return offline ?? new Response('Offline', { status: 503 });
  }
}

// ─── Queue for offline mutations ──────────────────────────────────────────────

interface QueueEntry {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

/** Store a failed mutation so it's replayed when connectivity returns. */
export async function enqueueRequest(request: Request): Promise<void> {
  const db    = await openQueueDB();
  const body  = request.body ? await request.text() : null;
  const entry: QueueEntry = {
    url:       request.url,
    method:    request.method,
    headers:   Object.fromEntries(request.headers.entries()),
    body,
    timestamp: Date.now(),
  };
  const tx    = db.transaction('queue', 'readwrite');
  await tx.objectStore('queue').add(entry);
}

async function replayQueue(): Promise<void> {
  const db      = await openQueueDB();
  const tx      = db.transaction('queue', 'readwrite');
  const store   = tx.objectStore('queue');
  const entries = await new Promise<QueueEntry[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueueEntry[]);
    req.onerror  = () => reject(req.error);
  });

  for (const entry of entries) {
    try {
      await fetch(entry.url, {
        method:  entry.method,
        headers: entry.headers,
        body:    entry.body,
      });
      await store.delete(entry.timestamp);
    } catch {
      // Will retry on next sync event
    }
  }
}

// ── Minimal IndexedDB wrapper ──────────────────────────────────────────────────

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('openqhse-sw-queue', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('queue', { keyPath: 'timestamp' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
