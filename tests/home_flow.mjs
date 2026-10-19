/* The home flow after the splash: the sign-in dialog is the first interactive
 * thing (child first, "Play without saving", "Are you a grown-up?", no group
 * codes), play without saving warns that nothing is kept and saves nothing,
 * and the layout picker defaults to Ribbon Road and jumps straight into the
 * chosen game. Also the Letters with Lucy name on every screen. No screenshots.
 * Run: CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/home_flow.mjs */
import assert from 'node:assert/strict';
import {playwright, launchOptions, serveGame, backend, context, playRound, loginOpen, signInChild, fits, screen} from './accounts/harness.mjs';

const be = await backend(), web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
let passed = 0;
const ok = label => {passed++; console.log(`PASS ${label}`);};
const OLD_NAMES = /little\s*woof|silk|learning game/i;
const sizes = [{name: 'phone', width: 390, height: 844}, {name: 'chromebook', width: 1366, height: 768}, {name: 'whiteboard', width: 1920, height: 1080}];
const contexts = [];
const open = async (options = {}) => { const c = await context(browser, be, {reducedMotion: 'no-preference', ...options}); contexts.push(c); return c; };
const brand = page => page.evaluate(() => {
  const el = document.querySelector('.chrome-brand,.corner-brand,.brand'), box = el.getBoundingClientRect();
  return {text: el.textContent.replace(/\s+/g, ' ').trim(), left: box.left, top: box.top};
});

