'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,playwright,backend,form}=require('./accounts_sync.cjs');
const out='reports/celebrate-delay';
const dirs=['v1-letter-post','v3-moonboat','v4-silk-thread'];
async function observe(context){await context.addInitScript(()=>{
 const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
 window.clips=[];window.playing=new Set();window.correctTap=null;document.addEventListener('click',e=>{if(e.target.closest('[data-answer="A"]'))window.correctTap=performance.now();},true);
 HTMLMediaElement.prototype.play=function(){const entry={src:this.src,at:performance.now(),overlap:[...window.playing].some(a=>!a.paused&&!a.ended)};window.clips.push(entry);window.playing.add(this);this.addEventListener('playing',()=>entry.started=performance.now(),{once:true});this.addEventListener('ended',()=>entry.ended=performance.now(),{once:true});return play.call(this).catch(e=>{entry.error=e.message;throw e;});};
 HTMLMediaElement.prototype.pause=function(){window.clips.push({pause:this.src,at:performance.now()});return pause.call(this);};
});}
async function match(page){await page.locator('[data-letter="A"]').click();await page.waitForFunction(()=>document.body.dataset.screen==='listen'&&!document.body.dataset.effect);assert.equal((await page.evaluate(()=>clips)).filter(e=>e.src).length,0,'No automatic letter/name/sound on entry');await page.locator('[data-action=match]').click();await page.waitForFunction(()=>document.body.dataset.screen==='match'&&!document.body.dataset.effect);}
async function started(page,text){await page.waitForFunction(text=>clips.some(e=>e.src?.includes(text)&&e.started),text);}
async function quiet(page){await page.waitForFunction(()=>!document.body.classList.contains('talking'));}
(async()=>{
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
 try{
  for(const viewport of [{width:1024,height:576},{width:768,height:1024},{width:1920,height:1080}]){
   const context=await browser.newContext({viewport,reducedMotion:viewport.width===768?'reduce':'no-preference'});let blocked=0;
   await context.route('**/*',r=>{if(!r.request().url().startsWith(local.url+'/')){blocked++;return r.abort();}return r.continue();});await observe(context);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(local.url+'/');await page.locator('#play-unsaved').click();await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
   for(const offline of [false,true]){
    await context.setOffline(offline);
    for(const dir of dirs){
     await page.goto(local.url+'/'+dir+'/');await page.waitForFunction(()=>document.body.dataset.screen==='home');await match(page);
     if(!offline&&viewport.width===1024){
      const wrong=page.locator('[data-answer]:not([data-answer="A"])').first();
      for(let i=0;i<3;i++){await wrong.click();await started(page,'/audio/feedback/');await quiet(page);}
      const clips=await page.evaluate(()=>window.clips.filter(e=>e.src));
      assert.equal(clips.length,6,'Three wrong taps each play word then retry');
      for(let i=0;i<6;i+=2){assert(clips[i].src.includes('word-'));assert(clips[i+1].src.includes('/feedback/'));assert(clips[i+1].at-clips[i].ended>=190,'200 ms retry pause');}
      assert.equal(new Set(clips.filter(e=>e.src.includes('/feedback/')).map(e=>e.src)).size,3,'Random bag covers all retries');
      assert.equal(await page.locator('[data-answer="A"].hint,[data-answer="A"].hinted').count(),0);
      await wrong.click();await started(page,'word-');await page.evaluate(()=>window.clips=[]);await page.locator('[data-answer="A"]').click();
     }else{await page.evaluate(()=>window.clips=[]);await page.locator('[data-answer="A"]').click();}
     await started(page,'lucy-cheer');await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');
     const cheer=await page.evaluate(()=>({...clips.find(e=>e.src?.includes('lucy-cheer')),tap:window.correctTap}));assert(cheer.started);assert(cheer.started-cheer.tap<300);assert(!cheer.overlap,'New correct tap cuts off previous speech');
     await page.locator('[data-action=reward-replay]').click();await started(page,'apple');
     assert((await page.evaluate(()=>clips)).some(e=>e.pause?.includes('lucy-cheer')),'Word replay interrupts cheer');
     assert((await page.evaluate(()=>clips.filter(e=>e.src))).every(e=>!e.overlap&&!e.error));
     await page.locator('.celebration-copy').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
     await page.screenshot({path:`${out}/${offline?'offline':'online'}-${dir}-${viewport.width}.png`,fullPage:true});
     if(!offline)await page.screenshot({path:`${out}/after-${dir}-${viewport.width}.png`,fullPage:true});
     await page.locator('[data-action=home]').first().click();await page.waitForFunction(()=>document.body.dataset.screen==='home');
     await page.evaluate(()=>window.clips=[]);await match(page);await page.locator('#mute').click();await page.locator('[data-answer="A"]').click();await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');
     assert.equal((await page.evaluate(()=>clips)).filter(e=>e.src).length,0,'Mute suppresses celebrate');
     await page.locator('#mute').click();await page.locator('[data-action=next]').click();await page.waitForFunction(()=>document.body.dataset.screen==='listen'&&!document.body.dataset.effect);
     assert.equal((await page.evaluate(()=>clips)).filter(e=>e.src).length,0,'Another sound never autoplays letter speech');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     results.push({dir,viewport,offline,delay:cheer.started-cheer.tap,nativeCheer:true,replay:true,cutoff:true,mute:true,noAutomaticLetterOrWord:true,errors:[...errors]});
     console.log(`PASS rules ${dir} ${viewport.width} ${offline?'offline':'online'}`);
    }
   }
   assert.deepEqual(errors,[]);results.push({viewport,externalRequestsBlocked:blocked,liveRequestsSent:0});await context.close();
  }
  // Saved progress is tested only against an in-memory regular-user fixture.
  const fixture=backend();fixture.seed('unused_fixture_owner','7234ab','Unused fixture owner');fixture.seed('celebrate_fixture','7234ab','Celebrate fixture');
  const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});await context.route('https://*.supabase.co/**',fixture.route);await observe(context);
  const page=await context.newPage();await page.goto(local.url+'/accounts/');await form(page,'signin-form',{handle:'celebrate_fixture',password:'7234ab'});
  for(const dir of dirs){await page.goto(local.url+'/'+dir+'/');await match(page);await page.locator('[data-answer="A"]').click();await started(page,'lucy-cheer');await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');await page.evaluate(()=>ACCOUNTS.sync());assert.equal(await page.evaluate(()=>ACCOUNTS.snapshot.rounds.filter(r=>r.letter==='A').length),dirs.indexOf(dir)+1);}
  results.push({regularFixtureSavedProgress:true,masterAccountAccessed:false});await context.close();
 }finally{fs.writeFileSync(out+'/audio-rules.json',JSON.stringify(results,null,2)+'\n');await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
