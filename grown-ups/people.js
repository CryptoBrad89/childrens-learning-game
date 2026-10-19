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
  shared_child: 'Another grown-up outside your corner also looks after this child, so their account stays. Choose "Take them off our list" instead.'
};
const say = e => ERRORS[e && e.code] || 'Something went wrong on the way to the server. Try again in a moment.';
function ago(ms) {
  if (!ms) return 'not played yet';
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);
  return days <= 0 ? 'played today' : days === 1 ? 'played yesterday' : days < 14 ? `played ${days} days ago` : `played ${new Date(ms).toLocaleDateString()}`;
}
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const kid = id => C.children().find(k => k.id === id);

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
function renderKids() {
  const kids = C.children();
  $('#kids').innerHTML = kids.map(k => `<li class="kid-card" data-id="${k.id}">
    <div class="kid-top">${P.avatar(k)}
      <div class="kid-text"><strong>${esc(k.name)}</strong><span class="login">${esc(k.login)}</span>
      <small>${plural(k.rounds, 'round')} · ${plural(k.letters, 'letter')} · ${plural(k.badges, 'sticker')} · ${ago(k.last_played)}</small></div></div>
    <div class="kid-actions">
      <button type="button" class="quiet-button" data-act="settings">Settings &amp; progress</button>
      <button type="button" class="quiet-button" data-act="edit">Name &amp; picture</button>
      <button type="button" class="quiet-button" data-act="password">Password</button>
      <button type="button" class="quiet-button danger" data-act="remove">Remove</button>
    </div></li>`).join('');
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
    ...others.map(g => `<li data-id="${g.id}">${P.avatar(g)}<span class="pl-text"><strong>${esc(g.name)}</strong><small>${esc(g.login)}${g.made_by_me ? ' · you added them' : ''}</small></span>
      <button type="button" class="quiet-button danger" data-act="remove-grownup" data-id="${g.id}" data-name="${esc(g.name)}">Remove</button></li>`)].join('');
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
let onSubmit = null;
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
function open({title, help = '', fields = '', go = 'Save', danger = false, submit}) {
  $('#form-title').textContent = title;
  $('#form-help').textContent = help;
  $('#form-fields').innerHTML = fields;
  $('#form-error').textContent = '';
  $('#form-go').textContent = go;
  $('#form-go').classList.toggle('danger-solid', danger);
  onSubmit = submit;
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
  } catch (err) { $('#form-error').textContent = err.local || say(err); }
  finally { $('#form-go').disabled = false; }
});
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
  else if (a === 'edit') open({title: `${name}'s name and picture`, fields: field('name', 'Name', {value: name}) + pictureField({avatar: k.avatar, picture: k.picture}),
    submit: async v => { await api('lw_edit_child', {p_child: id, p_name: v.name, p_avatar: avatarOf(v), p_picture: v.photo || null}); return 'Saved.'; }});
  else if (a === 'password') open({title: `New password for ${name}`, help: 'At least six characters. The old password stops working straight away, including on devices that are offline right now once they reconnect.',
    fields: field('password', 'New password', {auto: 'new-password'}), submit: async v => {
      needPassword(v.password);
      await api('lw_set_child_password', {p_child: id, p_password: v.password});
      return `${name}'s password is changed.`;
    }});
  else if (a === 'remove') open({title: `Remove ${name}?`, go: 'Remove', danger: true,
    fields: `<fieldset class="choices"><legend class="sr-only">How to remove ${esc(name)}</legend>
      <label class="choice"><input type="radio" name="how" value="off" checked><span><strong>Take them off our list</strong><small>${esc(name)}'s account, progress and stickers are kept, for any other grown-up who looks after them.</small></span></label>
      <label class="choice"><input type="radio" name="how" value="delete"><span><strong>Delete their account for good</strong><small>Their sign-in, settings, rounds and stickers go everywhere. This can't be undone.</small></span></label></fieldset>`,
    submit: async v => {
      if (v.how === 'delete') await api('lw_delete_child', {p_child: id});
      else await api('lw_remove_child', {p_child: id});
      if (C.target.id === id) C.target = {kind: 'all'};
      return v.how === 'delete' ? `${name}'s account is deleted.` : `${name} is off your list. Their account is kept.`;
    }});
  else if (a === 'remove-grownup') open({title: `Remove ${name}?`, help: `${name} stops looking after these children. Their own account is kept.`, go: 'Remove', danger: true,
    submit: async () => { await api('lw_remove_grownup', {p_grownup: id}); return `${name} no longer looks after these children.`; }});
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
  else if (b.id === 'add-grownup') open({title: 'Add a grown-up', help: 'They\'ll look after the same children as you. Tell them their sign-in name and password; they can change the password once they\'re in.',
    fields: field('name', 'Their name', {help: 'For example Ms Lee, Sam or Grandma.'}) + field('login', 'Their sign-in name', {help: '3 to 32 letters, numbers, dots or dashes, like ms-lee.'}) + field('password', 'Password', {help: 'At least six characters.', auto: 'new-password'}),
    go: 'Add grown-up', submit: async v => {
      needPassword(v.password);
      const g = await api('lw_create_grownup', {p_login: v.login, p_password: v.password, p_name: v.name});
      return `${g.name} can sign in now as ${g.login}.`;
    }});
  else if (b.id === 'print-cards') printCards();
  else if (b.id === 'password-mine') open({title: 'Change my password', fields: field('old', 'Current password', {type: 'password', auto: 'current-password'}) + field('password', 'New password', {type: 'password', auto: 'new-password', help: 'At least six characters.'}),
    submit: async v => { needPassword(v.password); await api('lw_change_password', {p_old: v.old, p_new: v.password}); return 'Your password is changed. Use it next time you sign in.'; }});
});
$('#show-here').addEventListener('change', e => {
  const me = C.me();
  if (e.target.checked) L.showHere(me.id, C.children()); else L.hideHere(me.id);
  $('#kids-status').textContent = e.target.checked ? 'Your children\'s pictures now show on this device\'s sign-in. Each child still types their password.' : 'Your children\'s pictures no longer show on this device\'s sign-in.';
});
})();
