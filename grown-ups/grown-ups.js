/* Grown-ups' corner: a reading gate, then settings that save as they change. */
(async () => {
'use strict';
if(location.protocol !== 'file:'){
  if(!window.ACCOUNTS){location.replace('../accounts/index.html');return;}
  await window.ACCOUNTS.ready;
  if(window.ACCOUNTS.profile?.role!=='grownup'){location.replace('../accounts/index.html');return;}
  await window.ACCOUNTS.sync();
  window.GROWN_UPS.settings=window.GROWN_UPS.load();
}
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
const A=window.ACCOUNTS, hosted=location.protocol!=='file:';
let targets=[], children=[], draft={...G.settings}, patch={}, mixed=new Set(), applying=false;
const LABELS={voice:"Lucy's voice",volume:'Voice volume',effects:'Sound effects',calm:'Calm motion',letters:'Letters',hintAfter:'Help when stuck',games:'Worlds',kidControls:"Children's buttons"};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const current = () => structuredClone(draft);
function scopeValues(){
  const source=targets.length?targets.map(id=>G.normalize(A.effectiveSettings(id))):[hosted?G.normalize(A.gameDefaults):G.load()];
  draft=structuredClone(source[0]);patch={};mixed=new Set(Object.keys(LABELS).filter(key=>source.some(s=>!same(s[key],source[0][key]))));
  render();
}
function renderScope(){
  if(!hosted)return;
  const custom=targets.filter(id=>Object.keys(A.childOverrides[id]||{}).length).length;
  $('#scope-state').textContent=targets.length?`Editing ${targets.length} ${targets.length===1?'child':'children'} · ${custom===0?'Using game defaults':custom===targets.length?'Custom for '+(targets.length===1?'this child':'these children'):`${custom} custom; ${targets.length-custom} using game defaults`}`:'Editing game defaults';
  const remaining=[...mixed].filter(key=>!(key in patch));
  $('#mixed-summary').textContent=remaining.length?'Mixed: '+remaining.map(key=>LABELS[key]).join(', ')+'. Only settings you change will be applied.':'';
  $('#apply-children').hidden=!targets.length;$('#apply-children').disabled=!Object.keys(patch).length||applying;
  $('#apply-children').textContent=Object.keys(patch).length?`Review ${Object.keys(patch).length} ${Object.keys(patch).length===1?'change':'changes'} for ${targets.length} ${targets.length===1?'child':'children'}`:'Review changes';
  $('#discard-settings').hidden=!Object.keys(patch).length;
  $('#reset').textContent=targets.length?'Reset to game defaults':'Reset all settings';
}
function summarize(value){return Array.isArray(value)?value.join(', '):typeof value==='boolean'?(value?'On':'Off'):String(value);}
async function setupScope(){
  if(!hosted)return;
  $('#settings-scope').hidden=false;
  const links=await A.rest('guardians?adult_id=eq.'+A.profile.id+'&select=child_id');
  const ids=links.map(row=>row.child_id);
  children=ids.length?await A.rest('profiles?id=in.('+ids.join(',')+')&select=id,display_name,handle&order=display_name'):[];
  for(const child of children){
    const label=document.createElement('label');label.className='child-chip';
    const input=document.createElement('input');input.type='checkbox';input.value=child.id;
    const span=document.createElement('span');span.textContent=child.display_name+' ('+child.handle+')';label.append(input,span);$('#settings-child-list').append(label);
    input.addEventListener('change',()=>{targets=$$('#settings-child-list input:checked').map(n=>n.value);scopeValues();});
  }
  $$('[name=scope]').forEach(input=>input.addEventListener('change',()=>{
    const selecting=$('[name=scope]:checked').value==='children';$('#settings-children').hidden=!selecting;
    if(selecting&&!targets.length&&children.length){$('#settings-child-list input').checked=true;targets=[children[0].id];}
    if(!selecting){targets=[];$$('#settings-child-list input').forEach(n=>{n.checked=false;});}
    scopeValues();
  }));
  if(A.owner?.role==='child'){
    $('[name=scope][value=children]').checked=true;$('#settings-children').hidden=false;
    const input=$$('#settings-child-list input').find(n=>n.value===A.owner.id);if(input){input.checked=true;targets=[input.value];}
  }
  $('#discard-settings').addEventListener('click',scopeValues);
  $('#apply-children').addEventListener('click',()=>{
    $('#settings-confirm-title').textContent=`Apply to ${targets.length} ${targets.length===1?'child':'children'}?`;
    const names=children.filter(c=>targets.includes(c.id)).map(c=>c.display_name+' ('+c.handle+')');
    $('#settings-confirm-copy').textContent=names.join(', ')+': '+Object.entries(patch).map(([key,value])=>LABELS[key]+' → '+summarize(value)).join('; ')+'. Other settings stay as they are.';
    $('#settings-confirm-result').textContent='';$('#confirm-settings').showModal();$('#cancel-settings').focus();
  });
  $('#cancel-settings').addEventListener('click',()=>$('#confirm-settings').close());
  $('#confirm-settings-action').addEventListener('click',async()=>{
    if(applying)return;applying=true;$('#confirm-settings-action').disabled=true;
    try{await A.applySettings(targets,patch);$('#confirm-settings').close();scopeValues();$('#save-status').textContent='Settings saved for '+targets.length+' '+(targets.length===1?'child.':'children.');stamp();}
    catch(error){$('#settings-confirm-result').textContent=error.message;}
    finally{applying=false;$('#confirm-settings-action').disabled=false;renderScope();}
  });
  scopeValues();
}
function render() {
  const s = draft;
  renderScope();
  $$('input[data-setting]').forEach(input => {
    const name = input.dataset.setting;
    if (input.type === 'checkbox') {input.checked=s[name];input.indeterminate=mixed.has(name)&&!(name in patch);}
    else if (input.type === 'radio') input.checked = (!mixed.has(name)||(name in patch)) && Number(input.value) === s[name];
    else input.value = s[name];
  });
  $('#volume-value').textContent = mixed.has('volume')&&!('volume' in patch)?'Mixed':`${s.volume}%`;
  $('#volume').style.setProperty('--fill', `${s.volume}%`);
  $('#volume').setAttribute('aria-valuetext', `${s.volume} percent`);
  $$('[data-game]').forEach(input => { input.checked=s.games.includes(input.dataset.game);input.indeterminate=mixed.has('games')&&!('games' in patch); });
  $$('#letter-grid button').forEach(b => b.setAttribute('aria-pressed', mixed.has('letters')&&!('letters' in patch)?'mixed':String(s.letters.includes(b.dataset.letter))));
  for (const [name, set] of Object.entries(PRESETS)) {
    $(`[data-preset="${name}"]`).setAttribute('aria-pressed', String((!mixed.has('letters')||('letters' in patch)) && set.length === s.letters.length && set.every(l => s.letters.includes(l))));
  }
  const n = s.letters.length;
  $('#letter-count').textContent = n === 26 ? 'All 26 letters are in play.' : `${n} of 26 letters in play: ${s.letters.join(' ').toLowerCase()}.`;
  const checked = [...$$('#hint input')].findIndex(input => input.checked);
  $('#hint .segments').style.setProperty('--index', Math.max(0, checked));
}
async function commit(next, message = 'Saved.', touched=Object.keys(LABELS)) {
  if(hosted){
    if($('[name=scope]:checked').value==='children'&&!targets.length){refuse('Choose at least one child first.');return;}
    const changes=Object.fromEntries(touched.map(key=>[key,next[key]]));
    if(targets.length){draft=G.normalize(next);Object.assign(patch,changes);render();$('#save-status').textContent='Changes ready. Review and apply to save.';return;}
    try{await A.applySettings([],changes);draft=G.normalize(A.gameDefaults);render();$('#save-status').textContent=message;stamp();}
    catch(error){$('#save-status').textContent=error.message;$('#save-status').classList.add('error');}
    return;
  }
  let ok = G.save(next);draft={...G.settings};
  try { await G.whenSaved; } catch { ok = false; }
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
      commit(next,'Saved.',[name]);
    } else if (input.dataset.game) {
      next.games = input.checked ? [...next.games, input.dataset.game] : next.games.filter(g => g !== input.dataset.game);
      if (!next.games.length) { refuse('Keep at least one world on, so there is something to play.'); return; }
      commit(next,'Saved.',['games']);
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
    commit(next,'Saved.',['letters']);
  });
  $('.presets').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    commit({...current(), letters: [...PRESETS[b.dataset.preset]]},'Saved.',['letters']);
  });
  $('#sample').addEventListener('click', playSample);
  const dialog = $('#confirm');
  $('#reset').addEventListener('click', () => {
    $('#confirm-title').textContent=targets.length?'Reset to game defaults?':'Reset all settings?';
    $('#confirm-text').textContent=targets.length?'Remove custom settings for '+children.filter(c=>targets.includes(c.id)).map(c=>c.display_name).join(', ')+'. They will use current and future game defaults.':'Sound, letters, help, motion and worlds go back to how they started.';
    dialog.showModal();dialog.querySelector('[value=cancel]').focus();
  });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'reset') {
      if(hosted&&targets.length)A.applySettings(targets,{}, {reset:true}).then(()=>{scopeValues();$('#save-status').textContent='Using game defaults.';}).catch(error=>refuse(error.message));
      else commit({...G.DEFAULTS}, 'Settings are back to how they started.');
    }
    $('#reset').focus();
  });
}
async function playSample() {
  const A = window.GAME_AUDIO; if (!A) return;
  if (sample) { sample.pause(); sample = null; }
  const volume = draft.volume / 100, button = $('#sample');
  button.setAttribute('aria-busy', 'true');
  for (const file of [A.letters.A.name, A.letters.A.sound]) {
    const clip = new Audio(file); clip.volume = volume; sample = clip;
    const ok = await new Promise(resolve => { clip.onended = () => resolve(true); clip.onerror = () => resolve(false); clip.play().catch(() => resolve(false)); });
    if (!ok || sample !== clip) break;
  }
  button.removeAttribute('aria-busy');
}

buildKeypad(); newChallenge(); bindSettings();
try{await setupScope();}catch(error){$('#save-status').textContent='Settings could not load: '+error.message;}
render();
document.body.dataset.view = 'gate';
if(window.ACCOUNTS?.profile?.role==='grownup'){
  $('#title').textContent=window.ACCOUNTS.owner.id===window.ACCOUNTS.profile.id?'Grown-ups’ corner':window.ACCOUNTS.owner.display_name+'’s settings';
  unlock();
}
window.ACCOUNTS?.subscribe(()=>{if(document.body.dataset.view==='settings'&&!Object.keys(patch).length&&!applying){draft=G.normalize(targets.length?A.effectiveSettings(targets[0]):A.gameDefaults);render();}});
})();
