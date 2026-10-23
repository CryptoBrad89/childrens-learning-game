/* Accounts end to end in a real browser: a grown-up signs in to the corner
 * from the children's sign-in, adds children (one with an uploaded photo) and
 * picks their settings, and adds a second grown-up, who sees the same
 * children; a child signs in on a shared device (the grown-up shows their
 * pictures there), plays, earns a sticker and hands over; the gate guards a
 * grown-up who stays signed in; children can be taken off a list or deleted;
 * risky actions ask only for the grown-up's own password, for one child or a
 * selection (reset progress, new passwords).
 * No screenshots.
 * Run: CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_flow.mjs */
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {playwright, launchOptions, serveGame, backend, context, playRound, loginOpen, waitSynced, fits, screen} from './accounts/harness.mjs';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const be = await backend(), web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
const suffix = Date.now().toString(36);
let passed = 0;
const ok = label => {passed++; console.log(`PASS ${label}`);};
const sizes = [{name: 'phone', width: 390, height: 844}, {name: 'chromebook', width: 1366, height: 768}, {name: 'whiteboard', width: 1920, height: 1080}];
const portal = page => page.waitForFunction(() => document.body.dataset.view === 'portal', null, {timeout: 20000});
const status = (page, pattern) => page.waitForFunction(p => new RegExp(p).test(document.querySelector('#kids-status').textContent), pattern.source, {timeout: 20000});
async function signInCorner(page, login, password, {keep = false} = {}) {
  await page.waitForFunction(() => document.body.dataset.view === 'signin');
  await page.locator('#signin-login').fill(login);
  await page.locator('#signin-password').fill(password);
  if (keep) await page.locator('#signin-keep').check();
  await page.locator('#signin-go').click();
  await portal(page);
}
// A real photo-sized PNG (640×480, a two-color split), as a phone camera would hand over.
function png(width = 640, height = 480) {
  const crc = buf => { let c, n = -1; for (const b of buf) { c = (n ^ b) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; n = (n >>> 8) ^ c; } return (n ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = [];
  for (let y = 0; y < height; y++) { const row = Buffer.alloc(1 + width * 3); for (let x = 0; x < width; x++) row.set(x < width / 2 ? [246, 207, 101] : [37, 63, 101], 1 + x * 3); rows.push(row); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
}

try {
  const lee = {login: `lee-${suffix}`, password: 'lucy12'};
  await be.makeGrownup(lee.login, lee.password, 'Ms Lee');

  // ---- A grown-up on a laptop, from the children's sign-in.
  const laptop = await context(browser, be);
  const t = await laptop.newPage();
  await t.goto(web.url + '/index.html');
  await loginOpen(t);
  await t.locator('#grown-link').click();
  await signInCorner(t, lee.login, lee.password);
  assert(await t.locator('#kids-empty').isVisible());
  assert(await t.locator('#settings-empty').isVisible(), 'Settings wait for a first child');
  ok('corner: a grown-up (made with no public sign-up) signs in from the children\'s sign-in');

  for (const [name, pw, photo] of [['Mia', '7234mk', true], ['Leo', '7234lb', false]]) {
    await t.locator('#add-child').click();
    await t.locator('#form-fields input[name="name"]').fill(name);
    if (photo) {
      await t.locator('#photo-file').setInputFiles({name: 'mia.png', mimeType: 'image/png', buffer: png()});
      await t.waitForFunction(() => document.querySelector('#form-dialog-form').elements.photo.value.startsWith('data:image/jpeg'));
      assert.equal(await t.locator('#photo-preview .lw-avatar.photo img').count(), 1, 'The uploaded picture shows straight away');
      assert(await t.locator('#photo-clear').isVisible());
    } else {
      await t.locator('.picture-grid label:has(input[value="fox"])').click();
    }
    await t.locator('#form-fields input[name="password"]').fill(pw.slice(0, 4));
    await t.locator('#form-go').click();
    assert.match(await t.locator('#form-error').textContent(), /six characters/);
    await t.locator('#form-fields input[name="password"]').fill(pw);
    await t.locator('#form-go').click();
    await status(t, new RegExp(`^${name} is ready`));
  }
  const logins = await t.locator('.kid-card .login').allTextContents();
  assert.equal(logins.length, 2); assert.match(logins[0], /^leo-[a-z0-9]{3}$/); assert.match(logins[1], /^mia-[a-z0-9]{3}$/);
  assert.equal(await t.locator('.kid-card:has-text("Mia") .lw-avatar.photo img').count(), 1, 'Mia has the uploaded photo');
  assert.equal(await t.locator('.kid-card:has-text("Leo") .lw-avatar svg').count(), 1, 'Leo has a drawn picture');
  const leeToken = await be.token(lee.login, lee.password);
  const {children} = await be.rpc('lw_portal', {}, leeToken);
  const mia = children.find(c => c.name === 'Mia'), leo = children.find(c => c.name === 'Leo');
  assert.match(mia.picture, /^data:image\/jpeg;base64,/); assert(mia.picture.length < 60000, 'Shrunk before upload');
  assert.match(leo.avatar, /^fox:/); assert.equal(leo.picture, undefined);
  const cornerText = await t.locator('body').innerText();
  assert(!/\bcodes?\b|invite|group|class\b/i.test(cornerText), 'No groups or codes in the grown-ups\' corner');
  ok('corner: two children with readable sign-in names, one with an uploaded photo and one with a drawn picture; no groups or codes');

  // Settings for all the children, then for one child only.
  assert.equal(await t.locator('#target').inputValue(), 'all');
  await t.locator('[data-preset="starter"]').click();
  await t.locator('label.row:has([data-setting="calm"])').click();
  await t.waitForFunction(() => /Saved for all 2 children/.test(document.querySelector('#save-status').textContent));
  await waitSynced(t, await t.evaluate(() => window.LW.grownupId()));
  for (const s of Object.values(await be.rpc('lw_children_states', {}, leeToken))) {
    assert.deepEqual(s.settings.letters.v, ['A', 'I', 'N', 'P', 'S', 'T']);
    assert.equal(s.settings.calm.v, true);
  }
  await t.locator('.kid-card:has-text("Leo") [data-act="settings"]').click();
  assert.match(await t.locator('#target-note').textContent(), /Leo only/);
  // There is no hint setting any more ("Help when stuck" is gone).
  assert.equal(await t.locator('[data-setting="hintAfter"],#hint').count(), 0);
  await t.locator('label.row:has([data-setting="effects"])').click();
  await waitSynced(t, await t.evaluate(() => window.LW.grownupId()));
  assert.equal((await be.rpc('lw_child_state', {p_child: leo.id}, leeToken)).settings.effects.v, false);
  assert.equal((await be.rpc('lw_child_state', {p_child: mia.id}, leeToken)).settings.effects, undefined);
  for (const size of sizes) { await t.setViewportSize(size); await fits(t, `corner ${size.name}`, size.width >= 1600 ? 72 : 60); }
  await t.setViewportSize({width: 1366, height: 768});
  ok('corner: settings for all the children and for one child reach the server');

  // Only a signed-in grown-up makes another grown-up, who looks after the same children.
  const dev = {login: `dev-${suffix}`, password: 'grown1'};
  await t.locator('#add-grownup').click();
  await t.locator('#form-fields input[name="name"]').fill('Dev');
  await t.locator('#form-fields input[name="login"]').fill(dev.login);
  await t.locator('#form-fields input[name="password"]').fill(dev.password);
  assert(await t.locator('#form-go').isDisabled(), 'Adding a grown-up waits for your own password');
  await t.locator('#mine').fill('not-mine');
  await t.locator('#form-go').click();
  await t.waitForFunction(() => /isn't your password/.test(document.querySelector('#form-error').textContent));
  assert.equal(await t.locator('#mine').inputValue(), '', 'A wrong password is cleared for another try');
  await t.locator('#mine').fill(lee.password);
  await t.locator('#form-go').click();
  await status(t, new RegExp(`Dev can sign in now as ${dev.login}`));
  assert.match(await t.locator('#grownup-list').innerText(), /Dev[\s\S]*you added them/);
  const second = await context(browser, be);
  const d = await second.newPage();
  await d.goto(web.url + '/grown-ups/index.html');
  await signInCorner(d, dev.login, dev.password);
  await d.waitForSelector('.kid-card');
  assert.deepEqual(await d.locator('.kid-card strong').allTextContents(), ['Leo', 'Mia']);
  assert.match(await d.locator('#grownup-list').innerText(), /Ms Lee/);
  await d.locator('#add-child').click();
  await d.locator('#form-fields input[name="name"]').fill('Ivy');
  await d.locator('#form-fields input[name="password"]').fill('7234iv');
  await d.locator('#form-go').click();
  await status(d, /^Ivy is ready/);
  await t.reload(); await portal(t);
  await t.waitForFunction(() => document.querySelectorAll('.kid-card').length === 3, null, {timeout: 20000});
  ok('grown-ups: a signed-in grown-up adds another; they see the same children and a child either adds shows for both');

  // ---- A shared Chromebook: nobody has played here yet. The sign-in dialog comes first.
  const cb = await context(browser, be);
  const c = await cb.newPage();
  await c.goto(web.url + '/index.html');
  await loginOpen(c);
  assert(await c.locator('nav').isHidden(), 'Worlds wait until someone is playing');
  assert(await c.locator('#tiles-wrap').isHidden(), 'No pictures yet on this device');
  for (const size of sizes) { await c.setViewportSize(size); await fits(c, `sign-in dialog ${size.name}`); }
  // The grown-up shows the children's pictures on this device from the corner.
  await c.locator('#grown-link').click();
  await signInCorner(c, lee.login, lee.password);
  await c.waitForSelector('.kid-card');
  await c.locator('label.row:has(#show-here)').click();
  await status(c, /now show on this device's sign-in/);
  await c.locator('#leave').click();
  await c.waitForURL(/\/index\.html$/);
  await loginOpen(c);
  assert.deepEqual(await c.locator('#people .person .name').allTextContents(), ['Ivy', 'Leo', 'Mia']);
  assert.equal(await c.locator('#people .person:has-text("Mia") .lw-avatar.photo img').count(), 1, 'Mia\'s photo is the tile');
  await c.locator('#people .person:has-text("Mia")').click();
  assert.equal(await c.locator('#login-name').inputValue(), logins[1]);
  assert(await c.locator('#login-go').isDisabled());
  await c.locator('#login-pw').fill('7234mx');
  await c.locator('#login-go').click();
  await c.waitForFunction(() => /don't match/.test(document.querySelector('#login-error').textContent));
  await c.locator('#login-pw').fill('7234mk');
  await c.locator('#login-go').click();
  await c.waitForFunction(() => document.body.dataset.home === 'picker' && !document.querySelector('#playing').hidden, null, {timeout: 20000});
  assert.equal(await c.locator('#playing-name').textContent(), 'Mia');
  assert.equal(await c.locator('#playing-avatar .lw-avatar.photo img').count(), 1, 'The photo shows during play');
  assert.deepEqual(await c.evaluate(() => window.GROWN_UPS.settings.letters), ['A', 'I', 'N', 'P', 'S', 'T']);
  assert.equal(await c.evaluate(() => document.documentElement.hasAttribute('data-calm')), true);
  await fits(c, 'picker');
  ok('chromebook: the grown-up shows the children\'s pictures here; Mia taps the photo tile, a wrong password is refused, Mia signs in with the chosen settings');

  // Mia plays in Letter Post: only the chosen letters, and the round is kept.
  await c.locator('nav a[data-world="post"]').click();
  await screen(c, 'home');
  assert.deepEqual(await c.locator('.letter-list [data-letter]').evaluateAll(n => n.map(x => x.dataset.letter)), ['A', 'I', 'N', 'P', 'S', 'T']);
  assert.match(await c.locator('.collection-heading').textContent(), /0 of 6 · yours to keep/);
  assert.match(await c.locator('#footer .lw-player').textContent(), /Mia/);
  assert.equal(await c.locator('#footer .lw-player .lw-avatar.photo img').count(), 1);
  await playRound(c, 'S');
  await c.waitForSelector('.lw-toast:has-text("First sound")');
  await playRound(c, 'A', 2);
  assert.match(await c.locator('.collection-heading').textContent(), /2 of 6 · yours to keep/);
  await c.selectOption('#theme', '1');
  await waitSynced(c);
  let state = await be.rpc('lw_child_state', {p_child: mia.id}, leeToken);
  assert.deepEqual([state.agg.post.S.n, state.agg.post.A.n, state.agg.post.A.clean], [1, 1, 0]);
  assert(state.badges['first-sound']); assert.equal(state.settings.theme_post.v, 1);
  ok('chromebook: rounds, a sticker and a color choice are saved to Mia\'s account');

  // "I'm done" hands the Chromebook to the next child.
  await c.locator('#lw-done').click();
  await loginOpen(c);
  assert.deepEqual(await c.locator('#people .person .name').allTextContents(), ['Mia', 'Ivy', 'Leo'], 'Who played here comes first');
  await c.locator('#people .person:has-text("Mia")').click();
  await c.locator('#login-pw').fill('7234mk');
  await c.locator('#login-go').click();
  await c.waitForFunction(() => document.body.dataset.home === 'picker' && !document.querySelector('#playing').hidden, null, {timeout: 20000});
  assert.equal(await c.locator('#stickers .lw-sticker').count(), 1);
  await c.locator('#sticker-button').click();
  assert.equal(await c.locator('#book li.earned').count(), 1);
  await c.locator('#book-dialog .go').click();
  await c.locator('#done').click();
  await loginOpen(c);
  // A new tab on the same Chromebook never continues as the last child.
  const c2 = await cb.newPage();
  await c2.goto(web.url + '/v1-letter-post/index.html');
  await screen(c2, 'home');
  assert.equal(await c2.locator('#footer .lw-player').count(), 0);
  assert.match(await c2.locator('.collection-heading').textContent(), /this visit/);
  await c2.close();
  ok('chromebook: I\'m done returns to the sign-in; a new tab never continues as the last child');

  // Play without saving still works and keeps nothing.
  await c.locator('#play-unsaved').click();
  assert(await c.locator('#guest-bar').isVisible());
  assert.match(await c.locator('#guest-bar').textContent(), /won't be kept/);
  assert.equal(await c.locator('nav a:not([hidden])').count(), 3);
  await c.locator('#guest-signin').click();
  await loginOpen(c);
  ok('chromebook: play without saving keeps the old one-visit game');

  // ---- Back on the laptop: progress shows in the corner; a new photo reaches the Chromebook.
  await t.reload(); await portal(t);
  await t.waitForFunction(() => /2 rounds · 2 letters/.test(document.querySelector('.kid-card:nth-child(3)')?.textContent || ''), null, {timeout: 20000});
  await t.locator('.kid-card:has-text("Mia") [data-act="settings"]').click();
  await t.waitForFunction(() => /2 rounds, 2 letters of 26/.test(document.querySelector('#progress-body').textContent));
  assert.equal(await t.locator('#progress-body .sticker-shelf li.earned').count(), 1);
  await t.locator('.kid-card:has-text("Leo") [data-act="edit"]').click();
  assert(await t.locator('#mine-wrap').isHidden(), 'A new picture alone needs no password');
  await t.locator('#form-fields input[name="name"]').fill('Leon');
  assert(await t.locator('#mine-wrap').isVisible(), 'A new name asks for your password');
  assert(await t.locator('#form-go').isDisabled());
  await t.locator('#form-fields input[name="name"]').fill('Leo');
  assert(await t.locator('#mine-wrap').isHidden());
  await t.locator('#photo-file').setInputFiles({name: 'leo.png', mimeType: 'image/png', buffer: png(300, 900)});
  await t.waitForFunction(() => document.querySelector('#form-dialog-form').elements.photo.value.startsWith('data:image/jpeg'));
  await t.locator('#form-go').click();
  await status(t, /^Saved/);
  assert.equal(await t.locator('.kid-card:has-text("Leo") .lw-avatar.photo img').count(), 1);
  assert.match((await be.rpc('lw_child_state', {p_child: leo.id}, leeToken)).profile.picture, /^data:image\/jpeg/);
  ok('corner: Mia\'s rounds, letters and sticker show for the grown-up; a photo can be added to an existing child');

  // A grown-up who stays signed in: the number-word gate guards re-entry.
  await t.locator('#signout').click();
  await signInCorner(t, lee.login, lee.password, {keep: true});
  assert.equal(await t.locator('#leave').textContent(), 'Lock and go to the games');
  await t.locator('#leave').click();
  await t.waitForURL(/\/index\.html$/);
  await loginOpen(t);
  await t.locator('#grown-link').click();
  await t.waitForFunction(() => document.body.dataset.view === 'gate');
  const digits = (await t.locator('#challenge span').allTextContents()).map(w => WORDS.indexOf(w));
  for (const n of digits) await t.locator(`[data-digit="${n}"]`).click();
  await portal(t);
  ok('corner: staying signed in brings back the reading gate as a re-entry check');

  // Another family adds Mia with Mia's sign-in name and password; the same progress shows there.
  const sam = {login: `sam-${suffix}`, password: 'home12'};
  await be.makeGrownup(sam.login, sam.password, 'Sam');
  const home = await context(browser, be);
  const h = await home.newPage();
  await h.goto(web.url + '/grown-ups/index.html');
  await signInCorner(h, sam.login, sam.password);
  await h.locator('#add-existing').click();
  await h.locator('#form-fields input[name="login"]').fill(logins[1]);
  await h.locator('#form-fields input[name="password"]').fill('7234mk');
  await h.locator('#form-go').click();
  await status(h, /Mia is on your list now/);
  assert.deepEqual(await h.locator('.kid-card strong').allTextContents(), ['Mia']);
  assert.doesNotMatch(await h.locator('#grownup-list').innerText(), /Ms Lee|Dev/, 'Adding a child doesn\'t share the other grown-ups');
  await h.locator('.kid-card:has-text("Mia") [data-act="settings"]').click();
  await h.waitForFunction(() => /2 rounds, 2 letters of 26/.test(document.querySelector('#progress-body').textContent));
  ok('another family: adds Mia\'s existing account with that sign-in; the same progress shows there');

  // Remove: Sam takes Mia off their list (the account stays); Ms Lee deletes Ivy; Ms Lee removes Dev.
  await h.locator('.kid-card:has-text("Mia") [data-act="remove"]').click();
  // The only thing to type is your own password: no counts, no names, no extra boxes.
  assert.deepEqual(await h.locator('#form-fields input:not([type="radio"]):not([type="hidden"])').evaluateAll(n => n.map(x => x.id)), ['mine']);
  assert.match(await h.locator('#affected-list').innerText(), /Mia/);
  const order = await h.evaluate(() => [document.querySelector('#mine'), document.querySelector('#form-go')].map(n => n.getBoundingClientRect().top));
  assert(order[0] < order[1], 'The password box comes before the button');
  await h.locator('#mine').fill(sam.password);
  await h.locator('#form-go').click();
  await status(h, /Mia is off your list/);
  assert(await h.locator('#kids-empty').isVisible());
  await t.locator('.kid-card:has-text("Ivy") [data-act="remove"]').click();
  await t.locator('#form-fields label.choice:has(input[value="delete"])').click();
  await t.locator('#mine').fill(lee.password);
  await t.locator('#form-go').click();
  await status(t, /Ivy's account is deleted/);
  await t.locator(`#grownup-list [data-act="remove-grownup"][data-name="Dev"]`).click();
  await t.locator('#mine').fill(lee.password);
  await t.locator('#form-go').click();
  await status(t, /Dev no longer looks after these children/);
  await d.reload(); await portal(d);
  await d.waitForFunction(() => document.querySelectorAll('.kid-card').length === 0 && !document.querySelector('#kids-empty').hidden, null, {timeout: 20000});
  assert.deepEqual((await be.rpc('lw_portal', {}, leeToken)).children.map(k => k.name), ['Leo', 'Mia']);
  await be.token(logins[1], '7234mk');
  ok('remove: off a list keeps the account, delete is for good, and a removed grown-up sees no children');

  // Select mode: reset progress and give new passwords to several children at once, behind the password only.
  await t.locator('#select-kids').click();
  assert.equal(await t.locator('#select-kids').getAttribute('aria-pressed'), 'true');
  assert(await t.locator('#kids-bulk').isVisible());
  assert(await t.locator('[data-bulk="kids-reset"]').isDisabled(), 'Nothing picked yet');
  await t.locator('[data-bulk="kids-all"]').click();
  assert.match(await t.locator('#kids-count').textContent(), /^2 of 2 selected/);
  for (const size of sizes) { await t.setViewportSize(size); await fits(t, `select mode ${size.name}`, size.width >= 1600 ? 72 : 60); }
  await t.setViewportSize({width: 1366, height: 768});
  await t.locator('[data-bulk="kids-reset"]').click();
  assert.match(await t.locator('#form-title').textContent(), /Reset progress for 2 children/);
  assert.deepEqual(await t.locator('#affected-list li').allInnerTexts().then(l => l.map(x => x.split('\n')[0])), ['Leo', 'Mia']);
  await t.locator('#mine').fill('wrong-1');
  await t.locator('#form-go').click();
  await t.waitForFunction(() => /isn't your password/.test(document.querySelector('#form-error').textContent));
  assert.equal((await be.rpc('lw_child_state', {p_child: mia.id}, leeToken)).agg.post.S.n, 1, 'A wrong password changes nothing');
  await t.locator('#mine').fill(lee.password);
  await t.locator('#form-go').click();
  await status(t, /Progress is cleared for 2 children/);
  state = await be.rpc('lw_child_state', {p_child: mia.id}, leeToken);
  assert.deepEqual([state.agg, state.badges], [{}, {}]);
  await t.locator('[data-bulk="kids-all"]').click();
  await t.locator('[data-bulk="kids-password"]').click();
  await t.locator('#form-fields input[name="password"]').fill('5555ab');
  await t.locator('#mine').fill(lee.password);
  await t.locator('#form-go').click();
  await status(t, /2 passwords changed/);
  await t.locator('#select-kids').click();
  assert(await t.locator('#kids-bulk').isHidden());
  await t.locator('.kid-card:has-text("Leo") [data-act="reset"]').click();
  assert.match(await t.locator('#form-title').textContent(), /Reset Leo's progress/);
  await t.locator('[data-close]').click();
  // Mia's Chromebook still has her old copy; after signing in, the reset holds there too.
  await c.locator('#people .person:has-text("Mia")').click();
  await c.locator('#login-pw').fill('5555ab');
  await c.locator('#login-go').click();
  await c.waitForFunction(() => document.body.dataset.home === 'picker' && !document.querySelector('#playing').hidden, null, {timeout: 20000});
  await waitSynced(c);
  await c.waitForFunction(() => document.querySelectorAll('#stickers .lw-sticker').length === 0, null, {timeout: 20000});
  await c.locator('nav a[data-world="post"]').click();
  await screen(c, 'home');
  assert.match(await c.locator('.collection-heading').textContent(), /0 of 6 · yours to keep/);
  await playRound(c, 'T');
  await waitSynced(c);
  state = await be.rpc('lw_child_state', {p_child: mia.id}, leeToken);
  assert.deepEqual([Object.keys(state.agg.post), Object.keys(state.badges)], [['T'], ['first-sound']]);
  ok('select: reset progress and new passwords for several children at once, password only; the reset holds on a device with an old copy');

  for (const ctx of [laptop, second, cb, home]) assert.deepEqual(ctx.errors, [], 'browser errors');
  console.log(`\n${passed} accounts flow checks passed (${be.mode} backend)`);
} finally {
  await browser.close(); await web.close(); await be.close();
}
