'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {staticServer, playwright} = require('./accounts_sync.cjs');
const out = 'reports/fade-swap';
const words = fs.readdirSync('v3-moonboat/pictures').map(name => name.replace('.webp',''));
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const local = await staticServer();
  const browser = await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-background-timer-throttling']});
  const results=[];
  try {
    for(const width of [390,768,1280]) {
      const context=await browser.newContext({viewport:{width,height:1024},reducedMotion:'no-preference'});
      const errors=[];
      await context.route('**/*',route=> {
        const url=new URL(route.request().url());
        if(url.origin===local.url)return route.continue();
        // Local guest settings fixture; no external request is sent.
        if(url.pathname==='/rest/v1/game_settings')return route.fulfill({json:[]});
        return route.abort();
      });
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(local.url);
      await page.locator('#play-unsaved').click();
      await page.evaluate(()=>navigator.serviceWorker.ready);
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
      for(const [game,names] of [['v4-silk-thread',['Pink','Purple','Yellow']],['v3-moonboat',['Dark','Cloud day','Plum dusk']]]) {
        await page.goto(`${local.url}/${game}/`);
        await page.waitForFunction(()=>document.body.dataset.screen==='home');
        if(await page.locator('#mute').getAttribute('aria-pressed')!=='true')await page.locator('#mute').click();
        const decoded=await page.evaluate(async words=>{
          const host=document.createElement('div');host.hidden=true;
          host.innerHTML=words.map(w=>window.wordPicture(w)).join('');document.body.append(host);
          await Promise.all([...host.querySelectorAll('img')].map(img=>img.decode()));
          const count=host.querySelectorAll('img').length;host.remove();return count;
        },words);
        assert.equal(decoded,26);
        for(const [theme,name] of names.entries()) {
          await page.selectOption('#theme',String(theme));
          await page.locator('[data-letter=A]').click();
          await page.waitForFunction(()=>document.body.dataset.screen==='listen'&&!document.body.dataset.effect);
          const stem=`${game}-${theme}-${width}`;
          if(game==='v3-moonboat') {
            assert.equal(await page.locator('.listen-letter img.word-picture').count(),0);
            await page.screenshot({path:`${out}/${stem}-letter.png`,fullPage:true});
          }
          await page.locator('[data-action=match]').click();
          await page.waitForFunction(()=>document.body.dataset.screen==='match'&&!document.body.dataset.effect);
          await page.locator('.choice').first().hover();
          await page.waitForTimeout(200);
          const styles=await page.locator('.choice img.word-picture').evaluateAll(async imgs=>Promise.all(imgs.map(async img=>{
            await img.decode();const s=getComputedStyle(img),r=img.getBoundingClientRect(),p=img.parentElement.getBoundingClientRect();
            return {word:img.alt,fit:s.objectFit,radius:s.borderRadius,background:s.backgroundColor,border:s.borderWidth,rotate:s.rotate,transform:s.transform,shadow:s.boxShadow,inside:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom};
          })));
          assert.equal(styles.length,3);
          for(const s of styles){assert.equal(s.fit,'contain');assert.equal(s.radius,'0px');assert.equal(s.background,'rgba(0, 0, 0, 0)');assert.equal(s.border,'0px');assert.equal(s.rotate,'none');assert.equal(s.transform,'none');assert.equal(s.shadow,'none');assert(s.inside);}
          await page.mouse.move(0,0);
          await page.screenshot({path:`${out}/${stem}-answers.png`,fullPage:true});
          await page.locator('[data-answer=A]').click();
          await page.waitForFunction(()=>document.body.dataset.screen==='celebrate'&&!document.body.dataset.effect);
          await page.locator('.reward-art img.word-picture').evaluate(img=>img.decode());
          await page.screenshot({path:`${out}/${stem}-reward.png`,fullPage:true});
          await page.locator('[data-action=home]').first().click();
          await page.waitForFunction(()=>document.body.dataset.screen==='home'&&!document.body.dataset.effect);
          results.push({game,theme:name,width,decoded,styles,letterCircle:game==='v3-moonboat'?'letter only, screenshot':'not applicable',errors:[...errors]});
          console.log(`PASS ${game} ${name} ${width}`);
        }
        await context.setOffline(true);
        const cached=await page.evaluate(async ({game,words})=>{
          for(const word of words){const response=await fetch(`pictures/${word}.webp`);if(!response.ok)throw Error(`${game}/${word}`);const blob=await response.blob();await createImageBitmap(blob);}
          return words.length;
        },{game,words});
        assert.equal(cached,26);
        await context.setOffline(false);
      }
      assert.deepEqual(errors,[]);
      await context.close();
    }
  }finally{fs.writeFileSync(`${out}/browser.json`,JSON.stringify(results,null,2)+'\n');await browser.close();local.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
