/*
 * Service worker for the installed office dashboard (/admin/). It does one
 * thing: when a page cannot load because there is no signal, it shows a
 * friendly "No connection" page instead of the browser's error. It never
 * stores the dashboard's pages, so no customer names or numbers are kept on
 * the phone. Registered from src/layouts/AdminLayout.astro.
 */
const CACHE = 'admin-offline-v1';
const OFFLINE = '/admin-offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([OFFLINE, '/logo-dark.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('admin-offline-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only page loads; everything else goes to the network untouched.
  if (req.mode !== 'navigate' || req.method !== 'GET') return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
});
