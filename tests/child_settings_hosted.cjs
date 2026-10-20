'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {playwright,form,settle}=require('./accounts_sync.cjs');
const base=process.env.PORTAL_PREVIEW||'https://raw.githack.com/CryptoBrad89/childrens-learning-game/c302bec2c28c95a4e891244e2e6f0b93a2c804a7/';
(async()=>{
 const browser=await playwright().chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const logins=JSON.parse(fs.readFileSync('reports/portal-child-settings-test-logins.json'));
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(base+'accounts/index.html');assert(response.ok(),'Hosted preview responds');
   const notice=page.getByRole('button',{name:'Open the page',exact:true});if(await notice.count())await notice.click();
   await form(page,'signin-form',logins.master);
   assert.equal(await page.evaluate(()=>ACCOUNTS.profile.is_master),true);
   const child=logins.runs.find(r=>r.width===width).children[0];
   await page.locator('#children-list li').filter({hasText:child.handle}).locator('button').click();
   await page.waitForFunction(id=>ACCOUNTS.owner?.id===id&&!document.getElementById('settings-link').inert,child.id);
   await page.locator('#child-management > summary').click();
   assert(await page.locator('#child-profile-form [name=handle]').isVisible());
   await page.locator('#profile-form').locator('xpath=ancestor::details').locator('summary').click();
   assert(await page.locator('#profile-form [name=handle]').isVisible());
   await page.locator('#settings-link').click();await page.waitForFunction(()=>document.body.dataset.view==='settings');
   assert.match(await page.locator('#scope-state').innerText(),/Custom for this child/);
   assert.equal(await page.locator('#volume-value').innerText(),'35%');
   await page.evaluate(()=>scrollTo(0,0));
   const rect=await page.locator('#sign-out').boundingBox();assert(rect.y>=0&&rect.y+rect.height<=900);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`reports/portal-child-settings-hosted-${width}.png`,fullPage:true});
   await page.locator('#sign-out').click();await page.waitForURL(base+'index.html');
   await form(page,'child-signin-form',{handle:child.handle,password:child.password});
   assert.equal(await page.evaluate(()=>GROWN_UPS.load().volume),35);
   assert.match(await page.locator('#change-player').innerText(),/Sign out/);
   await page.locator('#change-player').click();await page.waitForFunction(()=>!ACCOUNTS.session);
   await form(page,'child-signin-form',{handle:child.handle,password:child.password});
   await page.locator('[data-world=post]').click();await settle(page);
   await page.locator('#account-strip button').click();await page.waitForURL(base+'index.html');
   assert.equal(await page.evaluate(()=>ACCOUNTS.session),null);assert.deepEqual(errors,[]);
   await context.close();console.log(`PASS HOSTED ${width}: pinned preview, master login, child name fields, own profile fields, child overrides, visible header signout, picker/game child signout, no overflow/errors`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
