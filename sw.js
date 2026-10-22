/* Simulador de Taxa — cache só desta página.
   Os arquivos são relativos ao escopo do service worker (a pasta do site,
   por exemplo /loja-modelo-demo/ no GitHub Pages), nunca a raiz do domínio.
   Outras páginas não são interceptadas. */
const CACHE = 'simulador-taxa-v6';
const FILES = [
  'simulador.html',
  'css/simulador.css',
  'js/simulador.js',
  'js/config.js',
  'js/demo-aviso.js',
  'assets/logo.svg',
  'assets/simulador/manifest.webmanifest'
];

function abs(path) {
  return new URL(path, self.registration.scope).href;
}

function isSimulador(url) {
  return url.origin === self.location.origin && (
    url.pathname.endsWith('/simulador.html') ||
    url.pathname.endsWith('/css/simulador.css') ||
    url.pathname.endsWith('/js/simulador.js') ||
    url.pathname.endsWith('/js/demo-aviso.js') ||
    url.pathname.includes('/assets/simulador/')
  );
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map(abs))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('simulador-taxa-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!isSimulador(url)) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('/simulador.html')) {
    e.respondWith(
      fetch(req).then((r) => {
        const cp = r.clone();
        caches.open(CACHE).then((c) => c.put(abs('simulador.html'), cp));
        return r;
      }).catch(() => caches.match(abs('simulador.html')))
    );
    return;
  }

  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
