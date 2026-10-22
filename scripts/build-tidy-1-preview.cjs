'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {staticServer,backend,playwright,form}=require('../tests/accounts_sync.cjs');
const root=path.resolve(__dirname,'..'),preview=path.join(root,'previews/tidy-1'),shots=path.join(root,'reports/tidy-1/previews');
const games=[['post','Letter Post','v1-letter-post'],['moonboat','Moonboat','v3-moonboat'],['ribbon','Ribbon Road','v4-silk-thread']];
(async()=>{
 fs.mkdirSync(preview,{recursive:true});fs.mkdirSync(shots,{recursive:true});
 const local=await staticServer(),browser=await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
 const fixture=backend();fixture.seed('preview_adult','test7234','Preview grown-up');
 const context=await browser.newContext({viewport:{width:1024,height:576},reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===local.url)return route.continue();if(url.hostname.endsWith('.supabase.co'))return fixture.route(route);return route.abort();});
 const page=await context.newPage();await page.goto(local.url+'/accounts/');await form(page,'signin-form',{handle:'preview_adult',password:'test7234'});
 for(const [slug,title,dir]of games){
  await page.goto(local.url+'/'+dir+'/');await page.waitForFunction(()=>document.body.dataset.screen==='home');await page.selectOption('#theme','0');
  await page.waitForFunction(()=>!document.body.dataset.effect);await page.evaluate(()=>document.fonts.ready);
  const snapshot=await page.evaluate(({dir,title})=>{
   const doc=document.documentElement.cloneNode(true);doc.querySelectorAll('script').forEach(n=>n.remove());
   doc.querySelectorAll('#theme option').forEach((option,index)=>{option.toggleAttribute('selected',index===Number(document.querySelector('#theme').value));});
   const base=document.createElement('base');base.href='../../'+dir+'/';doc.querySelector('head').prepend(base);
   doc.querySelector('title').textContent=title+' · visual preview';
   doc.querySelectorAll('a').forEach(n=>{n.removeAttribute('href');});
   doc.querySelector('#footer').innerHTML='<span>Visual preview only · sample avatar · no account connection or progress</span>';
   doc.setAttribute('data-calm','');return '<!doctype html>\n'+doc.outerHTML;
  },{dir,title});
  fs.writeFileSync(path.join(preview,slug+'-current.html'),snapshot);
  const proposed=snapshot.replace('</head>','<style id="tidy-preview-only">#account-strip summary{padding:3px;min-width:50px;min-height:50px}#account-strip img{width:42px;height:42px}</style></head>').replace(slug==='post'?'<div class="open-sign">OPEN FOR<br><strong>PLAY!</strong></div>':'<!-- no tag -->','');
  fs.writeFileSync(path.join(preview,slug+'-proposed.html'),proposed);
  for(const version of ['current','proposed'])for(const [width,height]of [[1024,576],[768,1024],[1920,1080]]){
   await page.setViewportSize({width,height});await page.goto(local.url+'/previews/tidy-1/'+slug+'-'+version+'.html');await page.evaluate(()=>document.fonts.ready);
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
   const size=await page.locator('#account-strip img').evaluate(n=>n.getBoundingClientRect().width);assert.equal(size,version==='proposed'?42:32);
   const aligned=await page.locator('.player-controls').evaluate(group=>{const centers=['#mute','.theme-control','#account-strip summary'].map(s=>{const b=group.querySelector(s).getBoundingClientRect();return b.y+b.height/2;});return Math.max(...centers)-Math.min(...centers);});assert(aligned<1);
   if(slug==='post')assert.equal(await page.locator('.open-sign').count(),version==='proposed'?0:1);
   await page.screenshot({path:path.join(shots,`${slug}-${version}-${width}.png`),fullPage:true});
   if(width===1024)await page.locator('.player-controls').screenshot({path:path.join(shots,`${slug}-${version}-profile.png`)});
  }
  console.log(`PASS ${title} preview: 32px current, 42px proposed, aligned controls, three sizes, scripts removed`);
 }
 fs.writeFileSync(path.join(preview,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tidy 1 · visual changes for review</title><style>
 *{box-sizing:border-box}body{margin:0;background:#faf5e8;color:#263f5d;font:17px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:32px 24px}h1{font-size:36px;line-height:1.15}h2{margin-top:40px}h3{margin:0 0 16px}p{max-width:80ch}a{color:#254c85}figure{margin:0;background:#fffcf4;border:1px solid #d7cdbb;border-radius:16px;padding:18px;min-width:0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:16px 0 28px}.pair img{display:block;width:100%;height:auto}.profiles img{max-width:500px;margin:24px auto}figcaption{margin-top:16px;font-size:15px}.note{border-left:4px solid #b95b40;padding-left:18px}@media(max-width:740px){.pair{grid-template-columns:1fr}}
 </style></head><body><main><h1>Two visual changes for review</h1><p class="note">Items 6 and 8 are previews only. The live games still use their current profile picture size and Letter Post tag. These pages use a sample Lucy avatar and have no account connection.</p>
 <h2>6. Make the profile picture easier to see</h2><p>The proposed picture grows from 32 to 42 pixels inside a 50-pixel button. Its center stays aligned with the sound and theme controls.</p>
 ${games.map(([slug,title])=>`<h3>${title}</h3><div class="pair profiles">${['current','proposed'].map(v=>`<figure><strong>${v==='current'?'Current':'Proposed'}</strong><img src="../../reports/tidy-1/previews/${slug}-${v}-profile.png" alt="${title} ${v} profile size alongside the sound and theme buttons"><figcaption><a href="${slug}-${v}.html">Open the full ${v} ${title} preview</a></figcaption></figure>`).join('')}</div>`).join('')}
 <h2>8. Remove the “OPEN FOR PLAY!” tag</h2><p>The proposed Letter Post home removes the tilted tag. The mailbox, Lucy, and the working letter buttons stay in place.</p><div class="pair">${['current','proposed'].map(v=>`<figure><strong>${v==='current'?'Current':'Proposed'}</strong><a href="post-${v}.html"><img src="../../reports/tidy-1/previews/post-${v}-1024.png" alt="Letter Post ${v} home, ${v==='current'?'with the tilted tag':'with the tag removed'}"></a><figcaption><a href="post-${v}.html">Open the full ${v} preview</a></figcaption></figure>`).join('')}</div>
 <p>Full screenshots: ${[1024,768,1920].map(w=>`<a href="../../reports/tidy-1/previews/post-proposed-${w}.png">Letter Post at ${w}px</a>`).join(' · ')}. The 768px view is a portrait tablet at 768×1024.</p><p>Both changes wait for Bradley’s approval before they enter the live games.</p></main></body></html>`);
 await page.setViewportSize({width:1440,height:1000});await page.goto(local.url+'/previews/tidy-1/');await page.screenshot({path:path.join(shots,'review-page.png'),fullPage:true});
 await context.close();
 }finally{await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
