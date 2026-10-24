const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const {staticServer,playwright}=require('../../tests/accounts_sync.cjs');
(async()=>{
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const baseline=cp.execFileSync('git',['show','b0ef6de:v1-letter-post/word-pictures.css'],{encoding:'utf8'}),current=fs.readFileSync('v1-letter-post/word-pictures.css','utf8');
 try{for(const width of [390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:1024},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===local.url?route.continue():route.fulfill({json:[]}));
  const page=await context.newPage();await page.goto(local.url);await page.locator('#play-unsaved').click();await page.goto(local.url+'/v1-letter-post/');
  await page.waitForFunction(()=>document.body.dataset.screen==='home');await page.locator('#mute').click();
  for(const screen of ['home','listen','match','celebrate']){
   if(screen==='listen')await page.locator('[data-letter=A]').click();
   if(screen==='match')await page.locator('[data-action=match]').click();
   if(screen==='celebrate')await page.locator('[data-answer=A]').click();
   await page.waitForFunction(screen=>document.body.dataset.screen===screen&&!document.body.dataset.effect,screen);
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   await page.mouse.move(0,0);
   await page.addStyleTag({content:'#confetti{visibility:hidden}'});
   await page.waitForTimeout(300);
   const after=await page.locator('#main').screenshot({animations:'disabled'});
   await page.evaluate(css=>{document.querySelector('link[href="word-pictures.css"]').disabled=true;const s=document.createElement('style');s.id='baseline-word-pictures';s.textContent=css;document.head.append(s);},baseline);
   const before=await page.locator('#main').screenshot({animations:'disabled'});
   if(!after.equals(before)){fs.writeFileSync(`/tmp/letter-post-${width}-${screen}-after.png`,after);fs.writeFileSync(`/tmp/letter-post-${width}-${screen}-before.png`,before);}
   assert(after.equals(before),`${width} ${screen}: Letter Post pixels differ`);
   await page.evaluate(()=>{document.querySelector('#baseline-word-pictures').remove();document.querySelector('link[href="word-pictures.css"]').disabled=false;});
   console.log(`PASS Letter Post ${width} ${screen}: identical game-content screenshot bytes with baseline CSS`);
  }
  await context.close();
 }}finally{await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
