/* Risky actions and big selections in a real browser, on the local stand-in.
 * A grown-up with 250 children: select all, reset progress and take them off
 * the list in one go (sent in chunks the grown-up never sees); a connection
 * that drops part way leaves only the rest to try again; settings for all 250
 * go past the database's old per-call cap; several grown-ups removed at once;
 * ten wrong passwords pause risky actions. No screenshots.
 * Run: CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/risky_actions.mjs */
import assert from 'node:assert/strict';
import {playwright, launchOptions, serveGame, backend, context, fits} from './accounts/harness.mjs';

const be = await backend(), web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
let passed = 0;
const ok = label => {passed++; console.log(`PASS ${label}`);};
const MANY = 250;
const status = (page, pattern) => page.waitForFunction(p => new RegExp(p).test(document.querySelector('#kids-status').textContent), pattern.source, {timeout: 60000});

try {
  if (!be.standIn) throw new Error('risky_actions.mjs makes its 250 children directly in the local database; run it with LW_BACKEND=local');
  const db = be.standIn.db, pw = 'lucy12';
  const me = await be.makeGrownup('bulk-gu', pw, 'Robin');
  const token = await be.token('bulk-gu', pw);
  await be.rpc('lw_add_child', {p_name: 'First', p_avatar: 'sun:0', p_password: '7234fi'}, token);
  const {rows: [{team}]} = await db.query('select lw_private.team($1) as team', [me.id]);
  const hash = (await db.query(`select extensions.crypt('7234zz', extensions.gen_salt('bf', 4)) as h`)).rows[0].h;
  await db.query(`with u as (
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at)
      select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'kid-' || lpad(i::text, 3, '0') || $2, $3, now()
        from generate_series(2, $4) i returning id, email),
    p as (insert into public.profiles (id, role, login, display_name, avatar, created_by)
      select id, 'child', split_part(email, '@', 1), 'Kid ' || split_part(split_part(email, '@', 1), '-', 2), 'cat:1', $1 from u returning id)
    insert into public.group_members (group_id, profile_id, role) select $5, id, 'child' from p`, [me.id, be.DOMAIN || '@accounts.little-woof.invalid', hash, MANY, team]);
  await db.query(`insert into public.rounds (id, profile_id, world, letter, played_at)
    select gen_random_uuid(), m.profile_id, 'post', 'A', now() - interval '1 minute' from public.group_members m where m.group_id = $1 and m.role = 'child'`, [team]);
  for (const name of ['Ana', 'Bo', 'Cy']) {
    await be.rpc('lw_create_grownup', {p_login: `helper-${name.toLowerCase()}`, p_password: 'helper1', p_name: name, p_my_password: pw}, token);
  }

  const ctx = await context(browser, be);
  const t = await ctx.newPage();
  const calls = {};
  await t.route('**/rest/v1/rpc/*', route => { const fn = route.request().url().split('/').pop(); calls[fn] = (calls[fn] || 0) + 1; return route.fallback(); });
  await t.goto(web.url + '/grown-ups/index.html');
  await t.waitForFunction(() => document.body.dataset.view === 'signin');
  await t.locator('#signin-login').fill('bulk-gu');
  await t.locator('#signin-password').fill(pw);
  await t.locator('#signin-go').click();
  await t.waitForFunction(n => document.querySelectorAll('.kid-card').length === n, MANY, {timeout: 60000});
  ok(`corner: ${MANY} children load`);

  // Settings for all 250: three changes are 750 edits, past the old 2000-a-call cap only in batches of 500 here.
  await t.locator('[data-preset="vowels"]').click();
  await t.locator('label.row:has([data-setting="calm"])').click();
  await t.locator('label.row:has([data-setting="effects"])').click();
  await t.waitForFunction(() => { const s = window.LW.status(window.LW.grownupId()); return !s.waiting && !s.syncing && s.syncedAt; }, null, {timeout: 60000});
  const {rows: [set]} = await db.query(`select count(*) filter (where field = 'letters') as letters, count(*) filter (where field = 'calm') as calm,
    count(*) filter (where field = 'effects') as effects from public.settings where changed_by = $1`, [me.id]);
  assert.deepEqual([set.letters, set.calm, set.effects].map(Number), [MANY, MANY, MANY]);
  assert.equal(calls.lw_put_settings, 2, '750 edits went up as two batches');
  ok('settings: one change for all 250 children reaches every child, in batches the grown-up never sees');

  // Select all 250 and reset their progress: one password, three chunks.
  await t.locator('#select-kids').click();
  await t.locator('[data-bulk="kids-all"]').click();
  assert.match(await t.locator('#kids-count').textContent(), new RegExp(`^${MANY} of ${MANY} selected`));
  await t.locator('[data-bulk="kids-reset"]').click();
  assert.match(await t.locator('#affected-title').textContent(), new RegExp(`These ${MANY} accounts`));
  assert.equal(await t.locator('#affected-list li').count(), MANY);
  await fits(t, 'reset dialog, 250 children');
  await t.locator('#mine').fill(pw);
  await t.locator('#form-go').click();
  await status(t, new RegExp(`Progress is cleared for ${MANY} children`));
  assert.equal(calls.lw_reset_children_progress, 3, '250 children went as chunks of 100');
  assert.equal(Number((await db.query(`select count(*) as n from public.rounds r join public.group_members m on m.profile_id = r.profile_id where m.group_id = $1`, [team])).rows[0].n), 0);
  ok('reset: all 250 children at once, one password, chunks behind the scenes');

  // The connection drops after two chunks: the dialog keeps only the 50 still to do; Try again finishes them.
  let seen = 0;
  await t.route('**/rest/v1/rpc/lw_remove_children', route => (++seen === 3 ? route.abort('internetdisconnected') : route.fallback()));
  await t.locator('[data-bulk="kids-all"]').click();
  await t.locator('[data-bulk="kids-remove"]').click();
  await t.locator('#mine').fill(pw);
  await t.locator('#form-go').click();
  await t.waitForFunction(() => /^200 of 250 done\..*Try again for the other 50/.test(document.querySelector('#form-error').textContent), null, {timeout: 60000});
  assert.equal(await t.locator('#form-go').textContent(), 'Try again');
  assert.match(await t.locator('#affected-title').textContent(), /These 50 accounts/);
  assert.equal(await t.locator('#affected-list li').count(), 50);
  assert.equal((await be.rpc('lw_portal', {}, token)).children.length, 50, 'The first 200 really are off the list');
  await t.unroute('**/rest/v1/rpc/lw_remove_children');
  await t.locator('#form-go').click();
  await status(t, /250 children off your list/);
  await t.waitForFunction(() => !document.querySelector('#kids-empty').hidden, null, {timeout: 20000});
  assert(await t.locator('#select-kids').isHidden(), 'Nothing left to select');
  assert.equal(Number((await db.query(`select count(*) as n from public.profiles where role = 'child' and created_by = $1`, [me.id])).rows[0].n), MANY, 'Accounts are kept');
  ok('dropped connection: 200 done, the other 50 stay in the dialog; Try again finishes only those');

  // Several grown-ups at once.
  await t.locator('#select-grownups').click();
  await t.locator('[data-bulk="grownups-all"]').click();
  assert.match(await t.locator('#grownups-count').textContent(), /^3 of 3 selected/);
  await t.locator('[data-bulk="grownups-remove"]').click();
  assert.match(await t.locator('#form-title').textContent(), /Remove 3 grown-ups/);
  await t.locator('#mine').fill(pw);
  await t.locator('#form-go').click();
  await status(t, /3 grown-ups no longer look after these children/);
  assert.deepEqual((await be.rpc('lw_portal', {}, token)).grownups, []);
  ok('grown-ups: three removed at once, password only');

  // Ten wrong passwords pause risky actions for 15 minutes.
  await be.rpc('lw_add_child', {p_name: 'Last', p_avatar: 'sun:0', p_password: '7234la'}, token);
  await t.reload();
  await t.waitForSelector('.kid-card');
  await t.locator('.kid-card:has-text("Last") [data-act="reset"]').click();
  for (let i = 0; i < 10; i++) {
    await t.locator('#mine').fill(`wrong${i}`);
    await t.locator('#form-go').click();
    await t.waitForFunction(() => /isn't your password/.test(document.querySelector('#form-error').textContent) && document.querySelector('#mine').value === '');
    await t.evaluate(() => { document.querySelector('#form-error').textContent = ''; });
  }
  await t.locator('#mine').fill(pw);
  await t.locator('#form-go').click();
  await t.waitForFunction(() => /Wait 15 minutes/.test(document.querySelector('#form-error').textContent));
  ok('wrong passwords: after ten, even the right one waits 15 minutes');

  assert.deepEqual(ctx.errors.filter(e => !/internetdisconnected|INTERNET_DISCONNECTED/i.test(e)), [], 'browser errors');
  console.log(`\n${passed} risky action checks passed (${be.mode} backend)`);
} finally {
  await browser.close(); await web.close(); await be.close();
}
