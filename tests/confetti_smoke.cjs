'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try {return require('playwright');} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}
(async () => {
  const shots = '/tmp/confetti-shots';
  fs.mkdirSync(shots, {recursive: true});
  const browser = await playwright().chromium.launch({headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  let cases = 0;
  try {
    for (const game of ['v1-letter-post', 'v3-moonboat', 'v4-silk-thread']) {
      for (const viewport of [{width: 390, height: 844}, {width: 1920, height: 1080}]) {
        for (let theme = 0; theme < 3; theme++) {
          const context = await browser.newContext({viewport, reducedMotion: 'no-preference'});
          const errors = [], network = [];
          await context.route(/^https?:/, route => {network.push(route.request().url()); return route.abort();});
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(error.message));
          const screen = value => page.waitForFunction(value => document.body.dataset.screen === value, value);
          const settled = () => page.waitForFunction(() => !document.body.dataset.effect && !document.body.classList.contains('talking'));
          const prefix = `${game}-${viewport.width}-theme${theme}`;
          try {
            await page.goto(pathToFileURL(path.resolve(__dirname, '..', game, 'index.html')).href);
            await screen('home');
            await page.selectOption('#theme', String(theme)); await settled();
            await page.locator('#mute').click();
            await page.locator('[data-letter="B"]').click(); await screen('listen'); await settled();
            await page.locator('[data-action="match"]').click(); await screen('match');
            await page.locator('[data-answer="B"]').click(); await screen('celebrate');
            await page.waitForFunction(() => [...document.querySelectorAll('#confetti [data-paper]')].filter(node => {
              const rect = node.getBoundingClientRect();
              return Number(getComputedStyle(node).opacity) >= .85 && rect.width >= 14 && rect.height >= 14 &&
                rect.x >= 0 && rect.right <= innerWidth && rect.y >= 0 && rect.bottom <= innerHeight;
            }).length >= 14);
            const sample = () => page.locator('#confetti [data-paper]').evaluateAll(nodes => nodes.map(node => {
              const rect = node.getBoundingClientRect(), svg = node.querySelector('svg');
              const painted = svg && [...svg.querySelectorAll('path,rect,circle,ellipse,polygon')].some(part => {
                const style = getComputedStyle(part);
                return (style.fill !== 'none' && style.fill !== 'rgba(0, 0, 0, 0)') ||
                  (style.stroke !== 'none' && style.stroke !== 'rgba(0, 0, 0, 0)');
              });
              return {shape: node.dataset.paper, painted: Boolean(painted), x: rect.x, y: rect.y,
                width: rect.width, height: rect.height, opacity: Number(getComputedStyle(node).opacity)};
            }));
            const first = await sample();
            assert.equal(first.length, 24, `${prefix}: bounded paper confetti pieces`);
            const expectedShapes = game === 'v1-letter-post' ? ['curl', 'envelope', 'heart', 'stamp'] : game === 'v4-silk-thread' ? ['curl', 'heart', 'star'] : ['crescent', 'curl', 'planet', 'star'];
            assert.deepEqual([...new Set(first.map(piece => piece.shape))].sort(), expectedShapes, `${prefix}: world-themed shape variety`);
            assert(first.filter(piece => piece.width >= (viewport.width === 390 ? 64 : 100)).length >= 4,
              `${prefix}: clearly large hero pieces`);
            const motionBudget = await page.locator('#confetti [data-paper]').evaluateAll(nodes => {
              const allowed = new Set(['offset', 'computedOffset', 'easing', 'composite', 'transform', 'opacity']);
              return {duration: nodes.map(node => node.getAnimations()[0].effect.getTiming().duration),
                filters: nodes.flatMap(node => [...node.querySelectorAll('svg')].map(svg => getComputedStyle(svg).filter)),
                expensive: nodes.flatMap(node => node.getAnimations({subtree: true}).flatMap(animation =>
                  animation.effect.getKeyframes().flatMap(frame => Object.keys(frame).filter(key => !allowed.has(key))))) };
            });
            assert(motionBudget.duration.every(duration => duration >= 3000 && duration <= 4000), `${prefix}: slow readable descent`);
            assert(motionBudget.filters.every(filter => filter === 'none'), `${prefix}: no per-piece SVG filters`);
            assert.deepEqual(motionBudget.expensive, [], `${prefix}: animate compositor properties only`);
            assert(first.every(piece => piece.painted), `${prefix}: SVG paper must have painted color`);
            await page.waitForTimeout(120);
            const second = await sample();
            const falling = second.map((piece, index) => ({dx: piece.x - first[index].x, dy: piece.y - first[index].y}));
            assert(falling.filter(delta => delta.dy > 1).length >= 8, `${prefix}: paper falls visibly`);
            assert(new Set(falling.map(delta => Math.round(delta.dx))).size >= 4, `${prefix}: pieces flutter independently`);
            const fades = await page.locator('#confetti [data-paper]').evaluateAll(nodes => nodes.every(node =>
              node.getAnimations().some(animation => {
                const frames = animation.effect.getKeyframes();
                return frames[0].opacity === '0' && frames.at(-1).opacity === '0' && animation.effect.getTiming().iterations === Infinity;
              })));
            assert(fades, `${prefix}: every piece fades across a recycled flight`);
            await page.waitForFunction(() => {
              const piece = document.querySelector('#confetti [data-paper]');
              const animation = piece?.getAnimations()[0];
              return animation && animation.currentTime >= animation.effect.getTiming().duration * .42;
            });
            if (!process.env.NO_SCREENSHOTS) await page.screenshot({path: path.join(shots, `${prefix}-mid-fall.png`)});
            const originalPieces = await page.locator('#confetti [data-paper]').elementHandles();
            await page.waitForTimeout(8100);
            assert((await Promise.all(originalPieces.map(piece => piece.evaluate(node => node.isConnected)))).every(Boolean),
              `${prefix}: existing pieces are recycled`);
            assert.equal(await page.locator('#confetti [data-paper]').count(), 24, `${prefix}: paper stays capped after multiple flights`);
            const later = await sample();
            assert(later.filter(piece => piece.opacity >= .85 && piece.y >= 0 && piece.y < viewport.height).length >= 8,
              `${prefix}: visible paper continues after the reward finishes`);
            await page.locator('[data-action="reward-replay"]').click(); await settled();
            assert.equal(await page.locator('#confetti [data-paper]').count(), 24, `${prefix}: replay preserves the rain`);
            await page.selectOption('#theme', String((theme + 1) % 3)); await settled();
            assert.equal(await page.locator('#confetti [data-paper]').count(), 24, `${prefix}: theme changes preserve the rain`);
            const tones = await page.locator('#confetti [data-paper]').evaluateAll(nodes => {
              const probe = document.createElement('span');probe.style.color = 'var(--accent)';document.body.append(probe);
              const expected = getComputedStyle(probe).color;probe.remove();
              return {actual: getComputedStyle(nodes[0].querySelector('path')).fill, expected};
            });
            assert.equal(tones.actual, tones.expected, `${prefix}: current theme paints the rain`);
            if (theme === 0) {
              await page.evaluate(() => {
                Object.defineProperty(document, 'hidden', {configurable: true, value: true});
                document.dispatchEvent(new Event('visibilitychange'));
              });
              await page.waitForTimeout(80);
              const paused = await sample();
              await page.waitForTimeout(180);
              const stillPaused = await sample();
              assert(stillPaused.every((piece, index) => Math.abs(piece.y - paused[index].y) < .1), `${prefix}: hidden page pauses rain`);
              await page.evaluate(() => {
                delete document.hidden;
                document.dispatchEvent(new Event('visibilitychange'));
              });
              await page.waitForTimeout(180);
              const resumed = await sample();
              assert(resumed.some((piece, index) => Math.abs(piece.y - stillPaused[index].y) > 1), `${prefix}: visible page resumes rain`);
            }
            if (theme === 1) {
              await page.emulateMedia({reducedMotion: 'reduce'});
              await page.waitForFunction(() => !document.querySelector('#confetti [data-particle]'));
              assert.equal(await page.locator('[data-particle]').count(), 0, 'Reduced motion clears every decorative particle');
            }
            await page.locator('[data-action="next"]').click(); await screen('listen');
            assert.equal(await page.locator('#confetti [data-particle]').count(), 0, 'Confetti never leaks to the next route');
            assert.deepEqual(errors, [], `${prefix}: browser errors`);
            assert.deepEqual(network, [], `${prefix}: unexpected network requests`);
            cases++;
            console.log(`PASS ${prefix}: themed paper, independent fall/flutter, continuous recycling, replay, theme change and cleanup`);
          } finally {await context.close();}
        }
      }
    }
    console.log(`PASS ${cases} confetti cases; screenshots ${process.env.NO_SCREENSHOTS ? "disabled" : shots}`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
