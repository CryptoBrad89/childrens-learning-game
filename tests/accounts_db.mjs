/* Database and API checks for accounts and sync.
 * Runs supabase/migrations in PGlite behind the local Supabase stand-in
 * (tests/db/supabase-stand-in.mjs) and calls the API the way the game does.
 * Needs: npm ci --prefix tests/db */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {startStandIn} from './db/supabase-stand-in.mjs';

const s = await startStandIn();
const DOMAIN = '@accounts.little-woof.invalid';
let passed = 0;
const ok = label => {passed++; console.log(`PASS ${label}`);};

async function post(path, body, token) {
  const res = await fetch(s.url + path, {method: 'POST',
    headers: {apikey: s.key, 'content-type': 'application/json', ...(token ? {authorization: `Bearer ${token}`} : {})},
    body: JSON.stringify(body)});
  const text = await res.text();
  return {status: res.status, body: text ? JSON.parse(text) : null};
}
const rpc = (fn, args, token) => post(`/rest/v1/rpc/${fn}`, args, token);
async function must(fn, args, token) {
  const r = await rpc(fn, args, token);
  assert.equal(r.status, 200, `${fn}: ${JSON.stringify(r.body)}`);
  return r.body;
}
async function refused(fn, args, token, code) {
  const r = await rpc(fn, args, token);
  assert.notEqual(r.status, 200, `${fn} should be refused`);
  if (code) assert.match(r.body.message, new RegExp(code === 'denied' ? 'permission denied' : `LW:${code}`), `${fn}: ${r.body.message}`);
  return r;
}
async function signIn(login, password) {
  const r = await post('/auth/v1/token?grant_type=password', {email: login + DOMAIN, password});
  assert.equal(r.status, 200, `sign in ${login}: ${JSON.stringify(r.body)}`);
  return r.body.access_token;
}
// The project owner's way to make the first grown-up (SQL editor, not the API).
async function firstGrownup(login, password, name) {
  const {rows: [{p}]} = await s.db.query('select lw_private.make_grownup($1, $2, $3) as p', [login, password, name]);
  return p;
}
const round = (letter, world = 'post', misses = 0) => ({id: crypto.randomUUID(), world, letter, misses, hinted: misses >= 2, at: Date.now()});
// A tiny real JPEG (1×1), as the corner uploads after shrinking a photo.
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

