/* Grown-ups' corner: children, grown-ups, progress, and this device.
 * There are no groups or codes: a grown-up's children are simply theirs, and
 * every grown-up they add looks after the same children. Making or changing
 * accounts needs the internet; settings and progress work offline from the
 * last copy on this device. */
(() => {
'use strict';
const L = window.LW, C = window.CORNER, P = window.LW_PICTURES, $ = s => document.querySelector(s), esc = P.esc;
const WORLD_NAMES = {post: 'Letter Post', space: 'Moonboat', silk: 'Ribbon Road'};
const ERRORS = {
  offline: 'This needs the internet. Connect, then try again. Settings changes still work offline.',
  signed_out: 'Your sign-in has run out on this device. Sign out, then sign in again.',
  not_allowed: 'You don\'t look after this child, so you can\'t change that.',
  grownups_only: 'Only grown-ups can do that.',
  password_short: 'Passwords need at least six characters.',
  password_long: 'That password is too long. Use 72 characters or fewer.',
  bad_password: 'Your current password doesn\'t match.',
  name_shape: 'Names need 1 to 40 characters.',
  name_long: 'Names need 1 to 40 characters.',
  login_shape: 'Sign-in names use 3 to 32 letters, numbers, dots or dashes, starting with a letter or number.',
  login_taken: 'That sign-in name is taken. Try adding a number or initials.',
  bad_picture: 'That picture couldn\'t be used. Try a different photo.',
  bad_login: 'That sign-in name and password don\'t match a child\'s account.',
  too_many_tries: 'Too many tries. Wait an hour, then try again.',
  shared_child: 'Another grown-up outside your corner also looks after this child, so their account stays. Choose "Take them off our list" instead.',
  wrong_password: 'That isn\'t your password. Type the password you sign in with.',
  password_pause: 'Too many wrong passwords. Wait 15 minutes, then try again.'
};
const say = e => ERRORS[e && e.code] || (/Could not find the function/.test(e && e.message) ? 'The game\'s database needs its latest update before this works.'
  : 'Something went wrong on the way to the server. Try again in a moment.');
function ago(ms) {
  if (!ms) return 'not played yet';
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);
  return days <= 0 ? 'played today' : days === 1 ? 'played yesterday' : days < 14 ? `played ${days} days ago` : `played ${new Date(ms).toLocaleDateString()}`;
}
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const kid = id => C.children().find(k => k.id === id);
const grownup = id => (C.portal().grownups || []).find(g => g.id === id);
// Select mode: pick any number of children or grown-ups and act on them all at once.
const selecting = {kids: false, grownups: false}, picked = {kids: new Set(), grownups: new Set()};

/* ---------- loading ---------- */
let loading = null;
C.refresh = () => loading ||= (async () => {
  const me = C.me(); if (!me) return;
  try {
    const portal = await L.api(me.id, 'lw_portal', {});
    L.cache('portal:' + me.id, portal);
    if (portal.children.length) {
      const states = await L.api(me.id, 'lw_children_states', {});
      for (const state of Object.values(states)) L.adopt(state.profile.id, state);
    }
    // Keep this device's sign-in pictures up to date, when this grown-up chose to show them.
    if (L.isShownHere(me.id)) L.showHere(me.id, portal.children);
    C.loaded = Date.now(); C.loadError = null;
  } catch (e) {
    C.loadError = e.code;
    // Shown under Children, so an empty list is never a mystery.
    $('#kids-status').textContent = /Could not find the function/.test(e.message) ? 'The game\'s database needs its latest update before children can show here.'
      : e.code === 'offline' ? 'This device is offline, so this is the last list it saw. Changes to accounts need the internet.' : say(e);
  }
  finally { loading = null; }
})();

/* ---------- children ---------- */
function pick(list, id, name) {
  return selecting[list] ? `<label class="pick"><input type="checkbox" data-pick="${list}" value="${id}"${picked[list].has(id) ? ' checked' : ''}><span>Select<span class="sr-only"> ${esc(name)}</span></span></label>` : '';
}
function renderBulk(list, items) {
  for (const id of picked[list]) if (!items.some(x => x.id === id)) picked[list].delete(id);
  const n = picked[list].size, bar = $(`#${list}-bulk`), toggle = $(`#select-${list}`);
  toggle.hidden = !items.length;
  if (!items.length) selecting[list] = false;
  toggle.setAttribute('aria-pressed', String(selecting[list]));
  toggle.textContent = selecting[list] ? 'Done selecting' : 'Select';
  bar.hidden = !selecting[list];
  $(`#${list}-count`).textContent = `${n} of ${items.length} selected`;
  bar.querySelectorAll('[data-needs-pick]').forEach(b => { b.disabled = !n; });
}
function renderKids() {
  const kids = C.children();
  $('#kids').classList.toggle('selecting', selecting.kids);
  $('#kids').innerHTML = kids.map(k => `<li class="kid-card${picked.kids.has(k.id) ? ' picked' : ''}" data-id="${k.id}">${pick('kids', k.id, k.name)}
    <div class="kid-top">${P.avatar(k)}
      <div class="kid-text"><strong>${esc(k.name)}</strong><span class="login">${esc(k.login)}</span>
      <small>${plural(k.rounds, 'round')} · ${plural(k.letters, 'letter')} · ${plural(k.badges, 'sticker')} · ${ago(k.last_played)}</small></div></div>
    <div class="kid-actions">
      <button type="button" class="quiet-button" data-act="settings">Settings &amp; progress</button>
      <button type="button" class="quiet-button" data-act="edit">Name &amp; picture</button>
      <button type="button" class="quiet-button" data-act="password">Password</button>
      <button type="button" class="quiet-button" data-act="reset">Reset progress</button>
      <button type="button" class="quiet-button danger" data-act="remove">Remove</button>
    </div></li>`).join('');
  renderBulk('kids', kids);
  $('#kids-empty').hidden = kids.length > 0;
  $('#print-cards').hidden = !kids.length;
}

/* ---------- progress ---------- */
function personProgress(id, name) {
  const agg = L.progress(id), s = L.summary(agg), earned = L.badges(id, {remember: false});
  const worlds = ['silk', 'post', 'space'].map(w => `<div class="world-row"><h3>${WORLD_NAMES[w]}<small>${plural(s.byWorld[w].size, 'letter')} · ${plural(s.worlds[w], 'round')}</small></h3>
    <ol class="mini-letters" aria-label="${WORLD_NAMES[w]} letters">${L.LETTERS.map(l => {
      const cell = (agg[w] || {})[l];
      return `<li class="${cell && cell.n ? 'got' : ''}" aria-label="${l}${cell && cell.n ? `, ${plural(cell.n, 'round')}` : ', not yet'}">${l}${cell && cell.n > 1 ? `<small>${cell.n}</small>` : ''}</li>`;
    }).join('')}</ol></div>`).join('');
  const stickers = L.BADGES.map(b => `<li class="${earned[b.key] ? 'earned' : ''}">${P.sticker(b.key, !!earned[b.key])}<span>${esc(b.title)}</span></li>`).join('');
  return `<p class="progress-total"><strong>${esc(name)}</strong>: ${plural(s.rounds, 'round')}, ${plural(s.letters.size, 'letter')} of 26, ${plural(s.clean, 'round')} right first time, ${plural(Object.keys(earned).length, 'sticker')}.</p>
    ${worlds}<h3 class="sub">Stickers</h3><ul class="sticker-shelf">${stickers}</ul>`;
}
function renderProgress() {
  const kids = C.children(), t = C.target;
  let html;
  if (!kids.length) html = '<p class="empty">Progress shows here once a child has played.</p>';
  else if (t.kind === 'child' && kid(t.id)) html = personProgress(t.id, t.name);
  else html = `<div class="table-scroll"><table class="progress-table"><thead><tr><th scope="col">Child</th><th scope="col">Rounds</th><th scope="col">Letters</th><th scope="col">Stickers</th><th scope="col">Last played</th></tr></thead><tbody>${kids.map(k => {
      const s = L.summary(L.progress(k.id)), b = Object.keys(L.badges(k.id, {remember: false})).length;
      return `<tr><th scope="row">${esc(k.name)}</th><td>${s.rounds}</td><td>${s.letters.size}</td><td>${b}</td><td>${ago(k.last_played)}</td></tr>`;
    }).join('')}</tbody></table></div><p class="section-help">Pick one child under Settings to see each letter and sticker.</p>`;
  $('#progress-body').innerHTML = html;
}

/* ---------- grown-ups ---------- */
function renderGrownups() {
  const me = C.me(), others = C.portal().grownups || [];
  $('#grownup-list').innerHTML = [`<li>${P.avatar(me)}<span class="pl-text"><strong>${esc(me.name)} (you)</strong><small>${esc(me.login)}</small></span></li>`,
    ...others.map(g => `<li data-id="${g.id}" class="${picked.grownups.has(g.id) ? 'picked' : ''}">${pick('grownups', g.id, g.name)}${P.avatar(g)}<span class="pl-text"><strong>${esc(g.name)}</strong><small>${esc(g.login)}${g.made_by_me ? ' · you added them' : ''}</small></span>
      ${selecting.grownups ? '' : `<button type="button" class="quiet-button danger" data-act="remove-grownup" data-id="${g.id}" data-name="${esc(g.name)}">Remove</button>`}</li>`)].join('');
  renderBulk('grownups', others);
}

/* ---------- this device ---------- */
function renderDevice() {
  const me = C.me(), people = L.list().filter(p => p.id !== me.id);
  $('#show-here').checked = L.isShownHere(me.id);
  $('#device-people').innerHTML = people.map(p => `<li>${P.avatar(p)}<span class="pl-text"><strong>${esc(p.name)}</strong><small>${p.role === 'child' ? 'Child' : 'Grown-up'} · ${esc(p.login)}${p.waiting ? ' · still uploading' : ''}</small></span>
    <button type="button" class="quiet-button" data-act="forget" data-id="${p.id}" data-name="${esc(p.name)}"${p.waiting ? ' disabled title="Still uploading"' : ''}>Forget here</button></li>`).join('');
  $('#device-empty').hidden = people.length > 0;
}
C.render = () => {
  if (!C.me() || $('#portal').hidden) return;
  // The settings picker follows the same list of children, so draw it with them.
  C.renderTarget(); renderKids(); renderProgress(); renderGrownups(); renderDevice();
};

/* ---------- forms ---------- */
let onSubmit = null, onInput = null;
const field = (name, label, {type = 'text', help = '', value = '', auto = 'off'} = {}) =>
  `<label class="field"><span>${label}</span>${help ? `<small>${help}</small>` : ''}<input name="${name}" type="${type}" value="${esc(value)}" autocomplete="${auto}" autocapitalize="off" spellcheck="false"></label>`;
// A drawn picture and a color, plus "Upload a picture" for any photo or drawing.
function pictureField({avatar = 'cat:0', picture = null} = {}) {
  const {pic, tone} = P.parse(avatar), photo = P.photo(picture);
  return `<fieldset class="pictures"><legend>Picture</legend>
    <div class="photo-row"><span class="photo-preview" id="photo-preview">${P.avatar({avatar, picture: photo})}</span>
      <span class="photo-buttons"><label class="quiet-button upload"><input type="file" accept="image/*" id="photo-file">Upload a picture</label>
      <button type="button" class="quiet-button" id="photo-clear"${photo ? '' : ' hidden'}>Use a drawn picture</button></span></div>
    <p class="photo-note" id="photo-note">${photo ? 'Their photo shows wherever they sign in and play.' : 'Or pick one of these.'}</p>
    <input type="hidden" name="photo" value="${photo || ''}">
    <div class="picture-grid">${P.AVATARS.map(a => `<label><input type="radio" name="pic" value="${a}"${a === pic ? ' checked' : ''}><span class="sr-only">${a}</span>${P.avatar(a + ':' + tone)}</label>`).join('')}</div></fieldset>
    <fieldset class="tones"><legend>Color</legend><div class="tone-grid">${P.TONES.map((c, i) => `<label style="--tone:${c}"><input type="radio" name="tone" value="${i}"${i === tone ? ' checked' : ''}><span class="sr-only">Color ${i + 1}</span></label>`).join('')}</div></fieldset>`;
}
function previewPicture() {
  const form = $('#form-dialog-form'), photo = form.elements.photo; if (!photo) return;
  const pic = (form.querySelector('input[name="pic"]:checked') || {}).value || 'sun', tone = (form.querySelector('input[name="tone"]:checked') || {}).value || 0;
  $('#photo-preview').innerHTML = P.avatar({avatar: `${pic}:${tone}`, picture: photo.value || null});
  $('#photo-clear').hidden = !photo.value;
  $('#photo-note').textContent = photo.value ? 'Their photo shows wherever they sign in and play.' : 'Or pick one of these.';
}
// Any picture becomes a small square photo (160 × 160), cut from its middle.
async function shrink(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) throw fail('That file isn\'t a picture. Choose a photo or a drawing.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; })
      .catch(() => { throw fail('That picture couldn\'t be opened. Try a JPEG or PNG photo.'); });
    const w = img.naturalWidth, h = img.naturalHeight, side = Math.min(w, h), size = 160;
    if (!side) throw fail('That picture couldn\'t be opened. Try a JPEG or PNG photo.');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
    for (const q of [.85, .7, .55, .4]) { const data = canvas.toDataURL('image/jpeg', q); if (P.photo(data)) return data; }
    throw fail('That picture is too detailed to use. Try a different photo.');
  } finally { URL.revokeObjectURL(url); }
}
function open({title, help = '', fields = '', go = 'Save', danger = false, submit, input = null}) {
  $('#form-title').textContent = title;
  $('#form-help').textContent = help;
  $('#form-fields').innerHTML = fields;
  $('#form-error').textContent = '';
  $('#form-go').textContent = go;
  $('#form-go').classList.toggle('danger-solid', danger);
  onSubmit = submit; onInput = input;
  gate();
  $('#form-dialog').showModal();
  ($('#form-fields input:not([type=radio]):not([type=file]):not([type=hidden])') || $('#form-fields input:checked') || $('#form-go')).focus();
}
$('#form-dialog-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target), values = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
  $('#form-go').disabled = true; $('#form-error').textContent = '';
  try {
    const note = await onSubmit(values);
    $('#form-dialog').close();
    await C.refresh(); C.retarget(); C.renderTarget(); C.render();
    if (note) $('#kids-status').textContent = note;
  } catch (err) {
    $('#form-error').textContent = err.local || say(err);
    if (err.code === 'wrong_password' && $('#mine')) { $('#mine').value = ''; $('#mine').focus(); }
  }
  finally { gate(); }
});
// When the grown-up's own password is asked for, the button waits for it.
function gate() {
  const mine = $('#mine');
  $('#form-go').disabled = !!mine && !mine.closest('[hidden]') && !mine.value;
}
$('#form-dialog').addEventListener('input', () => { if (onInput) onInput(); gate(); });
$('#form-dialog').addEventListener('click', e => { if (e.target.dataset.close) $('#form-dialog').close(); });
$('#form-dialog').addEventListener('change', async e => {
  if (e.target.id === 'photo-file') {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    $('#form-error').textContent = '';
    try { $('#form-dialog-form').elements.photo.value = await shrink(file); }
    catch (err) { $('#form-error').textContent = err.local || say(err); }
    previewPicture();
  } else if (e.target.name === 'pic') {
    // Picking a drawn picture uses it instead of the photo.
    $('#form-dialog-form').elements.photo.value = ''; previewPicture();
  } else if (e.target.name === 'tone') previewPicture();
});
$('#form-dialog').addEventListener('click', e => {
  if (e.target.id === 'photo-clear') { $('#form-dialog-form').elements.photo.value = ''; previewPicture(); }
});
const fail = local => Object.assign(new Error(local), {local});
const needPassword = v => { if ((v || '').length < 6) throw fail(ERRORS.password_short); };
const api = (fn, args) => L.api(C.me().id, fn, args);
const avatarOf = v => `${v.pic || 'sun'}:${v.tone || 0}`;
// The server answers {ok: false, error} when the grown-up's password is wrong.
const sure = r => { if (r && r.ok === false) throw Object.assign(new Error(r.error), {code: r.error}); return r; };

