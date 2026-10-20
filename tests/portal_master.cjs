'use strict';
// Real browser, Auth, Edge and RLS verification on the authorized project only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {staticServer,playwright,form}=require('./accounts_sync.cjs');
const project='https://ixjbgshhzeaosrzavssr.supabase.co';
const master=require('./master_login.cjs');
(async()=>{
  const {server,url}=await staticServer();let browser;
  const results={project:'ixjbgshhzeaosrzavssr',created_at:new Date().toISOString(),grownup:{handle:master.handle},cases:[]};
  const call=(page,action,fields={})=>page.evaluate(async({action,fields})=>{
    const token=ACCOUNTS.session?.access_token;
    const response=await fetch(ACCOUNT_CONFIG.url+'/functions/v1/accounts',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,...fields})});
    return {status:response.status,data:await response.json()};
  },{action,fields});
  try {
    browser=await playwright().chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
    for(const width of [390,1440]) {
      const contexts=await Promise.all([0,1,2,3].map(()=>browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'})));
      const [a,b,c,anon]=await Promise.all(contexts.map(ctx=>ctx.newPage()));const errors=[];
      for(const page of [a,b,c,anon])page.on('pageerror',e=>errors.push(e.message));
      await a.goto(url+'/accounts/');assert.equal(await a.evaluate(()=>ACCOUNT_CONFIG.url),project);
      await form(a,'signin-form',master);assert.equal(await a.evaluate(()=>ACCOUNTS.profile.is_master),true);
      const suffix=Date.now().toString(36)+width,password='7234ab';
      const regular={handle:'master_regular_'+suffix,password},victim={handle:'master_delete_'+suffix,password},kid={handle:'master_kid_'+suffix,password};
      await form(a,'create-grownup-form',{...regular,display_name:'Regular grown-up'});
      await form(a,'create-grownup-form',{...victim,display_name:'Disposable grown-up'});
      await a.locator('#grownups-list li').filter({hasText:victim.handle}).waitFor();
      const grownups=(await call(a,'list-grownups')).data.grownups;
      const regularId=grownups.find(p=>p.handle===regular.handle).id,victimId=grownups.find(p=>p.handle===victim.handle).id;
      const masterId=await a.evaluate(()=>ACCOUNTS.profile.id);
      for(const action of ['delete-grownup','reset-grownup-password']) {
        assert.equal((await call(a,action,{grownup_id:crypto.randomUUID(),password:'willnotchange',confirm:action})).status,403);
      }
      const unconfirmed=await call(a,'delete-grownup',{grownup_id:victimId});assert.equal(unconfirmed.status,400,JSON.stringify({unconfirmed,victimId,masterId,width}));
      await a.locator('#grownups-list li').filter({hasText:regular.handle}).getByRole('button',{name:/^Edit /}).click();
      await form(a,'reset-grownup-password-form',{grownup_id:regularId,password:'8345bc'});
      await a.locator('#close-edit-grownup').click();regular.password='8345bc';
      await b.goto(url+'/accounts/');await form(b,'signin-form',regular);
      assert.equal(await b.evaluate(()=>ACCOUNTS.profile.is_master),false);
      assert(await b.locator('#create-grownup-form').isHidden());assert(await b.locator('#grownups').isHidden());
      assert(await b.locator('#people').isVisible());assert(await b.locator('#profile-form').count());
      // The regular grown-up owns the retained child and can perform all child actions.
      await form(b,'create-child-form',{...kid,display_name:'Retained child'});
      const childId=await b.evaluate(async handle=>(await ACCOUNTS.rest('profiles?handle=eq.'+handle))[0].id,kid.handle);
      assert.equal((await call(b,'reset-child-password',{child_id:childId,password})).status,200);
      await c.goto(url+'/');await form(c,'child-signin-form',kid);
      await c.evaluate(()=>ACCOUNTS.recordRound('post','A',0));await c.evaluate(()=>ACCOUNTS.sync());
      await c.goto(url+'/accounts/');assert(await c.locator('#grownups').isHidden());
      await anon.goto(url+'/accounts/');
      for(const [name,page] of [['regular',b],['child',c],['anonymous',anon]]) {
        for(const action of ['create-grownup','register','delete-grownup','reset-grownup-password']) {
          const result=await call(page,action,{handle:'denied_'+suffix,display_name:'Denied',password:'123456',grownup_id:victimId,confirm:action});
          assert([401,403].includes(result.status),`${name} ${action}: ${JSON.stringify(result)}`);
        }
        if(name!=='anonymous') {
          const rows=await page.evaluate(()=>ACCOUNTS.rest('profiles?role=eq.grownup&select=id'));
          assert.equal(rows.length,name==='regular'?1:0,'RLS hides other grown-ups');
          const status=await page.evaluate(async()=>{try{await ACCOUNTS.rest('profiles?id=eq.'+ACCOUNTS.profile.id,{method:'PATCH',body:{is_master:true}});return 200;}catch(e){return e.status;}});
          assert.equal(status,403,'Direct promotion denied');
        }
      }
      console.log(`PASS LIVE ${width}: master/regular/child/anonymous create, delete, reset-password + register; missing target denied; master protections covered locally; RLS denial; regular creates/resets child; real child play`);
      // Victim owns an orphan and shares the retained child with the regular grown-up.
      await b.locator('#sign-out').click();await b.waitForURL(url+'/accounts/index.html');await b.goto(url+'/accounts/');await form(b,'signin-form',victim);
      const orphan={handle:'master_orphan_'+suffix,password};
      await form(b,'create-child-form',{...orphan,display_name:'Child kept by master'});
      const orphanId=await b.evaluate(async handle=>(await ACCOUNTS.rest('profiles?handle=eq.'+handle))[0].id,orphan.handle);
      await call(a,'link-child',{child_id:childId,grownup_id:victimId});
      await a.locator('#adults-view').click();
      const deletion={click:async()=>{await a.locator('#grownups-list li').filter({hasText:victim.handle}).getByRole('button',{name:/^Edit /}).click();await a.locator('#delete-edit-grownup').click();}};
      await deletion.click();assert.match(await a.locator('#confirm-grownup-names').innerText(),new RegExp(victim.handle));
      assert.equal(await a.evaluate(()=>document.activeElement.id),'cancel-grownup');
      assert.equal(await a.locator('#confirm-grownup').evaluate(el=>el.scrollWidth>el.clientWidth),false,'Named confirmation wraps long usernames');
      await a.locator('#cancel-grownup').click();
      assert.equal((await call(b,'list-linkable-children')).status,403,'Regular account remains restricted after cancellation');
      await deletion.click();await a.locator('#confirm-grownup-count').fill('1');await a.locator('#confirm-grownup-action').click();await a.locator('#confirm-grownup').waitFor({state:'hidden'});
      await a.locator('#grownups-list li').filter({hasText:victim.handle}).waitFor({state:'detached'});
      assert.equal(await a.locator('#grownups-list li').filter({hasText:victim.handle}).count(),0);
      await a.locator('#kids-view').click();
      await a.locator('#children-list li').filter({hasText:orphan.handle}).waitFor();
      assert.equal((await call(b,'create-child',{handle:'deleted_'+suffix,password,display_name:'Denied'})).status,400,'Deleted session cannot administer');
      await b.evaluate(()=>ACCOUNTS.signOut());await b.goto(url+'/accounts/');await form(b,'signin-form',regular);
      const shared=await b.evaluate(async id=>({links:await ACCOUNTS.rest('guardians?child_id=eq.'+id),events:await ACCOUNTS.rest('operations?user_id=eq.'+id)}),childId);
      assert.equal(shared.links.length,1);assert.equal(shared.links[0].adult_id,regularId);assert.equal(shared.events.length,1);
      const deadLogin=await a.evaluate(async credentials=>(await fetch(ACCOUNT_CONFIG.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json'},body:JSON.stringify({email:credentials.handle+'@accounts.littlewoof.invalid',password:credentials.password})})).status,victim);
      assert.equal(deadLogin,400);
      for(const page of [a,b,c])assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      results.cases.push({width,regular:{...regular,id:regularId},child:{...kid,id:childId},reassigned_child:{...orphan,id:orphanId},deleted_grownup_id:victimId});
      fs.writeFileSync('reports/portal-master-test-logins.json',JSON.stringify(results,null,2)+'\n');
      console.log(`PASS LIVE ${width}: named delete, Cancel focused + cancel preserves login; confirmed deletion denies old login/session, preserves shared child + progress and rehomes orphan to master; no page errors/overflow`);
      await a.screenshot({path:`reports/portal-master-${width}.png`,fullPage:true});
      for(const ctx of contexts)await ctx.close();
    }
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
