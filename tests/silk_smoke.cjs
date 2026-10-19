'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const shots = '/tmp/silk-shots';
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const themes = ['Pink', 'Purple', 'Yellow'];
const viewports = [{width: 390, height: 844}, {width: 1180, height: 900}, {width: 1920, height: 1080}];
function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try {return require('playwright');} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}
async function fits(page, label) {
  const failures = await page.evaluate(() => {
    const failures = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Horizontal overflow');
    for (const node of document.querySelectorAll('button,select,a')) {
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < 0) continue;
      if (box.width < 59.5 || box.height < 59.5) failures.push(`${node.id || node.dataset.action || node.textContent.trim()}: ${box.width} × ${box.height}`);
    }
    for (const word of document.querySelectorAll('.choice .word')) {
      const box = word.closest('.choice').getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(word);
      if ([...range.getClientRects()].some(rect => rect.left < box.left || rect.right > box.right)) failures.push(`Clipped word: ${word.textContent}`);
    }
    return failures;
  });
  assert.deepEqual(failures, [], `${label}: layout and 60px touch targets`);
}
async function run() {
  fs.mkdirSync(shots, {recursive: true});
  const browser = await playwright().chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({viewport, reducedMotion: 'reduce'});
      try {
        const page = await context.newPage();
        await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
        await page.locator('#login:not([hidden])').waitFor();
        assert.equal(await page.locator('#layouts').isHidden(), true, 'Layouts stay behind the login');
        await page.locator('#play-guest').click();
        await page.locator('#layouts:not([hidden])').waitFor();
        assert.equal(await page.locator('a[data-world="silk"]').getAttribute('aria-current'), 'true', 'Ribbon Road is the default layout');
        assert.deepEqual(await page.locator('nav a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))),
          ['v1-letter-post/index.html', 'v3-moonboat/index.html', 'v4-silk-thread/index.html']);
        await fits(page, `chooser ${viewport.width}`);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({path: path.join(shots, `chooser-${viewport.width}.png`), fullPage: true});
        await page.locator('a[data-world="silk"]').click();
        await page.waitForFunction(() => document.body.dataset.screen === 'home');
        console.log(`PASS chooser-${viewport.width}: three usable world links and layout`);
      } finally {await context.close();}
    }
    for (const viewport of viewports) {
      for (const [theme, name] of themes.entries()) {
        const context = await browser.newContext({viewport, reducedMotion: 'no-preference'});
        const errors = [], network = [], missing = [];
        await context.route(/^https?:/, route => {network.push(route.request().url()); return route.abort();});
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        page.on('requestfailed', request => {if (request.url().startsWith('file:') && !request.failure().errorText.includes('ABORTED')) missing.push(request.url());});
        const prefix = `silk-${viewport.width}-${name.toLowerCase()}`;
        const screen = name => page.waitForFunction(name => document.body.dataset.screen === name, name);
        const settled = () => page.waitForFunction(() => !document.body.dataset.effect && !document.body.classList.contains('talking'));
        const capture = async name => {
          await page.evaluate(() => Promise.allSettled(document.getAnimations()
            .filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished)));
          await fits(page, `${prefix} ${name}`);
          if (viewport.width === 1920) return;
          await page.evaluate(() => document.fonts.ready);
          await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
          await page.screenshot({path: path.join(shots, `${prefix}-${name}.png`), fullPage: true});
        };
        try {
          await page.goto(pathToFileURL(path.join(root, 'v4-silk-thread/index.html')).href);
          await screen('home');
          assert.equal(await page.locator('#theme').inputValue(), '0', 'Pink is default');
          assert.deepEqual(await page.locator('#theme option').allTextContents(), themes);
          await page.selectOption('#theme', String(theme));
          await page.reload(); await screen('home');
          assert.equal(await page.locator('#theme').inputValue(), String(theme), `${name} survives reload`);
          assert.equal(await page.locator('body').getAttribute('data-theme'), String(theme));
          await page.locator('#mute').click(); await settled();
          assert.deepEqual(await page.locator('[data-letter]').evaluateAll(nodes => nodes.map(node => node.dataset.letter)), alphabet);
          await capture('home');
          await page.locator('[data-letter="B"]').click(); await screen('listen'); await settled(); await capture('listen');
          await page.locator('[data-action="match"]').click(); await screen('match'); await settled(); await capture('activity');
          await page.locator('[data-answer="B"]').click(); await screen('celebrate'); await settled();
          await page.waitForFunction(() => [...document.querySelectorAll('#confetti [data-paper]')].filter(node => {
            const box = node.getBoundingClientRect();
            return box.bottom > 0 && box.top < innerHeight && Number(getComputedStyle(node).opacity) > .5;
          }).length >= 8);
          await capture('celebrate-mid-fall');
          await page.emulateMedia({reducedMotion: 'reduce'});
          await page.waitForFunction(() => document.querySelectorAll('[data-particle]').length === 0);
          assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running' && Number(animation.effect.getTiming().duration) > 1).length), 0, 'Reduced motion stops all movement');
          await page.locator('[data-action="home"]').last().click(); await screen('home'); await settled();
          if (viewport.width === 390 && theme === 0) {
            for (const [index, letter] of alphabet.entries()) {
              await page.locator(`[data-letter="${letter}"]`).click(); await screen('listen'); await settled();
              assert((await page.locator('.listen-letter').getAttribute('aria-label')).includes(`letter ${letter} `));
              await page.locator('[data-action="match"]').click(); await screen('match'); await settled();
              assert((await page.locator('.match-prompt h1').textContent()).includes(letter === 'X' ? 'ends' : 'starts'));
              await page.locator(`[data-answer="${letter}"]`).click(); await screen('celebrate'); await settled();
              const expected = Math.max(2, index + 1);
              assert((await page.locator('.collection-heading').textContent()).includes(`${expected} of 26`));
              await page.locator('[data-action="home"]').last().click(); await screen('home'); await settled();
            }
            assert.equal(await page.locator('.visited').count(), 26, 'All A–Z sounds are reachable and collectible');
            await page.locator('[data-letter="Z"]').focus(); await page.keyboard.press('ArrowRight');
            assert.equal(await page.locator(':focus').getAttribute('data-letter'), 'A');
            console.log('PASS Silk A–Z: 26 real listen/match/celebrate rounds, full collection, X ending, keyboard wrap');
          }
          assert.deepEqual(errors, [], `${prefix}: browser errors`);
          assert.deepEqual(network, [], `${prefix}: attempted network requests`);
          assert.deepEqual(missing, [], `${prefix}: missing local assets`);
          console.log(`PASS ${prefix}: palette persistence, home/activity/reward, 60px targets, offline, reduced motion`);
        } finally {await context.close();}
      }
    }
    console.log(`PASS Ribbon Road and chooser; screenshots: ${shots}`);
  } finally {await browser.close();}
}
run().catch(error => {console.error(error); process.exitCode = 1;});
