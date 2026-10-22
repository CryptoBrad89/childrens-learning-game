'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {staticServer,backend,playwright,form}=require('./accounts_sync.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/tidy-1b');
const games=[['v1-letter-post','post'],['v3-moonboat','moonboat'],['v4-silk-thread','ribbon']];
const sizes=[[1024,576],[768,1024],[1920,1080]],results=[];
const settled=page=>page.waitForFunction(()=>document.body.dataset.screen==='home'&&!document.body.dataset.effect);
async function dimensions(page){
 return page.locator('.player-controls').evaluate(group=>{
  const rect=selector=>{const n=group.querySelector(selector),r=n.getBoundingClientRect();return {width:r.width,height:r.height,centerY:r.y+r.height/2};};
  const avatar=rect('#account-strip img'),button=rect('#account-strip summary');
  const style=getComputedStyle(group.querySelector('#account-strip summary'));
  const centers=['#mute','.theme-control','#account-strip summary'].map(s=>rect(s).centerY);
  return {avatar,button,padding:style.padding,borderRadius:style.borderRadius,alignment:Math.max(...centers)-Math.min(...centers)};
 });
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
 for(const [width,height]of sizes){
  const fixture=backend();fixture.seed('tidy1b_adult','test7234','Preview grown-up');fixture.seed('tidy1b_child','test7234','Preview child',{role:'child'});
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width===768,serviceWorkers:'block'});
  const errors=[],requests=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin===local.url)return route.continue();
   if(url.hostname==='127.0.0.1'&&url.pathname==='/accounts/lucy/garden.jpg')return route.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(path.join(root,'accounts/lucy/garden.jpg'))});
   requests.push({host:url.hostname,path:url.pathname,method:route.request().method()});
   if(url.hostname.endsWith('.supabase.co'))return fixture.route(route);
   return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const approved={};
  for(const [game,slug]of games){
   await page.goto(local.url+'/previews/tidy-1/'+slug+'-proposed.html');await page.evaluate(()=>document.fonts.ready);
   approved[game]=await dimensions(page);
  }
  for(const role of ['grownup','child']){
   await page.goto(local.url+(role==='grownup'?'/accounts/':'/'));
   await form(page,role==='grownup'?'signin-form':'child-signin-form',{handle:'tidy1b_'+(role==='grownup'?'adult':'child'),password:'test7234'});
   for(const [game]of games){
    await page.goto(local.url+'/'+game+'/');await settled(page);await page.evaluate(()=>document.fonts.ready);
    for(let theme=0;theme<3;theme++){
     await page.selectOption('#theme',String(theme));await settled(page);
     const actual=await dimensions(page),expected=approved[game];
     for(const key of ['width','height']){
      assert.equal(actual.avatar[key],42,`${game} avatar ${key}`);
      assert.equal(actual.avatar[key],expected.avatar[key],'Avatar matches approved preview');
      assert.equal(actual.button[key],50,`${game} button ${key}`);
      assert.equal(actual.button[key],expected.button[key],'Button matches approved preview');
     }
     assert.equal(actual.padding,expected.padding);assert.equal(actual.borderRadius,expected.borderRadius);
     assert(actual.alignment<1,'Profile stays centered with sound and theme buttons');
     assert.equal(await page.locator('.open-sign').count(),0);
     assert.equal(await page.locator('body').innerText().then(text=>/OPEN FOR\s+PLAY!/i.test(text)),false);
     if(game==='v1-letter-post'){
      assert.equal(await page.locator('.office-top .lucy').count(),1);
      assert.equal(await page.locator('[data-letter]').count(),6);
     }
     await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
     const prefix=`${game}-${role}-${width}x${height}-theme${theme}`;
     await page.screenshot({path:path.join(out,prefix+'-home.png'),fullPage:true});
     const summary=page.locator('#account-strip summary'),menu=page.locator('#account-strip details');
     await summary.click();assert(await menu.evaluate(n=>n.open));
     assert.equal(await page.getByRole('link',{name:'Grown-up portal',exact:true}).count(),role==='grownup'?1:0);
     const bounds=await page.locator('#account-strip .account-menu').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
     if(theme===0)await page.screenshot({path:path.join(out,prefix+'-menu.png'),fullPage:true});
     if(width===768)await page.locator('h1').tap();else await page.locator('h1').click();
     assert.equal(await menu.evaluate(n=>n.open),false,'Outside tap closes the resized profile menu');
     results.push({game,role,width,height,theme,themeName:await page.locator('#theme option:checked').innerText(),...actual,approvedMatch:true,noTag:true,portal:role==='grownup',liveDatabaseRequestsSent:0});
    }
    console.log(`PASS ${game} ${role} ${width}x${height}: all themes match approved 42px/50px preview, aligned controls, no tag, menu works`);
   }
   await page.evaluate(()=>ACCOUNTS.signOut());
  }
  assert.deepEqual(errors,[]);assert(requests.every(r=>r.host.endsWith('.supabase.co')),JSON.stringify(requests));
  await context.close();
 }
 console.log(`PASS ${results.length} live-game visual cases; all external account requests handled by local fixtures`);
 }finally{await browser.close();local.server.close();fs.writeFileSync(path.join(out,'visual-checks.json'),JSON.stringify(results,null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
