// ========================================================
// EDUPLAN - SERVICE WORKER PARA SOPORTE OFFLINE TOTAL (SW.JS)
// ========================================================

const CACHE_NAME = 'educap-static-v1.0.3';
const RUNTIME_CACHE_NAME = 'educap-runtime-v1.0.3';

// Recursos críticos necesarios para funcionamiento 100% offline sin conectividad
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './db.js',
  './app.js',
  './google-drive.js',
  './export-service.js',
  './xlsx.full.min.js',
  './manifest.json',
  './privacidad.html',
  './terminos.html',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// 1. INSTALACIÓN: Precarga los recursos estáticos esenciales en cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[ServiceWorker] Precarga parcial completada (algunos recursos pueden cargarse bajo demanda):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVACIÓN: Limpia cachés antiguos de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== RUNTIME_CACHE_NAME) {
            console.log('[ServiceWorker] Eliminando caché antiguo:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. INTERCEPTACIÓN DE PETICIONES (FETCH)
// Estrategia:
// - Para recursos locales (HTML, CSS, JS, imágenes, fuentes): Stale-While-Revalidate o Cache First con fallback offline.
// - Para Google APIs / Drive: Network Only (para evitar almacenar tokens u respuestas dinámicas en cache, dejando que IndexedDB + DriveSync maneje el estado offline).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Evitar interceptar llamadas que no sean GET
  if (request.method !== 'GET') {
    return;
  }

  // APIs de Google (OAuth, Drive, GAPI) -> Siempre hacia la red directa
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('googleusercontent.com')
  ) {
    return;
  }

  // Peticiones de navegación (cargar página HTML principal)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Si está offline, retornar la versión en caché de la app
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          const defaultIndex = await caches.match('./index.html') || await caches.match('./');
          if (defaultIndex) return defaultIndex;

          return new Response(
            `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>EduPlan Offline</title><style>body{font-family:sans-serif;padding:32px;text-align:center;background:#0b0f19;color:#fff;}h1{color:#6366f1;}</style></head><body><h1>EduPlan - Modo Offline</h1><p>No se pudo conectar a la red y el recurso no está disponible en caché todavía.</p><button onclick="location.reload()">Reintentar</button></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Fuentes de Google y CDNs estáticos -> Cache First con guardado en RUNTIME_CACHE
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkRes;
        }).catch(() => {
          // Si falla en offline, degradación elegante (las fuentes del sistema se usan como fallback)
          return new Response('', { status: 408, statusText: 'Offline Resource Unavailable' });
        });
      })
    );
    return;
  }

  // Recursos locales estáticos (CSS, JS, iconos, etc.): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch((err) => {
          // Si falla la red, el fallback ya será la respuesta en caché
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Manejo de mensajes desde la app (ej. forzar actualización de caché)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
