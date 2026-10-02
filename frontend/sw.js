/* Network-first application assets; offline fallback never returns HTML as JS. */
const CACHE = 'thcode-studio-2.5.2';
const CORE = ['./', './index.html', './style.css?v=2.5.2', './modern.css?v=2.5.2', './script.js?v=2.5.2', './js/react-app.js?v=2.5.2', './js/i18n.js?v=2.5.2', './i18n/pt-BR.json', './i18n/en.json', './i18n/es.json',
 './js/thcode-pro.js?v=2.5.2', './js/thcode-server.js?v=2.5.2', './js/thcode-promo.js?v=2.5.2', './js/thcode-legal.js?v=2.5.2', './js/onboarding.js?v=2.5.2',
 './manifest.json', './assets/logo.svg', './assets/icon-192.png', './assets/icon-512.png'];
const SHARE_CACHE = 'thcode-share';
const SCOPE = new URL(self.registration.scope).pathname;
const SHARE_KEY = self.registration.scope + 'share/';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('thcode-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
/* #1: página pede SKIP_WAITING quando o usuário clica em "Recarregar". */
self.addEventListener('message', event => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
/* #2: Web Share Target (Android) — recebe POST multipart, guarda os arquivos e redireciona. */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.origin === self.location.origin && (url.pathname === SCOPE || url.pathname === SCOPE + 'index.html')) {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const cache = await caches.open(SHARE_CACHE);
        let stored = 0;
        for (const f of form.getAll('files')) {
          if (f instanceof File) { await cache.put(SHARE_KEY + encodeURIComponent(f.name || ('arquivo-' + stored + '.bin')), new Response(f)); stored++; }
        }
        const text = [form.get('title'), form.get('text'), form.get('url')].filter(Boolean).join('\n\n');
        if (!stored && text) { await cache.put(SHARE_KEY + encodeURIComponent('texto-compartilhado.txt'), new Response(text, { type: 'text/plain' })); stored = 1; }
        if (stored) return Response.redirect(self.registration.scope + 'index.html?share=1', 303);
      } catch (e) { /* compartilhamento sem arquivos: segue para o app */ }
      return Response.redirect(self.registration.scope, 303);
    })());
    return;
  }
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!CORE.some(path => new URL(path, self.registration.scope).pathname === url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));}
    return response;
  }).catch(async () => (await caches.match(event.request)) || (event.request.mode === 'navigate' ? await caches.match('./index.html') : null) || Response.error()));
});
