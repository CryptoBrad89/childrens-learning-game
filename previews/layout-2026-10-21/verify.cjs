'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../..');
const checkmarks = process.argv.includes('--checkmarks');
const shots = path.join(root, checkmarks ? 'reports/checkmark-preview' : 'reports/layout-preview');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.jpg':'image/jpeg', '.woff2':'font/woff2'};
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || '/usr/bin/google-chrome', args:['--no-sandbox']});
  const results = [];
  try {
    fs.mkdirSync(shots, {recursive:true});
    for (const world of ['letter-post', 'moonboat']) {
      for (const [width, height] of (checkmarks ? [[1024,576], [768,1024], [1920,1080]] : [[1024,576], [1366,768], [1280,720], [768,1024], [1920,1080]])) {
        const context = await browser.newContext({viewport:{width,height}, deviceScaleFactor:1});
        const external = [], errors = [], failed = [];
        await context.route('**/*', route => {
          if (!route.request().url().startsWith(base + '/')) { external.push(route.request().url()); return route.abort(); }
          return route.continue();
        });
        const page = await context.newPage();
        if (checkmarks) await page.addInitScript(() => {
          window.badgeAnimations = [];
          const animate = Element.prototype.animate;
          Element.prototype.animate = function(...args) {
            const animation = animate.apply(this, args);
            if (this.matches('.done-badge')) window.badgeAnimations.push({duration:animation.effect.getTiming().duration, frames:animation.effect.getKeyframes(), animation});
            return animation;
          };
        });
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
        await page.goto(`${base}/previews/layout-2026-10-21/${world}.html`);
        await page.evaluate(() => document.fonts.ready);
        const bounds = async () => page.evaluate(() => {
          const selectors = ['h1', '[data-letter]', '.pager', '.collection-preview summary', '#footer', '#simulate-correct', '.calm-control'];
          const boxes = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(node => {
            const box = node.getBoundingClientRect();
            return {selector, top:Math.round(box.top), bottom:Math.round(box.bottom), left:box.left, right:box.right};
          }));
          return {pageHeight:document.documentElement.scrollHeight, width:innerWidth, height:innerHeight, boxes, overflow:document.documentElement.scrollWidth > innerWidth};
        });
        for (const theme of ['0','1','2']) {
          await page.selectOption('#theme', theme);
          const measured = await bounds();
          assert(!measured.overflow, `${world} ${width} theme ${theme}: horizontal overflow`);
          for (const box of measured.boxes) assert(box.top >= 0 && box.bottom <= height && box.left >= 0 && box.right <= width, `${world} ${width} theme ${theme}: clipped ${JSON.stringify(box)}`);
          assert(measured.pageHeight <= height, `${world} ${width}: collapsed page scrolls`);
          if (checkmarks) {
            const badges = await page.locator('#letters .done-badge').evaluateAll(nodes => nodes.map(node => {
              const style = getComputedStyle(node), box = node.getBoundingClientRect();
              const glyph = node.closest('button').querySelector('.pick-glyph').getBoundingClientRect();
              const map = node.closest('.star-map')?.getBoundingClientRect();
              return {color:style.backgroundColor, border:style.borderTopColor, borderWidth:style.borderTopWidth, width:parseFloat(style.width), glyphClear:box.right <= glyph.left || box.left >= glyph.right || box.bottom <= glyph.top || box.top >= glyph.bottom, inMap:!map || box.left >= map.left && box.right <= map.right && box.top >= map.top && box.bottom <= map.bottom};
            }));
            for (const badge of badges) {
              assert.equal(badge.color, 'rgb(23, 107, 58)');
              assert.equal(badge.border, 'rgb(255, 255, 255)');
              assert.equal(badge.borderWidth, '3px');
              assert.equal(badge.width, width === 1920 ? 44 : world === 'moonboat' && width === 1024 ? 32 : 36);
              assert(badge.glyphClear && badge.inMap, `${world} ${width}: badge overlaps glyph or map boundary`);
            }
            assert.equal(await page.locator('#letters .done-badge').count(), 4);
            assert(await page.locator('[data-letter=A]').isEnabled());
            assert.equal(await page.locator('[data-letter=A] .pick-caption').innerText(), 'Done');
            await page.screenshot({path:path.join(shots, `${world}-${width}x${height}-theme${theme}-home.png`)});
          }
        }
        await page.selectOption('#theme', '0');
        assert(await page.locator('[data-letter],.pager button,.collection-preview summary').evaluateAll(nodes => nodes.every(node => {
          const box = node.getBoundingClientRect();
          return box.width >= 60 && box.height >= 60;
        })), 'Letter, paging, and collection targets must be at least 60px');
        const prefix = `${world}-${width}x${height}`;
        if (!checkmarks) await page.screenshot({path:path.join(shots, prefix + '-home.png')});
        const seen = [];
        assert(await page.locator('#previous').isDisabled());
        const pagerTop = await page.locator('.pager').evaluate(node => node.getBoundingClientRect().top);
        for (let index = 0; index < 5; index++) {
          seen.push(...await page.locator('[data-letter]').evaluateAll(nodes => nodes.map(node => node.dataset.letter)));
          assert.equal(await page.locator('#page-number').innerText(), `Page ${index + 1} of 5`);
          assert(Math.abs(await page.locator('.pager').evaluate(node => node.getBoundingClientRect().top) - pagerTop) < 1, 'Paging controls move between pages');
          if (index < 4) await page.locator('#next').click();
        }
        assert.deepEqual(seen, [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
        assert.equal(await page.locator('#range').innerText(), 'Y–Z');
        assert(await page.locator('#next').isDisabled());
        if (!checkmarks && width === 1024) await page.screenshot({path:path.join(shots, prefix + '-last-page.png')});
        for (let index = 0; index < 4; index++) await page.locator('#previous').click();
        await page.locator('[data-letter=A]').click();
        assert.equal(await page.locator('[data-letter=A]').getAttribute('aria-pressed'), 'true');
        await page.locator('.collection-preview summary').focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('.collection-preview').evaluate(node => node.open));
        assert.equal(await page.locator('.album-slot').count(), 26);
        assert.equal(await page.locator('.album-slot.collected').count(), 4);
        assert(await page.locator('.album-grid').evaluate(node => node.scrollWidth <= node.clientWidth));
        await page.locator('[data-letter=A]').evaluate(node => node.removeAttribute('aria-pressed'));
        await page.locator('.collection-preview summary').evaluate(node => node.blur());
        await page.screenshot({path:path.join(shots, prefix + '-collection.png'), fullPage:true});
        await page.locator('.collection-preview summary').click();
        assert.equal(await page.locator('#range').innerText(), 'A–F');
        if (checkmarks) {
          await page.locator('[data-letter=E]').click();
          assert.equal(await page.locator('[data-letter=E] .done-badge').count(), 0, 'Selecting a letter must not complete it');
          assert.match(await page.locator('.collection-preview summary small').innerText(), /^4 of 26/);
          await page.locator('#simulate-correct').click();
          assert.equal(await page.locator('[data-letter=E] .pick-caption').innerText(), 'Done');
          assert.match(await page.locator('.collection-preview summary small').innerText(), /^5 of 26/);
          assert.equal(await page.locator('[data-collection-letter=E] .done-badge').count(), 1);
          assert(await page.locator('#simulate-correct').isDisabled());
          assert.equal(await page.evaluate(() => badgeAnimations.length), 1);
          const motion = await page.evaluate(() => ({duration:badgeAnimations[0].duration,frames:badgeAnimations[0].frames.map(frame => frame.transform)}));
          assert.equal(motion.duration, 220);
          assert.deepEqual(motion.frames, ['scale(0.85)', 'scale(1.08)', 'scale(1)']);
          await page.evaluate(() => Promise.all(badgeAnimations.map(record => record.animation.finished)));
          await page.locator('[data-letter=E]').click();
          await page.locator('#next').click();
          await page.locator('#previous').click();
          assert.equal(await page.evaluate(() => badgeAnimations.length), 1, 'Completed badges must not replay on tapping or paging');
          await page.locator('[data-letter=A]').click();
          await page.locator('#simulate-correct').evaluate(node => node.blur());
          await page.screenshot({path:path.join(shots, prefix + '-simulated-correct.png')});
          await page.locator('#preview-calm').check();
          await page.locator('[data-letter=F]').click();
          await page.locator('#simulate-correct').click();
          assert.equal(await page.locator('[data-letter=F] .pick-caption').innerText(), 'Done');
          assert.equal(await page.evaluate(() => badgeAnimations.length), 1, 'Calm mode must not animate completion');
          await page.locator('#preview-calm').uncheck();
          await page.emulateMedia({reducedMotion:'reduce'});
          await page.locator('#next').click();
          await page.locator('[data-letter=G]').click();
          await page.locator('#simulate-correct').click();
          assert.equal(await page.locator('[data-letter=G] .pick-caption').innerText(), 'Done');
          assert.equal(await page.evaluate(() => badgeAnimations.length), 1, 'Reduced motion must not animate completion');
          assert.match(await page.locator('.collection-preview summary small').innerText(), /^7 of 26/);
          await page.emulateMedia({reducedMotion:'no-preference'});
          await page.locator('.collection-preview summary').click();
          await page.locator('[data-letter=H]').click();
          await page.locator('#simulate-correct').click();
          assert.equal(await page.evaluate(() => badgeAnimations.length), 3, 'A newly completed card and visible collection badge each settle once');
          await page.evaluate(() => {
            const calm = document.querySelector('#preview-calm');
            calm.checked = true;
            calm.dispatchEvent(new Event('change', {bubbles:true}));
          });
          assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.effect?.target.matches('.done-badge')).length), 0, 'Enabling calm stops an active settle');
          await page.reload();
          assert.equal(await page.locator('#letters .done-badge').count(), 4, 'Example progress must reset on reload');
        }
        assert.deepEqual(external, [], 'Preview contacted an external service');
        assert.deepEqual(errors, []);
        assert.deepEqual(failed, []);
        results.push({world,viewport:`${width}x${height}`,collapsed:await bounds(),themes:3,paging:'A–Z, fixed controls',collection:26,externalRequests:0,...(checkmarks ? {tapDoesNotComplete:true,simulateCorrectCompletes:true,settleDurationMs:220,calmStatic:true,reducedMotionStatic:true,noReplayOnPaging:true} : {})});
        await context.close();
        console.log(`PASS ${prefix}: fits, three themes, paging, collection, no external requests`);
      }
    }
    if (checkmarks) {
      const completionChecks = [];
      for (const game of ['v1-letter-post', 'v3-moonboat', 'v4-silk-thread']) {
        const context = await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce'});
        const external = [], errors = [];
        await context.route(/^https?:/, route => { external.push(route.request().url()); return route.abort(); });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(pathToFileURL(path.join(root, game, 'index.html')).href);
        await page.waitForSelector('[data-letter=A]');
        await page.locator('#mute').evaluate(node => node.click());
        const screen = name => page.waitForFunction(name => document.body.dataset.screen === name, name);
        const tap = selector => page.locator(selector).first().evaluate(node => node.click());
        await tap('[data-letter=A]');
        await screen('listen');
        await tap('[data-action=home]');
        await screen('home');
        assert.equal(await page.locator('[data-letter=A] .visited').count(), 0, `${game}: opening a letter must not complete it`);
        await tap('[data-letter=A]');
        await screen('listen');
        await tap('[data-action=match]');
        await screen('match');
        await tap('.choice:not([data-answer=A])');
        await page.waitForFunction(() => !document.querySelector('.choice[aria-disabled=true]'));
        await page.keyboard.press('Escape');
        await screen('home');
        assert.equal(await page.locator('[data-letter=A] .visited').count(), 0, `${game}: wrong answers must not complete a letter`);
        await tap('[data-letter=A]');
        await screen('listen');
        await tap('[data-action=match]');
        await screen('match');
        await tap('[data-answer=A]');
        await screen('celebrate');
        await page.keyboard.press('Escape');
        await screen('home');
        assert.equal(await page.locator('[data-letter=A] .visited').count(), 1, `${game}: correct answers must complete a letter`);
        assert.match(await page.locator('.collection-heading').innerText(), /1 of 26/);
        assert.deepEqual(external, []);
        assert.deepEqual(errors, []);
        completionChecks.push({game,openingDoesNotComplete:true,wrongAnswerDoesNotComplete:true,correctAnswerCompletes:true,externalRequests:0});
        await context.close();
        console.log(`PASS real game ${game}: opening and wrong answer do not complete; correct answer completes`);
      }
      fs.writeFileSync(path.join(shots, 'real-game-completion.json'), JSON.stringify(completionChecks, null, 2) + '\n');
    }
    fs.writeFileSync(path.join(shots, 'checks.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
