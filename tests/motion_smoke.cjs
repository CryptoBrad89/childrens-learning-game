/* Real file:// journeys; all HTTP(S) requests are rejected, with no app/audio stubs. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const shots = '/tmp/lpmb-motion-shots';
function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try {return require('playwright');} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}
async function run() {
  fs.mkdirSync(shots, {recursive: true});
  const browser = await playwright().chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  let cases = 0;
  try {
    for (const game of ['v1-letter-post', 'v3-moonboat']) {
      for (const viewport of [{width: 390, height: 844}, {width: 768, height: 1024}, {width: 1920, height: 1080}]) {
        for (const reduced of [false, true]) {
          const context = await browser.newContext({viewport, reducedMotion: reduced ? 'reduce' : 'no-preference'});
          const network = [], errors = [];
          await context.route(/^https?:/, route => {network.push(route.request().url()); return route.abort();});
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(error.message));
          const prefix = `${game}-${viewport.width}-${reduced ? 'reduced' : 'motion'}`;
          const screen = name => page.waitForFunction(name => document.body.dataset.screen === name, name);
          const settled = () => page.waitForFunction(() => !document.body.dataset.effect && !document.body.classList.contains('talking'));
          const capture = async name => {
            await page.evaluate(() => Promise.allSettled(document.getAnimations()
              .filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished)));
            await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
            if (!process.env.NO_SCREENSHOTS) await page.screenshot({path: path.join(shots, `${prefix}-${name}.png`), fullPage: true});
          };
          async function animations(label, expectMotion = !reduced) {
            const result = await page.evaluate(() => {
              const allowed = new Set(['offset', 'computedOffset', 'easing', 'composite', 'transform', 'opacity', 'translate', 'rotate', 'scale', 'transformOrigin']);
              const active = document.getAnimations().filter(a => a.playState === 'running' && Number(a.effect.getTiming().duration) > 1);
              const violations = active.flatMap(a => a.effect.getKeyframes().flatMap(frame => Object.keys(frame).filter(key => !allowed.has(key))));
              const moving = active.filter(a => {
                const frames = a.effect.getKeyframes();
                return ['opacity', 'transform', 'translate', 'rotate', 'scale'].some(key => new Set(frames.map(f => f[key]).filter(v => v !== undefined)).size > 1);
              }).length;
              return {moving, active: active.length, violations, particles: document.querySelectorAll('[data-particle]').length};
            });
            assert.deepEqual(result.violations, [], `${prefix} ${label}: expensive animated property`);
            assert(result.particles <= 30, `${prefix} ${label}: unbounded decorative particles`);
            if (expectMotion) assert(result.moving > 0, `${prefix} ${label}: no visible movement`);
            else assert.equal(result.active, 0, `${prefix} ${label}: motion under reduced preference`);
          }
          async function stillOnHover(selector) {
            await page.mouse.move(0, 0);
            const node = page.locator(selector).first();
            const before = await node.boundingBox();
            await node.hover();
            await page.waitForTimeout(180);
            const after = await node.boundingBox();
            for (const key of ['x', 'y', 'width', 'height']) {
              assert(Math.abs(before[key] - after[key]) < .5, `${prefix}: reduced hover moves ${selector}`);
            }
          }
          async function fits(label) {
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.equal(overflow, false, `${prefix} ${label}: horizontal page overflow`);
          }
          try {
            await page.goto(pathToFileURL(path.join(root, game, 'index.html')).href);
            await screen('home'); await animations('home entrance'); await fits('home'); await capture('home');
            if (reduced) await stillOnHover('[data-letter="B"]');
            await page.locator('#mute').click();
            assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
            await page.locator('[data-letter="B"]').click();
            await screen('listen'); await animations('listen entrance'); await fits('listen'); await capture('listen'); await settled();
            if (reduced) await stillOnHover('.primary');
            await page.locator('.listen-letter').click(); await animations('sound replay'); await settled();
            await page.locator('[data-action="match"]').click(); await screen('match');
            await animations('choices entrance'); await fits('match'); await capture('match');
            if (reduced) await stillOnHover('.choice');
            await page.locator('.choice:not([data-answer="B"])').first().click();
            if (!reduced) {
              await page.waitForFunction(() => [...document.querySelectorAll('.choice')].some(node =>
                node.getAnimations().some(animation => animation.playState === 'running')));
              await animations('wrong choice');
            }
            await page.waitForFunction(() => [...document.querySelectorAll('.choice')].every(n => !n.hasAttribute('aria-disabled')));
            assert(await page.locator('.choice.tried').count());
            await page.locator('[data-answer="B"]').click();
            if (!reduced) {
              await page.waitForFunction(() => document.querySelector('[data-answer="B"]')?.getAnimations()
                .some(animation => animation.playState === 'running'));
              assert.equal(await page.locator('.collection-heading').count(), 0, 'Correct card celebrates before leaving the choices');
              await animations('correct card');
            }
            await screen('celebrate');
            await animations('reward'); await fits('reward'); await capture('reward'); await settled();
            assert((await page.locator('.collection-heading').textContent()).includes('1 of 26'));
            await page.locator('[data-action="reward-replay"]').click(); await animations('reward replay'); await settled();
            await page.locator('[data-action="next"]').click(); await screen('listen');
            await settled();
            await page.keyboard.press('Escape');
            if (!reduced) {
              await page.waitForFunction(() => document.querySelector('.screen')?.getAnimations().some(animation =>
                animation.playState === 'running' && animation.effect.getKeyframes().at(-1).opacity === '0'));
              await animations('screen exit');
            }
            await screen('home');
            await page.locator('[data-letter="A"]').click();
            await page.keyboard.press('Escape');
            await screen('home'); await settled();
            assert.equal(await page.locator('.listen-letter').count(), 0, 'Escape during a pending exit keeps the latest route');
            await page.locator('[data-letter="X"]').click(); await screen('listen');
            await page.keyboard.press('Escape'); await screen('home'); await settled();
            assert.equal(await page.locator('.listen-letter').count(), 0, 'Cancelled route must stay home');
            await page.locator('[data-letter="B"]').click(); await screen('listen'); await settled();
            await page.locator('.listen-letter').click();
            await page.emulateMedia({reducedMotion: 'reduce'});
            await page.waitForTimeout(80); await animations('live reduced toggle', false);
            assert.equal(await page.locator('[data-particle]').count(), 0, 'Reduce toggle must clear decorative particles');
            await page.locator('[data-action="match"]').click(); await screen('match');
            await animations('reduced choices', false);
            await page.locator('[data-answer="B"]').click(); await screen('celebrate');
            await animations('reduced reward', false); await fits('reduced reward');
            await page.selectOption('#theme', '1'); await animations('reduced theme', false);
            assert.deepEqual(errors, [], `${prefix}: browser errors`);
            assert.deepEqual(network, [], `${prefix}: local game attempted network access`);
            cases++; console.log(`PASS ${prefix}: entrances, replay, wrong/correct choice, reward, cancellation, live reduced motion`);
          } finally {await context.close();}
        }
      }
    }
    console.log(`PASS ${cases} motion cases; screenshots ${process.env.NO_SCREENSHOTS ? "disabled" : shots}`);
  } finally {await browser.close();}
}
run().catch(error => {
  fs.mkdirSync(shots, {recursive: true});
  fs.writeFileSync(path.join(shots, 'motion-error.txt'), `${error.stack || error}\n`);
  console.error(error); process.exitCode = 1;
});
