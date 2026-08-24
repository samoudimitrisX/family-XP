// Service Worker for Οικογενειακά Οικονομικά PWA
// Bump CACHE_VERSION whenever you deploy a new index.html so clients refresh.
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'family-xp-' + CACHE_VERSION;

// Files to cache for offline shell
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  // Activate the new SW immediately
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  // Remove old caches so a new version wins
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Never touch Dropbox / API calls — always go to network
  if (url.hostname.includes('dropbox') || url.hostname.includes('dropboxapi') || url.hostname.includes('cdn')) {
    return; // let the browser handle it normally
  }

  // NETWORK-FIRST for navigation/HTML so users always get the latest app.
  // Falls back to cache only when offline. This avoids the "stuck on old version" trap.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST for static assets (icons, manifest)
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
