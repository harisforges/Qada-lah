// Network-first service worker so the app keeps working offline
// while always picking up new versions when online. On a slow connection
// the cached copy is used after a few seconds so the app still opens fast.
const CACHE = 'qada-lah-v5';
const NETWORK_TIMEOUT_MS = 4000;
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png',
  'assets/fonts/plus-jakarta-sans-latin.woff2', 'assets/fonts/plus-jakarta-sans-latin-ext.woff2',
  'assets/fonts/amiri-700-arabic.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Only handle our own files; anything else goes straight to the network untouched.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const network = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
  e.waitUntil(network.catch(() => {})); // let the cache refresh finish in the background
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (!cached) {
      return network.catch(async () => (req.mode === 'navigate' && await caches.match('index.html')) || Response.error());
    }
    const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
    return Promise.race([network.catch(() => cached), timeout]);
  })());
});
