'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {staticServer,backend,playwright,form}=require('./accounts_sync.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/tidy-1');
const games=['v1-letter-post','v3-moonboat','v4-silk-thread'];
const baseline=process.argv.includes('--baseline');
const sizes=baseline?[[1024,576]]:[[1024,576],[768,1024],[1920,1080]];
const results=[];
const screen=(page,name)=>page.waitForFunction(name=>document.body.dataset.screen===name,name);
const settle=async page=>{try{await page.waitForFunction(()=>!document.body.dataset.effect&&!document.body.classList.contains('talking'));}catch(error){console.error('Stalled game',await page.evaluate(()=>({hidden:document.hidden,screen:document.body.dataset.screen,effect:document.body.dataset.effect,talking:document.body.classList.contains('talking'),fun:Fun.evidence,speech:speechLog})));throw error;}};
const speech=page=>page.evaluate(()=>window.speechLog);
const clear=page=>page.evaluate(()=>{window.speechLog=[];});
async function closeMenuChecks(page,role){
 const summary=page.locator('#account-strip summary'),menu=page.locator('#account-strip details');
 await summary.click();assert(await menu.evaluate(n=>n.open));
 assert.equal(await page.getByRole('link',{name:'Grown-up portal',exact:true}).count(),role==='grownup'?1:0);
 if(role==='grownup')assert.match(await page.getByRole('link',{name:'Grown-up portal',exact:true}).getAttribute('href'),/accounts\/index.html#kids$/);
 if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.locator('h1').tap();else await page.locator('h1').click();assert.equal(await menu.evaluate(n=>n.open),false);
 await summary.click();await page.locator('[data-letter=B]').click();await screen(page,'listen');await settle(page);
 assert.equal(await menu.evaluate(n=>n.open),false);
 await summary.click();await page.locator('[data-action=match]').click();await screen(page,'match');await settle(page);
 assert.equal(await menu.evaluate(n=>n.open),false);
 await summary.click();await page.locator('.choice:not([data-answer=B])').first().click();await settle(page);
 assert.equal(await menu.evaluate(n=>n.open),false);
 await summary.click();await page.keyboard.press('Escape');await screen(page,'home');await settle(page);
 assert.equal(await menu.evaluate(n=>n.open),false);
 // Open the menu while a real screen transition is pending. Replacement must close it too.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('[data-letter=B]').click();
 await page.evaluate(()=>{document.querySelector('#account-strip details').open=true;});
 await screen(page,'listen');await settle(page);
 assert.equal(await menu.evaluate(n=>n.open),false,'Screen replacement closes menu independently of outside taps');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.keyboard.press('Escape');await screen(page,'home');await settle(page);
}
async function nativeAudio(page,game,fixture){
 if(await page.locator('#mute').getAttribute('aria-pressed')==='true')await page.locator('#mute').click();
 await clear(page);
 await page.locator('[data-letter=B]').click();await screen(page,'listen');await settle(page);
 assert.deepEqual((await speech(page)).map(e=>e.file),['b-name-trim.mp3','b-sound-trim.mp3']);
 await clear(page);await page.locator('[data-action=match]').click();await screen(page,'match');await settle(page);
 assert.deepEqual(await speech(page),[],'Opening the picture screen must be silent');
 const wrong=page.locator('.choice:not([data-answer=B])');
 const word=await wrong.first().getAttribute('aria-label');
 const wordFile=await page.evaluate(word=>GAME_AUDIO.words[word].split('/').pop(),word);
 const retries=[],pauses=[];
 for(let i=0;i<5;i++){
  await clear(page);await wrong.first().click();await settle(page);
  const log=await speech(page);assert.equal(log.length,2,JSON.stringify(log));
  assert.equal(log[0].file,wordFile);
  assert.match(log[1].file,/^lucy-(uh-oh|try-again|oops-try-again)\.mp3$/);
  const gap=log[1].start-log[0].end;pauses.push(gap);assert(gap>=150&&gap<=250,`Pause ${gap} ms`);
  assert(log.every(e=>e.overlap===0&&e.end&&!e.error));retries.push(log[1].file);
  assert.equal(await page.locator('.hint,.hint-tag').count(),0);
  assert.equal(await page.locator('.choice').count(),3);
  assert(!(await page.locator('.feedback').innerText()).includes('/b/'));
  assert.equal([...fixture.events.values()].filter(e=>e.kind==='round').length,0);
  if(i===4)await page.screenshot({path:path.join(out,game+'-repeated-misses.png'),fullPage:true});
 }
 assert.equal(new Set(retries.slice(0,3)).size,3);assert(retries.includes('lucy-uh-oh.mp3'));
 // A new wrong tap interrupts the native MP3 and replaces its pending retry.
 await clear(page);await wrong.first().click();
 await page.waitForFunction(()=>speechLog.length===1&&!speechLog[0].end);
 await wrong.nth(1).click();await settle(page);
 let log=await speech(page);assert(log[0].pause);assert.equal(log.length,3);
 assert.equal(log[1].file,await page.evaluate(word=>GAME_AUDIO.words[word].split('/').pop(),await wrong.nth(1).getAttribute('aria-label')));
 assert(log.every(e=>e.overlap===0));
 // Replay interrupts both an active word, the pause, and an active retry.
 for(const phase of ['word','pause','retry']){
  await clear(page);await wrong.first().click();
  await page.waitForFunction(phase=>phase==='word'?speechLog.length===1&&!speechLog[0].end:phase==='pause'?speechLog.length===1&&Boolean(speechLog[0].end):speechLog.length===2&&!speechLog[1].end,phase);
  await page.locator('.match .listen-letter').click();await settle(page);
  log=await speech(page);assert.equal(log.at(-1).file,'b-sound-trim.mp3');
  assert.equal(log.length,phase==='retry'?3:2);
  assert(log.every(e=>e.overlap===0));assert(!log.some(e=>e.file==='b-name-trim.mp3'||e.file==='word-ball.mp3'));
 }
 // Muting suppresses the complete wrong-answer sequence.
 await page.locator('#mute').click();await clear(page);await wrong.first().click();await settle(page);assert.deepEqual(await speech(page),[]);
 await page.locator('#mute').click();await page.locator('[data-answer=B]').click();await screen(page,'celebrate');await settle(page);
 assert.equal([...fixture.events.values()].filter(e=>e.kind==='round').length,1);
 await page.keyboard.press('Escape');await screen(page,'home');await settle(page);
 if(game!=='v4-silk-thread')assert.equal(await page.locator('[data-letter=B] .done-badge').count(),1);
 else assert.equal(await page.locator('[data-letter=B] .visited').count(),1);
 results.push({game,nativeAudio:true,pauseMs:pauses,retryClips:retries,interruptions:['new picture','replay during word','replay during pause','replay during retry'],correctOnly:true});
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const local=await staticServer(process.env.TIDY_ROOT||root);
 const browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
 for(const [width,height]of sizes)for(const role of baseline?['grownup']:['grownup','child']){
  const fixture=backend();fixture.seed('tidy_adult','test7234','Preview grown-up');fixture.seed('tidy_child','test7234','Preview child',{role:'child'});
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width===768,serviceWorkers:'block'});
  const external=[],errors=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin===local.url)return route.continue();
   external.push({url:url.origin+url.pathname,method:route.request().method()});
   if(url.hostname.endsWith('.supabase.co'))return fixture.route(route);
   return route.abort();
  });
  await context.addInitScript(()=>{
   window.speechLog=[];const players=new Set(),play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
   HTMLMediaElement.prototype.play=function(){
    const entry={file:new URL(this.src).pathname.split('/').pop(),start:performance.now(),overlap:[...players].filter(p=>p!==this&&!p.paused&&!p.ended).length};
    speechLog.push(entry);players.add(this);this._tidyEntry=entry;
    this.addEventListener('ended',()=>{entry.end=performance.now();},{once:true});
    this.addEventListener('error',()=>{entry.error=true;},{once:true});return play.call(this);
   };
   HTMLMediaElement.prototype.pause=function(){if(this._tidyEntry&&!this.ended)this._tidyEntry.pause=performance.now();return pause.call(this);};
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(local.url+(role==='grownup'?'/accounts/':'/'));
  await form(page,role==='grownup'?'signin-form':'child-signin-form',{handle:'tidy_'+(role==='grownup'?'adult':'child'),password:'test7234'});
  for(const game of baseline?[games[0]]:games){
   await page.goto(local.url+'/'+game+'/');await screen(page,'home');await settle(page);
   if(width===1024&&role==='grownup')await nativeAudio(page,game,fixture);
   // Later games use their own round count for the detailed native-audio checks.
   fixture.events.clear();
   if(baseline)continue;
   if(await page.locator('#mute').getAttribute('aria-pressed')==='false')await page.locator('#mute').click();
   await closeMenuChecks(page,role);
   await page.selectOption('#theme','1');await settle(page);
   await page.locator('#account-strip summary').click();
   const bounds=await page.locator('#account-strip .account-menu').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
   await page.screenshot({path:path.join(out,`${game}-${role}-${width}x${height}-menu.png`),fullPage:true});
   if(role==='grownup'){
    await page.getByRole('link',{name:'Grown-up portal',exact:true}).click();await page.waitForURL('**/accounts/index.html#kids');
    await page.waitForFunction(()=>ACCOUNTS?.profile?.role==='grownup');
   }
   results.push({game,role,width,height,portal:role==='grownup',outsideTap:true,navigationClose:true,liveDatabaseRequestsSent:0});
   console.log(`PASS ${game} ${role} ${width}x${height}: menu, role, routes, screenshots${width===1024&&role==='grownup'?', native audio and correct-only progress':''}`);
  }
  assert.deepEqual(errors,[]);assert(external.every(e=>new URL(e.url).hostname.endsWith('.supabase.co')));
  await context.close();
 }
 }finally{await browser.close();local.server.close();fs.writeFileSync(path.join(out,baseline?'baseline-results.json':'checks.json'),JSON.stringify(results,null,2)+'\n');}
})().catch(e=>{console.error(e);process.exitCode=1;});
