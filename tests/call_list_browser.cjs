'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,backend,playwright,form,settle}=require('./accounts_sync.cjs');
(async()=>{
 const before=process.argv.includes('--before'),hosted=process.env.CALL_LIST_HOSTED;
 const local=hosted?null:await staticServer(),base=hosted||local.url+'/',phase=before?'before':hosted?'hosted':'after';
 const shots=`reports/risky-actions/browser/call-list-${phase}`;fs.mkdirSync(shots,{recursive:true});
 const browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const width of [390,768,1440]){
  const fixture=backend();fixture.seed('call_master','7234ab','Brandy (fixture)');fixture.seed('call_regular','7234ab','Additional administrator');
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('https://*.supabase.co/**',fixture.route);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const shot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${shots}/${name}-${width}.png`,fullPage:true});};
  await page.goto(base+'accounts/');await form(page,'signin-form',{handle:'call_master',password:'7234ab'});
  for(const [handle,display_name] of [['call_ava','Ava'],['call_leo','Leo']])await form(page,'create-child-form',{handle,display_name,password:'7234ab'});
  await page.waitForFunction(()=>document.querySelectorAll('#children-list li').length===2);await page.evaluate(()=>scrollTo(0,0));await shot('kids');
  if(!before){
   assert.equal(await page.locator('#children-list li').count(),2);
   for(const row of await page.locator('#children-list li').all())assert.equal(await row.getByRole('button',{name:/progress page/}).count(),1);
   const sign=await page.locator('#sign-out').boundingBox(),list=await page.locator('#children-list').boundingBox();assert(sign.y+sign.height<=list.y,'Sign out precedes the roster');
   assert.equal(await page.locator('#settings-link').evaluate(e=>getComputedStyle(e).color),'rgb(37, 63, 101)');
  }
  await page.locator('#adults-view').click();await page.locator('#grownups-list li input').check();await page.locator('#delete-selected-grownups').click();await shot('delete-dialog');
  if(!before){
   const count=await page.locator('#confirm-grownup-password').boundingBox(),action=await page.locator('#confirm-grownup-action').boundingBox();assert(count.y+count.height<=action.y);
   assert(await page.locator('#confirm-grownup-action').isDisabled());await page.locator('#confirm-grownup-password').fill('');assert(await page.locator('#confirm-grownup-action').isDisabled());
   await page.locator('#confirm-grownup-password').fill('7234ab');assert(await page.locator('#confirm-grownup-action').isEnabled());assert.match(await page.locator('#confirm-grownup-copy').innerText(),/master account/);
  }
  await page.locator('#cancel-grownup').click();await page.locator('#my-account').click();if(!before){assert(await page.locator('#profile-form').isHidden());assert(await page.locator('#own-password-form').isHidden());assert(await page.locator('#reset-own-progress').isHidden());await page.evaluate(()=>ACCOUNTS.signOut());await page.goto(base+'accounts/');await form(page,'signin-form',{handle:'call_regular',password:'7234ab'});await page.locator('#my-account').click();}await page.locator('#profile-form').locator('xpath=ancestor::details').evaluate(e=>e.open=true);await shot('profile-options');
  if(!before){
   const choices=page.locator('#profile-form [name=avatar]');assert.equal(await choices.count(),6);
   for(let i=0;i<6;i++){
    await choices.nth(i).check();const value=await choices.nth(i).inputValue();assert.match(value,/^data:image\/jpeg;base64,/);
    await form(page,'profile-form',{handle:'call_regular',display_name:'Additional administrator'});assert.equal(await page.evaluate(()=>ACCOUNTS.profile.avatar),value);
   }
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');await page.locator('#profile-avatar-upload').setInputFiles({name:'own.png',mimeType:'image/png',buffer:png});await page.locator('#profile-avatar-preview').waitFor();await form(page,'profile-form',{handle:'call_regular',display_name:'Additional administrator'});assert.match(await page.evaluate(()=>ACCOUNTS.profile.avatar),/^data:image\/jpeg/);
   await page.locator('#profile-form [name=avatar]').last().check();await form(page,'profile-form',{handle:'call_regular',display_name:'Additional administrator'});
   for(const dir of ['v4-silk-thread','v1-letter-post','v3-moonboat']){
    await page.goto(base+dir+'/');await page.locator('#account-strip summary img').waitFor();assert.match(await page.locator('#account-strip summary img').getAttribute('src'),/^data:image\/jpeg/);
    await page.locator('#account-strip summary').click();assert.equal(await page.locator('#account-strip a').first().getAttribute('href'),base+'accounts/index.html#account');
   }
   await page.locator('#account-strip a').first().click();await page.locator('#reset-own-progress').waitFor();
   for(const handle of ['call_regular']){
    if(handle==='call_regular'){await page.evaluate(()=>ACCOUNTS.signOut());await page.goto(base+'accounts/');await form(page,'signin-form',{handle,password:'7234ab'});await page.locator('#my-account').click();}
    await page.evaluate(async()=>{await ACCOUNTS.recordRound('silk','A',0);await ACCOUNTS.sync();});await page.waitForFunction(()=>document.getElementById('round-count').textContent==='1');
    await page.locator('#reset-own-progress').click();assert.match(await page.locator('#confirm-own-copy').innerText(),/settings/);await shot('self-reset');await page.locator('#cancel-own-reset').click();assert.equal(await page.locator('#round-count').innerText(),'1');
    await page.locator('#reset-own-progress').click();await page.locator('#confirm-own-password').fill('7234ab');await page.locator('#confirm-own-reset').click();await page.waitForFunction(()=>!document.getElementById('confirm-own-reset-dialog').open);assert.equal(await page.locator('#round-count').innerText(),'0');
    await page.reload();await page.locator('#reset-own-progress').waitFor();assert.equal(await page.locator('#round-count').innerText(),'0');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  }
  console.log(`PASS ${phase} ${width}: ${before?'baseline screenshots':'Lucy choices, uploads, per-child progress, header, dialog gating/order, all game menus, protected master controls and verified regular self-reset fixture'}`);await context.close();
 }}finally{await browser.close();if(local)local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
