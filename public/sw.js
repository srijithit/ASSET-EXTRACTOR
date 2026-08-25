/**
 * Asset Extractors - Mobile PWA Service Worker (v2.0 - Network First)
 */

const CACHE_NAME = 'asset-extractors-pwa-v2.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css?v=2.0.0',
  '/app.js?v=2.0.0',
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First Strategy to ensure live Render updates show instantly
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    fetch(evt.request)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, resClone));
        }
        return networkRes;
      })
      .catch(() => caches.match(evt.request))
  );
});
