/* Idempotent demo accounts for the served game.
 * Teacher  ada@littlewoof.test  / sunnyday
 * Class    Morning class         / SUNNY2
 * Child    maya                  / 7234ab   picture fox
 * Child    sam                   / 8811sa   picture owl
 * Parent   pat@littlewoof.test   / homepup  linked to maya
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const configText = fs.readFileSync(path.join(root, 'accounts', 'config.js'), 'utf8');
const url = configText.match(/url: '([^']+)'/)[1];
const key = configText.match(/key: '([^']+)'/)[1];

const DEMO = {
  teacher: {email: 'ada@littlewoof.test', password: 'sunnyday', display_name: 'Ada', role: 'teacher'},
  parent: {email: 'pat@littlewoof.test', password: 'homepup', display_name: 'Pat', role: 'parent'},
  classroom: {name: 'Morning class', code: 'SUNNY2'},
  children: [
    {display_name: 'Maya', login_name: 'maya', password: '7234ab', avatar: 'fox'},
    {display_name: 'Sam', login_name: 'sam', password: '8811sa', avatar: 'owl'}
  ]
};

async function api(pathname, body, token) {
  const response = await fetch(url + pathname, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = {error: text}; }
  return {ok: response.ok, status: response.status, data};
}

async function signup(person) {
  const result = await api('/functions/v1/accounts-public', person);
  if (result.ok) return;
  const session = await api('/auth/v1/token?grant_type=password', {email: person.email, password: person.password});
  if (session.ok) return;
  throw new Error(`signup closed and ${person.email} did not sign in: ${result.status} ${JSON.stringify(result.data)}`);
}

async function signIn(email, password) {
  const result = await api('/auth/v1/token?grant_type=password', {email, password});
  if (!result.ok) throw new Error(`sign in ${email} ${result.status}: ${JSON.stringify(result.data)}`);
  return result.data.access_token;
}

async function main() {
  await signup(DEMO.teacher);
  const teacher = await signIn(DEMO.teacher.email, DEMO.teacher.password);
  const room = await api('/rest/v1/rpc/create_classroom', {
    p_name: DEMO.classroom.name,
    p_code: DEMO.classroom.code
  }, teacher);
  if (!room.ok) throw new Error(`class ${room.status}: ${JSON.stringify(room.data)}`);
  if (room.data.code !== DEMO.classroom.code) {
    throw new Error(`Ada already has class ${room.data.code}, not ${DEMO.classroom.code}`);
  }
  for (const child of DEMO.children) {
    const made = await api('/functions/v1/accounts-manage', {action: 'create-child', ...child}, teacher);
    if (!made.ok && made.status !== 409) throw new Error(`child ${child.login_name} ${made.status}: ${JSON.stringify(made.data)}`);
  }
  await signup(DEMO.parent);
  const parent = await signIn(DEMO.parent.email, DEMO.parent.password);
  const link = await api('/functions/v1/accounts-manage', {
    action: 'link-child',
    login_name: 'maya',
    password: '7234ab'
  }, parent);
  if (!link.ok) throw new Error(`link ${link.status}: ${JSON.stringify(link.data)}`);
  const roster = await api('/rest/v1/rpc/my_roster', {}, parent);
  if (!roster.ok) throw new Error(`roster ${roster.status}: ${JSON.stringify(roster.data)}`);
  const names = (roster.data.children || []).map(child => child.login_name);
  if (!names.includes('maya')) throw new Error(`parent roster missing maya: ${JSON.stringify(roster.data)}`);
  console.log('PASS seed accounts');
  console.log('teacher ada@littlewoof.test / sunnyday');
  console.log('class Morning class / SUNNY2');
  console.log('child maya / 7234ab (fox)');
  console.log('child sam / 8811sa (owl)');
  console.log('parent pat@littlewoof.test / homepup (linked to maya)');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
