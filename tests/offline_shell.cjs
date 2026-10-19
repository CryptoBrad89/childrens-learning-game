/* No dependencies. The service worker (sw.js) must store every file the games
 * need, so they work offline after the first load, and nothing that isn't
 * there. Also checks every page loads the accounts scripts in the right order. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const SHIPPED = /\.(html|css|js|jpg|mp3|woff2)$/;
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { if (!/^(\.|tests$|supabase$|node_modules$|reports$)/.test(entry.name)) walk(rel, out); }
    else if (SHIPPED.test(entry.name) && rel !== 'sw.js') out.push(rel);
  }
  return out;
}
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const listed = [...sw.matchAll(/^ {2}"([^"]+)",?$/gm)].map(m => m[1]);
const files = walk('').sort();
assert.deepEqual([...listed].sort(), files, 'sw.js FILES must list exactly the shipped files (add or remove entries, then bump VERSION)');
for (const file of listed) assert(fs.existsSync(path.join(root, file)), `Missing ${file}`);
assert.match(sw, /const VERSION = 'little-woof-shell-\d+'/);
console.log(`PASS offline shell: sw.js stores all ${files.length} shipped files`);

for (const page of ['index.html', 'grown-ups/index.html', 'v1-letter-post/index.html', 'v3-moonboat/index.html', 'v4-silk-thread/index.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => path.basename(m[1]));
  const at = name => scripts.indexOf(name);
  assert(at('config.js', 1) !== -1 && scripts.lastIndexOf('config.js') < at('accounts.js') && at('accounts.js') < at('settings.js'), `${page}: config, then accounts, then settings`);
}
const config = fs.readFileSync(path.join(root, 'accounts/config.js'), 'utf8');
assert.match(config, /key: 'sb_publishable_/, 'Only the publishable key ships');
assert(!/service_role|sb_secret_/.test(fs.readdirSync(path.join(root, 'accounts')).map(f => fs.readFileSync(path.join(root, 'accounts', f), 'utf8')).join('')), 'No secret keys in the client');
console.log('PASS pages: accounts load before settings everywhere; only the publishable key ships');
