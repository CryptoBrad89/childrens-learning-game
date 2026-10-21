'use strict';
// Explicit opt-in. Creates its own fixture SQL containing only password hashes.
// Current passwords live only in this process. Never uses a pre-existing login.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const bcrypt=require('../.job/db-tools/node_modules/bcryptjs');
const {staticServer,playwright}=require('./accounts_sync.cjs');
const project='ixjbgshhzeaosrzavssr';
if(process.env.RISKY_ACTIONS_LIVE!==project)throw Error('Set RISKY_ACTIONS_LIVE to the authorized project to run this disposable-only suite.');
const prefix='risky_'+Date.now().toString(36),adult=crypto.randomUUID(),other=crypto.randomUUID();
const folder='.audit/risky-actions/live/'+prefix;fs.mkdirSync(folder,{recursive:true});
const password=crypto.randomBytes(18).toString('hex'),otherPassword=crypto.randomBytes(18).toString('hex');
const created=[adult,other],kids=[];const result={project,prefix,created_ids:created,checks:[]};
const save=()=>fs.writeFileSync(folder+'/ids.json',JSON.stringify(result,null,2));
// Match GoTrue's native $2a$ variant; pgcrypto does not recognize bcryptjs's $2b$ prefix.
const fixture=[{id:adult,handle:prefix+'_adult',hash:bcrypt.hashSync(password,10).replace(/^\$2b\$/,'$2a$')},{id:other,handle:prefix+'_other',hash:bcrypt.hashSync(otherPassword,10).replace(/^\$2b\$/,'$2a$')}];
let sql='begin;\n';for(const p of fixture)sql+=`insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,confirmation_token,recovery_token,email_change,email_change_token_new) values('${p.id}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${p.handle}@accounts.littlewoof.invalid','${p.hash}',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}','','','','');\ninsert into auth.identities(id,user_id,provider_id,provider,identity_data,created_at,updated_at) values(gen_random_uuid(),'${p.id}','${p.id}','email',jsonb_build_object('sub','${p.id}','email','${p.handle}@accounts.littlewoof.invalid'),now(),now());\ninsert into public.profiles(id,handle,display_name,role) values('${p.id}','${p.handle}','Risky disposable grown-up','grownup');\n`;
sql+='commit;';fs.writeFileSync(folder+'/fixture.sql',sql);save();
console.log('FIXTURE_READY '+folder+'/fixture.sql');
async function waitForFile(path){while(!fs.existsSync(path))await new Promise(r=>setTimeout(r,250));}
(async()=>{
 await waitForFile(folder+'/fixture-applied');
 const conf=Object.fromEntries(fs.readFileSync('.job/supabase.env','utf8').trim().split('\n').map(l=>{const n=l.indexOf('=');return [l.slice(0,n),l.slice(n+1).replace(/^['"]|['"]$/g,'')];}));
 assert.equal(new URL(conf.SUPABASE_URL).hostname,project+'.supabase.co');
 const key=conf.SUPABASE_PUBLISHABLE_KEY,url=conf.SUPABASE_URL;
 async function request(path,body,token,method='POST'){
  const r=await fetch(url+path,{method,headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,data:await r.json().catch(()=>null)};
 }
 let login=await request('/auth/v1/token?grant_type=password',{email:fixture[0].handle+'@accounts.littlewoof.invalid',password});assert.equal(login.status,200,JSON.stringify(login.data));const session=login.data;let token=session.access_token;
 const send=(action,fields={})=>request('/functions/v1/accounts',{action,...fields},token);
 async function manage(action,fields={}){
  console.log('LIVE_ACTION '+action);
  let r=await send(action,fields);assert.equal(r.status,200,JSON.stringify(r));
  if(!r.data.job_id)return r.data;
  const job=r.data.job_id;
  do{r=await send('run-bulk',{job_id:job});assert.equal(r.status,200,JSON.stringify(r));if(r.data.busy)await new Promise(r=>setTimeout(r,500));}while(!r.data.done);
  return r.data;
 }
 const before=await request('/rest/v1/rpc/session_status',{p_touch:false},token);assert.equal(before.status,200);
 for(const bad of [undefined,'wrong-password',otherPassword]){
  const r=await send('reset-own-progress',{confirm:'reset-own-progress',...(bad===undefined?{}:{current_password:bad})});assert([400,403].includes(r.status));
 }
 const after=await request('/rest/v1/rpc/session_status',{p_touch:false},token);assert.equal(after.data.expires_at,before.data.expires_at);result.checks.push('Wrong, missing and another grown-up password rejected without moving session deadline');
 for(const body of [{password:'bypass-password'},{password:'bypass-password',current_password:password},{email:prefix+'_bypass@accounts.littlewoof.invalid'}]){
  const r=await request('/auth/v1/user',body,token,'PUT');assert(r.status>=400,'Direct Auth sensitive update must fail');
 }
 result.checks.push('Direct Auth password and login email bypasses blocked, including supplied current_password');
 const direct=await request('/rest/v1/rpc/reset_own_progress',{p_actor:adult},token);assert(direct.status>=400);result.checks.push('Direct legacy SQL mutation denied');
 for(let offset=0;offset<125;offset+=5){
  const batch=await Promise.all(Array.from({length:Math.min(5,125-offset)},(_,i)=>manage('create-child',{handle:prefix+'_kid_'+(offset+i),display_name:'Risky disposable kid '+(offset+i),password:otherPassword})));
  for(const row of batch){kids.push(row.profile.id);created.push(row.profile.id);}save();
 }
 assert.equal(kids.length,125);result.checks.push('125 brand-new kids created without a grown-up password check');console.log('CREATED_125_DISPOSABLE_KIDS');
 const wrongBulk=await send('reset-children-progress',{child_ids:kids,current_password:otherPassword});assert(wrongBulk.status>=400);
 const reset=await manage('reset-children-progress',{child_ids:kids,current_password:password,request_id:crypto.randomUUID()});assert.equal(reset.results.length,125);assert(reset.results.every(x=>x.ok));
 const settings=await manage('patch-child-settings',{child_ids:kids,patch:{volume:37}});assert(settings.results.every(x=>x.ok));
 result.checks.push('125-target progress reset and password-free settings jobs completed with all outcomes');
 let one=await manage('edit-profile',{handle:fixture[0].handle,display_name:'Risky harmless edit',avatar:'🐶'});assert.equal(one.profile.display_name,'Risky harmless edit');
 const renameDenied=await send('edit-profile',{handle:fixture[0].handle+'_new',display_name:'Must not save',avatar:'🐶'});assert(renameDenied.status>=400);
 one=await manage('edit-profile',{handle:fixture[0].handle+'_new',display_name:'Risky renamed disposable',avatar:'🐶',current_password:password});fixture[0].handle=one.profile.handle;
 await manage('reset-child-password',{child_id:kids[0],password:otherPassword,current_password:password});
 await manage('reset-own-progress',{current_password:password});
 const newPassword=crypto.randomBytes(18).toString('hex');await manage('change-own-password',{password:newPassword,current_password:password});
 const unchanged=await request('/rest/v1/rpc/session_status',{p_touch:false},token);assert.equal(unchanged.data.expires_at,before.data.expires_at);
 login=await request('/auth/v1/token?grant_type=password',{email:fixture[0].handle+'@accounts.littlewoof.invalid',password:newPassword});assert.equal(login.status,200);result.checks.push('Benign profile edit skips check; username, kid/own password and own reset require actor password; new hash authenticates; original session deadline unchanged');
 // Exercise the real portal and backend with disposable credentials at all sizes.
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
  for(const width of [390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
   await page.goto((process.env.RISKY_ACTIONS_HOSTED||local.url+'/')+'accounts/index.html#kids');
   await page.locator('#signin-form [name=handle]').fill(fixture[0].handle);await page.locator('#signin-form [name=password]').fill(newPassword);await page.locator('#signin-form [type=submit]').click();
   await page.waitForFunction(()=>document.querySelectorAll('#children-list li').length===125,{},{timeout:60000});
   await page.locator('#select-kids').click();await page.locator('#reset-selected-kids').click();
   assert.equal(await page.locator('#confirm-child input').count(),1);assert.equal(await page.locator('#confirm-child-password').getAttribute('type'),'password');
   assert.match(await page.locator('#confirm-title').innerText(),/125/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const dest='reports/risky-actions/live';fs.mkdirSync(dest,{recursive:true});await page.screenshot({path:dest+'/password-'+width+'.png',fullPage:false,animations:'disabled'});
   await page.locator('#cancel-child').click();await page.evaluate(()=>ACCOUNTS.signOut());await context.close();
  }
  result.checks.push('Real portal and live backend: all 125 selected, one password field, no overflow at 390/768/1440');
 }finally{await browser.close();local.server.close();}
 // Only the exact IDs created and saved by this process may be deleted.
 assert(kids.every(id=>created.includes(id)));const partial=await manage('delete-children',{child_ids:[...kids,crypto.randomUUID()],current_password:newPassword});assert.equal(partial.results.length,126);assert.equal(partial.results.filter(x=>x.ok).length,125);result.checks.push('125 exact disposable kids deleted; unknown-ID partial failure reported');
 save();console.log('LIVE_SUITE_PASS '+JSON.stringify(result.checks));
 // Parent may now delete exactly the two bootstrap adults in ids.json via SQL.
 fs.writeFileSync(folder+'/tests-finished','passed');
})().catch(error=>{save();fs.writeFileSync(folder+'/tests-finished','failed');console.error(error.message);process.exitCode=1;});
