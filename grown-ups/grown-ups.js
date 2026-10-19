/* Grown-ups' corner: a grown-up signs in on the same card as the children's
 * sign-in, then manages their children and the children's settings, which save
 * as they change. A grown-up who stays signed in on their own device passes
 * the reading gate to come back in. Children and grown-ups are handled in
 * people.js. */
(() => {
'use strict';
const G = window.GROWN_UPS, L = window.LW, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const PRESETS = {all: G.ALL, starter: [...'SATPIN'], vowels: [...'AEIOU']};
const PAUSE_MS = 10000, GATE_OK = 'lw:gate-ok';
let code = [], typed = [], misses = 0, pausedUntil = 0, checking = false, sample = null;
const esc = s => window.LW_PICTURES ? window.LW_PICTURES.esc(s) : String(s);

/* ---------- shared with people.js ---------- */
const C = window.CORNER = {
  me: () => L.grownup(),
  // The last copy of {me, children, grownups} from the server, kept for offline use.
  portal: () => (C.me() && L.cache('portal:' + C.me().id)) || {children: [], grownups: []},
  children: () => C.portal().children || [],
  target: {kind: 'all'},
  // The children a settings change goes to.
  ids(target = C.target) {
    if (target.kind === 'child') return C.children().some(k => k.id === target.id) ? [target.id] : [];
    return C.children().map(k => k.id);
  },
  label(target = C.target) {
    if (target.kind === 'child') return target.name;
    const n = C.ids(target).length;
    return n === 1 ? C.children()[0].name : `all ${n} children`;
  },
  render: () => {}, renderTarget, setTarget, refresh: async () => {},
  // A child who was removed or deleted can't stay picked.
  retarget() { if (!C.ids().length) C.target = {kind: 'all'}; }
};

/* ---------- views ---------- */
function show(view) {
  document.body.dataset.view = view;
  for (const id of ['signin', 'gate']) {
    const d = $('#' + id);
    if (id === view && !d.open) d.showModal();
    else if (id !== view && d.open) d.close();
  }
  $('#portal').hidden = view !== 'portal';
  $('#top-actions').hidden = view !== 'portal';
  $('.leave-label').textContent = view === 'portal' ? (L.keptGrownup() ? 'Lock and go to the games' : 'Sign out and go to the games') : 'Back to the games';
}
function start() {
  const me = C.me();
  if (!me) { openSignin(); return; }
  let passed = false;
  try { passed = sessionStorage.getItem(GATE_OK) === me.id; } catch (e) { passed = false; }
  if (L.keptGrownup() && !passed) { $('#gate-name').textContent = me.name; newChallenge(); show('gate'); return; }
  openPortal();
}
function openPortal() {
  const me = C.me();
  G.apply(G.load(me.id));
  C.retarget();
  show('portal');
  renderHello(); renderTarget(); render(); C.render();
  window.scrollTo({top: 0});
  $('#title').focus({preventScroll: true});
  C.refresh().then(() => { C.retarget(); renderHello(); renderTarget(); render(); C.render(); });
}
function renderHello() {
  const me = C.me(); if (!me) return;
  $('#hello').textContent = `Hello, ${me.name}. Add children, choose their settings and see how they're getting on.`;
  $('#you-line').textContent = `You sign in as ${me.login}.`;
}

/* ---------- sign-in ---------- */
const SIGNIN_ERRORS = {
  bad_login: 'That sign-in name and password don\'t match. Check both and try again.',
  grownups_only: 'That\'s a child\'s account. Children sign in on the games page.',
  needs_internet: 'This device is offline, and you haven\'t signed in here before. Connect to the internet once, then try again.',
  offline: 'This device is offline. Connect to the internet, then try again.',
  slow_down: 'Too many tries in a row. Wait a minute, then try again.',
  not_set_up: 'Accounts aren\'t set up in this copy of the game.'
};
function openSignin() {
  $('#signin-password').value = ''; $('#signin-password').type = 'password'; $('#signin-show').textContent = 'Show';
  $('#signin-status').textContent = '';
  $('#signin-offline').hidden = navigator.onLine !== false;
  dots();
  show('signin');
  $('#signin-login').focus();
}
async function signin(e) {
  e.preventDefault();
  const login = $('#signin-login').value.trim(), password = $('#signin-password').value, status = $('#signin-status'), go = $('#signin-go');
  if (!login) { status.textContent = 'Type your sign-in name.'; $('#signin-login').focus(); return; }
  if (password.length < 6) { status.textContent = 'Passwords have at least six characters.'; $('#signin-password').focus(); return; }
  go.disabled = true; go.textContent = 'Signing in…'; status.textContent = '';
  try {
    await L.signIn(login, password, {as: 'grownup', keep: $('#signin-keep').checked});
    try { sessionStorage.setItem(GATE_OK, C.me().id); } catch (err) { /* the gate shows again next time */ }
    $('#signin-password').value = '';
    openPortal();
  } catch (err) {
    status.textContent = SIGNIN_ERRORS[err.code] || 'Couldn\'t reach the sign-in service just now. Check the internet connection and try again.';
  } finally { go.disabled = false; go.textContent = 'Sign in'; dots(); }
}
function signout() {
  L.endCorner();
  try { sessionStorage.removeItem(GATE_OK); } catch (e) { /* nothing kept */ }
  C.target = {kind: 'all'};
  $('#signin-login').value = '';
  openSignin();
}
function dots() {
  const n = $('#signin-password').value.length;
  $$('#signin-dots i').forEach((dot, i) => dot.classList.toggle('on', i < n));
  $('#signin-dots span').textContent = n >= 6 ? 'Ready' : `${6 - n} more`;
}

/* ---------- gate (for a grown-up who stays signed in) ---------- */
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
// No easy runs (1-2-3, 9-8-7): those are what small fingers tap by chance.
function easyRun([a, b, c]) { return (b - a === 1 && c - b === 1) || (a - b === 1 && b - c === 1); }
function newChallenge() {
  do code = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3); while (easyRun(code));
  typed = [];
  $('#challenge').innerHTML = code.map(n => `<span>${WORDS[n]}</span>`).join('<i aria-hidden="true">·</i>');
  $('#challenge').setAttribute('aria-label', code.map(n => WORDS[n]).join(', '));
  renderSlots();
}
function renderSlots() {
  $$('#slots span').forEach((slot, i) => {
    const filled = i < typed.length;
    slot.textContent = filled ? String(typed[i]) : '';
    slot.classList.toggle('filled', filled);
  });
}
function setPaused(on) {
  $$('#keypad button').forEach(b => { b.disabled = on; });
  $('#keypad').toggleAttribute('data-paused', on);
}
function press(digit) {
  if (checking || Date.now() < pausedUntil || typed.length >= 3) return;
  typed.push(digit); renderSlots();
  if (typed.length === 3) check();
}
function check() {
  checking = true;
  if (typed.every((d, i) => d === code[i])) { checking = false; unlock(); return; }
  misses++;
  $('#slots').classList.remove('wrong'); void $('#slots').offsetWidth; $('#slots').classList.add('wrong');
  if (misses % 3 === 0) {
    pausedUntil = Date.now() + PAUSE_MS; setPaused(true); typed = []; renderSlots();
    $('#gate-status').textContent = 'Not quite. Let\'s pause for 10 seconds, then try a new set of numbers.';
    setTimeout(() => { setPaused(false); checking = false; newChallenge(); $('#gate-status').textContent = 'Ready. Here is a new set of numbers.'; }, PAUSE_MS);
  } else {
    $('#gate-status').textContent = 'Not quite. Here is a new set of numbers to tap.';
    setTimeout(() => { checking = false; newChallenge(); }, 650);
  }
}
function unlock() {
  try { sessionStorage.setItem(GATE_OK, C.me().id); } catch (e) { /* this visit only */ }
  $('#gate-status').textContent = '';
  openPortal();
}
function buildKeypad() {
  $('#keypad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-digit="${n}" aria-label="${WORDS[n]}">${n}</button>`).join('');
  $('#keypad').addEventListener('click', e => { const b = e.target.closest('[data-digit]'); if (b) press(Number(b.dataset.digit)); });
  document.addEventListener('keydown', e => {
    if (!$('#gate').open) return;
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); press(Number(e.key)); }
    else if (e.key === 'Backspace' && !checking) { typed.pop(); renderSlots(); }
  });
}

