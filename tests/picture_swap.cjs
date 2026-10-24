'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {staticServer, playwright} = require('./accounts_sync.cjs');
const games = ['v1-letter-post', 'v3-moonboat', 'v4-silk-thread'];
const words = 'apple ball cat duck egg fish goat hat insect jellyfish kite leaf moon nest octopus pig quilt rabbit sun tiger umbrella van web fox yak zebra'.split(' ');
const out = 'reports/picture-swap';
fs.mkdirSync(out, {recursive:true});
const manifest = {};
vm.runInNewContext(fs.readFileSync('sw-assets.js', 'utf8'), {self:manifest});
for (const game of games) {
  const source = fs.readFileSync(`${game === games[2] ? games[0] : game}/app.js`, 'utf8');
  const rows = JSON.parse(source.match(/const letters=(\[.*?\])\.map\(/s)[1]);
  assert.deepEqual(rows.map(row => row[0]), [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
  assert.deepEqual(rows.map(row => row[1]), words);
  for (const word of words) {
    const file = `${game}/pictures/${word}.webp`;
    assert(fs.existsSync(file), file);
    assert(manifest.OFFLINE_MANIFEST.files.includes('./'+file), `Precached: ${file}`);
  }
}
(async () => {
  const local = await staticServer();
  const browser = await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome', args:['--no-sandbox']});
  const results = [];
  try {
    for (const viewport of [{width:768,height:1024},{width:1280,height:800}]) {
      const context = await browser.newContext({viewport, reducedMotion:'reduce'});
      const errors = [], external = [], pictureRequests = [];
      await context.route('**/*', route => {
        if (!route.request().url().startsWith(local.url+'/')) {external.push(route.request().url()); return route.abort();}
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', req => {if(req.url().includes('/pictures/')) pictureRequests.push(new URL(req.url()).pathname);});
      await page.goto(local.url+'/');
      await page.locator('#play-unsaved').click();
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      const cached = await page.evaluate(async () => {
        const keys = await caches.keys();
        return (await Promise.all(keys.map(async key => (await (await caches.open(key)).keys()).map(req => new URL(req.url).pathname)))).flat();
      });
      for (const game of games) for (const word of words) assert(cached.includes(`/${game}/pictures/${word}.webp`));
      for (const offline of [false,true]) {
        await context.setOffline(offline);
        for (const game of games) {
          pictureRequests.length = 0;
          await page.goto(`${local.url}/${game}/`);
          await page.waitForFunction(() => document.body.dataset.screen==='home');
          // Guest mute keeps this image-focused check independent of audio timing.
          if(await page.locator('#mute').getAttribute('aria-pressed')!=='true') await page.locator('#mute').click();
          const decoded = await page.evaluate(async words => {
            const host = document.createElement('div');
            host.hidden = true;
            host.innerHTML = words.map(word => window.wordPicture(word)).join('');
            document.body.append(host);
            const result = await Promise.all([...host.querySelectorAll('img')].map(async img => {
              await img.decode();
              return {word:img.alt,path:new URL(img.src).pathname,width:img.naturalWidth,height:img.naturalHeight};
            }));
            host.remove();
            return result;
          }, words);
          assert.deepEqual(decoded.map(img => img.word), words);
          for (const img of decoded) {
            assert.equal(img.path, `/${game}/pictures/${img.word}.webp`);
            assert.equal(img.width,512); assert.equal(img.height,512);
          }
          await page.locator('[data-letter=A]').click();
          await page.waitForFunction(() => document.body.dataset.screen==='listen'&&!document.body.dataset.effect);
          assert.equal(await page.locator('img.word-picture').count(),0, 'Letter-only page stays letter-only');
          if(!offline) await page.screenshot({path:`${out}/${game}-letter-${viewport.width}x${viewport.height}.png`,fullPage:true});
          await page.locator('[data-action=match]').click();
          await page.waitForFunction(() => document.body.dataset.screen==='match'&&!document.body.dataset.effect);
          async function checkPictures(selector) {
            const images = await page.locator(selector).evaluateAll(async images => Promise.all(images.map(async img => {
              await img.decode();
              const style=getComputedStyle(img);
              return {word:img.alt,path:new URL(img.src).pathname,fit:style.objectFit,radius:style.borderRadius};
            })));
            assert(images.length>0);
            for(const img of images) {
              assert.equal(img.path,`/${game}/pictures/${img.word}.webp`);
              assert.equal(img.fit,'contain'); assert.equal(img.radius,'0px');
            }
          }
          await checkPictures('.choice img.word-picture');
          assert.equal(await page.locator('.choice img.word-picture').count(),3);
          if(!offline) await page.screenshot({path:`${out}/${game}-find-${viewport.width}x${viewport.height}.png`,fullPage:true});
          await page.locator('[data-answer]:not([data-answer=A])').first().click();
          await page.waitForFunction(() => !document.body.dataset.effect&&[...document.querySelectorAll('.choice')].every(b=>b.getAttribute('aria-disabled')!=='true'));
          await checkPictures('.choice img.word-picture');
          await page.locator('[data-answer=A]').click();
          await page.waitForFunction(() => document.body.dataset.screen==='celebrate'&&!document.body.dataset.effect);
          await checkPictures('.reward-art img.word-picture');
          if(!offline) await page.screenshot({path:`${out}/${game}-reward-${viewport.width}x${viewport.height}.png`,fullPage:true});
          assert.equal(await page.locator('.collection img.word-picture').count(),0);
          assert(pictureRequests.every(url=>url.startsWith(`/${game}/pictures/`)), JSON.stringify(pictureRequests));
          results.push({game,viewport,offline,decoded:decoded.length,wrongChoice:true,reward:true,ownFolderOnly:true});
          console.log(`PASS ${game} ${viewport.width} ${offline?'offline':'online'}: all 26 decode, choices, wrong tap and reward use own folder`);
        }
      }
      assert.deepEqual(errors,[]);
      assert(external.every(url=>new URL(url).pathname==='/rest/v1/game_settings'));
      await context.close();
    }
  } finally {
    fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2)+'\n');
    await browser.close(); local.server.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
