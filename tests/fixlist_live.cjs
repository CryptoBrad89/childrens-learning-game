'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,playwright,form}=require('./accounts_sync.cjs');
const credentials=login=>({handle:login.handle,password:login.password});
const logins=JSON.parse(fs.readFileSync('reports/fixlist-test-logins.json'));
assert.equal(logins.project,'ixjbgshhzeaosrzavssr');
(async()=>{const local=process.env.PORTAL_PREVIEW?null:await staticServer(),base=process.env.PORTAL_PREVIEW||local.url+'/';
const b=await playwright().chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{for(const width of [390,1440]){
 const context=await b.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 async function open(path){await p.goto(base+path);const interstitial=p.getByRole('button',{name:'Open the page',exact:true});if(await interstitial.count())await interstitial.click();await p.evaluate(()=>ACCOUNTS.ready);assert.equal(await p.evaluate(()=>ACCOUNT_CONFIG.url),'https://ixjbgshhzeaosrzavssr.supabase.co');}
 await open('accounts/index.html');await form(p,'signin-form',require('./master_login.cjs'));
 const master=await p.evaluate(()=>ACCOUNTS.profile);assert(master.is_master);assert.equal(master.display_name,'Brandy');
 await p.locator('#my-account').click();assert(await p.locator('#profile-form').locator('xpath=ancestor::details').isVisible());await p.locator('#adults-view').click();assert(await p.locator('#create-grownup-form').locator('xpath=ancestor::details').isVisible());
 await open('grown-ups/index.html');await p.waitForFunction(()=>document.body.dataset.view==='settings');assert.equal(await p.locator('#keypad').count(),0);await p.locator('#portal-link').click();await p.evaluate(()=>ACCOUNTS.ready);assert.deepEqual(await p.evaluate(()=>ACCOUNTS.profile),master);
 await Promise.all([p.waitForNavigation(),p.locator('#sign-out').click()]);await p.locator('#signin-form').waitFor();
 await open('index.html');await form(p,'child-signin-form',credentials(logins.grownup));await p.waitForFunction(()=>document.body.dataset.homeStep==='layouts');assert.equal(await p.evaluate(()=>ACCOUNTS.profile.role),'grownup');assert.equal(await p.locator('[data-world=silk]').getAttribute('aria-current'),'true');await p.locator('[data-world=silk]').click();await p.locator('#account-strip summary').waitFor();assert.equal(await p.locator('[data-letter]').count(),26);
 await open('accounts/index.html');const row=p.locator('#children-list li').filter({hasText:logins.child.handle});await row.waitFor();await row.locator('input[type=checkbox]').check();await p.locator('#edit-selected-kids').click();await p.waitForFunction(()=>document.body.dataset.view==='settings');assert.match(await p.locator('#scope-state').innerText(),/Using game defaults/);await p.locator('#portal-link').click();await p.evaluate(()=>ACCOUNTS.ready);await Promise.all([p.waitForNavigation(),p.locator('#sign-out').click()]);
 await open('index.html');await form(p,'child-signin-form',credentials(logins.child));assert.equal(await p.evaluate(()=>ACCOUNTS.snapshot.count),0);await p.locator('[data-world=silk]').click();await p.locator('#account-strip summary').waitFor();assert.equal(await p.locator('[data-letter]').count(),26);assert.equal(await p.locator('#theme').inputValue(),'0');
 const shots=process.env.PORTAL_PREVIEW?'reports/fixlist-hosted':'reports/fixlist-live';fs.mkdirSync(shots,{recursive:true});await p.screenshot({path:`${shots}/ribbon-${width}.png`,fullPage:true});await p.locator('#account-strip summary').click();await p.getByRole('button',{name:'👋 Sign out',exact:true}).click();await p.waitForURL(base+'index.html');await p.locator('#child-signin-form').waitFor();assert.equal(await p.locator('#child-signin-form [name=handle]').inputValue(),'');
 assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();console.log(`PASS ${process.env.PORTAL_PREVIEW?'HOSTED':'LIVE'} ${width}: master read-only/persistent, one login for grown-up play, retained child defaults, direct batch settings, profile signout, no errors/overflow`);
}}finally{await b.close();if(local)local.server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
