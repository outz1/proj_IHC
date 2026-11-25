// Service worker: deixa o app abrir offline. Nunca guarda /api (os dados vêm do servidor ou do localStorage).
'use strict';
const CACHE = 'oai-v1';
const BASE = ['/', '/index.html', '/css/style.css', '/js/app.js', '/public/logo.svg', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Atualiza em segundo plano: responde do cache e renova a cópia (a mudança aparece no recarregamento seguinte).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).pathname.startsWith('/api/')) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const antigo = await c.match(req);
    const rede = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }).catch(() => null);
    return antigo || (await rede) || (req.mode === 'navigate' ? c.match('/index.html') : Response.error());
  }));
});
