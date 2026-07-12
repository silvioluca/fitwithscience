/* Fit with Science — service worker
   Strategia:
   - navigazioni: network-first (gli aggiornamenti arrivano subito),
     fallback alla cache se offline;
   - asset locali: stale-while-revalidate (istantanei + aggiornati in background);
   - CDN statiche (Chart.js, font, sql.js, SDK Firebase): cache-first runtime;
   - tutto il resto (API Firestore, OAuth, Open Food Facts): passa in rete.
   Per pubblicare un aggiornamento incrementare VERSION. */

'use strict';

const VERSION = 'fws-v2';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './foods-db.js',
  './exercises-db.js',
  './i18n/it.js',
  './i18n/en.js',
  './js/01-core.js',
  './js/02-data.js',
  './js/03-ui.js',
  './js/04-wellness.js',
  './js/05-pages.js',
  './js/06-forms.js',
  './js/07-integrations.js',
  './js/08-main.js',
];

/* Host esterni con contenuto statico sicuro da cachare */
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com', // SDK Firebase (file statici versionati)
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigazioni: rete prima (aggiornamenti immediati), cache se offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Asset locali: stale-while-revalidate
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const fresh = fetch(req)
          .then(res => {
            if (res.ok) {
              const copy = res.clone(); // clone SUBITO: dopo il return il body è consumato
              caches.open(VERSION).then(c => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // CDN statiche: cache-first con riempimento runtime
  if (CDN_HOSTS.includes(url.host)) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone(); // clone SUBITO, prima che il body venga letto
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Firestore, OAuth, Open Food Facts, wa.me…: solo rete (nessun intercept)
});
