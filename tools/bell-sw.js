// Service worker for the bell schedule — caches the app shell for offline use.
// Bump VERSION when bell-schedule.html changes so installed PWAs refresh their
// offline copy (network-first picks up edits online, but the offline fallback
// only updates after a successful online load).

const VERSION = 'bell-v2';
const SHELL = [
  '/tools/bell-schedule.html',
  '/tools/bell.webmanifest',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== VERSION && k.startsWith('bell-')).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

function stash(req, res) {
  const copy = res.clone();
  caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never intercept API calls — always go to network.
  if (url.pathname.startsWith('/api/')) return;

  // Only handle GETs.
  if (e.request.method !== 'GET') return;

  // Network-first for HTML so updates are picked up fast; cache fallback offline.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          stash(e.request, res);
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/tools/bell-schedule.html')))
    );
    return;
  }

  // Cache-first for static assets (fonts, icons).
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && (res.type === 'basic' || res.type === 'cors')) stash(e.request, res);
        return res;
      });
    })
  );
});
