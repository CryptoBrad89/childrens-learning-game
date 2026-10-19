/* Two isolated Chromium profiles; no screenshots. Default transport is an in-memory
 * Supabase protocol fixture. --live uses ONLY accounts/config.js's real project. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const live = process.argv.includes('--live');
function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch { return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright'); }
}
function staticServer() {
  const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
  const server = http.createServer((req,res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
    let target = file;
    try { if (fs.statSync(target).isDirectory()) target = path.join(target,'index.html'); }
    catch {res.writeHead(404).end();return;}
    fs.readFile(target,(error,data) => {
      if(error) {res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store'}).end(data);
    });
  });
  return new Promise(resolve => server.listen(0,'127.0.0.1',() => resolve({server,url:'http://127.0.0.1:'+server.address().port})));
}
function backend() {
  const users = new Map(), events = new Map(), links = []; let seq = 0, loseResponse = false, refreshHold = null;
  const profile = handle => [...users.values()].find(u => u.profile.handle === handle);
  async function route(requestRoute) {
    const request = requestRoute.request(), url = new URL(request.url()), data = request.postDataJSON() || {};
    let result = [], status = 200;
    const actor = users.get((request.headers().authorization || '').replace('Bearer ',''));
    if (url.pathname.endsWith('/accounts')) {
      if (data.action === 'register' || data.action === 'create-child') {
        if (data.password.length < 6) {status=400;result={message:'Use at least 6 characters.'};}
        else {
          const id = crypto.randomUUID(), item={password:data.password,profile:{id,handle:data.handle,display_name:data.display_name,role:data.action==='register'?'grownup':'child'}};
          users.set(id,item); if(actor)links.push({adult_id:actor.profile.id,child_id:id}); result=item.profile;
        }
      }
    } else if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type')==='refresh_token') {
      const user=users.get(data.refresh_token);
      if(refreshHold) {refreshHold.arrived();await refreshHold.wait;refreshHold=null;}
      result={access_token:user.profile.id,refresh_token:user.profile.id,user:{id:user.profile.id},expires_in:3600};
    } else if (url.pathname.endsWith('/token')) {
      const user = profile((data.email || '').split('@')[0]);
      if (!user || user.password !== data.password) {status=400;result={message:'Invalid login credentials'};}
      else result={access_token:user.profile.id,refresh_token:user.profile.id,user:{id:user.profile.id},expires_in:3600};
    } else if (url.pathname.endsWith('/logout')) {status=204;result=null;}
    else if (!actor) {status=401;result={message:'Sign in required'};}
    else if (url.pathname.endsWith('/profiles')) {
      const query=url.searchParams.get('id');result=[...users.values()].map(u=>u.profile).filter(p=>query===null || query==='eq.'+p.id || query.includes(p.id));
    } else if (url.pathname.endsWith('/user') && request.method()==='PUT') {actor.password=data.password;result={id:actor.profile.id};}
    else if (url.pathname.endsWith('/guardians')) result=links.filter(l=>l.adult_id===actor.profile.id);
    else if (url.pathname.endsWith('/classes')) result=[];
    else if (url.pathname.endsWith('/sync_batch')) {
      const allowed=data.p_owner===actor.profile.id || links.some(l=>l.adult_id===actor.profile.id&&l.child_id===data.p_owner);
      if(!allowed) {status=403;result={message:'Not your notebook'};}
      else {
        for(const event of data.p_events) if(!events.has(event.id))events.set(event.id,{...event,user_id:data.p_owner,seq:++seq});
        if(loseResponse) {loseResponse=false;await requestRoute.abort('failed');return;}
        result=null;
      }
    } else if (url.pathname.endsWith('/operations')) {
      result=[...events.values()].filter(e=>'eq.'+e.user_id===url.searchParams.get('user_id')).slice(Number(url.searchParams.get('offset')),Number(url.searchParams.get('offset'))+500);
    } else {status=404;result={message:'Unimplemented fixture route '+url.pathname};}
    await requestRoute.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(result)});
  }
  return {route,events,loseNextResponse(){loseResponse=true;},holdRefresh(){
    let arrived,release;const started=new Promise(resolve=>{arrived=resolve;});const wait=new Promise(resolve=>{release=resolve;});
    refreshHold={arrived,wait};return {started,release};
  }};
}
async function form(page,id,values) {
  const target=page.locator('#'+id);
  const details=target.locator('xpath=ancestor::details');
  if(await details.count())await details.evaluate(node=>{node.open=true;});
  for(const [name,value] of Object.entries(values)) {
    const input=target.locator(`[name="${name}"]`);
    if(await input.evaluate(node=>node.tagName)==='SELECT')await input.selectOption(value);else await input.fill(value);
  }
  await target.locator('button[type="submit"]').click();
  await page.waitForFunction(id=>document.getElementById(id).getAttribute('aria-busy')!=='true',id);
  const error=await target.locator('.form-result.error').allTextContents();
  assert.deepEqual(error,[],`${id}: ${error.join(' ')}`);
}
async function signin(page,url,handle,password) {
  await page.goto(url+'/accounts/');
  await form(page,'signin-form',{handle,password});
  await page.waitForFunction(()=>Boolean(window.ACCOUNTS?.profile));
}
async function settle(page) {
  await page.waitForFunction(()=>!document.body.dataset.effect&&!document.body.classList.contains('talking'));
}
async function round(page,letter) {
  await page.locator(`[data-letter="${letter}"]`).click();await settle(page);
  await page.locator('[data-action="match"]').click();await settle(page);
  await page.locator(`[data-answer="${letter}"]`).click();
  await page.waitForFunction(()=>document.body.dataset.screen==='celebrate');await settle(page);
}
async function run() {
  const {server,url}=await staticServer(),fixture=backend();let browser;
  const suffix=Date.now().toString(36),otherChild='test_other_'+suffix,parent='test_parent_'+suffix;let otherChildId=null;
  const adult='test_adult_'+suffix,child='test_child_'+suffix,password='7234ab';
  try {
    browser=await playwright().chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
    const contexts=await Promise.all([browser.newContext({reducedMotion:'reduce'}),browser.newContext({reducedMotion:'reduce'})]);
    for(const context of contexts)if(!live)await context.route('https://*.supabase.co/**',fixture.route);
    const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));
    const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
    console.log('Accounts browser: creating grown-up and child through forms');
    await a.goto(url+'/accounts/');
    assert.equal(await a.evaluate(()=>ACCOUNT_CONFIG.url),'https://ixjbgshhzeaosrzavssr.supabase.co','Tests may only touch the authorized project');
    try {await form(a,'register-form',{handle:adult,password,display_name:'Sync test grown-up'});}
    catch(error){if(live)throw new Error('LIVE DEPLOYMENT REQUIRED: configured Supabase needs the checked-in migrations and accounts Edge Function applied. '+error.message);throw error;}
    await form(a,'create-child-form',{handle:child,password,display_name:'Sync test child'});
    const childId=await a.evaluate(async()=>{const links=await ACCOUNTS.rest('/guardians?select=child_id');return links[0].child_id;});
    if(live) {
      await form(a,'create-class-form',{name:'Sync class '+suffix});
      await a.waitForFunction(()=>document.querySelector('#assign-class-form [name=class_id]').options.length>1);
      const classId=await a.locator('#assign-class-form [name=class_id] option').nth(1).getAttribute('value');
      await form(a,'assign-class-form',{child_id:childId,class_id:classId});
      await form(a,'create-child-form',{handle:otherChild,password:'aaaaaa',display_name:'Sync other child'});
      otherChildId=await a.evaluate(async id=>(await ACCOUNTS.rest('/guardians?select=child_id')).find(link=>link.child_id!==id).child_id,childId);
      await b.goto(url+'/accounts/');
      await form(b,'register-form',{handle:parent,password,display_name:'Sync test parent'});
      await form(b,'link-child-form',{handle:child,password});
      await b.waitForFunction(handle=>document.querySelector('#children-list').textContent.includes(handle),child);
      await b.locator('#sign-out').click();
      console.log('PASS LIVE SUPABASE: create class, assign child, second grown-up links existing child, lowercase six-character child password');
    }
    await a.locator('#sign-out').click();
    await signin(a,url,child,password);await signin(b,url,child,password);
    assert.equal(await a.evaluate(()=>ACCOUNTS.profile.id),await b.evaluate(()=>ACCOUNTS.profile.id));
    if(live) {
      const denial=await a.evaluate(async other=>{
        const profiles=await ACCOUNTS.rest('/profiles?id=eq.'+other+'&select=*');
        const rounds=await ACCOUNTS.rest('/operations?user_id=eq.'+other+'&select=*');
        let writeRejected=false;
        try {await ACCOUNTS.rest('/rpc/sync_batch',{method:'POST',body:{p_owner:other,p_events:[{id:crypto.randomUUID(),kind:'round',payload:{world:'post',letter:'Z',misses:0}}]}});}
        catch(error){writeRejected=error.status===403;}
        return {profiles,rounds,writeRejected};
      },otherChildId);
      assert.deepEqual(denial,{profiles:[],rounds:[],writeRejected:true},'Child cannot read another child profile/play or write their progress');
      console.log('PASS LIVE SUPABASE: RLS rejects cross-child reads and unauthorized progress write');
    }
    console.log('Accounts browser: opening game and preparing offline cache');
    await a.goto(url+'/v1-letter-post/');await settle(a);
    await a.waitForFunction(()=>navigator.serviceWorker.controller || document.querySelector('#offline-status')?.textContent.includes('not ready'));
    assert(!((await a.locator('#offline-status').textContent()).includes('not ready')), 'Offline installation failed');
    await a.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
    await a.locator('#mute').click();
    console.log('Accounts browser: offline reload and actual B round');
    await contexts[0].setOffline(true);
    await a.reload();await settle(a);
    assert.equal(await a.evaluate(()=>navigator.onLine),false);
    // Muting is a real game control, and avoids audio timing influencing the test.
    if(await a.locator('#mute').getAttribute('aria-pressed')!=='true')await a.locator('#mute').click();
    await a.selectOption('#theme','2');
    await a.evaluate(()=>ACCOUNTS.setSetting('calm',true));
    await round(a,'B');
    await a.waitForFunction(()=>ACCOUNTS.snapshot.count===1);
    assert((await a.evaluate(()=>ACCOUNTS.pending))>=3,'Offline play and settings must be durable pending writes');
    await b.evaluate(()=>ACCOUNTS.setSetting('volume',35));await b.evaluate(()=>ACCOUNTS.sync());
    console.log('Accounts browser: reconnecting both profiles');
    await contexts[0].setOffline(false);await a.evaluate(()=>ACCOUNTS.sync());await b.locator('#sync-now').click();
    await b.waitForFunction(()=>ACCOUNTS.snapshot.count===1 && ACCOUNTS.snapshot.settings.calm===true && ACCOUNTS.snapshot.settings.volume===35 && ACCOUNTS.snapshot.themes.post===2);
    assert.equal(await b.locator('#round-count').textContent(),'1');
    assert.match(await b.locator('#achievements').textContent(),/First sound/);
    assert.equal(await a.evaluate(()=>ACCOUNTS.snapshot.settings.volume),35,'Different setting fields survive simultaneous device changes');
    await Promise.all([a.evaluate(()=>ACCOUNTS.sync()),b.evaluate(()=>ACCOUNTS.sync())]);
    assert.equal(await b.locator('#round-count').textContent(),'1','Repeated sync cannot duplicate rounds');
    await b.goto(url+'/v1-letter-post/');await settle(b);
    assert.equal(await b.locator('#theme').inputValue(),'2','Theme renders on second device');
    assert.equal(await b.locator('html').getAttribute('data-calm'),'','Synced calm setting renders');
    console.log(`PASS ${live?'LIVE SUPABASE':'MOCK TRANSPORT'}: two isolated profiles; offline game round, cache reload, settings, theme, milestone, concurrent fields, duplicate prevention`);
    if(!live) {
      await contexts[0].setOffline(true);
      await a.evaluate(async()=>{
        const original=crypto.randomUUID.bind(crypto),ids=['ffffffff-ffff-4fff-bfff-fffffffffff1','00000000-0000-4000-8000-000000000001'];
        crypto.randomUUID=()=>ids.shift();
        try {await ACCOUNTS.setSetting('volume',12);await ACCOUNTS.setSetting('volume',78);}finally {crypto.randomUUID=original;}
      });
      await contexts[0].setOffline(false);await a.evaluate(()=>ACCOUNTS.sync());await b.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await a.evaluate(()=>ACCOUNTS.snapshot.settings.volume),78,'Later offline edit survives reversed lexical UUID order');
      assert.equal(await b.evaluate(()=>ACCOUNTS.snapshot.settings.volume),78,'Second device sees the later same-field edit');
      await a.locator('[data-action="home"]').first().click();await settle(a);
      fixture.loseNextResponse();await round(a,'C');
      await a.waitForFunction(()=>ACCOUNTS.status.includes('retry'));
      await a.evaluate(()=>ACCOUNTS.sync());
      await b.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await b.evaluate(()=>ACCOUNTS.snapshot.count),2,'Committed request with lost response counts once after retry');
      await contexts[0].setOffline(true);
      await a.evaluate(()=>ACCOUNTS.setSetting('hintAfter',0));
      await a.evaluate(()=>ACCOUNTS.signOut());
      await contexts[0].setOffline(false);
      await a.evaluate(({adult,password})=>ACCOUNTS.signIn(adult,password),{adult,password});
      assert.equal(await a.evaluate(()=>ACCOUNTS.snapshot.count),0,'Account switch hides child rounds');
      assert.equal(await a.evaluate(()=>ACCOUNTS.pending),0,'Account switch does not send child outbox as grown-up');
      assert.equal([...fixture.events.values()].some(e=>e.user_id===childId&&e.payload.field==='hintAfter'),false);
      await a.evaluate(({child,password})=>ACCOUNTS.signIn(child,password),{child,password});
      await a.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await a.evaluate(()=>ACCOUNTS.snapshot.settings.hintAfter),0,'Returning to child preserves and syncs their pending setting');
      assert.deepEqual(errors,[],'No uncaught browser errors');
      const shortPasswordRejected=await a.evaluate(async()=>{try {await ACCOUNTS.changePassword('12345');return false;}catch {return true;}});
      assert.equal(shortPasswordRejected,true,'Five-character password must be rejected');
      await a.evaluate(()=>ACCOUNTS.changePassword('aaaaaa'));
      await a.evaluate(()=>ACCOUNTS.signOut());
      await a.evaluate(child=>ACCOUNTS.signIn(child,'aaaaaa'),child);
      assert.equal(await a.evaluate(()=>ACCOUNTS.profile.handle),child,'Six lowercase characters satisfy the entire password rule');
      const refresh=fixture.holdRefresh();
      await a.evaluate(()=>{
        const saved=JSON.parse(localStorage.getItem('little-woof-session-v1'));saved.expires_at=0;
        localStorage.setItem('little-woof-session-v1',JSON.stringify(saved));ACCOUNTS.session.expires_at=0;
        window.refreshRace=ACCOUNTS.sync();
      });
      await Promise.race([refresh.started,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Refresh request did not start')),5000))]);
      await a.evaluate(()=>ACCOUNTS.signOut());refresh.release();await a.evaluate(()=>window.refreshRace);
      assert.equal(await a.evaluate(()=>ACCOUNTS.session),null,'An in-flight token refresh cannot sign a user back in after sign-out');
      assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('little-woof-session-v1'))),null,'Sign-out remains durable after delayed refresh');
      console.log('PASS MOCK TRANSPORT: committed request response loss, safe retry, shared-device identity, durable child outbox, six-character-only password rule, ordered same-field edits, delayed-refresh sign-out');
    } else {
      await a.goto(url+'/accounts/');await a.locator('#sign-out').click();
      await signin(a,url,adult,password);
      await a.locator('#children-list li').filter({hasText:child}).locator('button').click();
      await a.waitForFunction(handle=>ACCOUNTS.owner.handle===handle&&!document.querySelector('#settings-link').inert,child);
      await a.locator('#settings-link').click();
      await a.waitForFunction(()=>document.body.dataset.view==='settings');
      assert.equal(await a.evaluate(()=>ACCOUNTS.owner.handle),child,'Selected child survives navigation into grown-ups corner');
      await a.locator('#hint label').filter({hasText:'After 1 miss'}).click();
      await a.evaluate(()=>GROWN_UPS.whenSaved);await a.evaluate(()=>ACCOUNTS.sync());
      await b.evaluate(()=>ACCOUNTS.sync());
      assert.equal(await b.evaluate(()=>ACCOUNTS.snapshot.settings.hintAfter),1,'Grown-up edit arrives in the child account on another profile');
      await b.goto(url+'/v1-letter-post/');await settle(b);
      await b.locator('[data-letter="B"]').click();await settle(b);
      await b.locator('[data-action="match"]').click();await settle(b);
      await b.locator('.choice:not([data-answer="B"])').first().click();
      await b.waitForFunction(()=>[...document.querySelectorAll('.choice')].every(node=>!node.hasAttribute('aria-disabled')));
      assert.equal(await b.locator('[data-answer="B"].hint').count(),1,'Synced one-miss hint changes the real child renderer');
      assert.deepEqual(errors,[],'No uncaught browser errors during linked child settings journey');
      console.log('PASS LIVE SUPABASE: grown-up edits linked child through existing corner; second child profile renders the one-miss hint');
      const loginReport={created_at:new Date().toISOString(),grownup:{handle:adult,password},child:{handle:child,password},linked_grownup:{handle:parent,password},other_child:{handle:otherChild,password:'aaaaaa'}};
      fs.mkdirSync(path.join(root,'reports'),{recursive:true});
      const loginPath=path.join(root,'reports/accounts-test-logins.json');
      if(fs.existsSync(loginPath)) {const prior=JSON.parse(fs.readFileSync(loginPath,'utf8'));const history=prior.previous_runs||[];delete prior.previous_runs;loginReport.previous_runs=[...history,prior];}
      fs.writeFileSync(loginPath,JSON.stringify(loginReport,null,2)+'\n');
      console.log('LIVE test logins: '+JSON.stringify(loginReport));
    }
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
