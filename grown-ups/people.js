/* Grown-ups' corner: groups, children, progress, and this device.
 * Making or changing accounts needs the internet; settings and progress views
 * work offline from the last copy on this device. */
(() => {
'use strict';
const L = window.LW, C = window.CORNER, P = window.LW_PICTURES, $ = s => document.querySelector(s), esc = P.esc;
const WORLD_NAMES = {post: 'Letter Post', space: 'Moonboat', silk: 'Silk Thread'};
const ERRORS = {
  offline: 'This needs the internet. Connect, then try again. Settings changes still work offline.',
  signed_out: 'Your sign-in has run out on this device. Sign out, then sign in again.',
  not_allowed: 'Only grown-ups in this group can do that.',
  owners_only: 'Only the grown-up who owns this group can do that.',
  no_invite: 'No group has that invite code. Check it with the grown-up who shared it.',
  password_short: 'Passwords need at least six characters.',
  password_long: 'That password is too long. Use 72 characters or fewer.',
  bad_password: 'Your current password doesn\'t match.',
  name_shape: 'Names need 1 to 40 characters.',
  too_many: 'That group is full. Make another one.',
  bad_login: 'That sign-in name and password don\'t match a child\'s account.',
  too_many_tries: 'Too many tries. Wait an hour, then try again.',
  shared_child: 'Another group also looks after this child, so their account stays. Use Remove to take them out of this group.'
};
const say = e => ERRORS[e && e.code] || 'Something went wrong on the way to the server. Try again in a moment.';
const kids = g => g.members.filter(m => m.member_role === 'child');
const grownups = g => g.members.filter(m => m.member_role !== 'child');
const fmtCode = c => c && c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
function ago(ms) {
  if (!ms) return 'not played yet';
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);
  return days <= 0 ? 'played today' : days === 1 ? 'played yesterday' : days < 14 ? `played ${days} days ago` : `played ${new Date(ms).toLocaleDateString()}`;
}
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/* ---------- loading ---------- */
let loading = null;
C.refresh = () => loading ||= (async () => {
  const me = C.me(); if (!me) return;
  try {
    const groups = await L.api(me.id, 'lw_groups', {});
    L.cache('groups:' + me.id, groups);
    await Promise.all(groups.filter(g => kids(g).length).map(async g => {
      const states = await L.api(me.id, 'lw_group_states', {p_group: g.id});
      for (const state of Object.values(states)) L.adopt(state.profile.id, state);
    }));
    C.loaded = Date.now();
  } catch (e) { C.loadError = e.code; }
  finally { loading = null; }
})();

/* ---------- children and groups ---------- */
function groupCard(g) {
  const owner = g.role === 'owner', children = kids(g);
  return `<article class="group-card" data-group="${g.id}" aria-labelledby="g-${g.id}">
    <header class="group-head">
      <div><p class="label">Group${owner ? ' · you made it' : ''}</p><h3 id="g-${g.id}">${esc(g.name)}</h3></div>
      <dl class="codes">
        <div><dt>Board code</dt><dd>${esc(g.board_code)}</dd><dd class="code-help">Type it on a device to show the children's pictures.</dd></div>
        <div><dt>Invite code</dt><dd>${esc(fmtCode(g.invite_code))}</dd><dd class="code-help">For grown-ups only: it lets them look after these children.</dd></div>
      </dl>
    </header>
    ${children.length ? `<ul class="kids">${children.map(k => `<li class="kid">
      ${P.avatar(k.avatar)}
      <div class="kid-text"><strong>${esc(k.name)}</strong><span class="login">${esc(k.login)}</span><small>${plural(k.rounds, 'round')} · ${plural(k.letters, 'letter')} · ${plural(k.badges, 'sticker')} · ${ago(k.last_played)}</small></div>
      <div class="kid-actions">
        <button type="button" class="quiet-button" data-act="settings" data-id="${k.id}" data-name="${esc(k.name)}">Settings</button>
        <button type="button" class="quiet-button" data-act="password" data-id="${k.id}" data-name="${esc(k.name)}">Password</button>
        <button type="button" class="quiet-button" data-act="edit" data-id="${k.id}" data-name="${esc(k.name)}" data-avatar="${esc(k.avatar)}">Edit</button>
        <button type="button" class="quiet-button" data-act="remove" data-id="${k.id}" data-name="${esc(k.name)}">Remove</button>
        <button type="button" class="quiet-button danger" data-act="delete" data-id="${k.id}" data-name="${esc(k.name)}">Delete</button>
      </div></li>`).join('')}</ul>` : '<p class="empty">No children here yet.</p>'}
    <p class="grownups"><span class="label">Grown-ups</span> ${grownups(g).map(m => esc(m.name)).join(', ')}</p>
    <div class="group-buttons">
      <button type="button" class="solid-button" data-act="add">Add a child</button>
      <button type="button" class="quiet-button" data-act="link">Add a child who has an account</button>
      ${children.length ? '<button type="button" class="quiet-button" data-act="cards">Print sign-in cards</button>' : ''}
      <button type="button" class="quiet-button" data-act="rename">Rename</button>
      <button type="button" class="quiet-button" data-act="codes">New codes</button>
      <button type="button" class="quiet-button danger" data-act="leave">Leave</button>
    </div>
  </article>`;
}
function renderGroups() {
  const groups = C.groups();
  $('#groups').innerHTML = groups.map(groupCard).join('');
  $('#groups-empty').hidden = groups.length > 0;
}

/* ---------- progress ---------- */
function personProgress(id, name) {
  const agg = L.progress(id), s = L.summary(agg), earned = L.badges(id, {remember: false});
  const worlds = L.WORLDS.map(w => `<div class="world-row"><h3>${WORLD_NAMES[w]}<small>${plural(s.byWorld[w].size, 'letter')} · ${plural(s.worlds[w], 'round')}</small></h3>
    <ol class="mini-letters" aria-label="${WORLD_NAMES[w]} letters">${L.LETTERS.map(l => {
      const cell = (agg[w] || {})[l];
      return `<li class="${cell && cell.n ? 'got' : ''}" aria-label="${l}${cell && cell.n ? `, ${plural(cell.n, 'round')}` : ', not yet'}">${l}${cell && cell.n > 1 ? `<small>${cell.n}</small>` : ''}</li>`;
    }).join('')}</ol></div>`).join('');
  const stickers = L.BADGES.map(b => `<li class="${earned[b.key] ? 'earned' : ''}">${P.sticker(b.key, !!earned[b.key])}<span>${esc(b.title)}</span></li>`).join('');
  return `<p class="progress-total"><strong>${esc(name)}</strong>: ${plural(s.rounds, 'round')}, ${plural(s.letters.size, 'letter')} of 26, ${plural(s.clean, 'round')} right first time, ${plural(Object.keys(earned).length, 'sticker')}.</p>
    ${worlds}<h3 class="sub">Stickers</h3><ul class="sticker-shelf">${stickers}</ul>`;
}
function renderProgress() {
  const t = C.target, me = C.me();
  let html;
  if (!t || t.kind === 'me') html = personProgress(me.id, 'You');
  else if (t.kind === 'child') html = personProgress(t.id, t.name);
  else {
    const g = C.groups().find(x => x.id === t.id);
    html = g ? `<div class="table-scroll"><table class="progress-table"><caption>${esc(g.name)}</caption><thead><tr><th scope="col">Child</th><th scope="col">Rounds</th><th scope="col">Letters</th><th scope="col">Stickers</th><th scope="col">Last played</th></tr></thead><tbody>${kids(g).map(k => {
      const s = L.summary(L.progress(k.id)), b = Object.keys(L.badges(k.id, {remember: false})).length;
      return `<tr><th scope="row">${esc(k.name)}</th><td>${s.rounds}</td><td>${s.letters.size}</td><td>${b}</td><td>${ago(k.last_played)}</td></tr>`;
    }).join('')}</tbody></table></div><p class="section-help">Pick one child under "Settings for" to see each letter and sticker.</p>` : '';
  }
  $('#progress-body').innerHTML = html;
}

/* ---------- this device ---------- */
function renderDevice() {
  const me = C.me(), st = L.status(me.id), [state, text] = P.syncState(st);
  const others = L.list().reduce((n, p) => n + p.waiting, 0) - st.waiting;
  $('#sync-line').dataset.state = state;
  $('#sync-line span').textContent = text + (others > 0 ? `. ${plural(others, 'change')} from other people here also waiting` : '') + (st.syncedAt ? `. Last synced ${new Date(st.syncedAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}` : '');
  $('#device-people').innerHTML = L.list().map(p => `<li>${P.avatar(p.avatar)}<span class="dp-text"><strong>${esc(p.name)}</strong><small>${p.role === 'child' ? 'Child' : 'Grown-up'} · ${esc(p.login)}${p.waiting ? ` · ${plural(p.waiting, 'thing')} waiting to upload` : ' · all uploaded'}${p.needsSignIn && p.waiting ? ' · sign in again to finish' : ''}</small></span>
    <button type="button" class="quiet-button" data-act="forget" data-id="${p.id}" data-name="${esc(p.name)}"${p.waiting ? ' disabled title="Waiting to upload"' : ''}>Forget on this device</button></li>`).join('');
}
C.render = () => {
  if (!C.me() || $('#settings').hidden) return;
  renderGroups(); renderProgress(); renderDevice();
};

/* ---------- forms ---------- */
let onSubmit = null;
function avatarField(value = 'cat:0') {
  const {pic, tone} = P.parse(value);
  return `<fieldset class="pictures"><legend>Picture</legend><div class="picture-grid">${P.AVATARS.map(a => `<label><input type="radio" name="pic" value="${a}"${a === pic ? ' checked' : ''}><span class="sr-only">${a}</span>${P.avatar(a + ':' + tone)}</label>`).join('')}</div></fieldset>
    <fieldset class="tones"><legend>Color</legend><div class="tone-grid">${P.TONES.map((c, i) => `<label style="--tone:${c}"><input type="radio" name="tone" value="${i}"${i === tone ? ' checked' : ''}><span class="sr-only">Color ${i + 1}</span></label>`).join('')}</div></fieldset>`;
}
const field = (name, label, {type = 'text', help = '', value = '', auto = 'off'} = {}) =>
  `<label class="field"><span>${label}</span>${help ? `<small>${help}</small>` : ''}<input name="${name}" type="${type}" value="${esc(value)}" autocomplete="${auto}" autocapitalize="off" spellcheck="false"></label>`;
function open({title, help = '', fields = '', go = 'Save', danger = false, submit}) {
  $('#form-title').textContent = title;
  $('#form-help').textContent = help;
  $('#form-fields').innerHTML = fields;
  $('#form-error').textContent = '';
  $('#form-go').textContent = go;
  $('#form-go').classList.toggle('danger-solid', danger);
  onSubmit = submit;
  $('#form-dialog').showModal();
  ($('#form-fields input:not([type=radio])') || $('#form-fields input:checked') || $('#form-go')).focus();
}
$('#form-dialog-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.target), values = Object.fromEntries(form.entries());
  $('#form-go').disabled = true; $('#form-error').textContent = '';
  try {
    const note = await onSubmit(values);
    $('#form-dialog').close();
    await C.refresh(); C.retarget(); C.renderTarget(); C.render();
    if (note) { $('#groups-status').textContent = note; }
  } catch (err) { $('#form-error').textContent = err.local || say(err); }
  finally { $('#form-go').disabled = false; }
});
$('#form-dialog').addEventListener('click', e => { if (e.target.dataset.close) $('#form-dialog').close(); });
const fail = local => Object.assign(new Error(local), {local});
const needPassword = v => { if ((v || '').length < 6) throw fail(ERRORS.password_short); };
const api = (fn, args) => L.api(C.me().id, fn, args);

