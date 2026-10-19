/* No dependencies. The game is "Letters with Lucy" and the third layout is
 * "Ribbon Road": no old names in any page, script, style, doc or test.
 * Internal keys that are stored on devices or in the database keep their
 * spelling (listed below), because renaming them would orphan saved data. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');

// Build reports (reports/) and the applied migrations are records and are not edited;
// the two name tests hold the old names as patterns to look for.
const RECORDS = new Set(['reports/accounts-build.md', 'supabase/migrations/20261019120000_accounts_schema.sql',
  'supabase/migrations/20261019120100_accounts_functions.sql', 'tests/names_check.cjs', 'tests/home_flow.mjs']);
const OLD = [/little[\s ]*woof/i, /silk[\s ]+(thread|road)/i, /children['’]s learning game/i, /learning game/i];
// Internal identifiers that keep the old spelling on purpose.
const KEYS = [/little-woof-'\s*\+/g, /little-woof-\$\{/g, /'little-woof-shell-[\w-]*'?/g, /accounts\.little-woof\.invalid/g, /little-woof-db-tests/g];

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {cwd: root, encoding: 'utf8'})
  .split('\n').filter(f => /\.(html|css|js|cjs|mjs|md|py|json|sql)$/.test(f) && !RECORDS.has(f) && !f.startsWith('reports/') && fs.existsSync(path.join(root, f)));
const failures = [];
for (const file of files) {
  let text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const key of KEYS) text = text.replace(key, '');
  text.split('\n').forEach((line, i) => {
    for (const re of OLD) if (re.test(line)) failures.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
}
assert.deepEqual(failures, [], 'Old names still in use');
assert(!fs.existsSync(path.join(root, 'v4-silk-thread')), 'The layout folder is v4-ribbon-road');
for (const page of ['index.html', 'grown-ups/index.html', 'v1-letter-post/index.html', 'v3-moonboat/index.html', 'v4-ribbon-road/index.html']) {
  const title = fs.readFileSync(path.join(root, page), 'utf8').match(/<title>([^<]+)<\/title>/)[1];
  assert.match(title, /Letters with Lucy$/, `${page}: title ends with the game's name`);
}
const config = fs.readFileSync(path.join(root, 'v4-ribbon-road/config.js'), 'utf8');
assert.match(config, /title: 'Lucy’s Ribbon Road'/);
console.log(`PASS names: Letters with Lucy and Ribbon Road across ${files.length} files; every page title ends with the game's name`);
