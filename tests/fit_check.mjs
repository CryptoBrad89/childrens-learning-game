/* Item A and B: the Letter Post and Moonboat homes fit laptop, Chromebook, portrait
 * tablet and whiteboard screens with no page scroll, in every theme, and the done
 * badges are clear of the letter, its caption and the neighbouring cards. Ribbon Road
 * is checked for its badges only (its layout is unchanged). Phones keep scrolling.
 * A signed-in child is set up on this device only (no network, no account).
 *   CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/fit_check.mjs
 * FIT_SHOTS=dir saves a screenshot of every case. FIT_SIZES=1024x576 limits sizes. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {playwright, launchOptions, serveGame} from './accounts/harness.mjs';

const shots = process.env.FIT_SHOTS || '';
const all = [[1024, 576], [1366, 768], [768, 1024], [1920, 1080], [1440, 900], [390, 844]];
const sizes = process.env.FIT_SIZES ? process.env.FIT_SIZES.split(',').map(s => s.split('x').map(Number)) : all;
const GAMES = [['post', 'v1-letter-post', 3], ['space', 'v3-moonboat', 3], ['silk', 'v4-ribbon-road', 3]];
// Done letters, saved from three different games: every game shows all of them.
const DONE = {post: 'ABCDEFG', space: 'HIJKL', silk: 'MNOPQR'};
export function fixture(id = 'fit-kid') {
  const cell = {n: 1, clean: 1, first: 1};
  const agg = Object.fromEntries(Object.entries(DONE).map(([w, ls]) => [w, Object.fromEntries([...ls].map(l => [l, cell]))]));
  return {id, person: {id, login: 'fit-kid', name: 'Fit', avatar: 'cat:0', role: 'child', lastUsed: 1, played: true},
    data: {snap: {settings: {}, agg, badges: {}}, pending: [], localBadges: {}}};
}

const web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
if (shots) fs.mkdirSync(shots, {recursive: true});
let cases = 0;
const problems = [];
try {
  for (const [kind, slug, themes] of GAMES) for (const [width, height] of sizes) for (let theme = 0; theme < themes; theme++) {
    const context = await browser.newContext({viewport: {width, height}, reducedMotion: 'reduce'});
    const f = fixture();
    await context.addInitScript(({f, kind, theme}) => {
      localStorage.setItem('lw:people', JSON.stringify({[f.id]: f.person}));
      localStorage.setItem('lw:data:' + f.id, JSON.stringify(f.data));
      sessionStorage.setItem('lw:active', f.id);
      localStorage.setItem('lw:outbox', JSON.stringify([{n: 'fit', actor: f.id, profile: f.id, field: 'theme_' + kind, v: theme, t: Date.now() + 1e9}]));
    }, {f, kind, theme});
    await context.route(/supabase\.co/, route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${web.url}/${slug}/index.html`);
    await page.waitForSelector('[data-letter]');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const label = `${slug} ${width}x${height} theme ${theme}`;
    const report = await page.evaluate(({kind}) => {
      const out = [], vw = innerWidth, vh = innerHeight, wide = vw >= 700, paged = kind !== 'silk' && wide;
      const r = el => el.getBoundingClientRect();
      const inside = (b, what) => { if (b.left < -0.5 || b.top < -0.5 || b.right > vw + 0.5 || b.bottom > vh + 0.5) out.push(`${what} is cut off (${Math.round(b.left)},${Math.round(b.top)} → ${Math.round(b.right)},${Math.round(b.bottom)})`); };
      const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      const textBox = el => { const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()]; };
      if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls sideways');
      const cards = [...document.querySelectorAll('[data-letter]')].filter(b => !b.hidden && b.offsetParent);
      if (paged) {
        if (document.documentElement.scrollHeight > vh + 1) out.push(`page scrolls (${document.documentElement.scrollHeight} > ${vh})`);
        const title = document.querySelector('.home h1');
        inside(r(title), 'title');
        if (r(title).top > vh * 0.45 && vw > vh) out.push('title is not at the top');
        for (const b of cards) inside(r(b), 'letter ' + b.dataset.letter);
        for (const el of document.querySelectorAll('.page-arrow,.page-label,.collection-summary,#header .tool,#header .theme-control,.lw-profile,#footer a')) {
          if (!el.offsetParent || getComputedStyle(el).display === 'none') continue;
          inside(r(el), el.className || el.id || el.textContent.trim());
          for (const b of cards) if (hit(r(el), r(b))) out.push(`${el.className} overlaps letter ${b.dataset.letter}`);
        }
        for (const el of document.querySelectorAll('.page-arrow')) if (el.offsetParent && (r(el).width < 64 || r(el).height < 64)) out.push('page arrow under 64px');
        const shown = cards.map(b => b.dataset.letter), pages = document.querySelector('.paged')?.dataset.pages;
        if (!shown.length) out.push('no letters on screen');
        if (pages === 'many' && !/page 1 of \d/.test(document.querySelector('.page-label').textContent)) out.push('no page label');
        if (document.querySelector('.home .collection-slots') && getComputedStyle(document.querySelector('.collection-sheet')).display !== 'none') out.push('collection takes room on the home screen');
      }
      for (const b of cards) {
        const box = r(b);
        if (box.width < 60 || box.height < 60) out.push(`letter ${b.dataset.letter} is small (${Math.round(box.width)}×${Math.round(box.height)})`);
        const badge = b.querySelector('.done-badge');
        const done = b.classList.contains('is-done');
        if (done !== !!badge) out.push(`letter ${b.dataset.letter}: badge and done state disagree`);
        if (done && b.querySelector('.pick-caption').textContent !== 'Done') out.push(`letter ${b.dataset.letter}: caption isn't Done`);
        if (!badge) continue;
        const bb = r(badge);
        const want = innerWidth >= 1500 && innerHeight >= 900 ? 44 : innerWidth < 700 ? 32 : 36;
        if (Math.round(bb.width) < want - 1) out.push(`badge on ${b.dataset.letter} is ${Math.round(bb.width)}px, want ${want}`);
        if (getComputedStyle(badge.querySelector('circle')).fill !== 'rgb(23, 107, 58)') out.push('badge is not #176b3a');
        for (const t of textBox(b.querySelector('.pick-glyph'))) if (hit(bb, t)) out.push(`badge covers letter ${b.dataset.letter}`);
        for (const t of textBox(b.querySelector('.pick-caption'))) if (hit(bb, t)) out.push(`badge covers caption of ${b.dataset.letter}`);
        for (const other of cards) if (other !== b && hit(bb, r(other))) out.push(`badge on ${b.dataset.letter} covers letter ${other.dataset.letter}`);
        if (paged) inside(bb, 'badge on ' + b.dataset.letter);
        if (parseFloat(getComputedStyle(b).opacity) < 1) out.push(`letter ${b.dataset.letter} is faded`);
      }
      const doneShown = cards.filter(b => b.classList.contains('is-done')).map(b => b.dataset.letter);
      return {out, doneShown, pages: document.querySelector('.paged')?.dataset.pages || null, label: document.querySelector('.page-label')?.textContent || ''};
    }, {kind});
    // Every saved letter, from any game, is done here (only those on screen are checked).
    for (const l of report.doneShown) assert(Object.values(DONE).join('').includes(l), `${label}: ${l} shown done but never answered`);
    if (shots) await page.screenshot({path: path.join(shots, `${slug}-${width}x${height}-t${theme}.png`)});
    if (errors.length) report.out.push('page errors: ' + errors.join('; '));
    if (report.out.length) problems.push(`${label}: ${[...new Set(report.out)].join(' | ')}`);
    else console.log(`PASS ${label}${report.pages ? ` (${report.pages === 'many' ? report.label : 'one page'})` : ''}`);
    cases++;
    await context.close();
  }
} finally { await browser.close(); await web.close(); }
if (problems.length) { console.error(problems.join('\n')); console.error(`FAIL fit: ${problems.length} of ${cases} cases`); process.exitCode = 1; }
else console.log(`PASS fit: ${cases} cases, letters on screen with no page scroll and clear done badges`);