/* ---------- whose settings ---------- */
function renderTarget() {
  const me = C.me(); if (!me) return;
  const kids = C.children(), none = !kids.length;
  $('#settings-body').hidden = none; $('#settings-empty').hidden = !none;
  $('#target').closest('label').hidden = none;
  $('#target-note').hidden = none;
  if (none) return;
  $('#target').innerHTML = (kids.length > 1 ? `<option value="all">All children (${kids.length})</option>` : '')
    + kids.map(k => `<option value="child:${k.id}">${esc(k.name)}</option>`).join('');
  // With one child, "all children" is just that child.
  $('#target').value = C.target.kind === 'child' ? `child:${C.target.id}` : kids.length === 1 ? `child:${kids[0].id}` : 'all';
  const n = C.ids().length;
  $('#target-note').textContent = C.target.kind === 'child' ? `Changes go to ${C.target.name} only.`
    : n === 1 ? `Changes go to ${kids[0].name}.` : `Changes go to all ${n} children. Shown: ${kids[0].name}'s current settings.`;
  $('#confirm-who').textContent = C.label();
}
function setTarget(target) {
  C.target = target; renderTarget(); render(); C.render();
}

/* ---------- settings ---------- */
const current = () => ({...G.settings, letters: [...G.settings.letters], games: [...G.settings.games]});
function render() {
  if (!C.me()) return;
  G.settings = G.load(C.ids()[0] || C.me().id);
  const s = G.settings;
  $$('input[data-setting]').forEach(input => {
    const name = input.dataset.setting;
    if (input.type === 'checkbox') input.checked = s[name];
    else if (input.type === 'radio') input.checked = Number(input.value) === s[name];
    else input.value = s[name];
  });
  $('#volume-value').textContent = `${s.volume}%`;
  $('#volume').style.setProperty('--fill', `${s.volume}%`);
  $('#volume').setAttribute('aria-valuetext', `${s.volume} percent`);
  $$('[data-game]').forEach(input => { input.checked = s.games.includes(input.dataset.game); });
  $$('#letter-grid button').forEach(b => b.setAttribute('aria-pressed', String(s.letters.includes(b.dataset.letter))));
  for (const [name, set] of Object.entries(PRESETS)) {
    $(`[data-preset="${name}"]`).setAttribute('aria-pressed', String(set.length === s.letters.length && set.every(l => s.letters.includes(l))));
  }
  const n = s.letters.length;
  $('#letter-count').textContent = n === 26 ? 'All 26 letters are in play.' : `${n} of 26 letters in play: ${s.letters.join(' ').toLowerCase()}.`;
  const checked = [...$$('#hint input')].findIndex(input => input.checked);
  $('#hint .segments').style.setProperty('--index', Math.max(0, checked));
}
function commit(next, message) {
  const ids = C.ids(), diff = G.changes(G.settings, next);
  if (!ids.length) return;
  const ok = !Object.keys(diff).length || L.setSettings(C.me().id, ids, diff);
  render();
  const status = $('#save-status');
  // Alternate a trailing space so screen readers announce a repeated message.
  status.dataset.flip = status.dataset.flip === '1' ? '0' : '1';
  const text = (message || `Saved for ${C.label()}.`) + (navigator.onLine === false ? ' It uploads when this device is back online.' : '');
  status.textContent = ok ? text + (status.dataset.flip === '1' ? ' ' : '') : 'Couldn\'t save. This browser is blocking storage, which often happens in private windows. Open the corner in a normal window and try again.';
  status.classList.toggle('error', !ok);
  if (ok) stamp();
  C.render();
}
function stamp() {
  const el = $('#stamp');
  el.classList.remove('landed'); void el.offsetWidth; el.classList.add('landed');
}
function refuse(message) {
  const status = $('#save-status');
  status.textContent = message; status.classList.add('error');
  render();
}
function bindSettings() {
  $('#letter-grid').innerHTML = G.ALL.map(l => `<button type="button" data-letter="${l}" aria-pressed="true" aria-label="Letter ${l}">${l}<small>${l.toLowerCase()}</small></button>`).join('');
  document.addEventListener('change', e => {
    const input = e.target;
    if (input.id === 'target') {
      if (input.value === 'all') { setTarget({kind: 'all'}); return; }
      const id = input.value.split(':')[1], kid = C.children().find(k => k.id === id);
      setTarget({kind: 'child', id, name: kid ? kid.name : 'this child'}); return;
    }
    if (!C.me() || $('#portal').hidden) return;
    const next = current();
    if (input.dataset.setting) {
      const name = input.dataset.setting;
      next[name] = input.type === 'checkbox' ? input.checked : Number(input.value);
      commit(next);
    } else if (input.dataset.game) {
      next.games = input.checked ? [...next.games, input.dataset.game] : next.games.filter(g => g !== input.dataset.game);
      if (!next.games.length) { refuse('Keep at least one game on, so there is something to play.'); return; }
      commit(next);
    }
  });
  $('#volume').addEventListener('input', e => {
    $('#volume-value').textContent = `${e.target.value}%`;
    e.target.style.setProperty('--fill', `${e.target.value}%`);
  });
  $('#letter-grid').addEventListener('click', e => {
    const b = e.target.closest('[data-letter]'); if (!b) return;
    const next = current(), l = b.dataset.letter;
    next.letters = next.letters.includes(l) ? next.letters.filter(x => x !== l) : [...next.letters, l];
    if (!next.letters.length) { refuse('Keep at least one letter, so there is something to play.'); return; }
    commit(next);
  });
  $('.presets').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    commit({...current(), letters: [...PRESETS[b.dataset.preset]]});
  });
  $('#sample').addEventListener('click', playSample);
  const dialog = $('#confirm');
  $('#reset').addEventListener('click', () => { dialog.showModal(); $('#confirm-reset').focus(); });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'reset') commit({...G.DEFAULTS}, `Settings are back to how they started for ${C.label()}.`);
    $('#reset').focus();
  });
}
async function playSample() {
  const A = window.GAME_AUDIO; if (!A) return;
  if (sample) { sample.pause(); sample = null; }
  const volume = G.settings.volume / 100, button = $('#sample');
  button.setAttribute('aria-busy', 'true');
  for (const file of [A.letters.A.name, A.letters.A.sound]) {
    const clip = new Audio(file); clip.volume = volume; sample = clip;
    const ok = await new Promise(resolve => { clip.onended = () => resolve(true); clip.onerror = () => resolve(false); clip.play().catch(() => resolve(false)); });
    if (!ok || sample !== clip) break;
  }
  button.removeAttribute('aria-busy');
}

