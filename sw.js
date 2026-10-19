'use strict';
importScripts('./sw-assets.js');
const CACHE = 'letters-with-lucy-'+self.OFFLINE_MANIFEST.version;
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(self.OFFLINE_MANIFEST.files)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('little-woof-')||key.startsWith('letters-with-lucy-'))&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url = new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin) return;
  const path = url.pathname.endsWith('/') ? url.pathname+'index.html' : url.pathname;
  const key = new URL(path,self.location.origin);
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const response = await cache.match(key);
    return response || fetch(event.request);
  }));
});
