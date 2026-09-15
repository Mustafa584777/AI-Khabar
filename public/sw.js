// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Helper to ensure 16:9 widescreen format for notification image
function format169Image(url) {
  if (!url || typeof url !== 'string') return '/logo.png';
  if (url.startsWith('/')) return url;
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('ar', '16:9');
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('w', '1280');
      u.searchParams.set('q', '80');
      return u.toString();
    } catch (e) {
      return url;
    }
  }
  return url;
}

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
  const rawImage = data.image || data.imageUrl;
  const options = {
    body: data.body || data.subtitle || 'New trending AI photo prompts curated for you!',
    icon: '/logo.png',
    badge: '/logo.png',
    image: format169Image(rawImage),
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
    const rawImage = data.imageUrl || data.image || '/logo.png';
    const options = {
      body: data.subtitle || data.body || 'New trending AI photo prompts curated for you!',
      icon: '/logo.png',
      badge: '/logo.png',
      image: format169Image(rawImage),
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
