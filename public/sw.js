// Minimal hand-rolled service worker (#41) — network-first, cache-on-visit,
// static assets only: /api/ is excluded and never touched (#118).
// No Workbox/next-pwa: the custom Express+Next server (ADR-0003) isn't the
// standalone/static-export setup those tools assume.

// Bumped to v2 with the /api/ exclusion below (#118): the guard stops new API
// responses from being cached, but devices that ran v1 still hold the old ones,
// and `caches.match()` searches every cache in the origin — not just this one.
// The activate handler deletes any cache whose name isn't the current one, so
// renaming is what actually purges them.
const CACHE_NAME = "plm-cache-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API responses are session-shaped (#118): GET /api/auth/me resolves the
  // signed-in reader from the session cookie. Caching those writes session
  // state to disk that outlives the session (cache storage is per-origin, not
  // per-session, so it survives logout) and lets a stale copy — including a
  // signed-out {"reader":null} — get replayed on any transient network blip.
  // Returning without respondWith keeps the worker out of the request entirely,
  // same as the two guards above, so /api behaves as if no SW were installed.
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw err;
      }
    })(),
  );
});
