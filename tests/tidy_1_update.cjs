'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {playwright}=require('./accounts_sync.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/tidy-1');
const prefix='/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidy-1-upgrade-'));
const evidence=[];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.jpg':'image/jpeg','.woff2':'font/woff2'};
let build=root, nextBuild=false;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local');if(!url.pathname.startsWith(prefix+'/'))return res.writeHead(404).end();
 let file=path.resolve(build,'.'+decodeURIComponent(url.pathname.slice(prefix.length)));
 if(file!==build&&!file.startsWith(build+path.sep))return res.writeHead(403).end();
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');let body=fs.readFileSync(file);if(nextBuild&&file===path.join(root,'v1-letter-post/index.html'))body=body.toString().replace('</head>','<meta name="tidy-build" content="next-online-build"></head>');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}
 catch{res.writeHead(404).end();}
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,base=origin+prefix;
 try{
 for(const revision of ['20e7acf','3d874eb']){
  const old=path.join(temp,revision);fs.mkdirSync(old);
  const archive=execFileSync('git',['archive',revision,'index.html','sw.js','sw-assets.js','audio-map.js','accounts','grown-ups','home','audio','v1-letter-post','v3-moonboat','v4-silk-thread'],{cwd:root,maxBuffer:32*1024*1024});
  execFileSync('tar',['-x','-C',old],{input:archive});build=old;nextBuild=false;
  const context=await browser.newContext({viewport:{width:1024,height:576},reducedMotion:'reduce'});
  const blocked=[];await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();blocked.push(route.request().url());return route.abort();});
  await context.addInitScript(()=>{window.tidyLoads=Number(sessionStorage.getItem('tidy-loads')||0)+1;sessionStorage.setItem('tidy-loads',String(window.tidyLoads));window.clips=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){clips.push(this.src.split('/').pop());return play.call(this);};});
  const page=await context.newPage();
  await page.goto(base+'/');await page.locator('#play-unsaved').click();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await page.goto(base+'/v1-letter-post/');await page.waitForFunction(()=>document.body.dataset.screen==='home');
  assert.equal(await page.locator('[data-letter]').count(),revision==='20e7acf'?26:6);
  const oldKeys=await page.evaluate(()=>caches.keys());assert.equal(oldKeys.length,1);
  await page.screenshot({path:path.join(out,`upgrade-${revision}-old.png`)});
  const portal=await context.newPage();await portal.goto(base+'/accounts/index.html');
  await portal.waitForSelector('#signin-form');const portalLoads=await portal.evaluate(()=>tidyLoads);await page.bringToFront();
  build=root;
  // This is the user's only refresh. No registration.update(), cache deletion, or tab close.
  await page.reload();
  const deadline=Date.now()+45000;
  let upgraded=false;
  while(Date.now()<deadline){
   try{upgraded=await page.evaluate(async oldKeys=>{
    const keys=await caches.keys();return document.body.dataset.screen==='home'&&keys.length===1&&keys[0]!==oldKeys[0]&&document.querySelectorAll('[data-letter]').length===6;
   },oldKeys);}catch(error){if(!error.message.includes('context was destroyed'))throw error;}
   if(upgraded)break;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert(upgraded,'New build must take over after one refresh: '+JSON.stringify(await page.evaluate(async()=>({keys:await caches.keys(),count:document.querySelectorAll('[data-letter]').length,state:(await navigator.serviceWorker.getRegistration())?.active?.state}))))
  await page.screenshot({path:path.join(out,`upgrade-${revision}-new.png`)});
  assert.equal(await portal.evaluate(()=>tidyLoads),portalLoads,'An update must not reload the account editor or login page');
  const keys=await page.evaluate(()=>caches.keys());
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'sw-assets.js'),'utf8').replace(/^self.OFFLINE_MANIFEST = /,'').replace(/;\s*$/,''));
  assert.deepEqual(keys,['letters-with-lucy-'+manifest.version]);
  await context.setOffline(true);
  for(const game of ['v1-letter-post','v3-moonboat','v4-silk-thread']){
   await page.goto(base+'/'+game+'/');await page.waitForFunction(()=>document.body.dataset.screen==='home');
   assert.equal(await page.locator('[data-letter]').count(),game==='v4-silk-thread'?26:6);
   await page.locator('[data-letter=B]').click();await page.waitForFunction(()=>document.body.dataset.screen==='listen'&&!document.body.classList.contains('talking'));
   assert.deepEqual(await page.evaluate(()=>clips),['b-name-trim.mp3','b-sound-trim.mp3']);
   await page.locator('[data-action=match]').click();await page.waitForFunction(()=>document.body.dataset.screen==='match'&&!document.body.classList.contains('talking'));
   assert.deepEqual(await page.evaluate(()=>clips),['b-name-trim.mp3','b-sound-trim.mp3'],'New picture screen is silent offline');
   assert.equal(await page.locator('.hint-tag').count(),0);
  }
  await context.setOffline(false);
  // A new document on the server must appear on the next online load without another worker update.
  nextBuild=true;await page.goto(base+'/v1-letter-post/');
  await page.waitForFunction(()=>document.body.dataset.screen==='home');
  assert.equal(await page.locator('meta[name=tidy-build]').getAttribute('content'),'next-online-build');
  // With the new worker controlling, the next online load must fetch current files.
  const onlinePath=await page.evaluate(async()=>{const r=await fetch('../v1-letter-post/app.js');return await r.text();});
  assert(onlinePath.includes('nextRetry()'));
  evidence.push({oldRevision:revision,oldKeys,newKeys:keys,manualRefreshes:1,tabClosed:false,cacheClearedByTest:false,offlineGames:3,nextOnlineBuildVisible:true,accountPageReloaded:false,prefix,liveDatabaseRequestsSent:0,externalRequestsBlocked:blocked.length});
  await context.close();console.log(`PASS upgrade ${revision}: one refresh, new cache and runtime, all three games offline at nested hosted path`);
 }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});fs.writeFileSync(path.join(out,'service-worker-update.json'),JSON.stringify(evidence,null,2)+'\n');}
})().catch(e=>{console.error(e);process.exitCode=1;});
