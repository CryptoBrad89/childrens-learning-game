/* The collection pop-up's Close button closes it. Letter Post and Moonboat open the
 * whole collection in a pop-up on laptops and up; at each size and in every theme a
 * real mouse click on Close (no Escape, no tap outside) must shut it and put focus
 * back on the collection button. Nothing may sit on top of Close. At 768x1024 a real
 * touch tap on Close does the same. Escape and a tap outside still close it too.
 * Ribbon Road has no pop-up (its collection sits on the home); that is checked too.
 * A signed-in child is set up on this device only (no network, no account).
 *   CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/close_button.mjs
 * CLOSE_SHOTS=dir saves a screenshot of every open pop-up and Ribbon Road home. */
import fs from 'node:fs';
import path from 'node:path';
import {playwright, launchOptions, serveGame} from './accounts/harness.mjs';

const shots = process.env.CLOSE_SHOTS || '';
const SIZES = [[1024, 576], [1366, 768], [768, 1024], [1920, 1080], [1440, 900]];
const TABLET = '768x1024';
const GAMES = [['post', 'v1-letter-post'], ['space', 'v3-moonboat']];
const id = 'close-kid', person = {id, login: 'close-kid', name: 'Close', avatar: 'cat:0', role: 'child', lastUsed: 1, played: true};
const data = {snap: {settings: {}, agg: {post: {A: {n: 1, clean: 1, first: 1}}}, badges: {}}, pending: [], localBadges: {}};

const web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
if (shots) fs.mkdirSync(shots, {recursive: true});
let cases = 0;
const problems = [];
async function open(kind, slug, width, height, theme, touch = false) {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion: 'reduce', hasTouch: touch});
  await context.addInitScript(({id, person, data, kind, theme}) => {
    localStorage.setItem('lw:people', JSON.stringify({[id]: person}));
    localStorage.setItem('lw:data:' + id, JSON.stringify(data));
    sessionStorage.setItem('lw:active', id);
    localStorage.setItem('lw:outbox', JSON.stringify([{n: 'close', actor: id, profile: id, field: 'theme_' + kind, v: theme, t: Date.now() + 1e9}]));
  }, {id, person, data, kind, theme});
  await context.route(/supabase\.co/, route => route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${web.url}/${slug}/index.html`);
  await page.waitForSelector('[data-letter]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  return {context, page, errors};
}
const isOpen = page => page.evaluate(() => !!document.querySelector('.collection-sheet.open'));
async function openSheet(page) {
  await page.locator('.collection-summary').click();
  await page.waitForSelector('.collection-sheet.open');
}
// Whatever is under the middle and four inner points of Close: all must be Close.
const blockers = page => page.evaluate(() => {
  const b = document.querySelector('.collection-sheet.open .sheet-close').getBoundingClientRect(), out = [];
  for (const [fx, fy] of [[.5, .5], [.3, .3], [.7, .3], [.3, .7], [.7, .7]]) {
    const el = document.elementFromPoint(b.left + b.width * fx, b.top + b.height * fy);
    if (!el?.closest('.sheet-close')) out.push(el ? el.tagName.toLowerCase() + '.' + [...el.classList].join('.') : 'nothing');
  }
  return [...new Set(out)];
});
const centre = page => page.evaluate(() => { const b = document.querySelector('.sheet-close').getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height / 2}; });
// Shut within a second, with focus back on the collection button (a tap outside
// leaves focus where the tap landed, as on any page).
async function closed(page, how, focus = true) {
  try { await page.waitForFunction(() => !document.querySelector('.collection-sheet.open'), null, {timeout: 1000}); }
  catch { return [`${how} didn't close the pop-up`]; }
  const state = await page.evaluate(() => ({focus: document.activeElement?.matches('.collection-summary'), expanded: document.querySelector('.collection-summary').getAttribute('aria-expanded')}));
  const out = [];
  if (focus && !state.focus) out.push(`after ${how}, focus isn't on the collection button`);
  if (state.expanded !== 'false') out.push(`after ${how}, the collection button still says it's open`);
  return out;
}
try {
  for (const [kind, slug] of GAMES) for (const [width, height] of SIZES) for (let theme = 0; theme < 3; theme++) {
    const size = `${width}x${height}`, label = `${slug} ${size} theme ${theme}`, out = [];
    let {context, page, errors} = await open(kind, slug, width, height, theme);
    await openSheet(page);
    if (shots) await page.screenshot({path: path.join(shots, `popup-${slug}-${size}-t${theme}.png`)});
    const over = await blockers(page);
    if (over.length) out.push(`Close is covered by ${over.join(', ')}`);
    // A real mouse click on the middle of Close: no forcing, no Escape, no tap outside.
    const c = await centre(page);
    await page.mouse.click(c.x, c.y);
    out.push(...await closed(page, 'clicking Close'));
    let how = 'click';
    // The other ways out still work.
    if (await isOpen(page)) { await page.keyboard.press('Escape'); await closed(page, 'reset'); }
    await openSheet(page); await page.keyboard.press('Escape'); out.push(...await closed(page, 'Escape'));
    await openSheet(page); await page.mouse.click(8, height - 8); out.push(...await closed(page, 'tapping outside', false));
    if (errors.length) out.push('page errors: ' + errors.join('; '));
    await context.close();
    // A tablet: a real touch tap on Close.
    if (size === TABLET) {
      ({context, page, errors} = await open(kind, slug, width, height, theme, true));
      await page.locator('.collection-summary').tap(); await page.waitForSelector('.collection-sheet.open');
      const t = await centre(page);
      await page.touchscreen.tap(t.x, t.y);
      out.push(...await closed(page, 'a touch tap on Close'));
      if (errors.length) out.push('page errors (touch): ' + errors.join('; '));
      await context.close();
      how = 'click and touch tap';
    }
    if (out.length) problems.push(`${label}: ${[...new Set(out)].join(' | ')}`);
    else console.log(`PASS ${label} (${how})`);
    cases++;
  }
  // Ribbon Road keeps its collection on the home: no pop-up, so no Close button.
  for (const [width, height] of SIZES) for (let theme = 0; theme < 3; theme++) {
    const {context, page, errors} = await open('silk', 'v4-ribbon-road', width, height, theme);
    const label = `v4-ribbon-road ${width}x${height} theme ${theme}`, out = [];
    const state = await page.evaluate(() => ({sheet: document.querySelectorAll('.collection-sheet,.sheet-close,.collection-summary').length, home: !!document.querySelector('.home .collection-slots')}));
    if (state.sheet) out.push('has a pop-up or Close button: add it to this test');
    if (!state.home) out.push('no collection on the home');
    if (shots) await page.screenshot({path: path.join(shots, `home-v4-ribbon-road-${width}x${height}-t${theme}.png`)});
    if (errors.length) out.push('page errors: ' + errors.join('; '));
    if (out.length) problems.push(`${label}: ${out.join(' | ')}`);
    else console.log(`PASS ${label} (no pop-up; collection on the home)`);
    cases++;
    await context.close();
  }
} finally { await browser.close(); await web.close(); }
if (problems.length) { console.error(problems.join('\n')); console.error(`FAIL close button: ${problems.length} of ${cases} cases`); process.exitCode = 1; }
else console.log(`PASS close button: ${cases} cases, Close shuts the pop-up on a click (and a touch tap on a tablet) and focus goes back to the collection button`);
