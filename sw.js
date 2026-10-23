/* Offline shell for Letters with Lucy. On first load every file the games need is
 * stored, so they work offline afterwards; accounts sync separately (see
 * accounts/accounts.js). Pages, scripts and styles come from the network first,
 * so a new build shows on the next load, with the stored copy for offline play;
 * pictures, fonts and audio never change in place, so they come from the store.
 * A new version takes over at once and deletes the older stores.
 * tests/offline_shell.cjs checks this list against the files in the repo. */
'use strict';
const VERSION = 'little-woof-shell-5';
const FILES = [
  './',
  "accounts/accounts.js",
  "accounts/config.js",
  "accounts/front-door.css",
  "accounts/front-door.js",
  "accounts/in-world.css",
  "accounts/in-world.js",
  "accounts/pictures.js",
  "audio-map.js",
  "audio/letters/a-name-trim.mp3",
  "audio/letters/a-sound-trim.mp3",
  "audio/letters/b-name-trim.mp3",
  "audio/letters/b-sound-trim.mp3",
  "audio/letters/c-name-trim.mp3",
  "audio/letters/c-sound-trim.mp3",
  "audio/letters/d-name-trim.mp3",
  "audio/letters/d-sound-trim.mp3",
  "audio/letters/e-name-trim.mp3",
  "audio/letters/e-sound-trim.mp3",
  "audio/letters/f-name-trim.mp3",
  "audio/letters/f-sound-trim.mp3",
  "audio/letters/g-name-trim.mp3",
  "audio/letters/g-sound-trim.mp3",
  "audio/letters/h-name-trim.mp3",
  "audio/letters/h-sound-trim.mp3",
  "audio/letters/i-long-extra-trim.mp3",
  "audio/letters/i-name-trim.mp3",
  "audio/letters/i-sound-trim.mp3",
  "audio/letters/j-name-trim.mp3",
  "audio/letters/j-sound-trim.mp3",
  "audio/letters/k-name-trim.mp3",
  "audio/letters/k-sound-trim.mp3",
  "audio/letters/l-name-trim.mp3",
  "audio/letters/l-sound-trim.mp3",
  "audio/letters/m-name-trim.mp3",
  "audio/letters/m-sound-trim.mp3",
  "audio/letters/n-name-trim.mp3",
  "audio/letters/n-sound-trim.mp3",
  "audio/letters/o-name-trim.mp3",
  "audio/letters/o-sound-trim.mp3",
  "audio/letters/p-name-trim.mp3",
  "audio/letters/p-sound-trim.mp3",
  "audio/letters/q-name-trim.mp3",
  "audio/letters/q-sound-trim.mp3",
  "audio/letters/r-name-trim.mp3",
  "audio/letters/r-sound-trim.mp3",
  "audio/letters/s-name-trim.mp3",
  "audio/letters/s-sound-trim.mp3",
  "audio/letters/t-name-trim.mp3",
  "audio/letters/t-sound-trim.mp3",
  "audio/letters/u-name-trim.mp3",
  "audio/letters/u-sound-trim.mp3",
  "audio/letters/v-name-trim.mp3",
  "audio/letters/v-sound-trim.mp3",
  "audio/letters/w-name-trim.mp3",
  "audio/letters/w-sound-trim.mp3",
  "audio/letters/x-name-trim.mp3",
  "audio/letters/x-sound-trim.mp3",
  "audio/letters/y-name-trim.mp3",
  "audio/letters/y-sound-trim.mp3",
  "audio/letters/z-name-trim.mp3",
  "audio/letters/z-sound-trim.mp3",
  "audio/words/word-ball.mp3",
  "audio/words/word-cat.mp3",
  "audio/words/word-duck.mp3",
  "audio/words/word-egg.mp3",
  "audio/words/word-fish.mp3",
  "audio/words/word-fox.mp3",
  "audio/words/word-goat.mp3",
  "audio/words/word-hat.mp3",
  "audio/words/word-jellyfish.mp3",
  "audio/words/word-kite.mp3",
  "audio/words/word-leaf.mp3",
  "audio/words/word-nest.mp3",
  "audio/words/word-octopus.mp3",
  "audio/words/word-quilt.mp3",
  "audio/words/word-rabbit.mp3",
  "audio/words/word-umbrella.mp3",
  "audio/words/word-van.mp3",
  "audio/words/word-web.mp3",
  "audio/words/word-yak.mp3",
  "audio/words/word-zebra.mp3",
  "grown-ups/grown-ups.css",
  "grown-ups/grown-ups.js",
  "grown-ups/in-game.css",
  "grown-ups/index.html",
  "grown-ups/paper-shader.js",
  "grown-ups/people.js",
  "grown-ups/settings.js",
  "index.html",
  "v1-letter-post/app.js",
  "v1-letter-post/art.js",
  "v1-letter-post/assets/Comfortaa-Bold.woff2",
  "v1-letter-post/assets/NunitoSans-Black.woff2",
  "v1-letter-post/assets/NunitoSans-Bold.woff2",
  "v1-letter-post/assets/lucy-celebrate.jpg",
  "v1-letter-post/assets/lucy-cheer-1.mp3",
  "v1-letter-post/assets/lucy-cheer-2.mp3",
  "v1-letter-post/assets/lucy-default.jpg",
  "v1-letter-post/assets/lucy-nudge-1.mp3",
  "v1-letter-post/assets/lucy-specs.jpg",
  "v1-letter-post/assets/lucy-word-a-apple.mp3",
  "v1-letter-post/assets/lucy-word-i-insect.mp3",
  "v1-letter-post/assets/lucy-word-m-moon.mp3",
  "v1-letter-post/assets/lucy-word-p-pig.mp3",
  "v1-letter-post/assets/lucy-word-s-sun.mp3",
  "v1-letter-post/assets/lucy-word-t-tiger.mp3",
  "v1-letter-post/base.css",
  "v1-letter-post/config.js",
  "v1-letter-post/fun.css",
  "v1-letter-post/fun.js",
  "v1-letter-post/index.html",
  "v1-letter-post/style.css",
  "v3-moonboat/app.js",
  "v3-moonboat/art.js",
  "v3-moonboat/assets/Comfortaa-Bold.woff2",
  "v3-moonboat/assets/NunitoSans-Black.woff2",
  "v3-moonboat/assets/NunitoSans-Bold.woff2",
  "v3-moonboat/assets/lucy-celebrate.jpg",
  "v3-moonboat/assets/lucy-cheer-1.mp3",
  "v3-moonboat/assets/lucy-cheer-2.mp3",
  "v3-moonboat/assets/lucy-default.jpg",
  "v3-moonboat/assets/lucy-nudge-1.mp3",
  "v3-moonboat/assets/lucy-specs.jpg",
  "v3-moonboat/assets/lucy-word-a-apple.mp3",
  "v3-moonboat/assets/lucy-word-i-insect.mp3",
  "v3-moonboat/assets/lucy-word-m-moon.mp3",
  "v3-moonboat/assets/lucy-word-p-pig.mp3",
  "v3-moonboat/assets/lucy-word-s-sun.mp3",
  "v3-moonboat/assets/lucy-word-t-tiger.mp3",
  "v3-moonboat/base.css",
  "v3-moonboat/config.js",
  "v3-moonboat/fun.css",
  "v3-moonboat/fun.js",
  "v3-moonboat/index.html",
  "v3-moonboat/style.css",
  "v4-ribbon-road/config.js",
  "v4-ribbon-road/index.html",
  "v4-ribbon-road/style.css"
];
self.addEventListener('install', event => {
  // `reload` skips the browser's own HTTP cache, so the store gets this build's files.
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES.map(file => new Request(file, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('little-woof-shell-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// A page can ask which offline copy is serving it (tests/sw_update.mjs does).
self.addEventListener('message', event => { if (event.data === 'version' && event.source) event.source.postMessage({version: VERSION}); });
const FRESH = /\.(html|js|css)$|\/$/, SLOW_MS = 4000;
// The page gets pages, scripts and styles marked `no-cache`, so the browser's own
// memory and HTTP caches always come back here (hosts often say "keep for 10
// minutes", which would otherwise hide a new build until that runs out).
function askAgain(response) {
  if (!response || response.type === 'error' || response.type === 'opaqueredirect') return response;
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-cache');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(VERSION).then(async cache => {
    const key = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    const stored = async () => await cache.match(key, {ignoreSearch: true}) || await cache.match(request, {ignoreSearch: true});
    const offline = async () => await stored() || await cache.match(new URL('index.html', self.registration.scope).pathname) || Response.error();
    // Pages, scripts and styles are checked with the server, past the browser's HTTP
    // cache (by URL: a page's own request can't take extra options).
    const network = () => (FRESH.test(url.pathname) ? fetch(request.url, {cache: 'no-cache', credentials: 'same-origin'}) : fetch(request)).then(response => {
      if (response.ok && response.type === 'basic' && !request.headers.has('range')) cache.put(key, response.clone()).catch(() => {});
      return response;
    });
    if (FRESH.test(url.pathname)) {
      // Network first. A very slow connection gets the stored copy after a few seconds.
      const fresh = network();
      const slow = new Promise(resolve => setTimeout(resolve, SLOW_MS)).then(stored).then(copy => copy || fresh);
      try { return askAgain(await Promise.race([fresh, slow])); } catch (e) { return askAgain(await offline()); }
    }
    return await stored() || network().catch(offline);
  }));
});
