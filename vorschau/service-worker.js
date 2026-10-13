/* Service Worker: Oberfläche gecacht, damit die App ohne Verbindung startet.

   Erst Netz mit kurzer Wartezeit, sonst Cache. So kommt eine neue Version beim
   nächsten Öffnen an, und ohne oder mit schlechtem Empfang startet die App
   trotzdem sofort. Daten liegen nie im Cache, sondern im Gerätespeicher. */
const VERSION = 'v3.0';

// Alle Seiten unter davidfuchs1.github.io teilen sich im Browser einen
// Cache-Bereich. Deshalb trägt der Cache-Name den eigenen Pfad, und gelöscht
// werden nur eigene Caches.
const PFAD = new URL(self.registration.scope).pathname;
const PRAEFIX = `kaffee|${PFAD}|`;
const CACHE = PRAEFIX + VERSION;
const CACHE_ERSTE_VERSION = 'kaffee-logbuch-v2';
const IST_VORSCHAU = PFAD.endsWith('/vorschau/');

const OBERFLAECHE = [
  './',
  'index.html',
  'farben.css',
  'stil.css',
  'js/app.js',
  'js/daten.js',
  'js/speicher.js',
  'js/bohne.js',
  'js/bilder.js',
  'js/ziehen.js',
  'manifest.json',
  'apple-touch-icon.png',
  'schriften/fraunces-latin.woff2',
  'schriften/inter-latin.woff2',
  'schriften/ibm-plex-mono-400-latin.woff2',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(OBERFLAECHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  const veraltet = (name) =>
    (name.startsWith(PRAEFIX) && name !== CACHE) || (name === CACHE_ERSTE_VERSION && !IST_VORSCHAU);
  ev.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter(veraltet).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

const WARTEZEIT_MS = 1500;

async function netzMitWartezeit(anfrage) {
  const cache = await caches.open(CACHE);
  const ausNetz = fetch(anfrage, { cache: 'no-store' }).then((antwort) => {
    if (antwort.ok) cache.put(anfrage, antwort.clone());
    return antwort;
  });
  const zuLangsam = new Promise((fertig) => setTimeout(fertig, WARTEZEIT_MS));
  const erstes = await Promise.race([ausNetz.catch(() => null), zuLangsam.then(() => null)]);
  if (erstes) return erstes;
  const gespeichert = await cache.match(anfrage, { ignoreSearch: true });
  return gespeichert || ausNetz;
}

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;
  ev.respondWith(netzMitWartezeit(ev.request));
});
