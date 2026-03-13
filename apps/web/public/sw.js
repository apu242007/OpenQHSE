// Service Worker — development stub
// In production this would be replaced by the full PWA service worker.
// This stub immediately activates and does NOT cache anything,
// preventing stale-cache issues during development.

const CACHE_NAME = 'openqhse-v1';

self.addEventListener('install', (event) => {
  // Skip waiting so this SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients so the new SW takes over immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete any old caches
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      ),
    ])
  );
});

// In development: pass all fetches through without caching
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  event.respondWith(fetch(event.request));
});
