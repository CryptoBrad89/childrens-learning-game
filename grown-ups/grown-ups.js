/* Grown-ups' corner: a reading gate, then settings that save as they change. */
(() => {
'use strict';
const G = window.GROWN_UPS, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const PRESETS = {all: G.ALL, starter: [...'SATPIN'], vowels: [...'AEIOU']};
const PAUSE_MS = 10000;
let code = [], typed = [], misses = 0, pausedUntil = 0, checking = false, sample = null;

/* ---------- Gate ---------- */
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
  if (typed.every((d, i) => d === code[i])) { unlock(); return; }
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
  $('#gate').hidden = true;
  const settings = $('#settings');
  settings.hidden = false;
  requestAnimationFrame(() => { settings.dataset.open = 'true'; });
  $('#leave .fill-label').textContent = 'Lock and go to games';
  $('#leave .fill-layer .fill-label').textContent = 'Lock and go to games';
  document.body.dataset.view = 'settings';
  render();
  $('#sheet').focus({preventScroll: true}); window.scrollTo({top: 0});
}
function buildKeypad() {
  $('#keypad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-digit="${n}" aria-label="${WORDS[n]}">${n}</button>`).join('');
  $('#keypad').addEventListener('click', e => { const b = e.target.closest('[data-digit]'); if (b) press(Number(b.dataset.digit)); });
  document.addEventListener('keydown', e => {
    if (!$('#gate').hidden && /^[1-9]$/.test(e.key)) { e.preventDefault(); press(Number(e.key)); }
    else if (!$('#gate').hidden && e.key === 'Backspace' && !checking) { typed.pop(); renderSlots(); }
  });
}

/* ---------- Settings ---------- */
const current = () => ({...G.settings, letters: [...G.settings.letters], games: [...G.settings.games]});
function render() {
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
function commit(next, message = 'Saved.') {
  const ok = G.save(next);
  render();
  const status = $('#save-status');
  // Alternate a trailing space so screen readers announce a repeated "Saved.".
  status.dataset.flip = status.dataset.flip === '1' ? '0' : '1';
  status.textContent = ok ? message + (status.dataset.flip === '1' ? '\u00a0' : '') : 'Couldn\'t save. This browser is blocking storage, which often happens in private windows. Open the games in a normal window and try again.';
  status.classList.toggle('error', !ok);
  if (ok) stamp();
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
    const input = e.target, next = current();
    if (input.dataset.setting) {
      const name = input.dataset.setting;
      next[name] = input.type === 'checkbox' ? input.checked : Number(input.value);
      commit(next);
    } else if (input.dataset.game) {
      next.games = input.checked ? [...next.games, input.dataset.game] : next.games.filter(g => g !== input.dataset.game);
      if (!next.games.length) { refuse('Keep at least one world on, so there is something to play.'); return; }
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
    if (dialog.returnValue === 'reset') commit({...G.DEFAULTS}, 'Settings are back to how they started.');
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

buildKeypad(); newChallenge(); bindSettings(); render();
document.body.dataset.view = 'gate';
})();
