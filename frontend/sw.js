/* Network-first application assets; offline fallback never returns HTML as JS. */
const CACHE = 'thcode-studio-2.4.0';
const CORE = ['./', './index.html', './style.css', './modern.css', './script.js',
 './js/thcode-pro.js', './js/thcode-server.js', './js/thcode-promo.js', './js/thcode-legal.js',
 './manifest.json', './assets/logo.svg', './assets/icon-192.png', './assets/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('thcode-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
 if (!CORE.some(path => new URL(path, self.registration.scope).pathname === url.pathname)) return;
 event.respondWith(fetch(event.request).then(response => {
   if (response.ok) {const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));}
   return response;
 }).catch(async () => (await caches.match(event.request)) || (event.request.mode === 'navigate' ? await caches.match('./index.html') : null) || Response.error()));
});
