'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,backend,playwright,form}=require('./accounts_sync.cjs');
(async()=>{
 const shots='reports/risky-actions/browser';fs.mkdirSync(shots,{recursive:true});
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try { for(const width of [390,768,1440]) {
  const fixture=backend(),password='7234ab',master=fixture.seed('risky_master',password,'Fixture Master');
  const kids=Array.from({length:1251},(_,i)=>fixture.seed('risky_kid_'+i,password,'Kid '+String(i).padStart(4,'0'),{role:'child',adult_id:master}));
  for(let i=0;i<151;i++)fixture.seed('risky_adult_'+i,password,'Grown-up '+String(i).padStart(3,'0'));
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const profilePages=new Set(),guardianPages=new Set();let starts=0,runs=0,runAttempts=0,progressActive=0,maxProgress=0,holdFinal=true,settingsRequestId=null,settingsStarts=0;
  await context.route('https://*.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),data=req.postDataJSON()||{};
   if(url.pathname.endsWith('/profiles')&&url.searchParams.get('role')==='eq.child')profilePages.add(Number(url.searchParams.get('offset')||0));
   if(url.pathname.endsWith('/guardians'))guardianPages.add(Number(url.searchParams.get('offset')||0));
   if(url.pathname.endsWith('/operations')){progressActive++;maxProgress=Math.max(maxProgress,progressActive);try{return await fixture.route(route);}finally{progressActive--;}}
   if(url.pathname.endsWith('/accounts')&&data.action==='delete-children'){
    starts++;assert.equal(data.child_ids.length,1251);assert.equal(new Set(data.child_ids).size,1251);
    if(data.current_password!==password)return route.fulfill({status:403,contentType:'application/json',body:'{"error":"Check your current password."}'});
    return route.fulfill({status:200,contentType:'application/json',body:'{"job_id":"fixture-job"}'});
   }
   if(url.pathname.endsWith('/accounts')&&data.action==='patch-child-settings'){
    assert.equal(data.child_ids.length,1251);assert(!('current_password' in data),'Settings remain password-free');
    settingsStarts++;if(settingsRequestId)assert.equal(data.request_id,settingsRequestId,'Lost start reply reuses the exact request');else settingsRequestId=data.request_id;
    for(const id of data.child_ids)fixture.overrides.set(id,data.patch);
    if(settingsStarts===1)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Committed start reply lost"}'});
    return route.fulfill({status:200,contentType:'application/json',body:'{"job_id":"fixture-settings-job"}'});
   }
   if(url.pathname.endsWith('/accounts')&&data.action==='run-bulk'&&data.job_id==='fixture-settings-job'){
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({done:true,results:kids.map(id=>({id,ok:true}))})});
   }
   if(url.pathname.endsWith('/accounts')&&data.action==='run-bulk'){
    assert.deepEqual(Object.keys(data).sort(),['action','job_id']);assert.equal(data.job_id,'fixture-job');
    if(runAttempts++===0)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Temporary fixture failure"}'});
    if(runs<2)runs++;
    if(runs===2&&holdFinal)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Committed final reply unavailable"}'});
    const results=kids.slice(0,runs===1?600:1251).map((id,i)=>({id,ok:i!==1250,...(i===1250?{reason:'fixture partial failure'}:{})}));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({done:runs===2,results})});
   }
   return fixture.route(route);
  });
  await page.goto(local.url+'/accounts/');await form(page,'signin-form',{handle:'risky_master',password});
  await page.waitForFunction(()=>document.querySelectorAll('#children-list li').length===1251,null,{timeout:60000});
  assert(profilePages.has(1200));assert(guardianPages.has(1200));assert(maxProgress<=8,'Roster progress requests stay bounded');
  await page.evaluate(async ids=>{let saved=false;try{await ACCOUNTS.applySettings(ids,{calm:true});}catch(error){saved=error.message.includes('saved');}if(!saved)throw new Error('Expected retryable lost start');await ACCOUNTS.applySettings(ids,{calm:true});},kids);
  assert.equal(settingsStarts,2);
  assert.equal(await page.evaluate(id=>ACCOUNTS.effectiveSettings(id).calm,kids[1250]),true,'Settings job refresh includes the last of 1251 paged overrides');
  await page.locator('#select-kids').click();assert.equal(await page.locator('#kid-selected-count').innerText(),'1251 selected');
  await page.locator('#delete-selected-kids').click();assert.equal(await page.locator('#confirm-child-names li').count(),1251);
  assert.equal(await page.locator('#confirm-child input').count(),1);assert.equal(await page.locator('#confirm-child input').getAttribute('type'),'password');assert(await page.locator('#confirm-child-action').isDisabled());
  await page.screenshot({path:`${shots}/bulk-password-${width}.png`,fullPage:false});
  await page.locator('#confirm-child-password').fill('wrong-password');await page.locator('#confirm-child-action').click();await page.waitForFunction(()=>document.getElementById('confirm-result').textContent.includes('current password'));
  assert.equal(runs,0);assert.equal(await page.locator('#confirm-child-password').inputValue(),'');
  await page.locator('#confirm-child-password').fill(password);await page.locator('#confirm-child-action').click();
  await page.waitForFunction(()=>document.getElementById('confirm-result').textContent.includes('Your action is saved'),null,{timeout:60000});
  assert.equal(runs,2);const persisted=await page.evaluate(()=>sessionStorage.getItem('lwl-pending-bulk-v1'));assert(!persisted.includes(password));assert(!persisted.includes('current_password'));assert(persisted.includes('fixture-job'));
  holdFinal=false;await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#children-list li').length===1251,null,{timeout:60000});
  await page.locator('#select-kids').click();await page.locator('#delete-selected-kids').click();await page.locator('#confirm-child-password').fill(password);await page.locator('#confirm-child-action').click();await page.locator('#confirm-child').waitFor({state:'hidden',timeout:60000});
  await page.waitForFunction(()=>document.getElementById('kid-selected-count').textContent==='1 selected',null,{timeout:60000});
  await page.waitForFunction(()=>document.getElementById('account-status').textContent.includes('fixture partial failure'),null,{timeout:60000});
  assert.equal(starts,2);assert.equal(runs,2);assert.equal(runAttempts,6);assert.match(await page.locator('#account-status').innerText(),/fixture partial failure/);
  await page.locator('#select-all-kids').click();await page.locator('#edit-selected-kids').click();await page.waitForFunction(()=>document.body.dataset.view==='settings');assert(!page.url().includes('child='));assert(page.url().includes('selection='));assert.match(await page.locator('#scope-state').innerText(),/1251/);await page.locator('#portal-link').click();
  await page.locator('#adults-view').click();await page.waitForFunction(()=>document.querySelectorAll('#grownups-list li').length===152);await page.locator('#select-grownups').click();assert.equal(await page.locator('#grownup-selected-count').innerText(),'151 selected');
  const create=page.locator('#create-grownup-form');await create.evaluate(form=>form.closest('details').open=true);
  for(const [name,value]of Object.entries({handle:'risky_new',display_name:'New fixture grown-up',password}))await create.locator('[name='+name+']').fill(value);
  await create.locator('button[type=submit]').click();await page.locator('#risky-password-dialog').waitFor();assert.match(await page.locator('#risky-password-people').innerText(),/New fixture grown-up.*risky_new/);
  assert.equal(await page.locator('#risky-password-dialog input').count(),1);await page.locator('#risky-password').fill('wrong-password');await page.locator('#risky-password-form button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('risky-password-result').textContent.includes('current password'));assert.equal(await page.locator('#risky-password').inputValue(),'');
  await page.locator('#risky-password').fill(password);await page.locator('#risky-password-form button[type=submit]').click();await page.locator('#risky-password-dialog').waitFor({state:'hidden'});assert.equal(await page.locator('#risky-password').inputValue(),'');
  await page.locator('#my-account').click();for(const id of ['profile-form','own-password-form','reset-own-progress'])assert(await page.locator('#'+id).isHidden());
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.deepEqual(errors,[]);
  console.log(`PASS risky portal ${width}: 1251 paged kids, 151 grown-ups, select all, password only, wrong/right retry, same job resumed after lost final reply/reload, partial failure, settings selection key, master hidden, no overflow/errors`);
  await context.close();
 } } finally {await browser.close();await new Promise(resolve=>local.server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