function act(button) {
  const a = button.dataset.act, card = button.closest('[data-group]'), gid = card && card.dataset.group;
  const g = C.groups().find(x => x.id === gid), id = button.dataset.id, name = button.dataset.name;
  if (a === 'settings') { C.setTarget({kind: 'child', id, name}); $('#target-bar').scrollIntoView({block: 'start'}); $('#target').focus({preventScroll: true}); }
  else if (a === 'add') open({title: `Add a child to ${g.name}`, help: 'Each child gets their own sign-in name. The password is yours to choose: at least six characters, for example a four-digit number you\'ll remember plus the child\'s initials, like 7234mk.',
    fields: field('name', 'Child\'s name', {help: 'First name is enough. Children see it under their picture.'}) + avatarField(`${P.AVATARS[(kids(g).length * 7) % P.AVATARS.length]}:${kids(g).length % 6}`) + field('password', 'Password', {help: 'At least six characters.', auto: 'new-password'}),
    go: 'Add child', submit: async v => {
      needPassword(v.password);
      const child = await api('lw_create_child', {p_group: gid, p_name: v.name, p_avatar: `${v.pic}:${v.tone}`, p_password: v.password});
      return `${child.name} is ready. Their sign-in name is ${child.login}.`;
    }});
  else if (a === 'link') open({title: `Add a child who has an account`, help: `For a child who already has an account, made by any grown-up. Type their sign-in name and password (the grown-up who made the account can tell you). The same account, progress and stickers then show in ${g.name} too.`,
    fields: field('login', 'Child\'s sign-in name', {help: 'Like mia-k4x.'}) + field('password', 'Child\'s password', {type: 'password'}),
    go: 'Add child', submit: async v => {
      const r = await api('lw_link_child', {p_group: gid, p_login: v.login, p_password: v.password});
      if (!r.ok) throw Object.assign(new Error(r.error), {code: r.error});
      return `${r.child.name} is now in ${g.name} too.`;
    }});
  else if (a === 'password') open({title: `New password for ${name}`, help: 'At least six characters. The old password stops working straight away, including on devices that are offline right now once they reconnect.',
    fields: field('password', 'New password', {auto: 'new-password'}), submit: async v => {
      needPassword(v.password);
      await api('lw_set_child_password', {p_child: id, p_password: v.password});
      return `${name}'s password is changed.`;
    }});
  else if (a === 'edit') open({title: `Edit ${name}`, fields: field('name', 'Name', {value: name}) + avatarField(button.dataset.avatar),
    submit: async v => { await api('lw_update_child', {p_child: id, p_name: v.name, p_avatar: `${v.pic}:${v.tone}`}); return 'Saved.'; }});
  else if (a === 'remove') open({title: `Take ${name} out of ${g.name}?`, help: `${name}'s account, progress and stickers are kept, and so is any other group they're in.`, go: 'Take out', danger: true,
    submit: async () => { await api('lw_remove_member', {p_group: gid, p_profile: id}); if (C.target && C.target.id === id) C.target = null; return `${name} is out of ${g.name}.`; }});
  else if (a === 'delete') open({title: `Delete ${name}'s account?`, help: `This deletes ${name}'s sign-in, settings, rounds and stickers everywhere, for good. To keep them, use Remove instead.`, go: 'Delete for good', danger: true,
    submit: async () => { await api('lw_delete_child', {p_child: id}); if (C.target && C.target.id === id) C.target = null; return `${name}'s account is deleted.`; }});
  else if (a === 'rename') open({title: `Rename ${g.name}`, fields: field('name', 'Name', {value: g.name}),
    submit: async v => { await api('lw_rename_group', {p_group: gid, p_name: v.name}); return 'Saved.'; }});
  else if (a === 'codes') open({title: 'Make new codes?', help: `Use this if a code got out. The old board and invite codes stop working; devices showing the old board need the new code.`, go: 'Make new codes',
    submit: async () => { await api('lw_new_codes', {p_group: gid}); return 'New codes are ready.'; }});
  else if (a === 'leave') open({title: `Leave ${g.name}?`, help: grownups(g).length === 1 ? 'You\'re the only grown-up, so the group closes. The children\'s accounts, progress and stickers are kept.' : 'You stop looking after these children. Their accounts are kept.', go: 'Leave', danger: true,
    submit: async () => { await api('lw_remove_member', {p_group: gid, p_profile: C.me().id}); C.target = null; return `You left ${g.name}.`; }});
  else if (a === 'cards') printCards(g);
  else if (a === 'forget') {
    L.forget(id).then(() => { renderDevice(); $('#groups-status').textContent = `${name} is forgotten on this device. Their account is safe.`; })
      .catch(err => { $('#groups-status').textContent = err.code === 'still_waiting' ? `${name} still has play waiting to upload.` : say(err); });
  }
}
function printCards(g) {
  $('#cards').innerHTML = kids(g).map(k => `<div class="card">${P.avatar(k.avatar)}<div><strong>${esc(k.name)}</strong>
    <dl><dt>Sign-in name</dt><dd>${esc(k.login)}</dd><dt>Board code</dt><dd>${esc(g.board_code)}</dd><dt>Password</dt><dd>Ask ${esc(C.me().name)}</dd></dl>
    <p>To play on any device, open Lucy's games and choose "Sign in with a name", or open the group board.</p></div></div>`).join('');
  window.print();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !C.me()) return;
  if (b.dataset.act) act(b);
  else if (b.id === 'new-group') {
    open({title: 'New group', help: 'Any name that helps you find it, for example Sunflowers, Room 4, Grandma\'s or Saturday club.',
      fields: field('name', 'Name'), go: 'Make it', submit: async v => { await api('lw_create_group', {p_kind: 'group', p_name: v.name}); return `${v.name} is ready. Add children next.`; }});
  } else if (b.id === 'join-group') open({title: 'Join with an invite code', help: 'Another grown-up can find the invite code on their group in this corner.',
    fields: field('code', 'Invite code', {help: 'Eight letters and numbers, like NC3U-3PQD.'}), go: 'Join',
    submit: async v => { const r = await api('lw_join_group', {p_invite: v.code}); return `You joined ${r.name}.`; }});
  else if (b.id === 'password-mine') open({title: 'Change my password', fields: field('old', 'Current password', {type: 'password', auto: 'current-password'}) + field('password', 'New password', {type: 'password', auto: 'new-password', help: 'At least six characters.'}),
    submit: async v => { needPassword(v.password); await api('lw_change_password', {p_old: v.old, p_new: v.password}); return 'Your password is changed. Use it next time you sign in.'; }});
  else if (b.id === 'sync-now') {
    $('#sync-line span').textContent = 'Saving…';
    L.syncAll().then(() => C.refresh()).then(() => { C.renderTarget(); C.render(); });
  }
});
L.on('status', () => { if (C.me() && !$('#settings').hidden) renderDevice(); });
})();
