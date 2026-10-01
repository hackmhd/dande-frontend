// Service worker Dande : cache de la coque PWA pour la consultation hors-ligne,
// + réception des notifications push.
const CACHE_NAME = 'dande-v2';
const APP_SHELL = ['/dashboard', '/history', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Stratégie :
// - Les requêtes vers l'API (autre origine) : réseau seul (jamais mises en cache).
// - La navigation (pages) : réseau d'abord, puis cache, puis /dashboard en secours.
// - Les ressources statiques (JS/CSS/images, même origine) : cache d'abord, et on
//   met en cache au passage (« stale-while-revalidate » simplifié).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // On ne touche pas aux appels API (autre origine) : ils doivent échouer
  // proprement hors-ligne pour que l'app bascule sur ses données en cache.
  if (!sameOrigin) return;

  // Navigation (chargement d'une page).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/dashboard')) || Response.error()),
    );
    return;
  }

  // Ressources statiques same-origin : cache d'abord, maj en arrière-plan.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// Réception d'une notification push : l'affiche même app fermée.
self.addEventListener('push', (event) => {
  let data = { title: 'Dande', body: 'Nouvelle notification' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dande', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
    }),
  );
});

// Clic sur la notification : ouvre (ou met au premier plan) l'app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/dashboard');
    }),
  );
});
