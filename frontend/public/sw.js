/* ═══════════════════════════════════════════════════════════════════════════
   COURTIA — Service Worker PWA
   Aurora-Bubble C • Cockpit IA des courtiers
   Stratégies :
   • Précache shell + assets statiques (cache-first)
   • Network-first pour navigation HTML (offline fallback)
   • Cache-first 5 min pour /api/dashboard/summary et /api/health
   • Stale-while-revalidate pour assets hashés (/assets/*.js, *.css)
   ═══════════════════════════════════════════════════════════════════════════ */

const VERSION = 'courtia-pwa-v3-2026-05-11';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Endpoints cacheable (cache-first, 5min TTL)
const API_CACHEABLE = [
  '/api/dashboard/summary',
  '/api/health',
  '/api/me',
];

const API_CACHE_TTL_MS = 5 * 60 * 1000;

/* ─────────── Install ─────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] precache partial fail', err);
      })
    ).then(() => self.skipWaiting())
  );
});

/* ─────────── Activate ─────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─────────── Helpers ─────────── */
function isApiCacheable(url) {
  return API_CACHEABLE.some((p) => url.pathname.startsWith(p));
}

function isHashedAsset(url) {
  return /\/assets\/.+\.(js|css|woff2?|png|svg|jpg|jpeg|webp)$/.test(url.pathname);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    const cachedAt = Number(cached.headers.get('x-sw-cached-at') || 0);
    if (Date.now() - cachedAt < API_CACHE_TTL_MS) {
      // Background refresh
      fetch(request).then((res) => {
        if (res && res.status === 200) {
          const headers = new Headers(res.headers);
          headers.set('x-sw-cached-at', String(Date.now()));
          res.clone().blob().then((body) => {
            cache.put(request, new Response(body, { status: 200, headers })).catch(() => {});
          });
        }
      }).catch(() => {});
      return cached;
    }
  }
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const headers = new Headers(fresh.headers);
      headers.set('x-sw-cached-at', String(Date.now()));
      const body = await fresh.clone().blob();
      cache.put(request, new Response(body, { status: 200, headers })).catch(() => {});
    }
    return fresh;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirstNavigation(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await caches.match(request) || await caches.match('/') || await caches.match('/dashboard');
    if (cached) return cached;
    return new Response(
      '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>COURTIA — Hors-ligne</title><style>body{background:#050510;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px}h1{font-size:24px;margin:0 0 12px}p{color:#9CA3AF}</style></head><body><div><h1>Hors-ligne</h1><p>COURTIA reprendra dès que la connexion sera rétablie.</p></div></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/* ─────────── Fetch ─────────── */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // Skip cross-origin (Google, Stripe, Sentry…)
  if (url.origin !== self.location.origin) return;

  // API cacheable endpoints
  if (isApiCacheable(url)) {
    event.respondWith(cacheFirstApi(request));
    return;
  }

  // Other /api/* requests — network only (don't cache mutations)
  if (url.pathname.startsWith('/api/')) return;

  // Hashed assets — stale-while-revalidate
  if (isHashedAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Navigation requests — network-first with offline fallback
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Static fallback (icons, manifest…) — cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => cached))
  );
});

/* ─────────── Messages ─────────── */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
