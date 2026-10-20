'use strict';
// Live Auth/Edge/RLS and browser contract. Always restore the real master's exact profile.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,playwright,form}=require('./accounts_sync.cjs');
const project='https://ixjbgshhzeaosrzavssr.supabase.co';
const master={handle:'test',password:'ABCD1234'};
const picture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
const call=(page,action,fields={})=>page.evaluate(async({action,fields})=>{
 const r=await fetch(ACCOUNT_CONFIG.url+'/functions/v1/accounts',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json',...(ACCOUNTS.session?{Authorization:'Bearer '+ACCOUNTS.session.access_token}:{})},body:JSON.stringify({action,...fields})});return {status:r.status,data:await r.json()};
},{action,fields});
async function open(page,base){const r=await page.goto(base+'accounts/index.html');assert(r.ok());const n=page.getByRole('button',{name:'Open the page',exact:true});if(await n.count())await n.click();await page.waitForFunction(()=>Boolean(window.ACCOUNT_CONFIG));assert.equal(await page.evaluate(()=>ACCOUNT_CONFIG.url),project);}
async function loginStatus(page,handle,password){return page.evaluate(async({handle,password})=>(await fetch(ACCOUNT_CONFIG.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json'},body:JSON.stringify({email:handle+'@accounts.littlewoof.invalid',password})})).status,{handle,password});}
(async()=>{
 const local=process.env.PORTAL_PREVIEW?null:await staticServer(),base=process.env.PORTAL_PREVIEW||local.url+'/';
 const browser=await playwright().chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const logins={master,base,runs:[]};
 try{for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),a=await context.newPage();
  const errors=[];a.on('pageerror',e=>errors.push(e.message));
  let original,restore;
  try{
   await open(a,base);await form(a,'signin-form',master);
   original=await a.evaluate(()=>ACCOUNTS.profile);assert.equal(original.is_master,true);
   const auth=await a.evaluate(()=>({token:ACCOUNTS.session.access_token,key:ACCOUNT_CONFIG.key}));
   restore=async()=>{const r=await fetch(project+'/functions/v1/accounts',{method:'POST',headers:{apikey:auth.key,Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},body:JSON.stringify({action:'edit-profile',...original})});assert.equal(r.status,200,'Exact master restoration: '+await r.text());};
   await a.getByRole('button',{name:`Edit ${original.display_name} (${original.handle})`,exact:true}).click();
   const renamed='edit_master_'+Date.now().toString(36)+width;
   await a.locator('#profile-form [name=avatar][value="⭐"]').check();
   await form(a,'profile-form',{handle:renamed,display_name:'Master profile check'});
   assert.equal(await a.evaluate(()=>ACCOUNTS.profile.is_master),true);
   assert.equal(await a.evaluate(()=>ACCOUNTS.profile.id),original.id);
   assert.equal(await a.locator('#identity-title').innerText(),'Master profile check');
   const own=a.locator('#grownups-list li').filter({hasText:renamed});await own.waitFor();assert.match(await own.innerText(),/Master profile check/);assert.equal(await own.locator('.child-avatar').innerText(),'⭐');
   assert.equal(await loginStatus(a,'test',master.password),400,'Old master username stops working');
   const fresh=await browser.newContext(),p=await fresh.newPage();
   try{await open(p,base);await form(p,'signin-form',{handle:renamed,password:master.password});assert.equal(await p.evaluate(()=>ACCOUNTS.profile.is_master),true);}finally{await fresh.close();}
   await a.locator('#profile-avatar-upload').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:picture});await a.locator('#profile-avatar-preview').waitFor();
   await form(a,'profile-form',{handle:renamed,display_name:'Master profile check'});
   assert.match(await a.evaluate(()=>ACCOUNTS.profile.avatar),/^data:image\/jpeg;base64,/);
   assert.equal(await own.locator('img').count(),1,'Master list refreshes uploaded picture');
   console.log(`PASS ${width}: master edits own name, username, icon and upload; list refreshes; new login retains master ID/status; old login refused`);
   await restore();restore=null;
   // Use the fresh master session for the rest; the first page still holds the temporary handle.
   await a.reload();await a.waitForFunction(()=>ACCOUNTS.profile?.handle==='test');
   const suffix=Date.now().toString(36)+width,password='7234ab';
   const regular={handle:'edit_regular_'+suffix,password},kid={handle:'edit_kid_'+suffix,password};
   const made=await call(a,'create-grownup',{...regular,display_name:'Editable grown-up'});assert.equal(made.status,200);regular.id=made.data.profile.id;
   const child=await call(a,'create-child',{...kid,display_name:'Edit permission child'});assert.equal(child.status,200);kid.id=child.data.profile.id;
   logins.runs.push({width,regular,kid});fs.writeFileSync('reports/portal-master-edit-logins.json',JSON.stringify(logins,null,2)+'\n');
   await a.reload();await a.locator('#grownups-list li').filter({hasText:regular.handle}).getByRole('button',{name:/^Edit /}).click();
   const changed=regular.handle+'_n';
   await a.locator('#grownup-profile-form [name=avatar][value="🦊"]').check();
   await form(a,'grownup-profile-form',{handle:changed,display_name:'Edited by master'});
   const row=a.locator('#grownups-list li').filter({hasText:changed});await row.waitFor();assert.match(await row.innerText(),/Edited by master/);assert.equal(await row.locator('.child-avatar').innerText(),'🦊');
   await a.locator('#grownup-avatar-upload').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:picture});await a.locator('#grownup-avatar-preview').waitFor();
   await form(a,'grownup-profile-form',{handle:changed,display_name:'Edited by master'});assert.equal(await row.locator('img').count(),1);
   await a.screenshot({path:`reports/portal-master-edit-${width}.png`,fullPage:false});
   assert.equal(await a.locator('#edit-grownup').evaluate(el=>el.scrollWidth>el.clientWidth),false);
   await a.locator('#close-edit-grownup').click();
   assert.equal(await loginStatus(a,regular.handle,password),400,'Old regular username stops working');regular.handle=changed;
   assert.equal((await call(a,'edit-grownup-profile',{grownup_id:regular.id,handle:'test',display_name:'Conflict',avatar:'🐶'})).status,409);
   for(const id of [kid.id,crypto.randomUUID()])assert.equal((await call(a,'edit-grownup-profile',{grownup_id:id,handle:changed,display_name:'Denied',avatar:'🐶'})).status,403);
   const others=[];
   try{for(const [role,credentials] of [['regular',regular],['child',kid],['anonymous',null]]){
    const ctx=await browser.newContext({viewport:{width,height:900}});others.push(ctx);const page=await ctx.newPage();await open(page,base);
    if(credentials){if(role==='regular')await form(page,'signin-form',{handle:credentials.handle,password:credentials.password});else {await page.evaluate(async c=>ACCOUNTS.signIn(c.handle,c.password),credentials);}}
    assert(await page.locator('#grownups').isHidden());
    for(const id of [regular.id,original.id])assert([401,403].includes((await call(page,'edit-grownup-profile',{grownup_id:id,handle:changed,display_name:'Denied',avatar:'🐶'})).status));
    if(credentials){const status=await page.evaluate(async ids=>{const r=await fetch(ACCOUNT_CONFIG.url+'/rest/v1/rpc/edit_other_grownup_profile',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,Authorization:'Bearer '+ACCOUNTS.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_actor:ids.master,p_target:ids.regular,p_handle:'hijack',p_display_name:'Denied',p_avatar:'🐶'})});return r.status;},{master:original.id,regular:regular.id});assert.equal(status,403,'Direct RPC with forged master actor refused');}
    if(role==='regular'){
     assert.equal(await page.evaluate(()=>ACCOUNTS.profile.display_name),'Edited by master');assert.match(await page.evaluate(()=>ACCOUNTS.profile.avatar),/^data:image\/jpeg/);
     await page.locator('#profile-form').locator('xpath=ancestor::details').locator('summary').click();
     await form(page,'profile-form',{handle:regular.handle,display_name:'Regular edits self'});assert.equal(await page.locator('#identity-title').innerText(),'Regular edits self');
     assert.equal((await call(page,'edit-profile',{grownup_id:original.id,handle:regular.handle,display_name:'Still self',avatar:'🐱'})).data.profile.id,regular.id,'Self action ignores forged target');
    }
   }}finally{for(const ctx of others)await ctx.close();}
   assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   assert.deepEqual((await call(a,'edit-profile',original)).data.profile,original,'Master remains exactly as before');
   fs.writeFileSync('reports/portal-master-edit-logins.json',JSON.stringify(logins,null,2)+'\n');
   console.log(`PASS ${width}: master edits other grown-up name, unique username, icon/upload; old login refused; regular self-only; child/anonymous/forged RPC denied; no overflow/errors; master restored exactly`);
  }finally{try{if(restore)await restore();}finally{await context.close();}}
 }}finally{await browser.close();if(local)await new Promise(r=>local.server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