/* ---------- risky actions: the grown-up's own password, nothing else ---------- */
const mineField = ({hidden = false} = {}) => `<label class="field mine" id="mine-wrap"${hidden ? ' hidden' : ''}><span>Your password</span>
  <small>The one you sign in with, to make sure it's you.</small>
  <input name="mine" id="mine" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false"></label>`;
const affectedTitle = n => n === 1 ? 'This account' : `These ${n} accounts`;
const affectedItems = people => people.map(p => `<li>${P.avatar(p)}<span>${esc(p.name)}<small>${esc(p.login)}</small></span></li>`).join('');
const affected = people => `<div class="affected"><p class="affected-title" id="affected-title">${affectedTitle(people.length)}</p>
  <ul class="affected-list" id="affected-list">${affectedItems(people)}</ul></div>`;
function skippedNote(skipped) {
  const n = why => skipped.filter(x => x.why === why).length, out = [];
  if (n('shared_child')) out.push(`${plural(n('shared_child'), 'account')} stayed, because another grown-up outside your corner also looks after them. Choose "Take them off our list" for them instead.`);
  if (n('not_allowed')) out.push(`${plural(n('not_allowed'), 'account was', 'accounts were')} left alone, because you don't look after them.`);
  return out.length ? ' ' + out.join(' ') : '';
}
// Any number of accounts: sent in chunks behind the scenes. If the connection
// drops part way, the dialog stays open with only the ones still to do.
function risky({title, help, ids, list = 'kids', key = 'p_children', fields = '', go, danger = true, fn, chunk = 100, check = () => {}, extra = () => ({}), done}) {
  const total = ids.length, skipped = [], who = id => (list === 'kids' ? kid(id) : grownup(id)) || {id, name: 'Removed', login: ''};
  let left = [...ids];
  open({title, help, go, danger, fields: fields + affected(left.map(who)) + mineField(), submit: async v => {
    check(v);
    try {
      while (left.length) {
        const part = left.slice(0, chunk);
        const r = sure(await api(typeof fn === 'function' ? fn(v) : fn, {[key]: part, ...extra(v), p_my_password: v.mine}));
        left = left.slice(part.length); skipped.push(...r.skipped);
      }
    } catch (err) {
      if (left.length === total) throw err;
      $('#affected-title').textContent = affectedTitle(left.length);
      $('#affected-list').innerHTML = affectedItems(left.map(who));
      $('#form-go').textContent = 'Try again';
      throw fail(`${total - left.length} of ${total} done. ${say(err)} Then press Try again for the other ${left.length}.`);
    }
    picked[list].clear();
    return done(v, total - skipped.length, skipped);
  }});
}
function resetProgress(ids) {
  const one = ids.length === 1 && kid(ids[0]);
  risky({ids, title: one ? `Reset ${one.name}'s progress?` : `Reset progress for ${ids.length} children?`,
    help: 'Rounds, letters and stickers are cleared on every device, so the games start fresh. Names, pictures, passwords and settings stay. This can\'t be undone.',
    go: 'Reset progress', fn: 'lw_reset_children_progress',
    done: (v, n, skipped) => (one && n === 1 ? `${one.name}'s progress is cleared. The games start fresh next time.` : `Progress is cleared for ${plural(n, 'child', 'children')}.`) + skippedNote(skipped)});
}
function newPassword(ids) {
  const one = ids.length === 1 && kid(ids[0]);
  risky({ids, title: one ? `New password for ${one.name}` : `New password for ${ids.length} children`,
    help: (one ? '' : 'Everyone you picked gets this same password. ') + 'The old password stops working straight away, including on devices that are offline right now once they reconnect.',
    fields: field('password', 'New password', {help: 'At least six characters.', auto: 'new-password'}), go: 'Save password', danger: false,
    fn: 'lw_set_children_password', chunk: 20, check: v => needPassword(v.password), extra: v => ({p_new: v.password}),
    done: (v, n, skipped) => (one && n === 1 ? `${one.name}'s password is changed.` : `${plural(n, 'password')} changed.`) + skippedNote(skipped)});
}
function removeKids(ids) {
  const one = ids.length === 1 && kid(ids[0]), them = one ? esc(one.name) : 'them';
  risky({ids, title: one ? `Remove ${one.name}?` : `Remove ${ids.length} children?`, go: 'Remove',
    fields: `<fieldset class="choices"><legend class="sr-only">How to remove ${one ? esc(one.name) : 'these children'}</legend>
      <label class="choice"><input type="radio" name="how" value="off" checked><span><strong>Take ${them} off our list</strong><small>${one ? `${esc(one.name)}'s account` : 'Their accounts'}, progress and stickers are kept, for any other grown-up who looks after them.</small></span></label>
      <label class="choice"><input type="radio" name="how" value="delete"><span><strong>Delete ${one ? 'their account' : 'their accounts'} for good</strong><small>Sign-in, settings, rounds and stickers go everywhere. This can't be undone.</small></span></label></fieldset>`,
    fn: v => v.how === 'delete' ? 'lw_delete_children' : 'lw_remove_children',
    done: (v, n, skipped) => {
      if (ids.includes(C.target.id)) C.target = {kind: 'all'};
      const what = v.how === 'delete' ? (one && n === 1 ? `${one.name}'s account is deleted.` : `${plural(n, 'account')} deleted.`)
        : (one && n === 1 ? `${one.name} is off your list. Their account is kept.` : `${plural(n, 'child', 'children')} off your list. Their accounts are kept.`);
      return what + skippedNote(skipped);
    }});
}
function removeGrownups(ids) {
  const one = ids.length === 1 && grownup(ids[0]);
  risky({ids, list: 'grownups', key: 'p_grownups', title: one ? `Remove ${one.name}?` : `Remove ${ids.length} grown-ups?`, go: 'Remove',
    help: `${one ? one.name + ' stops' : 'They stop'} looking after these children. ${one ? 'Their own account is' : 'Their own accounts are'} kept.`,
    fn: 'lw_remove_grownups',
    done: (v, n) => one && n === 1 ? `${one.name} no longer looks after these children.` : `${plural(n, 'grown-up')} no longer look after these children.`});
}