/* ---------- wiring ---------- */
$('#signin-form').addEventListener('submit', signin);
$('#signin-password').addEventListener('input', dots);
$('#signin-show').addEventListener('click', e => {
  const input = $('#signin-password'), shown = input.type === 'password';
  input.type = shown ? 'text' : 'password'; e.target.textContent = shown ? 'Hide' : 'Show'; e.target.setAttribute('aria-pressed', String(shown));
});
// Like the children's sign-in, these cards are the way in: Escape doesn't close them onto an empty page.
for (const id of ['#signin', '#gate']) $(id).addEventListener('cancel', e => e.preventDefault());
$('#gate-signout').addEventListener('click', signout);
$('#signout').addEventListener('click', signout);
$('#leave').addEventListener('click', () => {
  if (C.me() && !L.keptGrownup()) L.endCorner();
  try { sessionStorage.removeItem(GATE_OK); } catch (e) { /* nothing kept */ }
});
const online = () => { $('#signin-offline').hidden = navigator.onLine !== false; };
window.addEventListener('online', online); window.addEventListener('offline', online);
L.on('change', () => { if (!$('#portal').hidden && !document.querySelector('#form-dialog[open],#confirm[open]')) { render(); C.render(); } });

buildKeypad(); bindSettings(); dots();
// people.js (loaded next) fills in the children, grown-ups and device parts first.
document.addEventListener('DOMContentLoaded', start);
})();
