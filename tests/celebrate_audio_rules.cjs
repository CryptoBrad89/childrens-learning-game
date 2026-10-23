'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,playwright,backend,form}=require('./accounts_sync.cjs');
const out=process.env.CELEBRATE_REPORT_DIR||'reports/celebrate-delay';
fs.mkdirSync(out,{recursive:true});
const dirs=['v1-letter-post','v3-moonboat','v4-silk-thread'];
async function observe(context){await context.addInitScript(()=>{
 const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
 window.clips=[];window.playing=new Set();window.correctTap=null;document.addEventListener('click',e=>{if(e.target.closest('[data-answer="A"]'))window.correctTap=performance.now();},true);
 HTMLMediaElement.prototype.play=function(){const entry={src:this.src,at:performance.now(),overlap:[...window.playing].some(a=>!a.paused&&!a.ended)};window.clips.push(entry);window.playing.add(this);this.addEventListener('playing',()=>entry.started=performance.now(),{once:true});this.addEventListener('ended',()=>entry.ended=performance.now(),{once:true});return play.call(this).catch(e=>{entry.error=e.message;throw e;});};
 HTMLMediaElement.prototype.pause=function(){window.clips.push({pause:this.src,at:performance.now()});return pause.call(this);};
});}
async function letterEntry(page,letter='A'){
 await page.waitForFunction(()=>document.body.dataset.screen==='listen'&&!document.body.dataset.effect);
 if(await page.locator('#mute').getAttribute('aria-pressed')!=='true')await page.waitForFunction(()=>clips.filter(e=>e.src).length===2&&clips.filter(e=>e.src).every(e=>e.ended));
 await quiet(page);
 const clips=await page.evaluate(()=>window.clips.filter(e=>e.src));
 if(await page.locator('#mute').getAttribute('aria-pressed')==='true')assert.equal(clips.length,0,'Muted letter entry is silent');
 else{
  assert.deepEqual(clips.map(e=>new URL(e.src).pathname),[`/audio/letters/${letter.toLowerCase()}-name-trim.mp3`,`/audio/letters/${letter.toLowerCase()}-sound-trim.mp3`],'Letter entry says name then sound');
  assert(clips.every(e=>e.started&&e.ended&&!e.error&&!e.overlap),'Both real clips finish without overlap');
 }
 await page.evaluate(()=>window.clips=[]);
}
async function findPicture(page){
 await page.locator('[data-action=match]').click();
 await page.waitForFunction(()=>document.body.dataset.screen==='match'&&!document.body.dataset.effect);
 assert.equal((await page.evaluate(()=>clips)).filter(e=>e.src).length,0,'Find the picture never replays letter speech');
}
async function match(page,screenshot){
 await page.locator('[data-letter="A"]').click();await letterEntry(page);await findPicture(page);
 await page.locator('[data-action=listen]').click();await letterEntry(page);
 if(screenshot)await page.screenshot({path:screenshot,fullPage:true});
 await findPicture(page);
}
async function started(page,text){await page.waitForFunction(text=>clips.some(e=>e.src?.includes(text)&&e.started),text);}
async function quiet(page){await page.waitForFunction(()=>!document.body.classList.contains('talking'));}
(async()=>{
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
 try{
  await Promise.all([{width:1024,height:576},{width:768,height:1024},{width:1920,height:1080}].map(async viewport=>{
   const context=await browser.newContext({viewport,reducedMotion:viewport.width===768?'reduce':'no-preference'});let blocked=0;
   await context.route('**/*',r=>{if(!r.request().url().startsWith(local.url+'/')){blocked++;return r.abort();}return r.continue();});await observe(context);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(local.url+'/');await page.locator('#play-unsaved').click();await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
   for(const offline of [false,true]){
    await context.setOffline(offline);
    for(const dir of dirs){
     await page.goto(local.url+'/'+dir+'/');await page.waitForFunction(()=>document.body.dataset.screen==='home');await match(page,`${out}/${offline?'offline':'online'}-listen-${dir}-${viewport.width}.png`);
     if(!offline){
      await page.locator('[data-action=replay]').click();await started(page,'a-sound');await quiet(page);
      const replay=await page.evaluate(()=>clips.filter(e=>e.src));
      assert.deepEqual(replay.map(e=>new URL(e.src).pathname),['/audio/letters/a-sound-trim.mp3'],'Match speaker plays only the letter sound');
      await page.evaluate(()=>window.clips=[]);
     }
     if(!offline&&viewport.width===1024){
      const wrong=page.locator('[data-answer]:not([data-answer="A"])').first();
      for(let i=0;i<3;i++){await wrong.click({force:true});await started(page,'/audio/feedback/');await quiet(page);}
      const clips=await page.evaluate(()=>window.clips.filter(e=>e.src));
      assert.equal(clips.length,6,'Three wrong taps each play word then retry');
      for(let i=0;i<6;i+=2){assert(clips[i].src.includes('word-'));assert(clips[i+1].src.includes('/feedback/'));assert(clips[i+1].at-clips[i].ended>=190,'200 ms retry pause');}
      assert.equal(new Set(clips.filter(e=>e.src.includes('/feedback/')).map(e=>e.src)).size,3,'Random bag covers all retries');
      assert.equal(await page.locator('[data-answer="A"].hint,[data-answer="A"].hinted').count(),0);
      await wrong.click({force:true});await started(page,'word-');await page.evaluate(()=>window.clips=[]);await page.locator('[data-answer="A"]').click({force:true});
     }else{await page.evaluate(()=>window.clips=[]);await page.locator('[data-answer="A"]').click({force:true});}
     await started(page,'lucy-cheer');await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');
     const cheer=await page.evaluate(()=>({...clips.find(e=>e.src?.includes('lucy-cheer')),tap:window.correctTap}));assert(cheer.started);const word=await page.evaluate(()=>clips.find(e=>e.src?.includes('apple')));assert(word.started-word.at<300);assert(cheer.started-word.ended>=0&&cheer.started-word.ended<300);assert(!cheer.overlap,'New correct tap cuts off previous speech');
     await page.evaluate(()=>window.clips=[]);
     await page.locator('[data-action=reward-replay]').click({force:true});await started(page,'apple');
     assert((await page.evaluate(()=>clips)).some(e=>e.pause?.includes('lucy-cheer')),'Word replay interrupts cheer: '+JSON.stringify(await page.evaluate(()=>clips)));
     assert((await page.evaluate(()=>clips.filter(e=>e.src))).every(e=>!e.overlap&&!e.error));
     await page.locator('.celebration-copy').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
     await page.screenshot({path:`${out}/${offline?'offline':'online'}-${dir}-${viewport.width}.png`,fullPage:true});
     if(!offline)await page.screenshot({path:`${out}/after-${dir}-${viewport.width}.png`,fullPage:true});
     await page.locator('#mute').click();await page.locator('[data-action=home]').first().click();await page.waitForFunction(()=>document.body.dataset.screen==='home');
     await page.evaluate(()=>window.clips=[]);await match(page);await page.locator('[data-answer="A"]').click({force:true});await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');
     assert.equal((await page.evaluate(()=>clips)).filter(e=>e.src).length,0,'Mute suppresses celebrate');
     await page.locator('#mute').click();await page.locator('[data-action=next]').click();await page.waitForFunction(()=>document.body.dataset.screen==='listen'&&!document.body.dataset.effect);
     await letterEntry(page,'B');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     await page.locator('#mute').click();await page.locator('[data-action=home]').first().click();await page.waitForFunction(()=>document.body.dataset.screen==='home');
     await match(page);await page.locator('#mute').click();
     await page.locator('[data-answer="A"]').click({force:true});await started(page,'lucy-cheer');await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');await quiet(page);
     const correctAudio=await page.evaluate(()=>clips.filter(e=>e.src));
     assert.equal(correctAudio.length,2,'Correct answer says the tapped word then one cheer');
     assert(correctAudio[0].src.includes('apple'));
     assert(correctAudio[1].src.includes('lucy-cheer'));
     await page.evaluate(()=>window.clips=[]);
     await page.locator('[data-action=next]').click();await page.waitForFunction(()=>clips.some(e=>e.src?.includes('b-name')&&e.started));
     await page.locator('[data-action=match]').click({force:true});await page.waitForFunction(()=>document.body.dataset.screen==='match'&&!document.body.dataset.effect);
     await quiet(page);
     const interrupted=await page.evaluate(()=>clips);
     assert(interrupted.some(e=>e.pause?.includes('b-name')),'Find the picture interrupts automatic letter audio: '+JSON.stringify(interrupted));
     assert(!interrupted.some(e=>e.src?.includes('b-sound')),'Cancelled name never queues a late sound');
     results.push({dir,viewport,offline,wordDelay:word.started-cheer.tap,cheerGap:cheer.started-word.ended,nativeCheer:true,replay:true,cutoff:true,mute:true,letterEntryAutoplay:true,listenBackAutoplay:true,silentMatch:true,correctAnswerWordThenCheer:true,errors:[...errors]});
     console.log(`PASS rules ${dir} ${viewport.width} ${offline?'offline':'online'}`);
    }
   }
   assert.deepEqual(errors,[]);results.push({viewport,externalRequestsBlocked:blocked,liveRequestsSent:0});await context.close();
  }));
  // Saved progress is tested only against an in-memory regular-user fixture.
  const fixture=backend();fixture.seed('unused_fixture_owner','7234ab','Unused fixture owner');fixture.seed('celebrate_fixture','7234ab','Celebrate fixture');
  const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});await context.route('https://*.supabase.co/**',fixture.route);await observe(context);
  const page=await context.newPage();await page.goto(local.url+'/accounts/');await form(page,'signin-form',{handle:'celebrate_fixture',password:'7234ab'});
  for(const dir of dirs){await page.goto(local.url+'/'+dir+'/');await match(page);await page.locator('[data-answer="A"]').click({force:true});await started(page,'lucy-cheer');await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');await page.evaluate(()=>ACCOUNTS.sync());assert.equal(await page.evaluate(()=>ACCOUNTS.snapshot.rounds.filter(r=>r.letter==='A').length),dirs.indexOf(dir)+1);}
  results.push({regularFixtureSavedProgress:true,masterAccountAccessed:false});await context.close();
 }finally{fs.writeFileSync(out+'/audio-rules.json',JSON.stringify(results,null,2)+'\n');await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