function addChild() {
  const n = C.children().length;
  open({title: 'Add a child', help: 'Each child gets their own sign-in name. The password is yours to choose: at least six characters, for example a four-digit number you\'ll remember plus the child\'s initials, like 7234mk.',
    fields: field('name', 'Child\'s name', {help: 'First name is enough. Children see it under their picture.'}) + pictureField({avatar: `${P.AVATARS[(n * 7) % P.AVATARS.length]}:${n % 6}`}) + field('password', 'Password', {help: 'At least six characters.', auto: 'new-password'}),
    go: 'Add child', submit: async v => {
      needPassword(v.password);
      const child = await api('lw_add_child', {p_name: v.name, p_avatar: avatarOf(v), p_password: v.password, p_picture: v.photo || null});
      return `${child.name} is ready. Their sign-in name is ${child.login}.`;
    }});
}
function act(button) {
  const a = button.dataset.act, card = button.closest('[data-id]'), id = button.dataset.id || (card && card.dataset.id);
  const k = kid(id), name = button.dataset.name || (k && k.name);
  if (a === 'settings') { C.setTarget({kind: 'child', id, name}); $('#settings').scrollIntoView({block: 'start'}); $('#target').focus({preventScroll: true}); }
  else if (a === 'edit') open({title: `${name}'s name and picture`,
    fields: field('name', 'Name', {value: name}) + pictureField({avatar: k.avatar, picture: k.picture}) + mineField({hidden: true}),
    // A new name needs the grown-up's password (checked by the server too); a new picture alone doesn't.
    input: () => { $('#mine-wrap').hidden = $('#form-dialog-form').elements.name.value.trim() === name; },
    submit: async v => {
      sure(await api('lw_edit_child', {p_child: id, p_name: v.name, p_avatar: avatarOf(v), p_picture: v.photo || null, p_my_password: v.mine || null}));
      return 'Saved.';
    }});
  else if (a === 'password') newPassword([id]);
  else if (a === 'reset') resetProgress([id]);
  else if (a === 'remove') removeKids([id]);
  else if (a === 'remove-grownup') removeGrownups([id]);
  else if (a === 'forget') {
    L.forget(id).then(() => { renderDevice(); $('#kids-status').textContent = `${name} is forgotten on this device. Their account is safe.`; })
      .catch(err => { $('#kids-status').textContent = err.code === 'still_waiting' ? `${name}'s play is still uploading. Try again in a moment.` : say(err); });
  }
}
function printCards() {
  $('#cards').innerHTML = C.children().map(k => `<div class="card">${P.avatar(k)}<div><strong>${esc(k.name)}</strong>
    <dl><dt>Sign-in name</dt><dd>${esc(k.login)}</dd><dt>Password</dt><dd>Ask ${esc(C.me().name)}</dd></dl>
    <p>To play on any device, open Letters with Lucy and type this sign-in name and the password.</p></div></div>`).join('');
  window.print();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !C.me() || b.closest('#form-dialog')) return;
  if (b.dataset.act) act(b);
  else if (b.id === 'add-child') addChild();
  else if (b.id === 'add-existing') open({title: 'Add a child who already has an account', help: 'For a child another grown-up made an account for. Type their sign-in name and password (that grown-up can tell you). The same account, progress and stickers then show here too.',
    fields: field('login', 'Child\'s sign-in name', {help: 'Like mia-k4x.'}) + field('password', 'Child\'s password', {type: 'password'}),
    go: 'Add child', submit: async v => {
      const r = await api('lw_add_existing_child', {p_login: v.login, p_password: v.password});
      if (!r.ok) throw Object.assign(new Error(r.error), {code: r.error});
      return `${r.child.name} is on your list now.`;
    }});
  else if (b.id === 'add-grownup') open({title: 'Add a grown-up', help: 'They\'ll look after the same children as you, and can add and remove children too. Tell them their sign-in name and password; they can change the password once they\'re in.',
    fields: field('name', 'Their name', {help: 'For example Ms Lee, Sam or Grandma.'}) + field('login', 'Their sign-in name', {help: '3 to 32 letters, numbers, dots or dashes, like ms-lee.'}) + field('password', 'Their password', {help: 'At least six characters.', auto: 'new-password'}) + mineField(),
    go: 'Add grown-up', submit: async v => {
      needPassword(v.password);
      const g = sure(await api('lw_create_grownup', {p_login: v.login, p_password: v.password, p_name: v.name, p_my_password: v.mine}));
      return `${g.name} can sign in now as ${g.login}.`;
    }});
  else if (b.id === 'select-kids' || b.id === 'select-grownups') {
    const list = b.id.slice(7);
    selecting[list] = !selecting[list]; picked[list].clear(); C.render();
    $(`#select-${list}`).focus();
  } else if (b.dataset.bulk) {
    const [list, what] = b.dataset.bulk.split('-'), items = list === 'kids' ? C.children() : (C.portal().grownups || []), ids = [...picked[list]];
    if (what === 'all') { items.forEach(x => picked[list].add(x.id)); C.render(); }
    else if (what === 'none') { picked[list].clear(); C.render(); }
    else if (!ids.length) return;
    else if (what === 'reset') resetProgress(ids);
    else if (what === 'password') newPassword(ids);
    else if (what === 'remove') (list === 'kids' ? removeKids : removeGrownups)(ids);
  }
  else if (b.id === 'print-cards') printCards();
  else if (b.id === 'password-mine') open({title: 'Change my password', fields: field('old', 'Current password', {type: 'password', auto: 'current-password'}) + field('password', 'New password', {type: 'password', auto: 'new-password', help: 'At least six characters.'}),
    submit: async v => { needPassword(v.password); await api('lw_change_password', {p_old: v.old, p_new: v.password}); return 'Your password is changed. Use it next time you sign in.'; }});
});
document.addEventListener('change', e => {
  const box = e.target.closest('input[data-pick]'); if (!box) return;
  const list = box.dataset.pick;
  if (box.checked) picked[list].add(box.value); else picked[list].delete(box.value);
  box.closest('li').classList.toggle('picked', box.checked);
  renderBulk(list, list === 'kids' ? C.children() : (C.portal().grownups || []));
});
$('#show-here').addEventListener('change', e => {
  const me = C.me();
  if (e.target.checked) L.showHere(me.id, C.children()); else L.hideHere(me.id);
  $('#kids-status').textContent = e.target.checked ? 'Your children\'s pictures now show on this device\'s sign-in. Each child still types their password.' : 'Your children\'s pictures no longer show on this device\'s sign-in.';
});
})();