try {
  // Nobody can make a grown-up account from outside: not a stranger, not a child, not the old sign-up.
  await refused('lw_sign_up', {p_login: 'mslee', p_password: 'aaaaaa', p_name: 'Ms Lee'}, null, 'denied');
  const {rows: anonCan} = await s.db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'lw\\_%' and has_function_privilege('anon', p.oid, 'execute')`);
  assert.deepEqual(anonCan, [], 'No function is open to people who are not signed in');
  const lee = await firstGrownup('MsLee', 'aaaaaa', 'Ms Lee');
  assert.equal(lee.login, 'mslee'); assert.equal(lee.role, 'grownup');
  const leeT = await signIn('mslee', 'aaaaaa');
  assert.equal((await post('/auth/v1/token?grant_type=password', {email: 'mslee' + DOMAIN, password: 'wrong1'})).status, 400);
  assert.deepEqual(await must('lw_me', {}, leeT), lee);
  await refused('lw_sign_up', {p_login: 'other', p_password: 'aaaaaa', p_name: 'Other'}, leeT, 'denied');
  ok('no public sign-up: closed to everyone through the API; the owner makes the first grown-up in SQL');

  // A signed-in grown-up makes children, with a drawn avatar or an uploaded picture.
  await refused('lw_add_child', {p_name: 'Mia', p_avatar: 'cat:2', p_password: '7234'}, leeT, 'password_short');
  const mia = await must('lw_add_child', {p_name: 'Mia', p_avatar: 'cat:2', p_password: '7234mk'}, leeT);
  const leo = await must('lw_add_child', {p_name: 'Léo 2', p_avatar: 'fox:4', p_password: '7234lb', p_picture: JPEG}, leeT);
  assert.match(mia.login, /^mia-[a-z0-9]{3}$/); assert.match(leo.login, /^leo-[a-z0-9]{3}$/);
  assert.equal(mia.picture, undefined); assert.equal(leo.picture, JPEG);
  for (const bad of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'javascript:alert(1)', 'https://example.com/a.jpg',
    'data:image/jpeg;base64,' + 'A'.repeat(60000), JPEG + '"><script>']) {
    await refused('lw_add_child', {p_name: 'Bad', p_avatar: 'sun:0', p_password: '7234ab', p_picture: bad}, leeT, 'bad_picture');
  }
  await refused('lw_edit_child', {p_child: mia.id, p_name: 'Mia', p_avatar: 'cat:2', p_picture: 'data:text/html;base64,PGI+'}, leeT, 'bad_picture');
  assert.equal((await must('lw_edit_child', {p_child: mia.id, p_name: 'Mia', p_avatar: 'cat:2', p_picture: JPEG}, leeT)).picture, JPEG);
  assert.equal((await must('lw_child_state', {p_child: mia.id}, leeT)).profile.picture, JPEG);
  assert.equal((await must('lw_edit_child', {p_child: mia.id, p_name: 'Mia', p_avatar: 'cat:2', p_picture: null}, leeT)).picture, undefined);
  await assert.rejects(s.db.query(`update public.profiles set picture = 'data:image/gif;base64,R0lG' where id = $1`, [mia.id]), /profiles_picture_check/);
  const portal = await must('lw_portal', {}, leeT);
  assert.deepEqual(portal.children.map(c => c.name), ['Léo 2', 'Mia']);
  assert.equal(portal.children[0].picture, JPEG);
  assert.deepEqual(portal.grownups, []);
  const {rows: [codes]} = await s.db.query('select board_code, invite_code from public.groups limit 1');
  for (const text of [JSON.stringify(portal), JSON.stringify(await must('lw_children_states', {}, leeT))]) {
    assert(!text.includes(codes.board_code) && !text.includes(codes.invite_code) && !/code|group/i.test(text), 'The corner never sees groups or codes');
  }
  ok('children: made by a grown-up, readable sign-in names, drawn avatar or an uploaded picture (photos only, small)');

  // Children sign in with their own password and can't do any grown-up thing.
  const miaT = await signIn(mia.login, '7234mk');
  assert.equal((await must('lw_me', {}, await signIn(leo.login, '7234lb'))).picture, JPEG, 'A child sees their own picture');
  await refused('lw_portal', {}, miaT, 'grownups_only');
  await refused('lw_create_grownup', {p_login: 'mias-mum', p_password: 'aaaaaa', p_name: 'Mum'}, miaT, 'grownups_only');
  await refused('lw_add_child', {p_name: 'Friend', p_avatar: 'sun:0', p_password: 'aaaaaa'}, miaT, 'grownups_only');
  await refused('lw_sync', {p_profile: leo.id}, miaT, 'not_allowed');
  ok('children: real sign-in; cannot make grown-ups or children, or see anyone else');

  // Only the old group and code functions are gone, for signed-in people too.
  for (const [fn, args] of [['lw_board', {p_code: codes.board_code}], ['lw_groups', {}], ['lw_create_group', {p_kind: 'group', p_name: 'X'}],
    ['lw_join_group', {p_invite: codes.invite_code}], ['lw_new_codes', {p_group: crypto.randomUUID()}], ['lw_rename_group', {p_group: crypto.randomUUID(), p_name: 'X'}],
    ['lw_create_child', {p_group: crypto.randomUUID(), p_name: 'X', p_avatar: 'sun:0', p_password: 'aaaaaa'}],
    ['lw_link_child', {p_group: crypto.randomUUID(), p_login: mia.login, p_password: '7234mk'}],
    ['lw_remove_member', {p_group: crypto.randomUUID(), p_profile: mia.id}], ['lw_group_states', {p_group: crypto.randomUUID()}],
    ['lw_update_child', {p_child: mia.id, p_name: 'X', p_avatar: 'sun:0'}]]) {
    await refused(fn, args, leeT, 'denied');
  }
  ok('no groups or codes: every group, board and code function is closed');

  // Sync is idempotent: a retried upload never counts a round twice.
  const rounds = [round('S'), round('A', 'post', 1), round('T', 'space', 2)];
  let state = await must('lw_sync', {p_profile: mia.id, p_rounds: rounds, p_device: 'dev-1'}, miaT);
  state = await must('lw_sync', {p_profile: mia.id, p_rounds: rounds, p_device: 'dev-2'}, miaT);
  assert.deepEqual(state.agg.post.S, {n: 1, clean: 1, first: state.agg.post.S.first});
  assert.equal(state.agg.post.A.clean, 0); assert.equal(state.agg.space.T.n, 1);
  const {rows: [{n}]} = await s.db.query('select count(*)::int as n from public.rounds');
  assert.equal(n, 3);
  // Bad rows are dropped, not fatal, so one odd round can't block a device's queue.
  state = await must('lw_sync', {p_profile: mia.id, p_rounds: [{id: 'nope', world: 'post', letter: 'B'},
    {id: crypto.randomUUID(), world: 'moon', letter: 'B'}, {id: crypto.randomUUID(), world: 'post', letter: 'bb'}, round('B', 'silk', 500)]}, miaT);
  assert.equal(state.agg.silk.B.n, 1); assert.equal(state.agg.post.B, undefined);
  // A future clock is capped at the time the round arrived.
  const future = round('C'); future.at = Date.now() + 86400000 * 30;
  state = await must('lw_sync', {p_profile: mia.id, p_rounds: [future]}, miaT);
  assert(state.agg.post.C.first <= state.server_time);
  ok('sync: rounds keyed by device-made ids; retries and bad rows never double count or block');

  // Settings: the newest edit of each field wins; children may change only their colors.
  const t0 = Date.now() - 60000;
  state = await must('lw_sync', {p_profile: mia.id, p_settings: [
    {field: 'theme_post', v: 2, t: t0}, {field: 'letters', v: ['S', 'A'], t: t0}, {field: 'calm', v: 'yes', t: t0}]}, miaT);
  assert.deepEqual(Object.keys(state.settings), ['theme_post']);
  await must('lw_put_settings', {p_changes: [{profile: mia.id, field: 'letters', v: ['S', 'A', 'T'], t: t0 + 1000},
    {profile: mia.id, field: 'theme_post', v: 1, t: t0 - 5000}]}, leeT);
  state = await must('lw_sync', {p_profile: mia.id}, miaT);
  assert.deepEqual(state.settings.letters.v, ['S', 'A', 'T']);
  assert.equal(state.settings.theme_post.v, 2, 'An older edit does not overwrite a newer one');
  await must('lw_put_settings', {p_changes: [{profile: mia.id, field: 'letters', v: ['P'], t: t0 + 500}]}, leeT);
  assert.deepEqual((await must('lw_child_state', {p_child: mia.id}, leeT)).settings.letters.v, ['S', 'A', 'T']);
  const states = await must('lw_children_states', {}, leeT);
  assert.deepEqual(Object.keys(states).sort(), [mia.id, leo.id].sort());
  assert.deepEqual(states[mia.id].settings.letters.v, ['S', 'A', 'T']);
  await refused('lw_children_states', {}, miaT, 'grownups_only');
  ok('settings: per-field newest-edit-wins, children limited to color themes');

  // Stickers merge and keep the earliest time; unknown keys are ignored.
  await must('lw_sync', {p_profile: mia.id, p_badges: [{key: 'first-sound', t: t0 + 100}, {key: 'made-up', t: t0}]}, miaT);
  state = await must('lw_sync', {p_profile: mia.id, p_badges: [{key: 'first-sound', t: t0}]}, miaT);
  assert.deepEqual(state.badges, {'first-sound': lw(t0)});
  await refused('lw_sync', {p_profile: mia.id, p_rounds: [round('D')]}, leeT, 'not_allowed');
  ok('stickers: merged, earliest kept; only the player uploads their own play');

  // A signed-in grown-up makes another grown-up, who looks after the same children.
  await refused('lw_create_grownup', {p_login: 'x', p_password: 'bbbbbb', p_name: 'X'}, leeT, 'login_shape');
  await refused('lw_create_grownup', {p_login: 'mrpatel', p_password: 'bbbbb', p_name: 'Mr Patel'}, leeT, 'password_short');
  await refused('lw_create_grownup', {p_login: mia.login, p_password: 'bbbbbb', p_name: 'Copy'}, leeT, 'login_taken');
  const patel = await must('lw_create_grownup', {p_login: 'MrPatel', p_password: 'bbbbbb', p_name: 'Mr Patel'}, leeT);
  assert.equal(patel.role, 'grownup'); assert.equal(patel.login, 'mrpatel');
  const patelT = await signIn('mrpatel', 'bbbbbb');
  assert.deepEqual((await must('lw_portal', {}, patelT)).children.map(c => c.name), ['Léo 2', 'Mia']);
  assert.deepEqual((await must('lw_portal', {}, leeT)).grownups.map(g => [g.name, g.made_by_me]), [['Mr Patel', true]]);
  assert.deepEqual((await must('lw_portal', {}, patelT)).grownups.map(g => [g.name, g.made_by_me]), [['Ms Lee', false]]);
  const ivy = await must('lw_add_child', {p_name: 'Ivy', p_avatar: 'duck:1', p_password: '7234iv'}, patelT);
  assert((await must('lw_portal', {}, leeT)).children.some(c => c.id === ivy.id), 'A child one grown-up adds shows for the other');
  // A grown-up made by another grown-up can make grown-ups too.
  await must('lw_create_grownup', {p_login: 'gran', p_password: 'gggggg', p_name: 'Gran'}, patelT);
  assert.equal((await must('lw_portal', {}, await signIn('gran', 'gggggg'))).children.length, 3);
  ok('grown-ups: only a signed-in grown-up makes another; they look after the same children and can make grown-ups too');

  // A grown-up from another team sees nothing until they add a child with the child's own sign-in.
  const dad = await firstGrownup('mias-dad', 'cccccc', 'Sam');
  const dadT = await signIn('mias-dad', 'cccccc');
  await refused('lw_child_state', {p_child: mia.id}, dadT, 'not_allowed');
  assert.equal((await must('lw_put_settings', {p_changes: [{profile: mia.id, field: 'calm', v: true, t: Date.now()}]}, dadT)).applied, 0);
  assert.deepEqual(await must('lw_portal', {}, dadT), {me: dad, children: [], grownups: []});
  assert.deepEqual(await must('lw_add_existing_child', {p_login: mia.login, p_password: 'wrong!'}, dadT), {ok: false, error: 'bad_login'});
  const linked = await must('lw_add_existing_child', {p_login: mia.login.toUpperCase(), p_password: '7234mk'}, dadT);
  assert.equal(linked.ok, true);
  assert.equal((await must('lw_child_state', {p_child: mia.id}, dadT)).agg.post.S.n, 1, 'Same child, same progress at home');
  assert.deepEqual((await must('lw_portal', {}, dadT)).grownups, [], 'Adding a child doesn\'t share the other grown-ups');
  for (let i = 0; i < 10; i++) await must('lw_add_existing_child', {p_login: leo.login, p_password: `guess${i}`}, dadT);
  assert.deepEqual(await must('lw_add_existing_child', {p_login: leo.login, p_password: '7234lb'}, dadT), {ok: false, error: 'too_many_tries'});
  ok('existing child: added with their sign-in name and password; guessing limited to ten tries an hour');

  // Passwords: a grown-up resets a child's; anyone changes their own.
  await must('lw_set_child_password', {p_child: leo.id, p_password: '9999lb'}, leeT);
  await signIn(leo.login, '9999lb');
  await refused('lw_set_child_password', {p_child: leo.id, p_password: '1111lb'}, dadT, 'not_allowed');
  await refused('lw_change_password', {p_old: 'nope00', p_new: 'dddddd'}, dadT, 'bad_password');
  await must('lw_change_password', {p_old: 'cccccc', p_new: 'dddddd'}, dadT);
  await signIn('mias-dad', 'dddddd');
  ok('passwords: grown-ups reset children they look after; own password needs the old one');

  // Remove keeps the account; delete is for good, and only when no one else looks after the child.
  await refused('lw_delete_child', {p_child: mia.id}, leeT, 'shared_child');
  await must('lw_remove_child', {p_child: mia.id}, dadT);
  await refused('lw_child_state', {p_child: mia.id}, dadT, 'not_allowed');
  await signIn(mia.login, '7234mk');
  await must('lw_sync', {p_profile: ivy.id, p_rounds: [round('Z')]}, await signIn(ivy.login, '7234iv'));
  await must('lw_delete_child', {p_child: ivy.id}, leeT);
  assert.equal((await post('/auth/v1/token?grant_type=password', {email: ivy.login + DOMAIN, password: '7234iv'})).status, 400);
  const {rows: [{left}]} = await s.db.query('select (select count(*) from public.rounds where profile_id = $1) + (select count(*) from public.profiles where id = $1) + (select count(*) from auth.users where id = $1) as left', [ivy.id]);
  assert.equal(Number(left), 0);
  ok('remove and delete: remove keeps the account; delete goes for good, only when no one else looks after the child');

  // Taking another grown-up off: they keep their account but no longer see the children.
  await refused('lw_remove_grownup', {p_grownup: lee.id}, leeT, 'bad_request');
  await must('lw_remove_grownup', {p_grownup: patel.id}, leeT);
  assert.deepEqual(await must('lw_portal', {}, patelT), {me: patel, children: [], grownups: []});
  await refused('lw_child_state', {p_child: mia.id}, patelT, 'not_allowed');
  // Their next child starts a fresh team of their own.
  await must('lw_add_child', {p_name: 'Zed', p_avatar: 'sun:0', p_password: '7234zd'}, patelT);
  assert.deepEqual((await must('lw_portal', {}, patelT)).children.map(c => c.name), ['Zed']);
  assert(!(await must('lw_portal', {}, leeT)).children.some(c => c.name === 'Zed'));
  ok('grown-ups: one can take another off; that grown-up keeps their account and sees none of the children');

  // Grown-ups from the accounts build who were in several groups keep every child.
  const old = await firstGrownup('old-hand', 'oooooo', 'Old Hand');
  const oldT = await signIn('old-hand', 'oooooo');
  for (const name of ['Room 4', 'Saturday club']) {
    const {rows: [{id}]} = await s.db.query(`insert into public.groups (kind, name, board_code, invite_code, created_by)
      values ('class', $1, lw_private.new_code(6), lw_private.new_code(8), $2) returning id`, [name, old.id]);
    await s.db.query(`insert into public.group_members (group_id, profile_id, role) values ($1, $2, 'owner'), ($1, $3, 'child')`,
      [id, old.id, name === 'Room 4' ? leo.id : mia.id]);
  }
  assert.deepEqual((await must('lw_portal', {}, oldT)).children.map(c => c.name), ['Léo 2', 'Mia']);
  ok('earlier groups: a grown-up in several old groups sees all their children in one list');

  // The tables are closed to the API roles; only the functions are reachable.
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['profiles', 'groups', 'group_members', 'rounds', 'settings', 'badges', 'link_attempts']) {
      await assert.rejects(s.db.transaction(async tx => {await tx.exec(`set local role ${role}`); await tx.query(`select * from public.${table}`);}),
        /permission denied/, `${role} reading ${table}`);
    }
    for (const fn of ['lw_private.state(gen_random_uuid())', `lw_private.make_grownup('sneaky', 'ssssss', 'S')`, 'lw_private.team(gen_random_uuid())']) {
      await assert.rejects(s.db.transaction(async tx => {await tx.exec(`set local role ${role}`); await tx.query(`select ${fn}`);}), /permission denied/);
    }
  }
  for (const fn of ['lw_me', 'lw_sync', 'lw_portal', 'lw_add_child', 'lw_create_grownup', 'lw_put_settings']) {
    const r = await rpc(fn, {});
    assert.notEqual(r.status, 200, `${fn} without signing in`);
  }
  const {rows: rls} = await s.db.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
  assert.deepEqual(rls, [], 'Row-level security is on for every table');
  const {rows: definer} = await s.db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'lw_private') and p.prosecdef and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false)`);
  assert.deepEqual(definer, [], 'Every security-definer function pins its search_path');
  ok('access: tables closed to anon and authenticated, RLS on, helpers (and make_grownup) unreachable, search_path pinned');

  // Child accounts look like ordinary confirmed email users to Supabase Auth.
  const {rows: [u]} = await s.db.query(`select u.email, u.email_confirmed_at is not null as confirmed, u.encrypted_password like '$2a$10$%' as bcrypt,
      u.confirmation_token, u.recovery_token, u.email_change_token_new, u.email_change, i.provider, i.provider_id = u.id::text as idok
    from auth.users u join auth.identities i on i.user_id = u.id where u.id = $1`, [mia.id]);
  assert.deepEqual(u, {email: mia.login + DOMAIN, confirmed: true, bcrypt: true, confirmation_token: '', recovery_token: '',
    email_change_token_new: '', email_change: '', provider: 'email', idok: true});
  ok('auth rows: confirmed, bcrypt, empty token columns, email identity');

  console.log(`\n${passed} database checks passed (${s.files.join(', ')})`);
} finally {
  await s.close();
}
function lw(ms) {return Math.round(ms);}
