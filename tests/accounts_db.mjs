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
  if (code) assert.match(r.body.message, new RegExp(`LW:${code}`), `${fn}: ${r.body.message}`);
  return r;
}
async function signIn(login, password) {
  const r = await post('/auth/v1/token?grant_type=password', {email: login + DOMAIN, password});
  assert.equal(r.status, 200, `sign in ${login}: ${JSON.stringify(r.body)}`);
  return r.body.access_token;
}
const round = (letter, world = 'post', misses = 0) => ({id: crypto.randomUUID(), world, letter, misses, hinted: misses >= 2, at: Date.now()});

try {
  // Grown-ups sign up with a sign-in name and any password of six or more characters.
  await refused('lw_sign_up', {p_login: 'mslee', p_password: '12345', p_name: 'Ms Lee'}, null, 'password_short');
  await refused('lw_sign_up', {p_login: 'x', p_password: '123456', p_name: 'X'}, null, 'login_shape');
  const lee = await must('lw_sign_up', {p_login: 'MsLee', p_password: 'aaaaaa', p_name: 'Ms Lee'});
  assert.equal(lee.login, 'mslee'); assert.equal(lee.role, 'grownup');
  await refused('lw_sign_up', {p_login: 'mslee', p_password: '123456', p_name: 'Copy'}, null, 'login_taken');
  const leeT = await signIn('mslee', 'aaaaaa');
  assert.equal((await post('/auth/v1/token?grant_type=password', {email: 'mslee' + DOMAIN, password: 'wrong1'})).status, 400);
  assert.deepEqual(await must('lw_me', {}, leeT), lee);
  ok('grown-up sign-up: six-character minimum and no other rule; confirmed account signs in at once');

  // Classes, children and the picture board.
  const {id: cls} = await must('lw_create_group', {p_kind: 'class', p_name: 'Sunflower Class'}, leeT);
  await refused('lw_create_child', {p_group: cls, p_name: 'Mia', p_avatar: 'cat:2', p_password: '7234'}, leeT, 'password_short');
  const mia = await must('lw_create_child', {p_group: cls, p_name: 'Mia', p_avatar: 'cat:2', p_password: '7234mk'}, leeT);
  const leo = await must('lw_create_child', {p_group: cls, p_name: 'Léo 2', p_avatar: 'fox:4', p_password: '7234lb'}, leeT);
  assert.match(mia.login, /^mia-[a-z0-9]{3}$/); assert.match(leo.login, /^leo-[a-z0-9]{3}$/);
  const [group] = await must('lw_groups', {}, leeT);
  assert.equal(group.role, 'owner'); assert.match(group.board_code, /^[A-Z0-9]{6}$/); assert.match(group.invite_code, /^[A-Z0-9]{8}$/);
  assert.deepEqual(group.members.map(m => m.member_role), ['child', 'child', 'owner']);
  const board = await must('lw_board', {p_code: group.board_code.toLowerCase().replace(/(...)/, '$1 ')});
  assert.deepEqual(board.children.map(c => c.name), ['Léo 2', 'Mia']);
  assert(!JSON.stringify(board).includes(group.invite_code), 'The board never shows the invite code');
  await refused('lw_board', {p_code: 'ZZZZZZ'}, null, 'no_board');
  ok('classes: child accounts made by a grown-up, readable sign-in names, picture board by code');

  // Children sign in with their own password.
  const miaT = await signIn(mia.login, '7234mk');
  await refused('lw_groups', {}, miaT, 'grownups_only');
  await refused('lw_create_group', {p_kind: 'class', p_name: 'Mine'}, miaT, 'grownups_only');
  await refused('lw_sync', {p_profile: leo.id}, miaT, 'not_allowed');
  ok('children: real sign-in; cannot see groups or other children');

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
  const states = await must('lw_group_states', {p_group: cls}, leeT);
  assert.deepEqual(Object.keys(states).sort(), [mia.id, leo.id].sort());
  assert.deepEqual(states[mia.id].settings.letters.v, ['S', 'A', 'T']);
  await refused('lw_group_states', {p_group: cls}, miaT, 'grownups_only');
  ok('settings: per-field newest-edit-wins, children limited to color themes');

  // Stickers merge and keep the earliest time; unknown keys are ignored.
  await must('lw_sync', {p_profile: mia.id, p_badges: [{key: 'first-sound', t: t0 + 100}, {key: 'made-up', t: t0}]}, miaT);
  state = await must('lw_sync', {p_profile: mia.id, p_badges: [{key: 'first-sound', t: t0}]}, miaT);
  assert.deepEqual(state.badges, {'first-sound': lw(t0)});
  await refused('lw_sync', {p_profile: mia.id, p_rounds: [round('D')]}, leeT, 'not_allowed');
  ok('stickers: merged, earliest kept; only the player uploads their own play');

  // A second grown-up joins with the invite code; a stranger sees nothing.
  await must('lw_sign_up', {p_login: 'mrpatel', p_password: 'bbbbbb', p_name: 'Mr Patel'});
  const patelT = await signIn('mrpatel', 'bbbbbb');
  await refused('lw_child_state', {p_child: mia.id}, patelT, 'not_allowed');
  await refused('lw_put_settings', {p_changes: []}, null);
  assert.equal((await must('lw_put_settings', {p_changes: [{profile: mia.id, field: 'calm', v: true, t: Date.now()}]}, patelT)).applied, 0);
  await refused('lw_join_group', {p_invite: group.board_code}, patelT, 'no_invite');
  await must('lw_join_group', {p_invite: group.invite_code.slice(0, 4) + '-' + group.invite_code.slice(4)}, patelT);
  assert.equal((await must('lw_child_state', {p_child: mia.id}, patelT)).profile.login, mia.login);
  await refused('lw_new_codes', {p_group: cls}, patelT, 'owners_only');
  await refused('lw_remove_member', {p_group: cls, p_profile: lee.id}, patelT, 'owners_only');
  ok('helpers: join by invite code (not the board code); owners keep owner-only actions');

  // A parent adds the school child to their home, proven by the child's sign-in.
  await must('lw_sign_up', {p_login: 'mias-dad', p_password: 'cccccc', p_name: 'Sam'});
  const dadT = await signIn('mias-dad', 'cccccc');
  const {id: home} = await must('lw_create_group', {p_kind: 'home', p_name: 'Home'}, dadT);
  assert.deepEqual(await must('lw_link_child', {p_group: home, p_login: mia.login, p_password: 'wrong!'}, dadT), {ok: false, error: 'bad_login'});
  const linked = await must('lw_link_child', {p_group: home, p_login: mia.login.toUpperCase(), p_password: '7234mk'}, dadT);
  assert.equal(linked.ok, true);
  assert.equal((await must('lw_child_state', {p_child: mia.id}, dadT)).agg.post.S.n, 1, 'Same child, same progress at home');
  for (let i = 0; i < 10; i++) await must('lw_link_child', {p_group: home, p_login: leo.login, p_password: `guess${i}`}, dadT);
  assert.deepEqual(await must('lw_link_child', {p_group: home, p_login: leo.login, p_password: '7234lb'}, dadT), {ok: false, error: 'too_many_tries'});
  await refused('lw_link_child', {p_group: cls, p_login: leo.login, p_password: '7234lb'}, dadT, 'not_allowed');
  ok('home: link an existing child with their sign-in; guessing limited to ten tries an hour');

  // Passwords: a grown-up resets a child's; anyone changes their own.
  await must('lw_set_child_password', {p_child: leo.id, p_password: '9999lb'}, leeT);
  await signIn(leo.login, '9999lb');
  await refused('lw_set_child_password', {p_child: leo.id, p_password: '1111lb'}, dadT, 'not_allowed');
  await refused('lw_change_password', {p_old: 'nope00', p_new: 'dddddd'}, dadT, 'bad_password');
  await must('lw_change_password', {p_old: 'cccccc', p_new: 'dddddd'}, dadT);
  await signIn('mias-dad', 'dddddd');
  await must('lw_update_child', {p_child: mia.id, p_name: 'Mia K', p_avatar: 'sun:1'}, dadT);
  assert.equal((await must('lw_board', {p_code: group.board_code})).children.find(c => c.id === mia.id).name, 'Mia K');
  ok('passwords: grown-ups reset children they look after; own password needs the old one');

  // Deleting a child for good: refused while another group (a home) also has them.
  await must('lw_sign_up', {p_login: 'gran', p_password: 'gggggg', p_name: 'Gran'});
  const dad2 = await signIn('gran', 'gggggg');
  const {id: home2} = await must('lw_create_group', {p_kind: 'home', p_name: 'Gran\'s'}, dad2);
  const temp = await must('lw_create_child', {p_group: cls, p_name: 'Temp', p_avatar: 'sun:0', p_password: 'tttttt'}, leeT);
  assert.equal((await must('lw_link_child', {p_group: home2, p_login: temp.login, p_password: 'tttttt'}, dad2)).ok, true);
  await refused('lw_delete_child', {p_child: temp.id}, leeT, 'shared_child');
  await must('lw_remove_member', {p_group: home2, p_profile: temp.id}, dad2);
  await refused('lw_delete_child', {p_child: temp.id}, dad2, 'not_allowed');
  await must('lw_sync', {p_profile: temp.id, p_rounds: [round('Z')]}, await signIn(temp.login, 'tttttt'));
  await must('lw_delete_child', {p_child: temp.id}, leeT);
  assert.equal((await post('/auth/v1/token?grant_type=password', {email: temp.login + DOMAIN, password: 'tttttt'})).status, 400);
  const {rows: [{left}]} = await s.db.query('select (select count(*) from public.rounds where profile_id = $1) + (select count(*) from public.profiles where id = $1) + (select count(*) from auth.users where id = $1) as left', [temp.id]);
  assert.equal(Number(left), 0);
  ok('delete: a child account goes for good, only when no one else looks after them');

  // Leaving: an owner leaving hands the group on; the last grown-up leaving closes it.
  await must('lw_remove_member', {p_group: cls, p_profile: lee.id}, leeT);
  const [patelGroup] = await must('lw_groups', {}, patelT);
  assert.equal(patelGroup.role, 'owner');
  await must('lw_remove_member', {p_group: home, p_profile: mia.id}, dadT);
  await refused('lw_child_state', {p_child: mia.id}, dadT, 'not_allowed');
  await must('lw_remove_member', {p_group: home, p_profile: (await must('lw_me', {}, dadT)).id}, dadT);
  assert.deepEqual(await must('lw_groups', {}, dadT), []);
  await signIn(mia.login, '7234mk');
  ok('membership: hand-over on leave; removing a child from a group keeps their account');

  // The tables are closed to the API roles; only the functions are reachable.
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['profiles', 'groups', 'group_members', 'rounds', 'settings', 'badges', 'link_attempts']) {
      await assert.rejects(s.db.transaction(async tx => {await tx.exec(`set local role ${role}`); await tx.query(`select * from public.${table}`);}),
        /permission denied/, `${role} reading ${table}`);
    }
    await assert.rejects(s.db.transaction(async tx => {await tx.exec(`set local role ${role}`); await tx.query(`select lw_private.state(gen_random_uuid())`);}),
      /permission denied/);
  }
  for (const fn of ['lw_me', 'lw_sync', 'lw_groups', 'lw_create_child', 'lw_put_settings']) {
    const r = await rpc(fn, {});
    assert.notEqual(r.status, 200, `${fn} without signing in`);
  }
  const {rows: rls} = await s.db.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
  assert.deepEqual(rls, [], 'Row-level security is on for every table');
  const {rows: definer} = await s.db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'lw_private') and p.prosecdef and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false)`);
  assert.deepEqual(definer, [], 'Every security-definer function pins its search_path');
  ok('access: tables closed to anon and authenticated, RLS on, helpers unreachable, search_path pinned');

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
