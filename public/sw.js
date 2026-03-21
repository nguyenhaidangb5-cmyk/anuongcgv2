// Service Worker cho PWA - Ăn Uống Cần Giuọc
const CACHE_NAME = 'anuong-cg-v1';
const IMAGE_CACHE = 'anuong-images-v1';

// Các URL cần cache khi install
const PRECACHE_URLS = [
    '/',
    '/kham-pha',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS).catch(() => {
                // Bỏ qua lỗi nếu một số URL không fetch được
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== IMAGE_CACHE)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Cache ảnh (CacheFirst - 30 ngày)
    if (event.request.destination === 'image') {
        event.respondWith(
            caches.open(IMAGE_CACHE).then((cache) =>
                cache.match(event.request).then((cached) => {
                    if (cached) return cached;
                    return fetch(event.request).then((response) => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    }).catch(() => cached || new Response('', { status: 408 }));
                })
            )
        );
        return;
    }

    // API WordPress - NetworkFirst (5 phút)
    if (url.hostname === 'admin.anuongcangiuoc.org') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Trang web - StaleWhileRevalidate
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                const fetchPromise = fetch(event.request).then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
                    }
                    return response;
                });
                return cached || fetchPromise;
            })
        );
    }
});
