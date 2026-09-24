// Service worker : fonctionnement hors ligne + rappels en arrière-plan (Periodic Background Sync).
const VERSION = 'anniv-v1';
const ASSETS = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/lib.js', 'manifest.webmanifest', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'anniv-data').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});

// ---- Rappels en arrière-plan

function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function bdayIn(p, y) { return new Date(y, p.month - 1, p.month === 2 && p.day === 29 && !isLeap(y) ? 28 : p.day); }

async function checkInBackground() {
  const dataCache = await caches.open('anniv-data');
  const res = await dataCache.match('/__anniv-data');
  if (!res) return;
  const { people, defaults } = await res.json();
  const sentRes = await dataCache.match('/__anniv-sent');
  const sent = sentRes ? await sentRes.json() : {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const p of people) {
    let next = bdayIn(p, today.getFullYear());
    if (next < today) next = bdayIn(p, today.getFullYear() + 1);
    const days = Math.round((next - today) / 86400000);
    const key = `${p.id}:${next.getFullYear()}:${days}`;
    if (!(p.reminders ?? defaults).includes(days) || sent[key]) continue;
    const age = p.year ? ` (${next.getFullYear() - p.year} ans)` : '';
    const body = days === 0 ? `C'est l'anniversaire de ${p.name}${age} aujourd'hui ! 🎂`
      : days === 1 ? `Demain : anniversaire de ${p.name}${age}.`
        : `Dans ${days} jours : anniversaire de ${p.name}${age}.`;
    await self.registration.showNotification('🎂 Rappel d’anniversaire', { body, tag: key, icon: 'icons/icon.svg' });
    sent[key] = Date.now();
  }
  await dataCache.put('/__anniv-sent', new Response(JSON.stringify(sent)));
}

self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'anniv-check') e.waitUntil(checkInBackground());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((wins) => (wins[0] ? wins[0].focus() : self.clients.openWindow('./'))),
  );
});
