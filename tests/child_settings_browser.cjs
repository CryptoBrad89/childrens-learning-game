/* Live contract against the authorized Supabase project, using isolated devices. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {staticServer,playwright,form,round,settle}=require('./accounts_sync.cjs');
const config='https://ixjbgshhzeaosrzavssr.supabase.co';
const reportPath='reports/portal-child-settings-test-logins.json';
const password='7234ab';
async function signin(page,url,handle,secret=password,adult=false){
  await page.goto(url+(adult?'/accounts/':'/index.html'));
  await form(page,adult?'signin-form':'child-signin-form',{handle,password:secret});
  await page.waitForFunction(()=>Boolean(ACCOUNTS.profile?.id));
}
async function signoutVisible(page){
  await page.evaluate(()=>window.scrollTo(0,0));
  const button=page.locator('#sign-out');await button.waitFor({state:'visible'});
  const rect=await button.boundingBox();
  const height=await page.evaluate(()=>innerHeight);
  assert(rect.y>=0&&rect.y+rect.height<=height,'Grown-up Sign out is visible without scrolling');
  assert.match(await button.innerText(),/Sign out/);
}
async function choose(page,ids){
  await page.goto(new URL('index.html?'+ids.map(id=>'child='+id).join('&'),page.url()).href);
  await page.waitForFunction(n=>document.querySelector('#scope-state').textContent.includes(n+' '),ids.length);
}
async function range(page,value){
  await page.locator('#volume').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},String(value));
}
async function apply(page,count){
  await page.locator('#apply-children').click();
  assert.match(await page.locator('#settings-confirm-title').innerText(),new RegExp('Apply to '+count));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cancel-settings');
  await page.locator('#confirm-settings-action').click();
  await page.locator('#confirm-settings').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('#apply-children').disabled);
}
async function deny(page,childId){
  const results=await page.evaluate(async childId=>{
    const headers={apikey:ACCOUNT_CONFIG.key,Authorization:'Bearer '+ACCOUNTS.session.access_token,'Content-Type':'application/json'};
    const output=[];
    for(const body of [{action:'edit-child-profile',child_id:childId,handle:'forbidden_name',display_name:'Forbidden'},{action:'patch-child-settings',child_ids:[childId],patch:{volume:1}}]){
      const res=await fetch(ACCOUNT_CONFIG.url+'/functions/v1/accounts',{method:'POST',headers,body:JSON.stringify(body)});output.push(res.status);
    }
    const res=await fetch(ACCOUNT_CONFIG.url+'/rest/v1/profiles?id=eq.'+childId,{method:'PATCH',headers,body:JSON.stringify({handle:'forbidden_name',display_name:'Forbidden'})});output.push(res.status);
    return output;
  },childId);
  assert.deepEqual(results,[403,403,403],'Child/unlinked adult cannot rename or configure another child via Edge or RLS');
}
async function queued(page,id){return page.evaluate(id=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('little-woof-accounts',1);req.onsuccess=()=>{const db=req.result;const read=db.transaction('operations').objectStore('operations').getAll();read.onsuccess=()=>{db.close();resolve(read.result.filter(row=>row.user_id===id&&row.pending).length);};read.onerror=()=>reject(read.error);};req.onerror=()=>reject(req.error);
}),id);}
async function run(){
  const {server,url}=await staticServer();let browser;const logins={project:config,master:{handle:require('./master_login.cjs').handle},runs:[]};
  if(fs.existsSync(reportPath))logins.previous_runs=[JSON.parse(fs.readFileSync(reportPath,'utf8'))];
  const save=()=>fs.writeFileSync(reportPath,JSON.stringify(logins,null,2)+'\n');
  try{
    browser=await playwright().chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [390,1440]){
      const contexts=await Promise.all([0,1,2].map(()=>browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'})));
      const [admin,kid,other]=await Promise.all(contexts.map(c=>c.newPage()));const errors=[];
      for(const p of [admin,kid,other])p.on('pageerror',e=>errors.push(e.message));
      const suffix=Date.now().toString(36)+width;
      const run={width,grownup:{handle:'settings_other_'+suffix,password},children:[{handle:'settings_sally_'+suffix,password,display_name:'Sally '+width},{handle:'settings_jane_'+suffix,password,display_name:'Jane '+width}]};
      logins.runs.push(run);save();
      await signin(admin,url,require('./master_login.cjs').handle,require('./master_login.cjs').password,true);
      assert.equal(await admin.evaluate(()=>ACCOUNT_CONFIG.url),config);
      await signoutVisible(admin);
      await form(admin,'create-grownup-form',{...run.grownup,display_name:'Unlinked settings grown-up '+width});
      for(const child of run.children){
        await form(admin,'create-child-form',child);
        const found=await admin.evaluate(async handle=>(await ACCOUNTS.rest('profiles?handle=eq.'+handle+'&select=id')),child.handle);
        assert(found.length,'Created '+child.handle+': '+await admin.locator('#create-child-form .form-result').innerText());child.id=found[0].id;save();
      }
      const [sally,jane]=run.children;
      await admin.locator('#children-list li').filter({hasText:sally.handle}).locator('button').click();
      await admin.waitForFunction(id=>ACCOUNTS.owner.id===id,sally.id);
      await signoutVisible(admin);
      await admin.locator('#child-profile-form').evaluate(node=>node.closest('details').open=true);
      sally.old_handle=sally.handle;sally.handle='settings_renamed_'+suffix;sally.display_name='Sally renamed '+width;
      await form(admin,'child-profile-form',{handle:sally.handle,display_name:sally.display_name});save();
      assert.equal(await admin.evaluate(()=>ACCOUNTS.owner.handle),sally.handle);
      await admin.locator('#my-account').click();await admin.locator('#profile-form').evaluate(node=>node.closest('details').open=true);
      await signoutVisible(admin);
      const oldRejected=await admin.evaluate(async({handle,password})=>{
        const result=await fetch(ACCOUNT_CONFIG.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json'},body:JSON.stringify({email:handle+'@accounts.littlewoof.invalid',password})});return result.status;
      },{handle:sally.old_handle,password});
      assert.equal(oldRejected,400,'Old child username stops authenticating');
      await signin(kid,url,sally.handle);await deny(kid,sally.id);
      await signin(other,url,run.grownup.handle,password,true);await deny(other,sally.id);
      console.log('PASS '+width+': master, rename through management, old handle rejected, child and unlinked adult denied');

      await admin.goto(url+'/grown-ups/');
      await admin.waitForFunction(()=>document.body.dataset.view==='settings');await signoutVisible(admin);
      await choose(admin,[sally.id]);
      await admin.locator('[data-setting=voice]').uncheck();
      await range(admin,35);
      await admin.locator('[data-setting=effects]').uncheck();
      await admin.locator('[data-setting=calm]').check();
      await admin.locator('[data-preset=starter]').click();
      await admin.locator('#hint label').filter({hasText:'After 1 miss'}).click();
      await admin.locator('[data-game=space]').uncheck();
      await admin.locator('[data-setting=kidControls]').uncheck();
      await apply(admin,1);
      const custom={voice:false,volume:35,effects:false,calm:true,letters:[...'SATPIN'],hintAfter:1,games:['post','silk'],kidControls:false};
      assert.deepEqual(await admin.evaluate(id=>ACCOUNTS.childOverrides[id],sally.id),custom,'All eight child settings save');
      await choose(admin,[jane.id]);await range(admin,75);await apply(admin,1);
      await choose(admin,[sally.id,jane.id]);
      assert.match(await admin.locator('#mixed-summary').innerText(),/Voice volume/);
      assert.equal(await admin.locator('#volume-value').innerText(),'Mixed');
      assert.equal(await admin.locator('[data-setting=voice]').evaluate(node=>node.indeterminate),true);
      await admin.locator('[data-preset=vowels]').click();
      await admin.locator('#apply-children').click();
      assert.match(await admin.locator('#settings-confirm-copy').innerText(),/Letters/);
      assert.doesNotMatch(await admin.locator('#settings-confirm-copy').innerText(),/Voice volume →/);
      await admin.locator('#confirm-settings-action').click();await admin.locator('#confirm-settings').waitFor({state:'hidden'});
      const values=await admin.evaluate(ids=>ids.map(id=>ACCOUNTS.childOverrides[id]),[sally.id,jane.id]);
      assert.deepEqual(values.map(s=>s.volume),[35,75],'Sparse bulk preserves mixed volume');
      assert.deepEqual(values.map(s=>s.letters),[[...'AEIOU'],[...'AEIOU']]);
      assert.equal(values[0].voice,false);assert.equal(values[1].voice,undefined,'Sparse bulk preserves unrelated inheritance');
      await admin.evaluate(()=>scrollTo(0,0));
      await admin.screenshot({path:'reports/portal-child-settings-'+width+'.png',fullPage:true});
      await kid.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await kid.evaluate(()=>GROWN_UPS.load().volume),35,'Existing child device receives server override');
      await other.locator('#sign-out').click();await other.waitForURL(url+'/accounts/index.html');
      await signin(other,url,sally.handle);
      assert.equal(await other.evaluate(()=>GROWN_UPS.load().volume),35,'Fresh isolated device receives same child override');
      console.log('PASS '+width+': eight settings, clear custom state, mixed bulk changes letters only, cross-device precedence');

      await choose(admin,[jane.id]);await admin.locator('#reset').click();await admin.locator('#confirm-reset').click();
      await admin.waitForFunction(id=>Object.keys(ACCOUNTS.childOverrides[id]||{}).length===0,jane.id);
      assert.match(await admin.locator('#scope-state').innerText(),/Using game defaults/);
      await other.locator('#change-player').click();await signin(other,url,jane.handle);
      assert.deepEqual(await other.evaluate(()=>GROWN_UPS.load()),await admin.evaluate(()=>GROWN_UPS.normalize(ACCOUNTS.gameDefaults)),'Reset child inherits defaults on another device');
      await other.locator('#change-player').click();await other.locator('#play-unsaved').click();
      assert.deepEqual(await other.evaluate(()=>GROWN_UPS.load()),await admin.evaluate(()=>GROWN_UPS.normalize(ACCOUNTS.gameDefaults)),'Guest uses game defaults');

      // The shared header signs out a grown-up without touching child outboxes.
      await admin.goto(url+'/accounts/');await signoutVisible(admin);await admin.locator('#sign-out').click();
      await admin.waitForURL(url+'/accounts/index.html');assert.equal(await admin.evaluate(()=>ACCOUNTS.session),null);
      await signin(admin,url,require('./master_login.cjs').handle,require('./master_login.cjs').password,true);await admin.goto(url+'/grown-ups/');await signoutVisible(admin);
      await admin.locator('#sign-out').click();await admin.waitForURL(url+'/accounts/index.html');
      assert.equal(await kid.evaluate(()=>ACCOUNTS.profile.id),sally.id,'Grown-up signout does not sign out another child device');

      // Complete a real offline round, sign out in-game, and recover its outbox.
      await kid.goto(url+'/v1-letter-post/');await settle(kid);
      await kid.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
      await contexts[1].setOffline(true);
      await round(kid,'A');await kid.waitForFunction(()=>ACCOUNTS.pending>0);
      const before=await kid.evaluate(()=>ACCOUNTS.snapshot.count);
      await kid.locator('#account-strip summary').click();
      assert.match(await kid.locator('#account-strip button').innerText(),/Sign out/);
      await kid.locator('#account-strip button').click();await kid.waitForURL(url+'/index.html');
      assert((await queued(kid,sally.id))>0,'Manual child signout keeps offline round queued');
      await contexts[1].setOffline(false);
      await signin(kid,url,require('./master_login.cjs').handle,require('./master_login.cjs').password,true);await kid.locator('#sign-out').click();await kid.waitForURL(url+'/accounts/index.html');
      assert((await queued(kid,sally.id))>0,'Grown-up signout on the shared device preserves child outbox');
      await signin(kid,url,sally.handle);await kid.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await kid.evaluate(()=>ACCOUNTS.snapshot.count),before,'Re-login synchronizes retained offline round');
      assert.match(await kid.locator('#change-player').innerText(),/Sign out/);

      // Clock changes exercise the shipped expiry timer while no server is reachable.
      await contexts[1].setOffline(true);
      await kid.evaluate(async()=>{await ACCOUNTS.recordRound('post','E',0);const now=Date.now;Date.now=()=>now()+6*60*60*1000+1000;});
      await kid.waitForURL(url+'/index.html?expired=1');
      assert.match(await kid.locator('#login-status').innerText(),/signed out for safety/i);
      assert((await queued(kid,sally.id))>0,'Child expiry retains offline progress');
      await contexts[1].setOffline(false);await signin(kid,url,sally.handle);await kid.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await kid.evaluate(()=>ACCOUNTS.pending),0);
      await signin(admin,url,require('./master_login.cjs').handle,require('./master_login.cjs').password,true);
      await contexts[0].setOffline(true);
      await admin.evaluate(()=>{const now=Date.now;Date.now=()=>now()+31*60*1000;});
      await admin.waitForURL(url+'/accounts/index.html?expired=1');
      assert.match(await admin.locator('main > .notice').first().innerText(),/signed out for safety/i);
      assert.equal(await admin.evaluate(()=>ACCOUNTS.session),null);
      await contexts[0].setOffline(false);
      assert.deepEqual(errors,[],'No browser exceptions');
      console.log('PASS '+width+': defaults/reset/guest, visible adult and child signout, offline progress recovery, six-hour child and inactive adult expiry');
      for(const context of contexts)await context.close();
    }
    save();console.log('PASS child_settings_browser: phone and desktop live contracts; retained logins '+reportPath);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
