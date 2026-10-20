'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {staticServer,backend,playwright,form}=require('./accounts_sync.cjs');
const live=process.argv.includes('--live');
(async()=>{
  const {server,url}=await staticServer(),fixture=backend();let browser;
  const seed=live?JSON.parse(fs.readFileSync('reports/portal-master-test-logins.json','utf8')).grownup:{handle:'portal_admin',password:'7234ab'};
  if(!live)fixture.seed(seed.handle,seed.password);
  try {
    browser=await playwright().chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
    for(const width of [390,1440])for(const colorScheme of ['light','dark']) {
      const context=await browser.newContext({viewport:{width,height:1000},colorScheme,reducedMotion:'reduce'});
      if(!live)await context.route('https://*.supabase.co/**',fixture.route);
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url+'/');
      const chrome=await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).color,texture:getComputedStyle(document.body).backgroundImage}));
      await page.locator('#login-dialog .grown').click();await page.waitForURL('**/accounts/index.html');
      assert.deepEqual(await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).color,texture:getComputedStyle(document.body).backgroundImage})),chrome);
      assert.equal(await page.locator('#register-form').count(),0);
      assert(await page.locator('#create-grownup-form').isHidden());
      for(const action of ['register','create-grownup','create-child']) {
        const status=await page.evaluate(async action=>(await fetch(ACCOUNT_CONFIG.url+'/functions/v1/accounts',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,'Content-Type':'application/json'},body:JSON.stringify({action,handle:'unauthorized',password:'123456',display_name:'Denied'})})).status,action);
        assert([401,403].includes(status),'Anonymous account creation denied by server');
      }
      await form(page,'signin-form',seed);
      assert.equal(await page.locator('#account-strip').count(),0);
      assert(!/playing as|groups?|classrooms?|board codes?|invite codes?/i.test(await page.locator('#account-main').textContent()));
      assert(await page.locator('#progress').isHidden(),'Portal starts with kid administration');
      const actor=await page.evaluate(()=>ACCOUNTS.profile.id);
      await page.goto(url+'/grown-ups/');await page.locator('#settings').waitFor();
      assert.equal(await page.locator('#account-strip').count(),0);
      assert.deepEqual(await page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).color,texture:getComputedStyle(document.body).backgroundImage})),chrome);
      await page.goto(url+'/accounts/');await page.locator('#people').waitFor();
      await page.locator('#create-child-form').locator('xpath=ancestor::details').evaluate(n=>{n.open=true;});
      assert.equal(await page.locator('#create-child-form input[type=radio][name=avatar]').count(),6);
      const suffix=Date.now().toString(36)+width+colorScheme;
      const iconKid='icon_'+suffix,photoKid='photo_'+suffix,adult='adult_'+suffix;
      await page.locator('#create-child-form [name=avatar][value="🐱"]').check();
      await form(page,'create-child-form',{handle:iconKid,password:'7234ab',display_name:'Icon child'});
      assert.equal(await page.locator('#children-list li').filter({hasText:iconKid}).locator('.child-avatar').innerText(),'🐱');
      const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
      await page.locator('#avatar-upload').setInputFiles({name:'chosen-picture.png',mimeType:'image/png',buffer:png});
      await page.locator('#avatar-preview').waitFor();
      await form(page,'create-child-form',{handle:photoKid,password:'7234ab',display_name:'Picture child'});
      await page.reload();await page.locator('#children-list li').filter({hasText:photoKid}).waitFor();
      assert.match(await page.locator('#children-list li').filter({hasText:photoKid}).locator('img').getAttribute('src'),/^data:image\/jpeg;base64,/);
      await form(page,'create-grownup-form',{handle:adult,password:'7234ab',display_name:'Additional administrator'});
      assert.equal(await page.evaluate(()=>ACCOUNTS.profile.id),actor,'Creating a grown-up keeps the administrator signed in');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('#sign-out').click();await page.waitForURL(url+'/index.html');await page.goto(url+'/accounts/');await form(page,'signin-form',{handle:adult,password:'7234ab'});
      assert.equal(await page.evaluate(()=>ACCOUNTS.profile.role),'grownup');
      await page.evaluate(()=>ACCOUNTS.signOut());await page.goto(url+'/');
      await form(page,'child-signin-form',{handle:photoKid,password:'7234ab'});
      const childDenial=await page.evaluate(async()=>{
        const statuses=[];
        for(const action of ['register','create-grownup','create-child'])statuses.push((await fetch(ACCOUNT_CONFIG.url+'/functions/v1/accounts',{method:'POST',headers:{apikey:ACCOUNT_CONFIG.key,Authorization:'Bearer '+ACCOUNTS.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,handle:'unauthorized',password:'123456',display_name:'Denied'})})).status);
        let clientDenied=false;try{await ACCOUNTS.manage('create-grownup',{});}catch{clientDenied=true;}
        return {statuses,clientDenied};
      });
      assert.deepEqual(childDenial,{statuses:[403,403,403],clientDenied:true});
      await page.goto(url+'/grown-ups/');await page.waitForURL('**/accounts/index.html');
      assert(await page.locator('#people').isHidden());assert(await page.locator('#create-grownup-form').isHidden());
      assert.deepEqual(errors,[]);await context.close();
      console.log(`PASS ${live?'LIVE':'FIXTURE'} portal ${width} ${colorScheme}: matching chrome, admin-only entry, no play banner/groups/codes, icon + uploaded avatar persistence, additional administrator, child denial`);
    }
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
