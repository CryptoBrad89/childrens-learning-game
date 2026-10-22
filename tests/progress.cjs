'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {staticServer,backend,playwright,form}=require('./accounts_sync.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/progress');
const run=process.env.PROGRESS_RUN||'after',results=[];
const games=['v1-letter-post','v3-moonboat','v4-silk-thread'];
const screen=(page,name)=>page.waitForFunction(name=>document.body.dataset.screen===name,name);
const settled=page=>page.waitForFunction(()=>!document.body.dataset.effect&&!document.body.classList.contains('talking'));
async function login(page,url,handle,role){
 await page.goto(url+(role==='grownup'?'/accounts/':'/'));
 await form(page,role==='grownup'?'signin-form':'child-signin-form',{handle,password:'fixture7234'});
}
async function open(page,url,game){
 await page.goto(url+'/'+game+'/');await screen(page,'home');await settled(page);
 if(await page.locator('#mute').getAttribute('aria-pressed')==='false')await page.locator('#mute').click();
}
async function home(page){await page.keyboard.press('Escape');await screen(page,'home');await settled(page);}
async function round(page,letter,{wrong=false}={}){
 while(!await page.locator(`[data-letter=${letter}]`).count())await page.locator('[data-action=letters-next]').click();
 await page.locator(`[data-letter=${letter}]`).click();await screen(page,'listen');await settled(page);
 await page.locator('[data-action=match]').click();await screen(page,'match');await settled(page);
 await page.locator(wrong?`.choice:not([data-answer=${letter}])`:`[data-answer=${letter}]`).first().click();
 if(wrong)await settled(page);else await screen(page,'celebrate');
 await home(page);
}
async function signedOut(page,url){
 await page.locator('#account-strip summary').click();await page.locator('#account-strip button').click();
 await page.waitForURL(url+'/index.html');await page.waitForFunction(()=>!ACCOUNTS.profile);
}
async function badge(page,game,letter){return page.locator(`[data-letter=${letter}] ${game==='v4-silk-thread'?'.visited':'.done-badge'}`).count();}
async function savedBadge(page,game,letter){
 assert.equal(await badge(page,game,letter),1,`${game}: saved ${letter} must be done`);
 assert(!/this visit/i.test(await page.locator(`[data-letter=${letter}]`).getAttribute('aria-label')||''));
 assert(!/this visit/i.test(await page.locator('.collection-preview,.collection').innerText()));
 if(game!=='v4-silk-thread'){
  await page.locator('.collection-preview summary').click();
  assert.equal(await page.locator(`[data-collection-letter=${letter}] .done-badge`).count(),1);
  await page.locator('.collection-preview summary').click();
 }else assert.equal(await page.locator('.collection-slot.collected').count(),1);
}
async function testProgress(){
 fs.mkdirSync(out,{recursive:true});const local=await staticServer(process.env.PROGRESS_ROOT||root);
 const browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
 for(const [width,height]of [[1024,576],[768,1024],[1920,1080]])for(const role of ['grownup','child']){
  const fixture=backend();fixture.seed('fixture_admin','fixture7234');
  const parent=fixture.seed('progress_adult','fixture7234','Progress grown-up');
  const main=role==='grownup'?'progress_adult':'progress_child',other=role==='grownup'?'progress_other':'progress_other_child';
  fixture.seed('progress_child','fixture7234','Progress child',{role:'child',adult_id:parent});
  fixture.seed('progress_other','fixture7234','Other grown-up');fixture.seed('progress_other_child','fixture7234','Other child',{role:'child',adult_id:parent});
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width===768,serviceWorkers:'block'});
  const errors=[],external=[];await context.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin===local.url)return route.continue();
   external.push(url.hostname);if(url.hostname.endsWith('.supabase.co'))return fixture.route(route);return route.abort();
  });
  await context.addInitScript(()=>{
   window.badgeAnimations=[];const animate=Element.prototype.animate;
   Element.prototype.animate=function(...args){if(this.matches('.done-badge'))badgeAnimations.push({letter:this.closest('[data-letter],[data-collection-letter]')?.dataset,duration:args[1]?.duration});return animate.apply(this,args);};
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const prefix=`${run}-${role}-${width}x${height}`;
  await login(page,local.url,main,role);await open(page,local.url,games[0]);
  await page.locator('[data-letter=A]').click();await screen(page,'listen');await home(page);
  assert.equal(await badge(page,games[0],'A'),0,'Opening does not count');
  await round(page,'A',{wrong:true});assert.equal(await badge(page,games[0],'A'),0,'A wrong answer does not count');
  assert.equal(await page.evaluate(()=>ACCOUNTS.snapshot.rounds.length),0);
  await round(page,'B');assert.equal(await badge(page,games[0],'B'),1);
  await page.evaluate(()=>ACCOUNTS.sync());
  const persisted=await page.evaluate(async()=>({local:ACCOUNTS.snapshot.rounds,remote:(await ACCOUNTS.readProgress(ACCOUNTS.owner.id)).snapshot.rounds}));
  assert.equal(persisted.local.length,1);assert.equal(persisted.remote.length,1);assert.equal(persisted.remote[0].letter,'B');
  await page.reload();await screen(page,'home');await settled(page);
  await page.screenshot({path:path.join(out,prefix+'-reloaded.png'),fullPage:true});
  fs.writeFileSync(path.join(out,prefix+'-stored-rounds.json'),JSON.stringify(persisted,null,2)+'\n');
  assert.equal(await page.evaluate(()=>ACCOUNTS.snapshot.rounds.length),1,'The saved round survives reload');
  assert.equal(await badge(page,games[0],'B'),1,'A saved correct answer must restore the badge after reload');
  await signedOut(page,local.url);await login(page,local.url,main,role);
  for(const game of games){
   await open(page,local.url,game);await savedBadge(page,game,'B');assert.equal(await badge(page,game,'A'),0);
   const fit=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
   assert(fit.width<=width+1,'Home has no horizontal overflow');
   if(game!=='v4-silk-thread')assert(fit.height<=height+1,'Collapsed home fits the viewport');
   await page.screenshot({path:path.join(out,`${prefix}-${game}-saved.png`),fullPage:true});
   assert.equal(await page.evaluate(()=>badgeAnimations.length),0,'Saved completions never settle');
  }
  await signedOut(page,local.url);await login(page,local.url,other,role);
  for(const game of games){await open(page,local.url,game);assert.equal(await badge(page,game,'B'),0,'Another account cannot inherit B');}
  await round(page,'D');await page.evaluate(()=>ACCOUNTS.sync());await signedOut(page,local.url);
  await login(page,local.url,main,role);await open(page,local.url,games[0]);
  assert.equal(await badge(page,games[0],'B'),1);assert.equal(await badge(page,games[0],'D'),0,'Other account D stays separate');
  await signedOut(page,local.url);await page.locator('#play-unsaved').click();
  await open(page,local.url,games[0]);assert.equal(await badge(page,games[0],'B'),0,'Guest ignores stored accounts');
  await round(page,'A',{wrong:true});assert.equal(await badge(page,games[0],'A'),0);
  await round(page,'B');assert.equal(await badge(page,games[0],'B'),1);
  assert.match(await page.locator('.collection-heading').innerText(),/this visit/);
  await page.reload();await screen(page,'home');assert.equal(await badge(page,games[0],'B'),0,'Guest progress ends on reload');
  await open(page,local.url,games[1]);assert.equal(await badge(page,games[1],'B'),0,'Guest does not inherit cross-game history');
  assert.deepEqual(errors,[]);assert(external.every(host=>host.endsWith('.supabase.co')));
  results.push({role,width,height,persisted:true,sharedGames:3,signInRestored:true,openingAndWrongDoNotCount:true,accountIsolation:true,guestVisitOnly:true,loadedSettle:false,liveDatabaseRequestsSent:0});
  await context.close();console.log(`PASS ${role} ${width}x${height}: correct-only persistence, reload, sign-in, three games, account isolation and guests`);
 }
 }finally{await browser.close();local.server.close();fs.writeFileSync(path.join(out,run+'-checks.json'),JSON.stringify(results,null,2)+'\n');}
}
module.exports={screen,settled,login,open,home,round,signedOut,badge,savedBadge};
if(require.main===module)testProgress().catch(e=>{console.error(e);process.exitCode=1;});
