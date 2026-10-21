'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,playwright,form}=require('./accounts_sync.cjs');
(async()=>{
 const [account]=JSON.parse(fs.readFileSync('reports/call-list-live-logins.json','utf8'));
 assert.equal(account.id,'d5275b62-4dab-4389-8271-873d92ddff0c','Only this job-created disposable account may be used');
 assert.notEqual(account.handle,'brandy');
 const local=await staticServer(),base=process.env.CALL_LIST_HOSTED||local.url+'/',browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const result={base,account:{id:account.id,handle:account.handle},checks:[]};
 try{
  const contexts=await Promise.all([browser.newContext({reducedMotion:'reduce'}),browser.newContext({reducedMotion:'reduce'})]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  for(const page of pages){await page.goto(base+'accounts/index.html#account');await form(page,'signin-form',{handle:account.handle,password:account.password});await page.locator('#my-account').click();assert.equal(await page.evaluate(()=>ACCOUNTS.profile.id),account.id);assert.equal(await page.evaluate(()=>ACCOUNTS.profile.is_master),false);}
  const [a,b]=pages;
  for(const page of pages)await page.evaluate(async()=>{await ACCOUNTS.recordRound('silk','A',0);await ACCOUNTS.sync();});
  await contexts[1].setOffline(true);await b.evaluate(()=>ACCOUNTS.recordRound('silk','B',0));assert.equal(await b.evaluate(()=>ACCOUNTS.pending),1);
  await a.locator('#reset-own-progress').click();await a.locator('#confirm-own-reset').click();await a.waitForFunction(()=>!document.getElementById('confirm-own-reset-dialog').open);assert.equal(await a.locator('#round-count').innerText(),'0');
  await contexts[1].setOffline(false);await b.evaluate(()=>ACCOUNTS.sync());assert.equal(await b.evaluate(()=>ACCOUNTS.snapshot.count),0);assert.equal(await b.evaluate(()=>ACCOUNTS.pending),0);
  result.checks.push('Live self-reset clears saved rounds and rejects a second browser’s stale offline round');
  await a.locator('#profile-form').locator('xpath=ancestor::details').evaluate(e=>e.open=true);await a.locator('#profile-form [name=avatar]').last().check();await form(a,'profile-form',{handle:account.handle,display_name:account.display_name});
  await a.reload();await a.locator('#reset-own-progress').waitFor();assert.match(await a.locator('#identity-avatar img').getAttribute('src'),/^data:image\/jpeg;base64,/);assert.equal(await a.evaluate(()=>ACCOUNTS.snapshot.count),0);
  result.checks.push('Chosen Lucy avatar and cleared progress survive reload against live Supabase');
  const direct=await a.evaluate(async()=>{try{await ACCOUNTS.rest('rpc/reset_own_progress',{method:'POST',body:{p_actor:ACCOUNTS.profile.id}});return 200;}catch(e){return e.status;}});assert([401,403,404].includes(direct));result.checks.push('Authenticated direct RPC invocation denied');
  for(const p of pages)await p.evaluate(()=>ACCOUNTS.signOut());
  console.log('PASS LIVE call list: '+result.checks.join('; '));
 }finally{await browser.close();local.server.close();fs.writeFileSync('reports/call-list-live-results.json',JSON.stringify(result,null,2)+'\n');}
})().catch(e=>{console.error(e);process.exitCode=1;});
