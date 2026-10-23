/* Source checks for the password step and the missing bulk cap. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const grown = read('accounts/grown.js');
const account = read('accounts/account.js');
const manage = read('supabase/functions/accounts-manage/index.ts');
const sql = read('supabase/migrations/20261021063000_risky_actions.sql');
const settings = read('grown-ups/index.html');
const silk = read('v4-silk-thread/config.js');
const baseSilk = require('node:child_process').execSync('git show 0d01cc60678b78e552d6498a6dba6eea0f5b5a35:v4-silk-thread/config.js', {cwd: root, encoding: 'utf8'});

assert.equal(grown.includes('Type delete'), false);
assert.equal(grown.includes("!== 'delete'"), false);
assert.equal(account.includes('Type delete'), false);
assert.match(grown, /type="password"/);
assert.match(grown, /confirm_password/);
assert.match(account, /confirm_password/);
assert.match(settings, /Reset all settings/);
assert.equal(sql.includes('update auth.users'), false);
assert.match(sql, /extensions\.crypt/);

const cap = /too many|at most \d+|selection limit|bulk cap|only \d+ (kids|grown|accounts)/i;
assert.equal(cap.test(grown), false);
assert.equal(cap.test(manage), false);
assert.equal(cap.test(sql), false);

function sliceFn(source, name, next) {
  const start = source.indexOf(`async function ${name}`);
  const end = source.indexOf(`async function ${next}`);
  assert.ok(start >= 0 && end > start, name);
  return source.slice(start, end);
}

const createGrown = sliceFn(manage, 'createGrownup', 'saveIdentity');
assert.ok(createGrown.indexOf('callerIsMaster') < createGrown.indexOf('secretOk'));
assert.ok(createGrown.indexOf('secretOk') < createGrown.indexOf('createUser'));

const link = sliceFn(manage, 'linkChildren', 'resetPassword');
assert.equal(link.includes('secretOk'), false);
const createChild = sliceFn(manage, 'createChild', 'linkChildren');
assert.equal(createChild.includes('secretOk'), false);

for (const name of ['deleteChild', 'deleteGrownup', 'unlinkChild', 'transferChild', 'resetProgress', 'resetPassword']) {
  assert.match(manage, new RegExp(`async function ${name}[\\s\\S]*secretOk`), name);
}

assert.equal(silk, baseSilk, 'Ribbon Road copy is unchanged from 0d01cc6');
const header = read('v1-letter-post/app.js');
assert.match(header, /id="player-chip"/);
assert.match(header, /id="theme"/);
assert.ok(header.indexOf('id="player-chip"') < header.indexOf('id="theme"'), 'theme chooser stays after the picture');

console.log('PASS risky actions: password step, no bulk cap, Ribbon Road copy unchanged');
