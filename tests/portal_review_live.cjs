'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,playwright,form}=require('./accounts_sync.cjs');
(async()=>{
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const previous=fs.existsSync('reports/portal-review/test-logins.json')?JSON.parse(fs.readFileSync('reports/portal-review/test-logins.json','utf8')):null;
 const report={previous_runs:previous?[...(previous.previous_runs||[]),{...previous,previous_runs:undefined}]:[],project:'ixjbgshhzeaosrzavssr',created_at:new Date().toISOString(),accounts:[],results:[]};
 const save=()=>fs.writeFileSync('reports/portal-review/test-logins.json',JSON.stringify(report,null,2)+'\n');
 const context=await browser.newContext(),a=await context.newPage();
 async function call(page,action,fields={}){return page.evaluate(async({action,fields})=>{try{return {status:200,data:await ACCOUNTS.manage(action,fields)};}catch(e){return {status:e.status,message:e.message};}},{action,fields});}
 try{
  await a.goto(local.url+'/accounts/');await form(a,'signin-form',require('./master_login.cjs'));
  const master=await a.evaluate(()=>ACCOUNTS.profile);assert.equal(master.handle,'brandy');assert.equal(master.display_name,'Brandy');
  const suffix=Date.now().toString(36),password='7234ab';
  async function create(role,label){const login={handle:'review_'+label+'_'+suffix,password,display_name:'Portal review '+label};const r=await call(a,'create-'+role,login);assert.equal(r.status,200,JSON.stringify(r));login.id=r.data.profile.id;report.accounts.push({...login,role});save();return login;}
  const source=await create('grownup','source'),destination=await create('grownup','destination');
  const one=await create('child','ava'),two=await create('child','leo');
  let r=await call(a,'transfer-children',{child_ids:[one.id,two.id],source_id:master.id,destination_id:source.id,confirm:'transfer-children'});assert.equal(r.status,200);assert(r.data.results.every(r=>r.ok));
  const regularContext=await browser.newContext(),b=await regularContext.newPage();await b.goto(local.url+'/accounts/');await form(b,'signin-form',{handle:source.handle,password:source.password});
  await b.waitForFunction(()=>document.querySelectorAll('#children-list li').length===2);
  assert(await b.locator('#adults-view').isHidden());assert(await b.locator('#link-child-form').isHidden());
  for(const action of ['list-linkable-children','link-child','transfer-children','delete-grownups','patch-game-settings','reset-grownup-progress']){
   r=await call(b,action,{child_id:one.id,child_ids:[one.id],grownup_ids:[destination.id],grownup_id:destination.id,source_id:source.id,destination_id:destination.id,confirm:action,patch:{}});assert.equal(r.status,403,action);
  }
  await a.reload();await a.locator('#kids-view').click();const row=a.locator('#children-list li').filter({hasText:one.handle});await row.waitFor();assert.match(await row.innerText(),new RegExp(source.handle));await row.locator('button').click();await a.waitForFunction(()=>ACCOUNTS.owner.role==='child'&&!document.getElementById('settings-link').inert);assert(await a.locator('#delete-child-shortcut').isVisible());await a.locator('#back-to-me').click();
  await a.locator('#kid-search').fill(source.handle);assert.equal(await a.locator('#children-list li').count(),2);await a.locator('#kid-search').fill('');
  for(const [action,fields] of [['edit-child-profile',{child_id:one.id,handle:one.handle,display_name:'Ava reviewed',avatar:'🦊'}],['reset-child-password',{child_id:one.id,password}],['reset-child-progress',{child_id:one.id,confirm:'reset-child-progress'}],['patch-child-settings',{child_ids:[one.id],patch:{volume:35}}]])assert.equal((await call(a,action,fields)).status,200,action+' master without link');
  await b.evaluate(()=>ACCOUNTS.recordRound('post','A',0));await b.evaluate(()=>ACCOUNTS.sync());
  assert.equal((await call(a,'reset-grownup-progress',{grownup_id:source.id,confirm:'reset-grownup-progress'})).status,200);
  await b.evaluate(()=>ACCOUNTS.sync());assert.equal(await b.evaluate(()=>ACCOUNTS.snapshot.count),0);
  assert.equal((await call(a,'link-child',{child_id:one.id,grownup_id:destination.id})).status,200);
  r=await call(a,'transfer-children',{child_ids:[one.id,two.id],source_id:source.id,destination_id:master.id,confirm:'transfer-children'});assert(r.data.results.every(r=>r.ok));
  const assignment=await a.evaluate(async id=>ACCOUNTS.rest('guardians?child_id=eq.'+id+'&select=adult_id'),one.id);assert.deepEqual(new Set(assignment.map(r=>r.adult_id)),new Set([master.id,destination.id]));
  for(const action of ['edit-child-profile','reset-child-password','reset-child-progress','patch-child-settings','delete-child','unlink-child','list-child-grownups']){
   r=await call(b,action,{child_id:one.id,child_ids:[one.id],handle:one.handle,display_name:'Denied',password,confirm:action,patch:{}});assert.equal(r.status,403,action+' unlinked regular');
  }
  r=await call(a,'transfer-children',{child_ids:[one.id,two.id],source_id:source.id,destination_id:destination.id,confirm:'transfer-children'});assert(r.data.results.every(r=>!r.ok&&r.reason==='not-linked-to-source'));
  // Last-link protection uses only newly created kids.
  await call(a,'transfer-child',{child_id:two.id,source_id:master.id,destination_id:source.id,confirm:'transfer-child'});
  r=await call(b,'unlink-child',{child_id:two.id});assert.equal(r.data.rehomed,true);
  r=await call(a,'unlink-child',{child_id:two.id,grownup_id:master.id});assert.equal(r.data.kept_with_master,true);
  // Exact IDs recorded above are the only live deletion targets.
  const absent=crypto.randomUUID();
  r=await call(a,'delete-children',{child_ids:[one.id,two.id,absent],confirm:'delete-children'});assert.deepEqual(r.data.results.map(r=>r.ok),[true,true,false]);
  r=await call(a,'delete-grownups',{grownup_ids:[source.id,destination.id,absent],confirm:'delete-grownups'});assert.deepEqual(r.data.results.map(r=>r.ok),[true,true,false]);
  report.results.push('All four recorded disposable IDs deleted; partial not-found results verified.');
  for(const id of report.accounts.map(a=>a.id))assert.equal((await a.evaluate(async id=>ACCOUNTS.rest('profiles?id=eq.'+id),id)).length,0);
  save();await regularContext.close();console.log('PASS LIVE portal review: master all-kid permissions/assignment search; regular linked-only reads/actions; master-only sharing/transfers/defaults; master resets disposable grown-up progress; transfer preserves shared links/skips; unlink rehomes; bulk partial delete of exact newly-created IDs only');
 }finally{await browser.close();local.server.close();save();}
})().catch(e=>{console.error(e);process.exitCode=1;});
