'use strict';
const assert=require('node:assert/strict');
const {staticServer,playwright}=require('./accounts_sync.cjs');
(async()=>{
 const local=await staticServer(),base=process.env.CALL_LIST_HOSTED||local.url+'/',browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
  const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'accounts/');
  await page.waitForFunction(async()=>{const keys=await caches.keys();for(const key of keys){const cache=await caches.open(key);if(await cache.match(new URL('audio/feedback/lucy-oops-try-again.mp3',location.href.replace(/accounts\/$/,'')).href))return true;}return false;},null,{timeout:120000});
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);await page.reload();
  const evidence=await page.evaluate(async base=>{
   const paths=['garden','nap','mailbox','celebrate','wave','headtilt'].map(n=>'accounts/lucy/'+n+'.jpg').concat(['uh-oh','try-again','oops-try-again'].map(n=>'audio/feedback/lucy-'+n+'.mp3'));
   return Promise.all(paths.map(async path=>{const r=await fetch(new URL(path,base));const bytes=await r.arrayBuffer();return {path,status:r.status,bytes:bytes.byteLength};}));
  },base);
  assert(evidence.every(e=>e.status===200&&e.bytes>1000));assert.equal(await page.locator('.avatar-options').first().locator('input').count(),6);
  console.log('PASS OFFLINE: portal reload, all six Lucy JPEGs and all three retry MP3s served from installed service-worker cache');
 }finally{await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
