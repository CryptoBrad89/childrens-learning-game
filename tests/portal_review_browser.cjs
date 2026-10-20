'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {staticServer,backend,playwright,form}=require('./accounts_sync.cjs');
(async()=>{
 const baselineDir=fs.mkdtempSync(path.join(os.tmpdir(),'portal-review-baseline-'));
 execFileSync('tar',['-x','-C',baselineDir],{input:execFileSync('git',['archive','448ef96'],{maxBuffer:128*1024*1024})});
 const baseline=await staticServer(baselineDir);
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const shots='reports/portal-review';fs.mkdirSync(shots,{recursive:true});
 try{for(const width of [390,768,1440])for(const before of [true,false]){
  const fixture=backend();fixture.seed('review_master','7234ab','Brandy (fixture)');fixture.seed('review_alex','7234ab','Alex Rivera');
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('https://*.supabase.co/**',fixture.route);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=before?baseline.url:local.url;
  await page.goto(base+'/accounts/');await form(page,'signin-form',{handle:'review_master',password:'7234ab'});
  for(const [handle,display_name] of [['review_ava','Ava'],['review_leo','Leo']])await form(page,'create-child-form',{handle,display_name,password:'7234ab'});
  try{await page.waitForFunction(()=>document.querySelectorAll('#children-list li').length===2);}catch(e){console.log({before,width,errors,text:await page.locator('#signed-in').innerText()});throw e;}
  if(before){await page.screenshot({path:`${shots}/before-kids-${width}.png`,fullPage:false});await context.close();continue;}
  const people=await page.evaluate(()=>ACCOUNTS.manage('list-grownups')),alex=people.grownups.find(p=>p.handle==='review_alex');
  const kids=await page.evaluate(()=>ACCOUNTS.rest('profiles?role=eq.child&select=*'));
  await page.evaluate(async ids=>ACCOUNTS.manage('link-child',ids),{child_id:kids[0].id,grownup_id:alex.id});await page.reload();
  await page.waitForFunction(()=>document.querySelector('#children-list').textContent.includes('Alex Rivera'));
  assert.match(await page.locator('#children-list').innerText(),/Linked to: You.*Alex Rivera \(review_alex\)/);
  await page.screenshot({path:`${shots}/after-kids-${width}.png`,fullPage:false});
  await page.locator('#children-list').scrollIntoViewIfNeeded();await page.screenshot({path:`${shots}/after-assignments-${width}.png`,fullPage:false});await page.evaluate(()=>scrollTo(0,0));
  await page.locator('#kid-search').fill('Alex Rivera');assert.equal(await page.locator('#children-list li').count(),1);await page.locator('#kid-search').fill('');
  await page.locator('#children-list button').first().click();await page.waitForFunction(()=>ACCOUNTS.owner?.role==='child'&&!document.getElementById('settings-link').inert);assert(await page.locator('#people').isHidden());assert(await page.locator('#delete-child-shortcut').isVisible());
  await page.locator('#child-profile-form [name=avatar][value="🦊"]').check();await form(page,'child-profile-form',{handle:'review_ava',display_name:'Ava'});assert.equal(await page.evaluate(()=>ACCOUNTS.owner.avatar),'🦊');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');await page.locator('#child-avatar-upload').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});await page.locator('#child-avatar-preview').waitFor();await form(page,'child-profile-form',{handle:'review_ava',display_name:'Ava'});assert.match(await page.evaluate(()=>ACCOUNTS.owner.avatar),/^data:image\/jpeg/);
  await page.locator('#adults-view').click();assert(await page.locator('#progress').isHidden());assert(await page.locator('#delete-child').isHidden());
  await page.reload();await page.waitForFunction(()=>document.querySelector('#adults-view').getAttribute('aria-pressed')==='true');
  const masterRow=page.locator('#grownups-list li').filter({hasText:'review_master'});await masterRow.waitFor();assert.equal(await masterRow.locator('input').count(),0);
  await page.screenshot({path:`${shots}/after-grownups-${width}.png`,fullPage:false});
  await page.locator('#my-account').click();assert(await page.locator('#progress').isVisible());assert(await page.locator('#child-management').isHidden());
  await page.locator('#kids-view').click();await page.locator('#children-list button').first().click();await page.waitForFunction(()=>ACCOUNTS.owner?.role==='child'&&!document.getElementById('settings-link').inert);
  const childId=await page.evaluate(()=>ACCOUNTS.owner.id);
  await page.locator('#child-settings-link').click();await page.waitForFunction(()=>document.body.dataset.view==='settings');
  assert(page.url().includes('child='+childId));assert.match(await page.locator('#scope-state').innerText(),/Editing: Ava/);
  await page.goto(base+'/grown-ups/');await page.waitForFunction(()=>document.body.dataset.view==='settings');assert.match(await page.locator('#scope-state').innerText(),/Game defaults \(everyone\)/);
  assert.equal(await page.locator('#settings-child-list input').count(),0);
  await page.screenshot({path:`${shots}/after-settings-${width}.png`,fullPage:false});
  await page.goto(base+'/accounts/');await page.locator('#back-to-me').click();
  await page.locator('#select-kids').click();assert.match(await page.locator('#kid-selected-count').innerText(),/2 selected/);
  await page.locator('#delete-selected-kids').click();assert.equal(await page.locator('#confirm-child-action').isDisabled(),true);
  assert.match(await page.locator('#confirm-child-names').innerText(),/review_ava/);assert.match(await page.locator('#confirm-child-names').innerText(),/review_leo/);
  await page.locator('#confirm-child-count').fill('1');assert(await page.locator('#confirm-child-action').isDisabled());
  await page.locator('#confirm-child-count').fill('2');assert(await page.locator('#confirm-child-action').isEnabled());
  await page.screenshot({path:`${shots}/after-delete-confirm-${width}.png`,fullPage:false});
  await page.locator('#cancel-child').click();assert.equal(await page.locator('#children-list li').count(),2);
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS '+width+': assignments/search, isolated persisted views, own progress, protected master row, explicit settings/no owner leak, typed bulk confirm/cancel, no overflow/errors');
  await context.close();
 }}finally{await browser.close();local.server.close();baseline.server.close();fs.rmSync(baselineDir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
