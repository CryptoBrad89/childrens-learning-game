/* Live permission checks on shkmpxaejiuqzejsdwyr.
 * Creates disposable people and deletes them by the id the server returned.
 * Does not reset or rename any pre-existing account.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const configText = fs.readFileSync(path.join(__dirname, '..', 'accounts', 'config.js'), 'utf8');
const url = configText.match(/url: '([^']+)'/)[1];
const key = configText.match(/key: '([^']+)'/)[1];
assert.equal(url, 'https://shkmpxaejiuqzejsdwyr.supabase.co');

async function call(pathname, body, token) {
  const response = await fetch(url + pathname, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (error) { data = {raw: text}; }
  return {status: response.status, data};
}

function suffix() { return Math.random().toString(36).slice(2, 8); }

async function run() {
  const anon = await call('/functions/v1/accounts-manage', {action: 'create-child'});
  assert.equal(anon.status, 401, 'anonymous manage is refused');

  const ada = await call('/auth/v1/token?grant_type=password', {email: 'ada@littlewoof.test', password: 'sunnyday'});
  assert.equal(ada.status, 200, 'grown-up test sign-in');
  const token = ada.data.access_token;
  const roster = await call('/rest/v1/rpc/my_roster', {}, token);
  assert.equal(roster.status, 200);
  assert.equal(roster.data.is_master, false, 'the test grown-up is not the master');
  assert.equal(Array.isArray(roster.data.grownups) ? roster.data.grownups.length : 0, 0);

  const blocked = await call('/functions/v1/accounts-manage', {
    action: 'create-grownup', display_name: 'Nope', login_name: 'nopezz', password: '7234ab'
  }, token);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.code, 'not-master');

  const tag = suffix();
  const login = `c${tag}`.replace(/[^a-z0-9]/g, '').slice(0, 12);
  const created = await call('/functions/v1/accounts-manage', {
    action: 'create-child', display_name: 'Call List Kid', login_name: login, password: '7234ab', avatar: 'garden'
  }, token);
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const childId = created.data.id;
  assert.match(childId, /^[0-9a-f-]{36}$/);
  const extraIds = [];
  try {
    const progress = await call('/rest/v1/rpc/kid_progress', {p_user_id: childId}, token);
    assert.equal(progress.status, 200, JSON.stringify(progress.data));
    assert.equal(progress.data.ok, true);

    const stranger = await call('/rest/v1/rpc/kid_progress', {p_user_id: '00000000-0000-4000-8000-000000000099'}, token);
    assert.ok(stranger.status === 401 || stranger.status === 403, `expected not-linked, got ${stranger.status}`);
    assert.match(JSON.stringify(stranger.data), /not-linked/);

    const childSession = await call('/auth/v1/token?grant_type=password', {email: `${login}@players.littlewoof.app`, password: '7234ab'});
    assert.equal(childSession.status, 200);
    const childToken = childSession.data.access_token;
    const childManage = await call('/functions/v1/accounts-manage', {action: 'create-child', display_name: 'Nope', login_name: 'nopezz', password: '7234ab'}, childToken);
    assert.equal(childManage.status, 403);
    assert.equal(childManage.data.error, 'not-allowed');

    const touch = await call('/rest/v1/rpc/touch_session', {p_start: false, p_peek: true}, token);
    assert.equal(touch.status, 200, JSON.stringify(touch.data));
    assert.equal(touch.data.limit, 'inactivity');

    const blockedDelete = await call('/functions/v1/accounts-manage', {action: 'delete-child', child_id: childId}, token);
    assert.equal(blockedDelete.status, 403);
    assert.equal(blockedDelete.data.code, 'password');
    const wrongDelete = await call('/functions/v1/accounts-manage', {action: 'delete-child', child_id: childId, confirm_password: 'not-the-secret'}, token);
    assert.equal(wrongDelete.status, 403);
    assert.equal(wrongDelete.data.code, 'password');
    const stillThere = await call('/auth/v1/token?grant_type=password', {email: `${login}@players.littlewoof.app`, password: '7234ab'});
    assert.equal(stillThere.status, 200, 'a wrong secret does not delete the child');

    const rename = await call('/functions/v1/accounts-manage', {
      action: 'update-child', child_id: childId, display_name: 'Call List Kid', login_name: `${login}x`, avatar: 'garden'
    }, token);
    assert.equal(rename.status, 403);
    assert.equal(rename.data.code, 'password');

    for (let i = 0; i < 2; i++) {
      const extraLogin = `b${tag}${i}`.replace(/[^a-z0-9]/g, '').slice(0, 12);
      const extra = await call('/functions/v1/accounts-manage', {
        action: 'create-child', display_name: `Batch ${i}`, login_name: extraLogin, password: '7234ab', avatar: 'nap'
      }, token);
      assert.equal(extra.status, 200, JSON.stringify(extra.data));
      extraIds.push(extra.data.id);
    }
    const bulk = await call('/functions/v1/accounts-manage', {
      action: 'delete-child', child_ids: [childId, ...extraIds], confirm_password: 'sunnyday'
    }, token);
    assert.equal(bulk.status, 200, JSON.stringify(bulk.data));
    assert.equal(bulk.data.results.filter(row => row.ok).length, 3);
  } finally {
    await call('/functions/v1/accounts-manage', {
      action: 'delete-child',
      child_ids: [childId, ...extraIds],
      confirm_password: 'sunnyday'
    }, token);
  }

  const gone = await call('/auth/v1/token?grant_type=password', {email: `${login}@players.littlewoof.app`, password: '7234ab'});
  assert.notEqual(gone.status, 200, 'the disposable child login is gone');
  console.log('PASS call list live: anonymous 401, child 403, not-linked, disposable child removed by id');
}

run().catch(error => { console.error(error); process.exit(1); });
