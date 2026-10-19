/* Makes the demo logins in the real project (LW_BACKEND=live) or the stand-in.
 * Every password is 7234ab. Safe to run again: existing accounts are reused.
 *   LW_BACKEND=live node tests/accounts/demo_logins.mjs */
import {backend} from './harness.mjs';

const PASSWORD = '7234ab';
const be = await backend();
async function grownUp(login, name) {
  try { await be.rpc('lw_sign_up', {p_login: login, p_password: PASSWORD, p_name: name}); }
  catch (e) { if (!/login_taken/.test(e.message)) throw e; }
  return be.token(login, PASSWORD);
}
async function group(token, name) {
  const found = (await be.rpc('lw_groups', {}, token)).find(g => g.name === name);
  if (found) return found;
  const {id} = await be.rpc('lw_create_group', {p_kind: 'group', p_name: name}, token);
  return (await be.rpc('lw_groups', {}, token)).find(g => g.id === id);
}
async function child(token, g, name, avatar) {
  const fresh = (await be.rpc('lw_groups', {}, token)).find(x => x.id === g.id);
  return fresh.members.find(m => m.member_role === 'child' && m.name === name)
    || be.rpc('lw_create_child', {p_group: g.id, p_name: name, p_avatar: avatar, p_password: PASSWORD}, token);
}
try {
  const one = await grownUp('demo-grownup', 'Demo Grown-up');
  const two = await grownUp('demo-grownup2', 'Second Grown-up');
  const sunflowers = await group(one, 'Demo Sunflowers');
  const kids = [];
  for (const [name, avatar] of [['Ava', 'cat:0'], ['Ben', 'fox:4'], ['Cleo', 'duck:2']]) kids.push(await child(one, sunflowers, name, avatar));
  // The second grown-up looks after the first group too, and has a group of their own
  // with a new child plus Ava (one child in two groups, looked after by two grown-ups).
  await be.rpc('lw_join_group', {p_invite: sunflowers.invite_code}, two);
  const evenings = await group(two, 'Demo Evenings');
  kids.push(await child(two, evenings, 'Dev', 'rabbit:5'));
  await be.rpc('lw_link_child', {p_group: evenings.id, p_login: kids[0].login, p_password: PASSWORD}, two);
  const groups = await be.rpc('lw_groups', {}, two);
  console.log(JSON.stringify({password: PASSWORD, grownups: ['demo-grownup', 'demo-grownup2'],
    groups: groups.map(g => ({name: g.name, board_code: g.board_code, invite_code: g.invite_code,
      children: g.members.filter(m => m.member_role === 'child').map(m => `${m.name}: ${m.login}`),
      grownups: g.members.filter(m => m.member_role !== 'child').map(m => m.login)}))}, null, 2));
} finally { await be.close(); }
