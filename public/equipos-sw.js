/* R+ Lista de espera — service worker (Web Push + homescreen) */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'R+ Lista de espera', body: event.data?.text() || 'Actualización de cola.' };
  }

  const title = data.title || 'R+ Lista de espera';
  const options = {
    body: data.body || '',
    icon: data.icon || '/equipos/icons/icon-192.png',
    badge: data.badge || '/equipos/icons/icon-192.png',
    tag: data.tag || 'equipos-queue',
    renotify: true,
    data: data.data || { url: '/equipos' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/equipos';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
