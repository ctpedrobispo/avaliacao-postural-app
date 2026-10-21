// Mantém o app funcionando sem internet: guarda os arquivos do app (não guarda dados de alunos).
const CACHE = 'avaliacao-postural-v6';
const FILES = ['./', 'index.html', 'angles.js', 'guide.js', 'movimento.js', 'report.js', 'app.js', 'manifest.webmanifest', 'logo-ct.png', 'logo-correplus.webp', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'guide-ant.jpg', 'guide-post.jpg', 'guide-lat.jpg'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