try {
  const room = await be.classroom({children: ['Mia']});
  const mia = room.kids[0];

  // ---- First visit: the splash, then the sign-in dialog and nothing else.
  {
    const ctx = await open(), page = await ctx.newPage();
    const rpc = [];
    page.on('request', r => { if (r.url().startsWith(be.url)) rpc.push(new URL(r.url()).pathname); });
    await page.goto(web.url + '/index.html');
    assert.equal(await page.evaluate(() => document.body.dataset.home), 'splash');
    assert(await page.locator('#splash').isVisible());
    assert.equal(await page.evaluate(() => document.querySelector('#login').open), false, 'The dialog waits for the splash');
    await loginOpen(page);
    assert(await page.locator('#splash').isHidden());
    assert(await page.evaluate(() => document.querySelector('#login').contains(document.activeElement)), 'Focus starts in the dialog');
    assert(await page.locator('nav').isHidden() && await page.locator('header').isHidden(), 'No world map behind the sign-in');
    const text = await page.locator('#login').innerText();
    assert.match(text, /Who's playing\?/);
    assert(!/\b(class|classroom|teacher|parent|student|board|code)\b/i.test(text), `Dialog stays free of group codes and roles: ${text}`);
    assert(await page.locator('#login-name').isVisible() && await page.locator('#login-pw').isVisible());
    assert.equal(await page.locator('#login-go').textContent(), 'Let\'s play');
    assert.equal(await page.locator('#play-unsaved').textContent(), 'Play without saving');
    assert.equal(await page.locator('#grown-link').textContent(), 'Are you a grown-up?');
    assert.equal(await page.locator('#grown-link').getAttribute('href'), 'grown-ups/index.html');
    const sizes2 = await page.evaluate(() => ['#login-go', '#play-unsaved', '#grown-link'].map(s => parseFloat(getComputedStyle(document.querySelector(s)).fontSize)));
    assert(sizes2[0] > sizes2[2] && sizes2[1] > sizes2[2], 'Signing in leads; the grown-up link is smaller');
    await page.keyboard.press('Escape');
    assert(await page.evaluate(() => document.querySelector('#login').open), 'Escape doesn\'t close the front door');
    const b = await brand(page);
    assert.match(b.text, /^Letters with Lucy\s*Little sounds\. Big discoveries\.$/); assert(b.left < 80 && b.top < 80, 'Name sits top left');
    assert.equal(await page.title(), 'Letters with Lucy');
    for (const size of sizes) { await page.setViewportSize(size); await fits(page, `sign-in dialog ${size.name}`); }
    await page.setViewportSize({width: 1366, height: 768});
    ok('first visit: splash, then the child-first sign-in dialog is the first interactive thing; no codes, a small grown-up link');

    // ---- Play without saving: one click, a clear warning, Ribbon Road ready.
    await page.locator('#play-unsaved').click();
    await page.waitForFunction(() => document.body.dataset.home === 'picker');
    assert(await page.locator('#guest-bar').isVisible());
    assert.equal(await page.locator('#guest-bar').getAttribute('role'), 'status');
    assert.match(await page.locator('#guest-bar').innerText(), /playing without saving[\s\S]*won't be kept/i);
    assert.deepEqual(await page.locator('nav a').evaluateAll(n => n.map(a => a.querySelector('strong').textContent)), ['Lucy’s Letter Post', 'Lucy’s Moonboat', 'Lucy’s Ribbon Road']);
    assert.deepEqual(await page.locator('nav a.is-default').evaluateAll(n => n.map(a => a.dataset.world)), ['silk']);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), 'v4-ribbon-road/index.html', 'Ribbon Road is focused');
    assert(await page.locator('nav a.is-default .pick-badge').isVisible());
    // The three layout cards are the whole choice: no separate "Play Ribbon Road" button.
    const extra = await page.evaluate(() => [...document.querySelectorAll('main a, main button')].filter(n => !n.closest('nav') && n.offsetParent && /ribbon|letter post|moonboat|play\b/i.test(n.textContent)).map(n => n.textContent.trim()));
    assert.deepEqual(extra, [], 'Only the three layout picks');
    for (const size of sizes) { await page.setViewportSize(size); await fits(page, `picker ${size.name}`); }
    await page.setViewportSize({width: 1366, height: 768});
    await page.keyboard.press('Enter');
    await page.waitForURL(/v4-ribbon-road\/index\.html$/);
    await screen(page, 'home');
    assert.match(await page.title(), /^Lucy's Ribbon Road · Letters with Lucy$/);
    assert.match((await brand(page)).text, /^Letters with Lucy\s*Little sounds\. Big discoveries\.$/);
    assert.match(await page.locator('#footer').innerText(), /Playing without saving/);
    await playRound(page, 'A');
    assert.match(await page.locator('.collection-heading').textContent(), /1 of 26 · this visit/);
    await page.selectOption('#theme', '2');
    const saved = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('lw:data:') || k === 'lw:outbox' || k.endsWith('-theme')));
    assert.deepEqual(saved, [], 'Nothing is saved, not even the color choice');
    assert.deepEqual(rpc, [], 'Nothing is sent');
    // Back home in the same visit: straight to the picker, no splash or dialog.
    await page.goto(web.url + '/index.html');
    await page.waitForFunction(() => document.body.dataset.home === 'picker');
    assert(await page.locator('#splash').isHidden());
    ok('play without saving: one click, a clear warning, Ribbon Road focused by default, straight into the game, nothing saved or sent');
  }

  // ---- Signed in: the picker defaults to Ribbon Road and jumps into the chosen game.
  {
    const ctx = await open(), page = await ctx.newPage();
    await page.goto(web.url + '/index.html');
    await loginOpen(page);
    await page.locator('#login-name').fill(mia.login);
    await page.locator('#login-pw').fill('wrong12');
    await page.locator('#login-go').click();
    await page.waitForFunction(() => /don't match/.test(document.querySelector('#login-error').textContent));
    await signInChild(page, web.url, mia.login, mia.password);
    assert(await page.locator('#guest-bar').isHidden());
    assert.equal(await page.locator('#playing-name').textContent(), 'Mia');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), 'v4-ribbon-road/index.html');
    await page.locator('nav a[data-world="space"]').click();
    await page.waitForURL(/v3-moonboat\/index\.html$/);
    await screen(page, 'home');
    assert.match(await page.locator('.collection-heading').textContent(), /yours to keep/);
    await page.goto(web.url + '/index.html');
    await page.waitForFunction(() => document.body.dataset.home === 'picker');
    assert.equal(await page.evaluate(() => document.querySelector('#login').open), false);
    // If a grown-up hides Ribbon Road, the first shown layout is the default instead.
    await be.rpc('lw_put_settings', {p_changes: [{profile: mia.id, field: 'games', v: ['post', 'space'], t: Date.now()}]}, room.teacher.token);
    await page.evaluate(() => window.LW.sync(window.LW.playerId()));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('nav a.is-default')?.dataset.world === 'post');
    assert.equal(await page.locator('nav a[data-world="silk"]').isHidden(), true);
    await be.rpc('lw_put_settings', {p_changes: [{profile: mia.id, field: 'games', v: ['post', 'space', 'silk'], t: Date.now()}]}, room.teacher.token);
    // I'm done brings the sign-in back, with Mia's picture.
    await page.locator('#done').click();
    await loginOpen(page);
    assert.deepEqual(await page.locator('#people .person .name').allTextContents(), ['Mia']);
    ok('signed in: picker with Ribbon Road focused, any layout jumps straight in; hidden Ribbon Road falls back; I\'m done returns to the sign-in');
  }

  // ---- A splash video added later plays to its end before the sign-in opens.
  {
    const ctx = await open(), page = await ctx.newPage();
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        const splash = document.querySelector('#splash');
        if (!splash || splash.querySelector('video')) return;
        const video = document.createElement('video');
        video.play = () => { setTimeout(() => video.dispatchEvent(new Event('ended')), 2500); return Promise.resolve(); };
        splash.append(video); observer.disconnect();
      }).observe(document, {childList: true, subtree: true});
    });
    await page.goto(web.url + '/index.html');
    await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(() => document.querySelector('#login').open), false, 'Still on the splash video');
    await loginOpen(page);
    ok('splash: a video placed in #splash later plays to its end, then the sign-in opens');
  }

  // ---- Reduced motion: a shorter, still splash.
  {
    const ctx = await open({reducedMotion: 'reduce'}), page = await ctx.newPage();
    const start = Date.now();
    await page.goto(web.url + '/index.html');
    await loginOpen(page);
    assert(Date.now() - start < 4000);
    assert.equal(await page.locator('.splash-name span').first().evaluate(n => getComputedStyle(n).animationName), 'none');
    ok('reduced motion: the splash is brief and still');
  }

  // ---- The name on every screen.
  {
    const ctx = await open(), page = await ctx.newPage();
    for (const [path, title] of [['/index.html', 'Letters with Lucy'], ['/grown-ups/index.html', 'Grown-ups\' corner · Letters with Lucy'],
      ['/v1-letter-post/index.html', 'Lucy’s Letter Post · Letters with Lucy'], ['/v3-moonboat/index.html', 'Lucy’s Moonboat · Letters with Lucy'],
      ['/v4-ribbon-road/index.html', 'Lucy\'s Ribbon Road · Letters with Lucy']]) {
      await page.goto(web.url + path);
      await page.waitForTimeout(300);
      assert.equal(await page.title(), title);
      assert.match((await brand(page)).text, /^Letters with Lucy\s*Little sounds\. Big discoveries\.$/, `${path}: name and tagline top left`);
      const visible = await page.evaluate(() => document.body.innerText + ' ' + document.title + ' ' + [...document.querySelectorAll('[aria-label],[alt],[title]')].map(n => n.getAttribute('aria-label') || n.getAttribute('alt') || n.getAttribute('title')).join(' '));
      assert(!OLD_NAMES.test(visible), `${path}: no old names (${(visible.match(OLD_NAMES) || [])[0]})`);
    }
    ok('name: Letters with Lucy and its tagline top left on the chooser, the corner and all three layouts; no old names anywhere visible');
  }

  for (const c of contexts) assert.deepEqual(c.errors, [], 'browser errors');
  console.log(`\n${passed} home flow checks passed (${be.mode} backend)`);
} finally {
  await browser.close(); await web.close(); await be.close();
}
