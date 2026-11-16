// Service Worker: Fresh-First Page/API + Fast Static Asset Caching + Push Notifications
const CACHE_VERSION = 'v2';
const PAGES_CACHE = `zeena-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `zeena-assets-${CACHE_VERSION}`;
const API_CACHE = `zeena-api-${CACHE_VERSION}`;
const VALID_CACHES = [PAGES_CACHE, ASSETS_CACHE, API_CACHE];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 604,800,000 ms

const EXCLUDED_PATH_PREFIXES = [
  '/sw.js',
  '/admin',
  '/cms-login',
  '/dashboard',
  '/auth',
  '/api/auth',
  '/api/user',
  '/api/admin',
  '/api/create-order',
  '/api/verify-payment',
  '/api/backup',
  '/api/gemini',
  '/api/search-queries',
];

const PUBLIC_API_PREFIXES = [
  '/api/posts/',
  '/api/categories',
  '/api/tags',
  '/api/settings',
  '/api/notifications/latest',
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !VALID_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isExcluded(url) {
  if (url.origin !== self.location.origin) return true;
  if (EXCLUDED_PATH_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix + '/') || url.pathname.startsWith(prefix))) {
    return true;
  }
  if (
    url.searchParams.get('source') === 'firebase' ||
    url.searchParams.get('admin') === 'true' ||
    url.searchParams.get('all') === 'true'
  ) {
    return true;
  }
  return false;
}

function isStaticAsset(url) {
  const p = url.pathname;
  if (p.startsWith('/_next/static/')) return true;
  if (p.startsWith('/_next/image')) return true;
  if (p.startsWith('/images/')) return true;
  if (p === '/manifest.webmanifest' || p === '/favicon.ico' || p === '/logo.png') return true;
  return /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico)$/i.test(p);
}

function isPublicApi(url) {
  const p = url.pathname;
  return PUBLIC_API_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix));
}

function isFresh(response) {
  if (!response) return false;
  const cachedAt = Number(response.headers.get('x-sw-cached-at') || 0);
  if (!cachedAt) return true; // Keep immutable/headerless cache hits valid until evicted
  return Date.now() - cachedAt < SEVEN_DAYS_MS;
}

async function cloneWithTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('x-sw-cached-at', String(Date.now()));
  const body = await response.clone().arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function cacheFirst7Days(cacheName, cacheKey, fetchRequest, validateResponse) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(cacheKey);
  if (cached && isFresh(cached)) {
    return cached;
  }

  try {
    const networkResponse = await fetch(fetchRequest);
    if (networkResponse && networkResponse.status === 200 && (!validateResponse || validateResponse(networkResponse))) {
      const stamped = await cloneWithTimestamp(networkResponse);
      await cache.put(cacheKey, stamped);
    }
    return networkResponse;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirstWithFallback(cacheName, cacheKey, fetchRequest, validateResponse) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(fetchRequest, { cache: 'no-cache' });
    if (networkResponse && networkResponse.status === 200 && (!validateResponse || validateResponse(networkResponse))) {
      const stamped = await cloneWithTimestamp(networkResponse);
      await cache.put(cacheKey, stamped);
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (isExcluded(url)) return;

  // 1. Static JS, CSS, Fonts & Images (Cache-First for immutable hashed assets & images)
  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst7Days(ASSETS_CACHE, request.url, request, (res) => res.type === 'basic' || res.type === 'cors')
    );
    return;
  }

  // 2. Public Read APIs (Network-First so cleared/updated data always reflects immediately, cache fallback offline)
  if (url.pathname.startsWith('/api/')) {
    if (!isPublicApi(url)) return;
    event.respondWith(
      networkFirstWithFallback(API_CACHE, request.url, request, (res) => {
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        return ct.includes('application/json');
      })
    );
    return;
  }

  // 3. Public Pages & Prompt Pages (Network-First so visitors always get latest version)
  const isRsc =
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1' ||
    url.searchParams.has('_rsc');
  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  if (!isRsc && !isNavigation) return;

  if (isRsc) {
    const rscToken = url.searchParams.get('_rsc') || '1';
    const rscCacheKey = `${url.origin}${url.pathname}${url.search ? '&q=' + encodeURIComponent(url.search) : ''}?__sw=rsc&v=${encodeURIComponent(rscToken)}`;
    event.respondWith(
      networkFirstWithFallback(PAGES_CACHE, rscCacheKey, request, (res) => {
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        return !ct.includes('text/html');
      })
    );
    return;
  }

  const htmlCacheKey = `${url.origin}${url.pathname}${url.search ? '&q=' + encodeURIComponent(url.search) : ''}?__sw=html`;
  event.respondWith(
    networkFirstWithFallback(PAGES_CACHE, htmlCacheKey, request, (res) => {
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      return ct.includes('text/html');
    })
  );
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
  const options = {
    body: data.body || data.subtitle || 'New trending AI photo prompts curated for you!',
    icon: '/logo.png',
    badge: '/logo.png',
    image: data.image || data.imageUrl,
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
  if (event.data && event.data.type === 'PURGE_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
    return;
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const data = event.data.payload || {};
    const title = data.title || 'tool.reelz: Trending Photo Prompts';
    const options = {
      body: data.subtitle || data.body || 'New trending AI photo prompts curated for you!',
      icon: '/logo.png',
      badge: '/logo.png',
      image: data.imageUrl || data.image || '/logo.png',
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
