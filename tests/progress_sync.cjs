'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {staticServer,backend,playwright}=require('./accounts_sync.cjs');
const {screen,settled,login,open,home,round,signedOut,badge}=require('./progress.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/progress'),results=[];
async function device(browser,local,fixture,{offlineCache=false}={}){
 const context=await browser.newContext({viewport:{width:1024,height:576},reducedMotion:'reduce',...(offlineCache?{}:{serviceWorkers:'block'})});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===local.url)return route.continue();if(url.hostname.endsWith('.supabase.co'))return fixture.route(route);return route.abort();});
 await context.addInitScript(()=>{
  window.badgeAnimations=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(...args){if(this.matches('.done-badge'))badgeAnimations.push({letter:this.closest('[data-letter],[data-collection-letter]')?.getAttribute('data-letter'),duration:args[1]?.duration});return animate.apply(this,args);};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {context,page,errors};
}
async function newCompletion(page,letter){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator(`[data-letter=${letter}]`).click();await screen(page,'listen');await settled(page);
 await page.locator('[data-action=match]').click();await screen(page,'match');
 await page.locator(`[data-answer=${letter}]`).click();await screen(page,'celebrate');
 await page.emulateMedia({reducedMotion:'no-preference'});await home(page);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
  const fixture=backend();fixture.seed('fixture_admin','fixture7234');
  const adult=fixture.seed('sync_adult','fixture7234','Sync grown-up');
  fixture.seed('sync_child','fixture7234','Linked child',{role:'child',adult_id:adult});
  const a=await device(browser,local,fixture),b=await device(browser,local,fixture);
  try{
   await login(a.page,local.url,'sync_adult','grownup');await open(a.page,local.url,'v1-letter-post');await round(a.page,'B');await a.page.evaluate(()=>ACCOUNTS.sync());
   await login(b.page,local.url,'sync_adult','grownup');await open(b.page,local.url,'v4-silk-thread');
   assert.equal(await badge(b.page,'v4-silk-thread','B'),1,'Device two loads shared B');
   await a.page.emulateMedia({reducedMotion:'no-preference'});
   await a.page.locator('.collection-preview summary').click();await a.page.locator('[data-action=letters-next]').click();await a.page.locator('[data-letter=H]').focus();
   await round(b.page,'C');await b.page.evaluate(()=>ACCOUNTS.sync());await a.page.bringToFront();
   await a.page.waitForFunction(()=>Boolean(document.querySelector('[data-collection-letter=C] .done-badge')),{},{timeout:25000});
   assert.equal(await a.page.locator('.page-range').innerText(),'G–L','Incoming sync keeps the selected page');
   assert(await a.page.locator('.collection-preview').evaluate(n=>n.open),'Incoming sync keeps the album open');
   assert.equal(await a.page.locator(':focus').getAttribute('data-letter'),'H','Incoming sync keeps keyboard focus');
   assert.equal(await a.page.evaluate(()=>badgeAnimations.length),0,'Another device never queues a settle');
   assert(!/this visit/.test(await a.page.locator('.collection-preview').innerText()));
   await a.page.screenshot({path:path.join(out,'remote-sync-album-open.png'),fullPage:true});
   await a.page.locator('.collection-preview summary').click();await a.page.locator('[data-action=letters-previous]').click();
   await newCompletion(a.page,'A');
   assert.equal(await a.page.evaluate(()=>badgeAnimations.filter(a=>a.letter==='A'&&a.duration===220).length),1,'New correct A settles despite the recordRound notification');
   await newCompletion(a.page,'A');assert.equal(await a.page.evaluate(()=>badgeAnimations.length),1,'Replaying an already done letter never settles again');
   await a.page.reload();await screen(a.page,'home');await settled(a.page);
   assert.equal(await a.page.evaluate(()=>badgeAnimations.length),0,'Saved letters load statically with normal motion');
   if(await a.page.locator('#mute').getAttribute('aria-pressed')==='false')await a.page.locator('#mute').click();
   await a.page.emulateMedia({reducedMotion:'reduce'});
   await a.page.locator('[data-letter=D]').click();await screen(a.page,'listen');
   await open(b.page,local.url,'v3-moonboat');await round(b.page,'E');await b.page.evaluate(()=>ACCOUNTS.sync());await a.page.evaluate(()=>ACCOUNTS.sync());
   assert.equal(await a.page.locator('body').getAttribute('data-screen'),'listen','Sync does not interrupt a lesson');
   await home(a.page);assert.equal(await badge(a.page,'v1-letter-post','E'),1);assert.equal(await a.page.evaluate(()=>badgeAnimations.length),0);
   await open(a.page,local.url,'v4-silk-thread');await open(b.page,local.url,'v1-letter-post');await round(b.page,'F');await b.page.evaluate(()=>ACCOUNTS.sync());await a.page.evaluate(()=>ACCOUNTS.sync());
   assert.equal(await badge(a.page,'v4-silk-thread','F'),1,'Ribbon Road updates its existing cards after sync');
   await a.page.locator('[data-letter=B]').click();await screen(a.page,'listen');await a.page.locator('[data-action=match]').click();await screen(a.page,'match');await a.page.locator('[data-answer=B]').click();await screen(a.page,'celebrate');
   const left=await a.page.locator('.collection-slots').evaluate(n=>n.scrollLeft);
   await open(b.page,local.url,'v3-moonboat');await round(b.page,'G');await b.page.evaluate(()=>ACCOUNTS.sync());await a.page.evaluate(()=>ACCOUNTS.sync());
   assert.equal(await a.page.locator('body').getAttribute('data-screen'),'celebrate');
   assert.equal(await a.page.locator('.collection-slot.collected').count(),6,'Reward collection also receives shared progress');
   assert.equal(await a.page.locator('.collection-slots').evaluate(n=>n.scrollLeft),left,'Collection update keeps the scroll position');
   const child=await a.page.evaluate(async()=>{return(await ACCOUNTS.allRows('profiles?role=eq.child&select=*')).find(p=>p.handle==='sync_child');});
   await a.page.evaluate(child=>ACCOUNTS.selectOwner(child),child);await screen(a.page,'home');
   assert.equal(await badge(a.page,'v4-silk-thread','B'),0,'Selected child does not inherit the grown-up actor progress');
   await round(a.page,'D');await a.page.evaluate(()=>ACCOUNTS.sync());
   assert.equal([...fixture.events.values()].filter(e=>e.kind==='round'&&e.user_id===child.id).length,1);
   await a.page.evaluate(()=>ACCOUNTS.selectOwner(ACCOUNTS.profile));await screen(a.page,'home');
   assert.equal(await badge(a.page,'v4-silk-thread','B'),1);assert.equal(await badge(a.page,'v4-silk-thread','D'),0);
   // Changing owner during a pending correct-answer effect must cancel that old round.
   await a.page.emulateMedia({reducedMotion:'no-preference'});
   await a.page.locator('[data-letter=D]').click();await screen(a.page,'listen');await settled(a.page);await a.page.locator('[data-action=match]').click();await screen(a.page,'match');
   const before=[...fixture.events.values()].filter(e=>e.kind==='round').length;
   await a.page.locator('[data-answer=D]').click();await a.page.evaluate(child=>ACCOUNTS.selectOwner(child),child);await screen(a.page,'home');
   await a.page.evaluate(()=>ACCOUNTS.sync());assert.equal([...fixture.events.values()].filter(e=>e.kind==='round').length,before,'Pending answer cannot save under a new owner');
   await a.page.evaluate(()=>ACCOUNTS.selectOwner(ACCOUNTS.profile));
   assert.equal(await badge(a.page,'v4-silk-thread','D'),0);assert.equal(await a.page.evaluate(()=>badgeAnimations.length),0);
   fixture.overrides.set(child.id,{letters:['B','C']});
   await signedOut(b.page,local.url);await login(b.page,local.url,'sync_child','child');await open(b.page,local.url,'v1-letter-post');
   assert.equal(await b.page.evaluate(()=>ACCOUNTS.snapshot.rounds.length),1,'The child still has D saved');
   assert.match(await b.page.locator('.collection-heading').innerText(),/0 of 2/,'Hidden completed letters do not inflate a restricted collection');
   fixture.overrides.set(child.id,{letters:['B','D']});await open(b.page,local.url,'v3-moonboat');
   assert.equal(await badge(b.page,'v3-moonboat','D'),1);assert.match(await b.page.locator('.collection-heading').innerText(),/1 of 2/);
   await b.page.screenshot({path:path.join(out,'restricted-child-saved-progress.png'),fullPage:true});
   assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
   results.push({crossDeviceAutomaticSync:true,normalMotionLoadedSettle:false,newCorrectSettle:true,repeatedCorrectSettle:false,pagerAlbumAndFocusPreserved:true,lessonPreserved:true,rewardCollectionRefreshed:true,ownerScoped:true,pendingAnswerOwnerIsolation:true,restrictedPoolCount:true,liveDatabaseRequestsSent:0});
   console.log('PASS live sync, new-only settle, pager/album/focus, active lesson, Ribbon Road reward, selected child, owner-change cancellation, restricted pools');
  }finally{await a.context.close();await b.context.close();}
  const offlineFixture=backend();offlineFixture.seed('fixture_admin','fixture7234');offlineFixture.seed('offline_progress','fixture7234','Offline player');
  const offline=await device(browser,local,offlineFixture,{offlineCache:true});
  try{
   await login(offline.page,local.url,'offline_progress','grownup');await open(offline.page,local.url,'v1-letter-post');
   await offline.page.evaluate(()=>navigator.serviceWorker.ready);await offline.page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await offline.page.evaluate(()=>ACCOUNTS.sync());
   await offline.context.setOffline(true);await round(offline.page,'B');
   assert(await offline.page.evaluate(()=>ACCOUNTS.pending>0));
   assert.equal([...offlineFixture.events.values()].filter(e=>e.kind==='round').length,0);
   for(const game of ['v1-letter-post','v3-moonboat','v4-silk-thread']){
    await open(offline.page,local.url,game);assert.equal(await badge(offline.page,game,'B'),1,'Offline pending progress survives reload and crosses games');
    assert.equal(await offline.page.evaluate(()=>ACCOUNTS.snapshot.rounds.length),1);
   }
   await offline.page.screenshot({path:path.join(out,'offline-shared-pending-round.png'),fullPage:true});
   await offline.context.setOffline(false);await offline.page.evaluate(()=>ACCOUNTS.sync());
   assert.equal([...offlineFixture.events.values()].filter(e=>e.kind==='round').length,1,'Reconnect uploads the existing round once');
   assert.equal(await badge(offline.page,'v4-silk-thread','B'),1);assert.deepEqual(offline.errors,[]);
   results.push({offlinePendingSaved:true,offlineReloadSharedGames:3,reconnectOneRound:true,liveDatabaseRequestsSent:0});
   console.log('PASS offline correct answer: pending round survives reload in all three games and reconnects once');
  }finally{await offline.context.close();}
 }finally{await browser.close();local.server.close();fs.writeFileSync(path.join(out,'sync-animation-offline.json'),JSON.stringify(results,null,2)+'\n');}
})().catch(e=>{console.error(e);process.exitCode=1;});
