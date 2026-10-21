'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {staticServer,playwright}=require('./accounts_sync.cjs');
(async()=>{
  const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const evidence=[];
  try {
    const context=await browser.newContext({viewport:{width:1024,height:576},reducedMotion:'reduce'}),external=[];
    await context.route('**/*',route=>{
      if(!route.request().url().startsWith(local.url+'/')){external.push(route.request().url());return route.abort()}
      return route.continue();
    });
    const page=await context.newPage();
    await page.goto(local.url+'/');
    await page.locator('#play-unsaved').click();
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    for(const game of ['v1-letter-post','v3-moonboat']) {
      await page.goto(local.url+'/'+game+'/');
      await page.waitForFunction(()=>document.body.dataset.screen==='home');
      assert.equal(await page.locator('[data-letter]').count(),6);
      assert.equal(await page.locator('.page-range').innerText(),'A–F');
      assert.equal(await page.locator('.done-badge').count(),0);
      await page.locator('[data-action=letters-next]').click();
      assert.equal(await page.locator('.page-range').innerText(),'G–L');
      const assets=await page.evaluate(async()=>Promise.all(['layout.js','layout.css'].map(async name=>{
        const response=await fetch('../v1-letter-post/'+name),body=await response.text();
        return {name,status:response.status,bytes:body.length};
      })));
      assert(assets.every(asset=>asset.status===200&&asset.bytes>1000));
      evidence.push({game,offlineHome:true,offlinePaging:true,assets});
      console.log(`PASS offline ${game}: new layout, six letters, paging and both layout assets from service-worker cache`);
    }
    assert(external.every(url=>new URL(url).pathname==='/rest/v1/game_settings'),'Unexpected external request');
    evidence.push({externalSettingsReadsBlocked:external.length,liveDatabaseRequestsSent:0});
    fs.mkdirSync(path.resolve(__dirname,'../reports/layout-build'),{recursive:true});
    fs.writeFileSync(path.resolve(__dirname,'../reports/layout-build/offline.json'),JSON.stringify(evidence,null,2)+'\n');
    await context.close();
  } finally {await browser.close();local.server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
