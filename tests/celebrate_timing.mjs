/* Measures how long the celebrate clip takes to start after a correct tap, in
 * every layout at a laptop, a portrait tablet and a whiteboard size. The page
 * is served over http (service worker on). Times come from the page's own
 * clock: the correct tap, the found-it page appearing, and the cheer clip's
 * `playing` event. Fails if the cheer starts more than CHEER_LIMIT_MS (default
 * 1500) after the tap, or more than 250ms after the found-it page shows.
 *   CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/celebrate_timing.mjs
 * Set CHEER_LIMIT_MS=0 to only report (used for the before numbers). */
import {playwright, launchOptions, serveGame} from './accounts/harness.mjs';

const LIMIT = Number(process.env.CHEER_LIMIT_MS ?? 1500);
const GAMES = [['Letter Post', 'v1-letter-post'], ['Moonboat', 'v3-moonboat'], ['Ribbon Road', 'v4-ribbon-road']];
const SIZES = [[1024, 576], [768, 1024], [1920, 1080]];
const web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
const rows = [];
let failed = 0;
try {
  for (const [name, slug] of GAMES) for (const [width, height] of SIZES) {
    for (const visit of ['first', 'repeat']) {
      const context = await browser.newContext({viewport: {width, height}});
      await context.addInitScript(() => {
        const log = window.__timing = [];
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          const src = this.currentSrc || this.src || '';
          log.push({kind: 'play', src, t: performance.now()});
          this.addEventListener('playing', () => log.push({kind: 'playing', src, t: performance.now()}), {once: true});
          this.addEventListener('ended', () => log.push({kind: 'ended', src, t: performance.now()}), {once: true});
          return play.call(this);
        };
        document.addEventListener('click', e => {
          const b = e.target.closest && e.target.closest('[data-answer]');
          if (b) log.push({kind: 'tap', answer: b.dataset.answer, t: performance.now()});
        }, true);
        new MutationObserver(() => {
          if (document.body && document.body.dataset.screen === 'celebrate' && !log.some(x => x.kind === 'page')) log.push({kind: 'page', t: performance.now()});
        }).observe(document, {attributes: true, subtree: true, attributeFilter: ['data-screen']});
      });
      const page = await context.newPage();
      // "first": a brand-new browser profile, nothing cached. "repeat": the same
      // profile loads the game a second time, so the offline copy is in place.
      await page.goto(`${web.url}/${slug}/index.html`);
      if (visit === 'repeat') {
        await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || performance.now() > 8000, null, {timeout: 15000}).catch(() => {});
        await page.reload();
      }
      await page.waitForSelector('[data-letter="A"]');
      await page.click('[data-letter="A"]');
      await page.waitForSelector('[data-action="match"]');
      await page.waitForTimeout(300);
      await page.click('[data-action="match"]');
      await page.waitForSelector('[data-answer="A"]');
      await page.waitForTimeout(300);
      await page.click('[data-answer="A"]');
      await page.waitForFunction(() => window.__timing.some(x => x.kind === 'playing' && /cheer/.test(x.src)), null, {timeout: 20000}).catch(() => {});
      const log = await page.evaluate(() => window.__timing);
      const tap = log.filter(x => x.kind === 'tap').at(-1), shown = log.find(x => x.kind === 'page');
      const cheer = log.find(x => x.kind === 'playing' && /cheer/.test(x.src));
      const row = {game: name, size: `${width}×${height}`, visit, tapToPage: shown && tap ? Math.round(shown.t - tap.t) : null,
        tapToCheer: cheer && tap ? Math.round(cheer.t - tap.t) : null, pageToCheer: cheer && shown ? Math.round(cheer.t - shown.t) : null,
        afterTap: log.filter(x => x.kind === 'play' && tap && x.t >= tap.t).map(x => x.src.split('/').pop())};
      rows.push(row);
      // The cheer must start with the found-it page, not after its animation.
      if (LIMIT && (row.tapToCheer == null || row.tapToCheer > LIMIT || row.pageToCheer > 250)) failed++;
      await context.close();
    }
  }
} finally { await browser.close(); await web.close(); }
console.log('| Game | Size | Visit | Tap → found-it page (ms) | Tap → cheer playing (ms) | Page → cheer (ms) | Clips started after the tap |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.game} | ${r.size} | ${r.visit} | ${r.tapToPage ?? '–'} | ${r.tapToCheer ?? 'never'} | ${r.pageToCheer ?? '–'} | ${r.afterTap.join(', ')} |`);
if (failed) { console.error(`FAIL celebrate timing: ${failed} run(s) slower than ${LIMIT}ms or no cheer`); process.exitCode = 1; }
else if (LIMIT) console.log(`PASS celebrate timing: the cheer starts within ${LIMIT}ms of the correct tap in all ${rows.length} runs`);
