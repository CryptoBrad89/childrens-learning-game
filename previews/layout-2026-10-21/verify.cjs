'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../..');
const shots = path.join(root, 'reports/layout-preview');
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
      for (const [width, height] of [[1024,576], [1366,768], [1280,720], [768,1024], [1920,1080]]) {
        const context = await browser.newContext({viewport:{width,height}, deviceScaleFactor:1});
        const external = [], errors = [], failed = [];
        await context.route('**/*', route => {
          if (!route.request().url().startsWith(base + '/')) { external.push(route.request().url()); return route.abort(); }
          return route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
        await page.goto(`${base}/previews/layout-2026-10-21/${world}.html`);
        await page.evaluate(() => document.fonts.ready);
        const bounds = async () => page.evaluate(() => {
          const selectors = ['h1', '[data-letter]', '.pager', '.collection-preview summary', '#footer'];
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
        }
        await page.selectOption('#theme', '0');
        assert(await page.locator('[data-letter],.pager button,.collection-preview summary').evaluateAll(nodes => nodes.every(node => {
          const box = node.getBoundingClientRect();
          return box.width >= 60 && box.height >= 60;
        })), 'Letter, paging, and collection targets must be at least 60px');
        const prefix = `${world}-${width}x${height}`;
        await page.screenshot({path:path.join(shots, prefix + '-home.png')});
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
        if (width === 1024) await page.screenshot({path:path.join(shots, prefix + '-last-page.png')});
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
        assert.deepEqual(external, [], 'Preview contacted an external service');
        assert.deepEqual(errors, []);
        assert.deepEqual(failed, []);
        results.push({world,viewport:`${width}x${height}`,collapsed:await bounds(),themes:3,paging:'A–Z, fixed controls',collection:26,externalRequests:0});
        await context.close();
        console.log(`PASS ${prefix}: fits, three themes, paging, collection, no external requests`);
      }
    }
    fs.writeFileSync(path.join(shots, 'checks.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
