// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push from server
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'tool.reelz: Trending Photo Prompts', body: event.data.text() };
    }
  }

  const title = data.title || 'tool.reelz: Trending Photo Prompts';
  let notifImage = data.image || data.imageUrl || '';
  if (notifImage && notifImage.startsWith('/')) {
    notifImage = self.location.origin + notifImage;
  }

  const options = {
    body: data.body || data.subtitle || 'New trending AI photo prompts curated for you!',
    icon: self.location.origin + '/logo.png',
    badge: self.location.origin + '/logo.png',
    image: notifImage || undefined,
    data: {
      url: data.url || '/',
    },
    vibrate: [100, 50, 100],
    actions: Array.isArray(data.actionButtons)
      ? data.actionButtons.slice(0, 2).map((b) => ({
          action: b.actionKey || 'open',
          title: b.label || 'Explore',
        }))
      : [{ action: 'open', title: 'Explore' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle direct trigger message from client page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const data = event.data.payload || {};
    const title = data.title || 'tool.reelz: Trending Photo Prompts';
    let notifImage = data.imageUrl || data.image || '';
    if (notifImage && notifImage.startsWith('/')) {
      notifImage = self.location.origin + notifImage;
    }

    const options = {
      body: data.subtitle || data.body || 'New trending AI photo prompts curated for you!',
      icon: self.location.origin + '/logo.png',
      badge: self.location.origin + '/logo.png',
      image: notifImage || undefined,
      data: {
        url: data.url || '/',
      },
      vibrate: [100, 50, 100],
      actions: Array.isArray(data.actionButtons)
        ? data.actionButtons.slice(0, 2).map((b) => ({
            action: b.actionKey || 'open',
            title: b.label || 'Explore',
          }))
        : [{ action: 'open', title: 'Explore' }],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Handle notification click: focus or open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
