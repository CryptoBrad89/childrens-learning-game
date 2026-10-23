'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const {staticServer,playwright}=require('./accounts_sync.cjs');
const dirs=['v1-letter-post','v3-moonboat','v4-silk-thread'].filter(dir=>!process.env.CELEBRATE_LAYOUT||dir===process.env.CELEBRATE_LAYOUT);
const sizes=[{width:1024,height:576},{width:768,height:1024},{width:1920,height:1080}].filter(viewport=>!process.env.CELEBRATE_WIDTH||viewport.width===Number(process.env.CELEBRATE_WIDTH));
const baseline=cp.execFileSync('git',['show',`${process.env.CELEBRATE_BASELINE_REF||'67cf3c2'}:v1-letter-post/app.js`],{encoding:'utf8'});
const initial=process.argv.includes('--baseline'),runs=initial?1:5;
const out=process.env.CELEBRATE_REPORT_DIR||'reports/celebrate-delay';fs.mkdirSync(out,{recursive:true});
async function instrument(context){
 await context.addInitScript(()=>{
  window.audioEvidence=[];window.motionEvidence=[];window.tapAt=null;
  document.addEventListener('click',e=>{if(e.target.closest('[data-answer="A"]'))window.tapAt=performance.now();},true);
  const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause,animate=Element.prototype.animate;
  HTMLMediaElement.prototype.play=function(){
   const entry={src:this.src,requested:performance.now()};window.audioEvidence.push(entry);
   this.addEventListener('playing',()=>{entry.started=performance.now();entry.delay=entry.started-window.tapAt;entry.duration=this.duration;},{once:true});
   this.addEventListener('ended',()=>entry.ended=performance.now(),{once:true});
   this.addEventListener('error',()=>entry.error=this.error?.message,{once:true});
   return play.call(this).catch(e=>{entry.error=e.message;throw e;});
  };
  HTMLMediaElement.prototype.pause=function(){window.audioEvidence.push({paused:this.src,at:performance.now()});return pause.call(this);};
  Element.prototype.animate=function(frames,options){const entry={duration:options.duration,start:performance.now()};window.motionEvidence.push(entry);const a=animate.call(this,frames,options);a.finished.then(()=>entry.end=performance.now(),()=>entry.cancelled=true);return a;};
 });
}
async function enter(page,url,dir){await page.goto(url+'/');await page.locator('#play-unsaved').click();await page.goto(url+'/'+dir+'/');await page.locator('[data-letter="A"]').click();await page.locator('[data-action="match"]').waitFor();await page.waitForFunction(()=>document.body.dataset.screen==='listen'&&!document.body.classList.contains('talking')&&!document.body.dataset.effect);await page.locator('[data-action="match"]').click();await page.waitForFunction(()=>document.body.dataset.screen==='match'&&!document.body.dataset.effect);}
(async()=>{
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
 try{
  for(const viewport of sizes){
   await Promise.all(dirs.map(async dir=>{
    for(let run=0;run<runs;run++)for(const phase of initial?['before']:['before','after']){
     const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'no-preference'});let external=0;
     await context.route('**/*',route=>{if(!route.request().url().startsWith(local.url+'/')){external++;return route.abort();}if(phase==='before'&&/\/(v1-letter-post|v3-moonboat)\/app.js$/.test(route.request().url()))return route.fulfill({contentType:'text/javascript',body:baseline});return route.continue();});
     await instrument(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
     await enter(page,local.url,dir);await page.evaluate(()=>{window.audioEvidence=[];window.motionEvidence=[];});
     await page.locator('[data-answer="A"]').click();
     await page.waitForFunction(()=>window.audioEvidence.some(e=>e.src?.includes('lucy-cheer')&&e.started),{},{timeout:15000});
     const evidence=await page.evaluate(()=>({audio:window.audioEvidence,motion:window.motionEvidence,tapAt:window.tapAt,resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('lucy-cheer')).map(e=>e.toJSON())}));
     assert.deepEqual(errors,[]);assert(evidence.audio.filter(e=>e.src).every(e=>!e.error));
     const cheer=evidence.audio.find(e=>e.src?.includes('lucy-cheer'));
     if(phase==='after'){const word=evidence.audio.find(e=>e.src?.includes('apple'));assert(word?.started&&word.ended,'Tapped word plays fully');assert(word.delay<300,`Word starts promptly: ${word.delay}`);assert(cheer.started-word.ended<300,'Cheer follows word promptly');assert.equal(evidence.audio.filter(e=>e.src).length,2,'Tapped word then cheer follow correct tap');}
     await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');
     if(run===0)await page.screenshot({path:`${out}/${phase}-${dir}-${viewport.width}.png`,fullPage:true});
     results.push({phase,dir,viewport,run,delay:cheer.delay,externalBlocked:external,...evidence});
     console.log(`PASS ${phase} ${dir} ${viewport.width} run ${run+1}: ${cheer.delay.toFixed(1)} ms, native playing event`);
     await context.close();
    }
   }));
  }
 }finally{fs.writeFileSync(`${out}/${initial?'baseline':'timings'}.json`,JSON.stringify(results,null,2)+'\n');await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
