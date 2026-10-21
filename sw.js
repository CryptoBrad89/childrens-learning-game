/* After the first online visit, the game opens with no network.
 * Supabase itself is a different origin and is never cached: play waits
 * in the browser and merges when the network comes back.
 */
const CACHE = 'little-woof-shell-2';
const PRECACHE = [
  'audio/wrong/lucy-uh-oh.mp3',
  'audio/wrong/lucy-try-again.mp3',
  'audio/wrong/lucy-oops-try-again.mp3',
  'accounts/pictures/garden.jpg',
  'accounts/pictures/nap.jpg',
  'accounts/pictures/mail.jpg',
  'accounts/pictures/leap.jpg',
  'accounts/pictures/wave.jpg',
  'accounts/pictures/nudge.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(load(request));
});

async function load(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.status === 200) await cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}
