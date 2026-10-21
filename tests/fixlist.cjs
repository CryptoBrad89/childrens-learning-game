'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {staticServer,backend,playwright,form,round}=require('./accounts_sync.cjs');
(async()=>{
 const {server,url}=await staticServer(),fixture=backend();fixture.seed('fix_admin','7234ab','Grown-up');
 const browser=await playwright().chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
 const shots='reports/risky-actions/browser/fixlist';fs.mkdirSync(shots,{recursive:true});
 try{for(const width of [390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('https://*.supabase.co/**',fixture.route);
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'/');await form(p,'child-signin-form',{handle:'fix_admin',password:'7234ab'});await p.waitForFunction(()=>document.body.dataset.homeStep==='layouts');
 assert.equal(await p.evaluate(()=>ACCOUNTS.profile.role),'grownup');
 await p.goto(url+'/accounts/');await p.waitForFunction(()=>ACCOUNTS.profile?.is_master&&document.querySelector('#identity-title').textContent==='Grown-up');
 await form(p,'create-child-form',{handle:'fix_child_'+width,password:'7234ab',display_name:'Explorer'});
 await p.locator('#children-list input[type=checkbox]').first().check();await p.locator('#edit-selected-kids').click();
 await p.waitForFunction(()=>document.body.dataset.view==='settings');assert.equal(await p.locator('#keypad').count(),0);assert.match(await p.locator('#scope-state').innerText(),/1 child/);
 await p.locator('#portal-link').click();await p.waitForFunction(()=>document.querySelector('#identity-title').textContent==='Grown-up');
 assert(await p.locator('#signed-in').isVisible());assert.equal(await p.locator('#adults-view').getAttribute('aria-pressed'),'false');
 await p.screenshot({path:`${shots}/portal-${width}.png`,fullPage:true});
 await p.locator('#my-account').click();assert(await p.locator('#profile-form').locator('xpath=ancestor::details').isHidden(),'Master profile cannot be edited');await p.locator('#adults-view').click();assert(await p.locator('#create-grownup-form').locator('xpath=ancestor::details').isVisible());assert(await p.locator('#people').isHidden());
 await p.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('little-woof-session-v1'));saved.profile.is_master=false;localStorage.setItem('little-woof-session-v1',JSON.stringify(saved));});
 await p.reload();await p.waitForFunction(()=>ACCOUNTS.profile?.is_master===true);
 await p.locator('#adults-view').click();assert(await p.locator('#create-grownup-form').locator('xpath=ancestor::details').isVisible());
 await p.locator('#kids-view').click();await p.locator('#children-list button').first().click();await p.locator('#settings-link').click();await p.waitForFunction(()=>document.body.dataset.view==='settings');
 await p.screenshot({path:`${shots}/settings-${width}.png`,fullPage:true});
 await p.locator('#portal-link').click();await p.waitForFunction(()=>document.querySelector('#identity-title').textContent==='Grown-up');
 await Promise.all([p.waitForNavigation(),p.locator('#sign-out').click()]);await p.locator('#signin-form').waitFor();
 await p.goto(url+'/');await form(p,'child-signin-form',{handle:'fix_child_'+width,password:'7234ab'});await p.locator('#change-player').click();assert.equal(await p.locator('#child-signin-form [name=handle]').inputValue(),'');
 await form(p,'child-signin-form',{handle:'fix_child_'+width,password:'7234ab'});
 for(const [name,path] of [['ribbon','v4-silk-thread'],['post','v1-letter-post'],['moonboat','v3-moonboat']]){
 await p.goto(url+'/'+path+'/');await p.waitForFunction(()=>document.body.dataset.screen==='home');await p.locator('#account-strip summary').waitFor();
 assert.equal(await p.locator('#account-progress,#account-sync-status').count(),0);assert(!/Take your time/.test(await p.locator('#footer').innerText()));
 const layout=await p.evaluate(()=>{const shelf=document.querySelector('.picker-shelf'),slots=document.querySelector('.collection-slots'),ship=document.querySelector('.map-ship'),planets=document.querySelector('.planets');return {shelf:shelf.scrollHeight<=shelf.clientHeight+2,slots:slots.scrollHeight<=slots.clientHeight+2&&slots.scrollWidth<=slots.clientWidth+2,ship:!ship||ship.getBoundingClientRect().top>=planets.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth};});
 assert.deepEqual(layout,{shelf:true,slots:true,ship:true,overflow:false},name+' '+width);
 await p.screenshot({path:`${shots}/${name}-${width}.png`,fullPage:true});
 await p.locator('#mute').click();await round(p,'B');await p.locator('#account-strip summary').click();assert(await p.getByRole('button',{name:'👋 Sign out',exact:true}).isVisible());await p.locator('#account-strip summary').click();
 }
 await p.locator('#account-strip summary').click();await p.getByRole('button',{name:'👋 Sign out',exact:true}).click();await p.waitForURL('**/index.html');assert.equal(await p.locator('#child-signin-form [name=handle]').inputValue(),'');
 await p.locator('#play-unsaved').click();await p.locator('[data-world=silk]').click();await p.locator('#account-strip a').filter({hasText:'Sign in to save'}).waitFor();await p.screenshot({path:`${shots}/guest-ribbon-${width}.png`,fullPage:true});assert(await p.locator('#account-strip details').isHidden());
 assert.deepEqual(errors,[]);console.log('PASS '+width+': unified login, portal persistence/views, direct batch settings, no PIN, page-flow pickers/collections, compact profile and guest controls, consistent sign-out');await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.route('https://*.supabase.co/**',fixture.route);const p=await context.newPage();
 await p.goto(url+'/accounts/');await form(p,'signin-form',{handle:'fix_admin',password:'7234ab'});
 await form(p,'create-grownup-form',{handle:'fix_linker',password:'7234ab',display_name:'Linking grown-up with a long display name'});
 await p.locator('#grownups-list li').filter({hasText:'fix_linker'}).getByRole('button',{name:/^Edit /}).click();
 const close=await p.locator('#close-edit-grownup').boundingBox();assert(close.y>=0&&close.y+close.height<=844,'Cancel stays inside the phone viewport');
 assert.equal(await p.locator('#edit-grownup').evaluate(e=>e.scrollWidth>e.clientWidth),false);
 await p.screenshot({path:shots+'/edit-grownup-390.png',fullPage:true});await p.locator('#close-edit-grownup').click();
 await Promise.all([p.waitForNavigation(),p.locator('#sign-out').click()]);await form(p,'signin-form',{handle:'fix_admin',password:'7234ab'});
 await p.waitForFunction(()=>document.querySelectorAll('#link-child-choice option').length>=2);
 const ids=await p.locator('#link-child-choice option').evaluateAll(nodes=>nodes.slice(0,2).map(n=>n.value));
 await p.locator('#link-child-form').locator('xpath=ancestor::details').evaluate(node=>{node.open=true;});await p.locator('#link-grownup-choice').selectOption(await p.evaluate(async()=>(await ACCOUNTS.manage('list-grownups')).grownups.find(p=>p.handle==='fix_linker').id));await form(p,'link-child-form',{child_id:ids});
 await Promise.all([p.waitForNavigation(),p.locator('#sign-out').click()]);await form(p,'signin-form',{handle:'fix_linker',password:'7234ab'});await p.locator('#select-kids').click();await p.locator('#edit-selected-kids').click();await p.waitForFunction(()=>document.body.dataset.view==='settings');assert.match(await p.locator('#scope-state').innerText(),/2 children/);
 console.log('PASS multi-select linking and direct batch settings for two children; stale cached master metadata recovers read-only');await context.close();
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
