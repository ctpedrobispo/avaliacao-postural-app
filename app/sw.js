// Mantém o app funcionando sem internet: guarda os arquivos do app (não guarda dados de alunos).
const CACHE = 'avaliacao-postural-v18';
const FILES = ['./', 'index.html', 'angles.js', 'guide.js', 'movimento.js', 'autopose.js', 'report.js', 'app.js', 'manifest.webmanifest', 'logo-ct.png', 'logo-correplus.webp', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'guide-ant.jpg', 'guide-post.jpg', 'guide-lat.jpg', 'guia-frente.jpg', 'guia-costas.jpg', 'guia-lado-d.jpg', 'guia-lado-e.jpg'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  // modelo e motor de detecção (grandes): usa o guardado primeiro e só baixa na primeira vez
  if (e.request.url.includes('/vendor/')) {
    e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })));
    return;
  }
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
