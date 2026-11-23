// Offline support for the website: the app files are cached on install, and every picture is cached the
// first time it is opened. Cached copies are served immediately and refreshed in the background, so a
// new release shows up the next time the page is opened. Bump CACHE when the list of app files changes.
const CACHE = 'coloring-book-v2';
const SHELL = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'pages/manifest.json',
  'app.js', 'backup.js', 'brushes.js', 'colors.js', 'editor.js', 'fill.js', 'history.js', 'icons.js', 'launcher.js',
  'library.js', 'router.js', 'storage.js', 'symmetry.js', 'ui.js', 'uploads.js', 'view.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || req.headers.has('range')) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req);
    const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => hit || Response.error());          // offline and never cached: a normal network error, not a crash
    return hit || fresh;
  }));
});
