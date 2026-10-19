'use strict';
// Live browser + server contract. Creates disposable accounts only on lwl-codex.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {staticServer,playwright,form,round}=require('./accounts_sync.cjs');
(async()=>{
  const {server,url}=await staticServer(); let browser;
  const seed=JSON.parse(fs.readFileSync('reports/home-flow-test-logins.json')).grownup;
  const logins={created_at:new Date().toISOString(),project:'ixjbgshhzeaosrzavssr',cases:[]};
  try {
    browser=await playwright().chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
    for(const width of [390,1440]){
      const suffix=Date.now().toString(36)+width,password='7234ab';
      const adult='r2_adult_'+suffix,parent='r2_parent_'+suffix,kid='r2_child_'+suffix,keep='r2_play_'+suffix,newAdult=adult+'_new';
      const contexts=await Promise.all([browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'})]);
      const [a,b,c]=await Promise.all(contexts.map(ctx=>ctx.newPage()));const errors=[];
      for(const page of [a,b,c])page.on('pageerror',error=>errors.push(error.message));
      await a.goto(url+'/accounts/');
      assert.equal(await a.evaluate(()=>ACCOUNT_CONFIG.url),'https://ixjbgshhzeaosrzavssr.supabase.co');
      await form(a,'signin-form',seed);
      for(const [handle,name] of [[adult,'Round two grown-up'],[parent,'Second grown-up']])await form(a,'create-grownup-form',{handle,password,display_name:name});
      await a.locator('#sign-out').click();await form(a,'signin-form',{handle:adult,password});
      const adultId=await a.evaluate(()=>ACCOUNTS.profile.id);
      await form(a,'profile-form',{handle:newAdult,display_name:'Updated grown-up'});
      assert.equal(await a.locator('#identity-title').innerText(),'Updated grown-up');
      await a.locator('#profile-form [name=avatar][value="🦊"]').check();
      await form(a,'profile-form',{handle:newAdult,display_name:'Updated grown-up'});
      assert.equal(await a.evaluate(()=>ACCOUNTS.profile.avatar),'🦊');
      const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
      await a.locator('#profile-avatar-upload').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:png});await a.locator('#profile-avatar-preview').waitFor();
      await form(a,'profile-form',{handle:newAdult,display_name:'Updated grown-up'});
      assert.match(await a.evaluate(()=>ACCOUNTS.profile.avatar),/^data:image\/jpeg;base64,/);
      const duplicate=await a.evaluate(async handle=>{try{await ACCOUNTS.editProfile({handle,display_name:'Bad duplicate',avatar:'🐶'});return 200;}catch(e){return e.status;}},parent);
      assert.equal(duplicate,409);
      await form(a,'own-password-form',{password:'8345bc'});
      await a.locator('#sign-out').click();
      const oldStatus=await a.evaluate(async({handle,password})=>(await fetch(ACCOUNT_CONFIG.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json'},body:JSON.stringify({email:handle+'@accounts.littlewoof.invalid',password})})).status,{handle:adult,password:'8345bc'});
      assert.equal(oldStatus,400);
      await form(a,'signin-form',{handle:newAdult,password:'8345bc'});
      assert.equal(await a.evaluate(()=>ACCOUNTS.profile.id),adultId);
      assert.match(await a.locator('#identity-avatar img').getAttribute('src'),/^data:image\/jpeg/);
      console.log(`PASS LIVE ${width}: own display name, unique username + Auth login, icon/upload, password, old handle rejected`);
      await form(a,'create-child-form',{handle:kid,password,display_name:'Reset and delete child'});
      await form(a,'create-child-form',{handle:keep,password,display_name:'Explorer available to link'});
      const childId=await a.evaluate(async handle=>(await ACCOUNTS.rest('profiles?handle=eq.'+handle+'&select=id'))[0].id,kid);
      const keepId=await a.evaluate(async handle=>(await ACCOUNTS.rest('profiles?handle=eq.'+handle+'&select=id'))[0].id,keep);
      await b.goto(url+'/accounts/');await form(b,'signin-form',{handle:parent,password});
      for(const action of ['delete-child','reset-child-progress','reset-child-password']){
        const status=await b.evaluate(async({action,child_id})=>{try{await ACCOUNTS.manage(action,{child_id,confirm:action,password:'1111aa'});return 200;}catch(e){return e.status;}},{action,child_id:childId});
        assert.equal(status,403,'Unlinked grown-up denied');
      }
      await b.locator(`#link-child-choice option[value="${childId}"]`).waitFor({state:'attached'});
      assert.equal(await b.locator('#link-child-form input').count(),0,'Linking requires no credentials');
      await form(b,'link-child-form',{child_id:childId});
      await b.locator('#children-list li').filter({hasText:kid}).waitFor();
      await b.evaluate(async id=>{await ACCOUNTS.manage('link-child',{child_id:id});},childId);
      assert.equal(await b.evaluate(async id=>(await ACCOUNTS.rest('guardians?adult_id=eq.'+ACCOUNTS.profile.id+'&child_id=eq.'+id)).length,childId),1);
      console.log(`PASS LIVE ${width}: dropdown shares existing child without password, idempotent link, unlinked destructive actions denied`);
      await c.goto(url+'/');await c.locator('#play-unsaved').click();
      assert.equal(await c.locator('#change-player').innerText(),'Sign in to save');
      assert.equal(await c.locator('[data-world=silk]').evaluate(el=>getComputedStyle(el,':before').content),'none');
      await c.locator('#change-player').click();await form(c,'child-signin-form',{handle:kid,password});
      assert.equal(await c.locator('#change-player').innerText(),'Change player');
      const actions=['list-linkable-children','link-child','edit-profile','delete-child','reset-child-progress'];
      for(const authenticated of [true,false]){
        const statuses=await c.evaluate(async({actions,authenticated,child_id})=>{
          const out=[];for(const action of actions)out.push((await fetch(ACCOUNT_CONFIG.url+'/functions/v1/accounts',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+ACCOUNTS.session.access_token}:{})},body:JSON.stringify({action,child_id,confirm:action,handle:'not_allowed',display_name:'Denied',avatar:'🐶'})})).status);return out;
        },{actions,authenticated,child_id:childId});
        assert(statuses.every(status=>[401,403].includes(status)));
      }
      await c.locator('[data-world=post]').click();await c.locator('#mute').click();await round(c,'B');await c.waitForFunction(()=>ACCOUNTS.snapshot.count===1);await c.evaluate(()=>ACCOUNTS.sync());await c.waitForFunction(()=>ACCOUNTS.pending===0);
      // Refresh is navigation: no sync button or client cache is used to read roster totals.
      await a.reload();const row=a.locator('#children-list li').filter({hasText:kid});await row.waitFor();
      assert.match(await row.innerText(),/1 rounds.*Live from server/);
      await row.locator('button').click();await a.waitForFunction(()=>!document.getElementById('settings-link').inert);
      assert.equal(await a.locator('#round-count').innerText(),'1');
      await a.evaluate(()=>ACCOUNTS.setSetting('volume',35));await a.evaluate(()=>ACCOUNTS.sync());
      await a.locator('#child-management').evaluate(el=>el.open=true);
      await a.locator('#reset-progress').click();await a.locator('#cancel-child').click();
      assert.equal(await a.locator('#round-count').innerText(),'1','Cancel keeps progress');
      const missingConfirm=await a.evaluate(async id=>{try{await ACCOUNTS.manage('reset-child-progress',{child_id:id});return 200;}catch(e){return e.status;}},childId);assert.equal(missingConfirm,400);
      // Keep an offline round pending across the server reset.
      await contexts[2].setOffline(true);await c.evaluate(()=>ACCOUNTS.recordRound('post','C',0));
      await a.locator('#reset-progress').click();await a.locator('#confirm-child-action').click();await a.locator('#confirm-child').waitFor({state:'hidden'});
      assert.equal(await a.locator('#round-count').innerText(),'0');
      await contexts[2].setOffline(false);await c.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await c.evaluate(()=>ACCOUNTS.snapshot.count),0,'Offline rounds from before reset are discarded');
      assert.equal(await c.evaluate(()=>ACCOUNTS.snapshot.settings.volume),35,'Settings survive reset');
      await c.evaluate(()=>ACCOUNTS.recordRound('post','D',0));await c.evaluate(()=>ACCOUNTS.sync());
      await a.reload();await a.locator('#children-list li').filter({hasText:kid}).waitFor();
      assert.match(await a.locator('#children-list li').filter({hasText:kid}).innerText(),/1 rounds/);
      await contexts[0].setOffline(true);await a.reload();await a.locator('#children-list li').filter({hasText:kid}).waitFor();
      assert.match(await a.locator('#children-list li').filter({hasText:kid}).innerText(),/Last known.*offline/);
      await contexts[0].setOffline(false);await a.reload();await a.locator('#children-list li').filter({hasText:kid}).waitFor();
      console.log(`PASS LIVE ${width}: real game round read on portal entry, confirmed reset, cancelled reset, settings kept, stale offline uploads discarded, new progress saves, offline cache labelled`);
      await a.locator('#children-list li').filter({hasText:kid}).locator('button').click();await a.waitForFunction(()=>!document.getElementById('settings-link').inert);
      await a.locator('#child-management').evaluate(el=>el.open=true);await a.locator('#delete-child').click();await a.locator('#cancel-child').click();
      assert.equal(await a.locator('#children-list li').filter({hasText:kid}).count(),1);
      await a.locator('#delete-child').click();await a.locator('#confirm-child-action').click();await a.locator('#confirm-child').waitFor({state:'hidden'});
      assert.equal(await a.locator('#children-list li').filter({hasText:kid}).count(),0);
      const remains=await a.evaluate(async id=>({profile:await ACCOUNTS.rest('profiles?id=eq.'+id),links:await ACCOUNTS.rest('guardians?child_id=eq.'+id),progress:await ACCOUNTS.rest('operations?user_id=eq.'+id)}),childId);
      assert.deepEqual(remains,{profile:[],links:[],progress:[]});
      const deletedLogin=await a.evaluate(async({handle,password})=>(await fetch(ACCOUNT_CONFIG.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json'},body:JSON.stringify({email:handle+'@accounts.littlewoof.invalid',password})})).status,{handle:kid,password});assert.equal(deletedLogin,400);
      assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      logins.cases.push({width,grownup:{handle:newAdult,password:'8345bc'},second_grownup:{handle:parent,password},child:{handle:keep,password,id:keepId},deleted_child_id:childId});
      fs.writeFileSync('reports/portal-round2-test-logins.json',JSON.stringify(logins,null,2)+'\n');
      console.log(`PASS LIVE ${width}: cancelled/confirmed deletion removes Auth login, profiles/avatar, all guardian links and progress; no overflow or page errors`);
      for(const ctx of contexts)await ctx.close();
    }
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
