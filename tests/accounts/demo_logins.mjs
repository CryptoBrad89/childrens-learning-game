/* Makes the demo logins in the real project (LW_BACKEND=live) or the stand-in.
 * Every password is 7234ab. Safe to run again: existing accounts are reused.
 * There is no public sign-up: demo-grownup must already exist live (it does,
 * from the accounts build); locally the project owner's SQL function makes it.
 *   LW_BACKEND=live node tests/accounts/demo_logins.mjs */
import {backend} from './harness.mjs';

const PASSWORD = '7234ab';
const be = await backend();
async function tokenOr(login, make) {
  try { return await be.token(login, PASSWORD); } catch (e) { await make(); return be.token(login, PASSWORD); }
}
async function child(token, name, avatar) {
  const {children} = await be.rpc('lw_portal', {}, token);
  return children.find(c => c.name === name) || be.rpc('lw_add_child', {p_name: name, p_avatar: avatar, p_password: PASSWORD}, token);
}
try {
  const one = await tokenOr('demo-grownup', () => be.makeGrownup('demo-grownup', PASSWORD, 'Demo Grown-up'));
  // The second grown-up is made by the first, from the corner's "Add a grown-up".
  await tokenOr('demo-grownup2', () => be.rpc('lw_create_grownup', {p_login: 'demo-grownup2', p_password: PASSWORD, p_name: 'Second Grown-up'}, one));
  for (const [name, avatar] of [['Ava', 'cat:0'], ['Ben', 'fox:4'], ['Cleo', 'duck:2']]) await child(one, name, avatar);
  const portal = await be.rpc('lw_portal', {}, one);
  console.log(JSON.stringify({password: PASSWORD, grownups: ['demo-grownup', ...portal.grownups.map(g => g.login)],
    children: portal.children.map(c => `${c.name}: ${c.login}`)}, null, 2));
} finally { await be.close(); }
