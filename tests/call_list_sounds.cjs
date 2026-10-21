'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,backend,playwright,form}=require('./accounts_sync.cjs');
(async()=>{
 const local=await staticServer(),base=process.env.CALL_LIST_HOSTED||local.url+'/',browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const results=[];
 try{for(const [role,width] of [['grownup',390],['child',768],['guest',1440]]){
  const fixture=backend();fixture.seed('sound_adult','7234ab','Sound fixture');
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('https://*.supabase.co/**',fixture.route);
  await context.addInitScript(()=>{
   const play=HTMLMediaElement.prototype.play,players=new Set();window.soundEvidence=[];
   HTMLMediaElement.prototype.play=function(){
    const overlapping=[...players].filter(p=>p!==this&&!p.paused&&!p.ended);
    window.soundEvidence.push({src:this.src,overlap:overlapping.length,volume:this.volume});players.add(this);
    return play.call(this);
   };
  });
  const page=await context.newPage();await page.goto(base+'accounts/');await form(page,'signin-form',{handle:'sound_adult',password:'7234ab'});
  if(role==='child'){
   await page.evaluate(()=>ACCOUNTS.manage('create-child',{handle:'sound_kid',display_name:'Sound kid',password:'7234ab'}));await page.evaluate(()=>ACCOUNTS.signOut());await page.goto(base);await form(page,'child-signin-form',{handle:'sound_kid',password:'7234ab'});
  }else if(role==='guest'){await page.evaluate(()=>ACCOUNTS.startGuest());}
  for(const dir of ['v4-silk-thread','v1-letter-post','v3-moonboat']){
   await page.goto(base+dir+'/');await page.locator('[data-letter="B"]').click();
   await page.waitForFunction(()=>!document.body.classList.contains('talking'));await page.locator('[data-action="match"]').click();
   await page.waitForFunction(()=>document.body.dataset.screen==='match'&&!document.body.classList.contains('talking'));
   const wrong=page.locator('[data-answer]:not([data-answer="B"])').first();
   for(let i=0;i<3;i++){
    await wrong.click();await page.waitForFunction(()=>document.querySelector('.choice')?.getAttribute('aria-disabled')!=='true'&&!document.body.classList.contains('talking'));
   }
   const evidence=await page.evaluate(()=>window.soundEvidence);
   const retry=evidence.filter(e=>e.src.includes('/audio/feedback/'));assert.equal(retry.length,3);assert.equal(new Set(retry.map(e=>e.src)).size,3);assert(evidence.every(e=>e.overlap===0),'No speech overlap');
   await page.locator('#mute').click();await wrong.click();await page.waitForFunction(()=>document.querySelector('.choice')?.getAttribute('aria-disabled')!=='true');
   assert.equal((await page.evaluate(()=>window.soundEvidence)).length,evidence.length,'Mute suppresses wrong-answer speech');
   await page.locator('#mute').click();await wrong.click();await page.waitForFunction(()=>document.body.classList.contains('talking'));await page.keyboard.press('Escape');
   await page.waitForFunction(()=>document.body.dataset.screen==='home'&&!document.body.classList.contains('talking'));
   results.push({role,width,layout:dir,clips:retry.map(e=>e.src.split('/').pop()),overlap:false,mute:true,cancel:true});
   console.log(`PASS sounds ${role} ${width} ${dir}: native MP3 playback, three varied clips, no overlap, mute, Escape cancellation`);
  }
  await context.close();
 }}finally{await browser.close();local.server.close();fs.writeFileSync('reports/call-list-sounds-results.json',JSON.stringify(results,null,2)+'\n');}
})().catch(e=>{console.error(e);process.exitCode=1;});
