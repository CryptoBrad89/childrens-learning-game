/* Local Playwright check of the grown-ups' corner with real sign-in: the
 * door from the children's sign-in into a sign-in card that matches it (same
 * cream, ink and red; never a dark page), no way to make a grown-up account
 * there, sign-in refusal, every setting saved to the children's accounts, the
 * last-game and last-letter guards, reset, signing out, the reading gate for a
 * grown-up who stays signed in (and its three-miss pause), and the settings'
 * effect on the chooser and all three games. Also reduced motion and a device
 * set to dark mode. Runs against the local Supabase stand-in (or
 * LW_BACKEND=live). Only the game server and the backend are contacted. No
 * screenshots. */
'use strict';
const assert = require('node:assert/strict');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const viewports = [
  {name: 'phone', width: 390, height: 844},
  {name: 'tablet', width: 768, height: 1024},
  {name: 'chromebook', width: 1366, height: 768},
  {name: 'whiteboard', width: 1920, height: 1080}
];
async function run() {
  const H = await import('./accounts/harness.mjs');
  const be = await H.backend(), web = await H.serveGame();
  const browser = await H.playwright().chromium.launch(H.launchOptions());
  const room = await be.family({children: ['Mia', 'Leo']});
  const {grownup} = room, mia = room.kids.find(k => k.name === 'Mia');
  const allowed = [new URL(web.url).host, new URL(be.url).host];
  const fresh = async (viewport, options = {}) => {
    const context = await H.context(browser, be, {viewport, reducedMotion: 'no-preference', ...options});
    const strangers = [];
    context.on('request', r => { const host = new URL(r.url()).host; if (!allowed.includes(host)) strangers.push(r.url()); });
    const page = await context.newPage();
    const done = async label => {
      assert.deepEqual(context.errors, [], `${label}: browser errors`);
      assert.deepEqual(strangers, [], `${label}: only the game and its backend are contacted`);
      await context.close();
    };
    return {context, page, done};
  };
  const signIn = async (page, {keep = false, password = grownup.password} = {}) => {
    await page.locator('#signin-login').fill(grownup.login);
    await page.locator('#signin-password').fill(password);
    if (keep) await page.locator('#signin-keep').check();
    await page.locator('#signin-go').click();
  };
  const code = async page => (await page.locator('#challenge span').allTextContents()).map(word => WORDS.indexOf(word));
  const values = (page, id) => page.evaluate(i => window.GROWN_UPS.load(i), id);
  const server = async () => (await be.rpc('lw_child_state', {p_child: mia.id}, grownup.token)).settings;
  const settled = page => page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), null, {timeout: 5000});
  const cardLook = async (page, sel) => (await settled(page), page.evaluate(sel => {
    const card = document.querySelector(sel), css = n => getComputedStyle(n);
    const go = card.querySelector('button.go'), heading = card.querySelector('h2');
    return {page: css(document.body).backgroundColor, pattern: css(document.body).backgroundImage, card: css(card).backgroundColor,
      border: css(card).borderColor, radius: css(card).borderRadius, shadow: css(card).boxShadow, ink: css(heading).color,
      font: css(heading).fontFamily, go: css(go).backgroundColor, goInk: css(go).color, width: Math.round(card.getBoundingClientRect().width),
      brand: (() => { const b = document.querySelector('.chrome-brand').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top)]; })()};
  }, sel));
  try {
    for (const viewport of viewports) {
      const label = `grown-ups-${viewport.name}`;
      const {page, done} = await fresh(viewport);
      const big = viewport.width >= 1600 ? 72 : 60;
      // The chooser's sign-in dialog has a small, plain door for grown-ups.
      await page.goto(web.url + '/index.html');
      await H.loginOpen(page);
      const door = page.locator('#grown-link');
      assert.equal(await door.getAttribute('href'), 'grown-ups/index.html');
      assert.equal(await door.textContent(), 'Are you a grown-up?');
      await H.fits(page, `${label} chooser`);
      const kidLook = await cardLook(page, '#login');
      await door.click();
      await page.waitForFunction(() => document.body?.dataset.view === 'signin');
      await page.evaluate(() => document.fonts.ready);
      // The grown-ups' sign-in is the same card on the same page: no jump to a different world.
      assert(await page.evaluate(() => document.querySelector('#signin').open), 'The grown-up sign-in is a card like the children\'s');
      assert.deepEqual(await cardLook(page, '#signin'), kidLook, 'Same cream page, card, ink, red button, width and name top left as the children\'s sign-in');
      assert(await page.locator('#portal').isHidden(), 'The corner stays hidden until a grown-up signs in');
      assert(!(await page.evaluate(() => document.querySelector('#gate').open)), 'No reading gate before sign-in');
      // Nobody on the sign-in, a child included, can make a grown-up account.
      const signinText = await page.locator('#signin').innerText();
      assert(!/new account|make (my|an|your) account|sign up|create/i.test(signinText), `No sign-up on the grown-up sign-in: ${signinText}`);
      assert.equal(await page.locator('#signin input').count(), 3, 'Sign-in name, password and "stay signed in" only');
      assert.match(signinText, /A grown-up who already has an account adds you/);
      await H.fits(page, `${label} sign-in`);

      // A wrong password is refused; a child's account can't open the corner.
      await signIn(page, {password: 'not-it'});
      await page.waitForFunction(() => /don't match/.test(document.querySelector('#signin-status').textContent));
      await page.locator('#signin-login').fill(mia.login);
      await page.locator('#signin-password').fill(mia.password);
      await page.locator('#signin-go').click();
      await page.waitForFunction(() => /child's account/.test(document.querySelector('#signin-status').textContent));
      assert(await page.locator('#portal').isHidden());

      await signIn(page);
      await page.waitForFunction(() => document.body?.dataset.view === 'portal', null, {timeout: 20000});
      assert.equal(await page.evaluate(() => document.activeElement.id), 'title');
      assert.equal(await page.locator('#leave').textContent(), 'Sign out and go to the games');
      await page.waitForSelector('.kid-card');
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), kidLook.page, 'The corner keeps the cream page');
      // A simple admin: children, settings, progress, grown-ups, this device, you. No "playing as" or sync banners.
      assert.deepEqual(await page.locator('.panel h2').allTextContents(), ['Children', 'Settings', 'Progress', 'Grown-ups', 'This device', 'You']);
      const text = await page.locator('#portal').innerText();
      assert(!/playing as|signed in as|sync|upload|group|code|invite|class\b|teacher|parent|student/i.test(text), `No banners, groups or codes: ${text.match(/playing as|signed in as|sync|upload|group|code|invite|class\b|teacher|parent|student/i)}`);
      assert.deepEqual(await page.locator('.kid-card strong').allTextContents(), ['Leo', 'Mia']);
      assert.equal(await page.locator('#target').inputValue(), 'all', 'Settings start on all the children');
      await page.waitForTimeout(450);
      await H.fits(page, `${label} corner`, big);
      assert.equal(await page.locator('#letter-grid button[aria-pressed="true"]').count(), 26);
      assert.equal(await page.locator('[data-preset="all"]').getAttribute('aria-pressed'), 'true');

      // Every control saves straight away, for every child.
      await page.locator('label.row:has([data-setting="voice"])').click();
      await page.locator('#volume').fill('40');
      await page.locator('label.row:has([data-setting="effects"])').click();
      await page.locator('[data-preset="starter"]').click();
      await page.locator('.segments label:has(input[value="1"])').click();
      await page.locator('label.row:has([data-setting="calm"])').click();
      await page.locator('label.row:has([data-game="silk"])').click();
      await page.locator('label.row:has([data-setting="kidControls"])').click();
      await page.locator('#letter-grid [data-letter="T"]').click();
      const want = {voice: false, effects: false, calm: true, kidControls: false, volume: 40, letters: ['A', 'I', 'N', 'P', 'S'], hintAfter: 1, games: ['post', 'space']};
      for (const kid of room.kids) assert.deepEqual(await values(page, kid.id), want);
      assert.match(await page.locator('#save-status').textContent(), /^Saved for all 2 children\./);
      assert.equal(await page.locator('#volume-value').textContent(), '40%');
      assert.equal(await page.locator('#letter-count').textContent(), '5 of 26 letters in play: a i n p s.');
      assert.equal(await page.locator('[data-preset="starter"]').getAttribute('aria-pressed'), 'false');
      await H.waitSynced(page, await page.evaluate(() => window.LW.grownupId()));
      const saved = await server();
      assert.deepEqual(Object.fromEntries(Object.entries(want).map(([k]) => [k, saved[k].v])), want, 'Every setting reached the server');

      // The last game and the last letter can't be switched off.
      await page.locator('label.row:has([data-game="space"])').click();
      await page.locator('label.row:has([data-game="post"])').click();
      assert.deepEqual((await values(page, mia.id)).games, ['post']);
      assert(await page.locator('[data-game="post"]').isChecked());
      assert.match(await page.locator('#save-status').textContent(), /at least one game/);
      for (const letter of ['A', 'I', 'N', 'P', 'S']) await page.locator(`#letter-grid [data-letter="${letter}"]`).click();
      assert.deepEqual((await values(page, mia.id)).letters, ['S']);
      assert.equal(await page.locator('#letter-grid [data-letter="S"]').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('#save-status').textContent(), /at least one letter/);

      // Reset asks first; keeping cancels it.
      await page.locator('#reset').click();
      assert(await page.locator('#confirm').evaluate(n => n.open));
      await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
      await H.fits(page, `${label} dialog`);
      await page.locator('#confirm button[value="cancel"]').click();
      await page.waitForFunction(() => document.activeElement.id === 'reset');
      assert.deepEqual((await values(page, mia.id)).letters, ['S']);
      await page.locator('#reset').click();
      await page.locator('#confirm-reset').click();
      await page.waitForFunction(() => /back to how they started/.test(document.querySelector('#save-status').textContent));
      const defaults = await values(page, mia.id);
      assert.equal(defaults.letters.length, 26); assert.equal(defaults.calm, false); assert.equal(defaults.games.length, 3);
      assert.equal(await page.locator('#letter-grid button[aria-pressed="true"]').count(), 26);
      await H.waitSynced(page, await page.evaluate(() => window.LW.grownupId()));
      assert.equal((await server()).letters.v.length, 26);

      // Leaving signs out (this grown-up didn't choose to stay); the next visit needs a sign-in.
      await page.locator('#leave').click();
      await page.waitForURL(/\/index\.html$/);
      await page.goto(web.url + '/grown-ups/index.html');
      await page.waitForFunction(() => document.body?.dataset.view === 'signin');
      assert(await page.locator('#portal').isHidden(), 'Every visit starts signed out');
      await done(label);
      console.log(`PASS ${label}: matching sign-in card with no sign-up, refusal, simple corner, every setting saved, guards, reset, sign-out, layout`);
    }

    // A grown-up who stays signed in passes the reading gate; three misses pause it for ten seconds.
    {
      const {page, done} = await fresh(viewports[1]);
      await page.goto(web.url + '/grown-ups/index.html');
      await page.waitForFunction(() => document.body?.dataset.view === 'signin');
      await signIn(page, {keep: true});
      await page.waitForFunction(() => document.body?.dataset.view === 'portal', null, {timeout: 20000});
      assert.equal(await page.locator('#leave').textContent(), 'Lock and go to the games');
      await page.locator('#leave').click();
      await page.waitForURL(/\/index\.html$/);
      await page.clock.install();
      await page.goto(web.url + '/grown-ups/index.html');
      await page.waitForFunction(() => document.body?.dataset.view === 'gate');
      assert(await page.locator('#portal').isHidden());
      assert(await page.evaluate(() => document.querySelector('#gate').classList.contains('lw-dialog')), 'The gate is the same card too');
      assert.equal(await page.locator('#gate-name').textContent(), 'Sam Lee');
      await H.fits(page, 'gate');
      for (let miss = 0; miss < 3; miss++) {
        await page.waitForFunction(() => !document.querySelector('#keypad [disabled]') && [...document.querySelectorAll('#slots span')].every(s => !s.textContent));
        const right = await code(page);
        const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !right.includes(d)).slice(0, 3);
        for (const digit of wrong) await page.locator(`[data-digit="${digit}"]`).click();
        if (miss < 2) await page.clock.runFor(700);
      }
      assert(await page.locator('#keypad').evaluate(n => n.hasAttribute('data-paused')));
      assert.equal(await page.locator('#keypad button:disabled').count(), 9);
      assert.equal(await page.locator('#slots .filled').count(), 0, 'Slots clear when the pause starts');
      await page.keyboard.press(String((await code(page))[0]));
      assert.equal(await page.locator('#slots .filled').count(), 0, 'Keys do nothing while paused');
      await page.clock.runFor(9000);
      assert.equal(await page.locator('#keypad button:disabled').count(), 9);
      await page.clock.runFor(1100);
      assert.equal(await page.locator('#keypad button:disabled').count(), 0);
      for (const digit of await code(page)) await page.keyboard.press(String(digit));
      await page.waitForFunction(() => document.body?.dataset.view === 'portal');
      await page.locator('#signout').click();
      await page.waitForFunction(() => document.body?.dataset.view === 'signin');
      await done('gate');
      console.log('PASS gate: staying signed in brings the reading gate back, on the same card; three misses pause it for 10 seconds');
    }

    // Settings reach the chooser and every world, on the child's own device.
    await be.rpc('lw_put_settings', {p_changes: Object.entries({voice: false, effects: false, calm: true, kidControls: false, volume: 40,
      letters: ['S', 'A', 'T', 'P', 'I', 'N'], hintAfter: 1, games: ['post', 'silk']}).map(([field, v]) => ({profile: mia.id, field, v, t: Date.now()}))}, grownup.token);
    for (const viewport of [viewports[0], viewports[3]]) {
      const label = `worlds-${viewport.name}`;
      const {context, page, done} = await fresh(viewport);
      await context.addInitScript(() => {
        const volumes = window.__volumes = [];
        const setter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume').set;
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {set(v) {volumes.push(v); setter.call(this, v);}, get() {return 1;}});
        HTMLMediaElement.prototype.play = function () {setTimeout(() => this.dispatchEvent(new Event('ended')), 30); return Promise.resolve();};
      });
      await H.signInChild(page, web.url, mia.login, mia.password);
      await page.waitForFunction(() => window.GROWN_UPS.settings.calm === true);
      assert.deepEqual(await page.locator('nav a:visible').evaluateAll(n => n.map(a => a.dataset.world)), ['post', 'silk']);
      assert.equal(await page.locator('nav').evaluate(n => n.style.getPropertyValue('--worlds')), '2');
      assert(await page.evaluate(() => document.documentElement.hasAttribute('data-calm')));
      await H.fits(page, `${label} chooser`);
      for (const world of ['v1-letter-post', 'v3-moonboat', 'v4-ribbon-road']) {
        await page.goto(`${web.url}/${world}/index.html`);
        await page.waitForFunction(() => document.body?.dataset.screen === 'home');
        assert.deepEqual(await page.locator('.letter-list [data-letter]').evaluateAll(n => n.map(b => b.dataset.letter)), ['A', 'I', 'N', 'P', 'S', 'T']);
        assert(await page.locator('.controls').isHidden(), `${world}: children's buttons hidden`);
        assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.evaluate(() => window.Fun.evidence.reduced), true, `${world}: calm motion`);
        const before = Number((await page.locator('.collection-heading span').textContent()).split(' ')[0]);
        await H.fits(page, `${label} ${world} home`, 44, '.letter-list [data-letter],.primary,.secondary');
        await page.locator('.letter-list [data-letter="P"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'listen');
        assert.equal(await page.evaluate(() => window.__volumes.length), 0, `${world}: voice off plays nothing`);
        await page.locator('[data-action="match"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'match');
        await page.locator('.choice:not([data-answer="P"])').first().click();
        await page.waitForFunction(() => document.querySelector('[data-answer="P"]').classList.contains('hint'));
        await page.waitForFunction(() => [...document.querySelectorAll('.choice')].every(n => !n.hasAttribute('aria-disabled')));
        await page.locator('[data-answer="P"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'celebrate');
        assert.equal(await page.locator('#confetti [data-particle]').count(), 0, `${world}: no confetti in calm motion`);
        assert.match(await page.locator('.collection-heading').textContent(), before ? new RegExp(`${before} of 6`) : /1 of 6 · yours to keep/);
        await page.locator('[data-action="next"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'listen');
        assert((await page.locator('.listen-letter').getAttribute('aria-label')).includes('letter S '));
      }
      // Voice on: clips play at the chosen volume.
      await be.rpc('lw_put_settings', {p_changes: [{profile: mia.id, field: 'voice', v: true, t: Date.now()}]}, grownup.token);
      await page.goto(web.url + '/index.html');
      await page.evaluate(() => window.LW.sync(window.LW.playerId()));
      await page.goto(web.url + '/v1-letter-post/index.html');
      await page.waitForFunction(() => document.body?.dataset.screen === 'home');
      await page.locator('.letter-list [data-letter="A"]').click();
      await page.waitForFunction(() => window.__volumes.length >= 2);
      assert(await page.evaluate(() => window.__volumes.every(v => v === .4)), 'Voice volume applied in the browser');
      await be.rpc('lw_put_settings', {p_changes: [{profile: mia.id, field: 'voice', v: false, t: Date.now()}]}, grownup.token);
      await done(label);
      console.log(`PASS ${label}: hidden world, chosen letters, quiet start, hidden buttons, calm motion, one-miss hint and volume`);
    }

    // Reduced motion, and a device set to dark mode: the corner stays the same cream as the games.
    for (const options of [{reducedMotion: 'reduce'}, {colorScheme: 'dark'}]) {
      const label = `grown-ups-${options.reducedMotion ? 'reduced' : 'dark'}`;
      const {page, done} = await fresh(viewports[2], options);
      await page.goto(web.url + '/grown-ups/index.html');
      await page.waitForFunction(() => document.body?.dataset.view === 'signin');
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(250, 242, 223)', 'Cream, never a dark-blue page');
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#signin')).backgroundColor), 'rgb(255, 250, 240)');
      await signIn(page);
      await page.waitForSelector('.kid-card', {timeout: 20000});
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.panel')).backgroundColor), 'rgb(255, 250, 240)');
      if (options.reducedMotion) assert.equal(await page.locator('.stamp').evaluate(n => getComputedStyle(n).display), 'none');
      await done(label);
      console.log(`PASS ${label}: sign-in and corner render in the games' cream`);
    }
    console.log(`PASS grown-ups' corner (${be.mode} backend)`);
  } finally {await browser.close(); await web.close(); await be.close();}
}

run().catch(error => {console.error(error); process.exitCode = 1;});
