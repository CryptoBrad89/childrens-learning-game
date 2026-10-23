/* Served grown-ups' corner: sign in, then manage children.
 * file:// never reaches this file's work, so the reading gate stays for the
 * local prototype and its checks.
 * There is no public signup. An admin who is already signed in adds grown-ups.
 * The page does not show groups or codes.
 */
(function () {
  'use strict';
  if (location.protocol === 'file:') return;
  let grownPeople = [];
  const Client = window.LittleWoofClient;
  const Store = window.LittleWoofStore;
  const Avatars = window.LittleWoofAvatars;
  const $ = selector => document.querySelector(selector);
  const PICTURE = /^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i;

  document.addEventListener('DOMContentLoaded', () => { start().catch(error => showStatus(error.message, true)); });

  function showStatus(message, bad) {
    const el = document.querySelector('#account-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('bad', !!bad);
  }
  function field(label, html) {
    return `<label>${label}${html}</label>`;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
  }
  function isAdmin(user, roster) {
    const flag = user && user.app_metadata && user.app_metadata.admin;
    return flag === true || flag === 'true' || !!(roster && roster.is_admin);
  }
  function avatarPicker(selected = 'garden') {
    const pictures = window.LittleWoofPictures;
    const items = pictures ? pictures.PICTURES : [];
    return `<div class="choices" role="group" aria-label="Picture">${items.map(item => `<button type="button" class="avatar-pick" data-avatar="${item.id}" aria-pressed="${item.id === selected}" aria-label="${escapeHtml(item.label)}"><img src="${pictures.src(item.id)}" alt=""></button>`).join('')}</div>`;
  }
  function bindAvatars(root) {
    let current = 'garden';
    root.querySelectorAll('[data-avatar]').forEach(button => {
      if (button.getAttribute('aria-pressed') === 'true') current = button.dataset.avatar;
      button.addEventListener('click', () => {
        current = button.dataset.avatar;
        root.querySelectorAll('[data-avatar]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      });
    });
    return () => current;
  }
  function suggestLogin(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  }
  async function shrinkPicture(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error('Choose a picture file.');
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 192 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();
    const url = canvas.toDataURL('image/jpeg', 0.82);
    if (!PICTURE.test(url) || url.length > 180000) throw new Error('That picture is too big. Try a smaller one.');
    return url;
  }
  function face(child) {
    const pictures = window.LittleWoofPictures;
    if (child.avatar_image && PICTURE.test(child.avatar_image)) {
      const img = document.createElement('img');
      img.src = child.avatar_image;
      img.alt = '';
      return img;
    }
    if (pictures && pictures.isPicture(child.avatar)) {
      const img = document.createElement('img');
      img.src = pictures.src(child.avatar);
      img.alt = '';
      return img;
    }
    const holder = document.createElement('span');
    holder.innerHTML = Avatars.svg(child.avatar || 'pup');
    return holder;
  }
  let progressTimer = 0;

  async function start() {
    const gate = $('#gate');
    if (gate) gate.hidden = true;
    const host = document.createElement('section');
    host.id = 'account';
    host.className = 'account player';
    host.innerHTML = '<p id="account-status" class="status" role="status"></p>';
    gate.after(host);
    let user = null;
    try { user = await Client.sessionUser(); } catch (error) { user = null; }
    if (!user) { renderSign(host); return; }
    if (Client.roleOf(user) === 'child') { renderChildBlocked(host); return; }
    await renderDesk(host, user);
  }

  function renderSign(host) {
    host.insertAdjacentHTML('beforeend', signInForm());
    host.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      if (String(data.password || '').length < 6) { showStatus('The secret needs at least 6 characters.', true); return; }
      try {
        showStatus('Signing in…');
        const user = await Client.signIn(String(data.email).trim(), data.password);
        if (Client.roleOf(user) === 'child') {
          await Client.signOut();
          showStatus('That sign-in is for a child. Use the home screen.', true);
          return;
        }
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
  }
  function signInForm() {
    return `<h2>Grown-up sign-in</h2><p class="player-lead">Use the email and secret you already have.</p><form class="grid" id="grown-sign-in">${field('Email', '<input name="email" type="email" autocomplete="username" required>')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="current-password" required>')}<button type="submit">Sign in</button></form>`;
  }

  function renderChildBlocked(host) {
    host.insertAdjacentHTML('beforeend', `<h2>A grown-up needs to sign in.</h2><p class="player-lead">This screen is signed in as a child, so the settings stay hidden.</p><button type="button" id="switch-grownup">Sign in as a grown-up</button>`);
    host.querySelector('#switch-grownup').addEventListener('click', async () => {
      await Client.signOut();
      Store.clearActive();
      Store.clearProjection();
      location.reload();
    });
  }

  function selectedKids(host) {
    return [...host.querySelectorAll('[data-kid-check]:checked')].map(box => box.value);
  }
  function kidById(children, id) {
    return children.find(child => child.id === id) || null;
  }
  function guardianLine(child, master) {
    if (!master) return '';
    const people = child.guardians || [];
    if (!people.length) return 'No grown-up yet';
    return people.map(person => person.you ? 'You' : `${person.display_name}${person.login_name ? ` (${person.login_name})` : ''}`).join(', ');
  }
  function settingsLine(id) {
    const state = Store.readState(id);
    const custom = state.settings && Object.keys(state.settings).length > 0;
    return custom ? 'Custom for this child' : 'Using game defaults';
  }
  function formatWhen(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'not yet';
    return date.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});
  }
  async function signOutDesk() {
    await Client.signOut();
    Store.clearActive();
    Store.clearProjection();
    location.href = 'index.html';
  }
  async function eachChunk(items, send) {
    const out = [];
    for (let start = 0; start < items.length; start += 25) {
      const data = await send(items.slice(start, start + 25));
      if (data && Array.isArray(data.results)) out.push(...data.results);
    }
    return out;
  }
  function askPassword(text, commit) {
    const dialog = document.getElementById('danger');
    const phrase = dialog.querySelector('#danger-phrase');
    const go = dialog.querySelector('#danger-go');
    dialog.querySelector('#danger-text').textContent = text;
    go.textContent = commit || 'Continue';
    phrase.value = '';
    go.disabled = true;
    dialog.showModal();
    phrase.focus();
    return new Promise(resolve => {
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        phrase.value = '';
        resolve(value);
      };
      dialog.addEventListener('close', () => finish(null), {once: true});
      phrase.oninput = () => { go.disabled = phrase.value.length === 0; };
      go.onclick = () => {
        if (go.disabled) return;
        finish(phrase.value);
        dialog.close();
      };
      dialog.querySelector('#danger-cancel').onclick = () => { finish(null); dialog.close(); };
    });
  }
  function openGameSettings(label, ids, extras) {
    const target = document.getElementById('settings-target');
    if (target) target.textContent = label;
    const settings = document.getElementById('settings');
    if (settings) {
      settings.hidden = false;
      settings.dataset.open = 'true';
      settings.scrollIntoView({block: 'nearest'});
    }
    document.body.dataset.portal = 'ready';
    const current = window.GROWN_UPS && window.GROWN_UPS.settings;
    window.LittleWoofSettingsBaseline = current ? JSON.parse(JSON.stringify(current)) : {};
    window.LittleWoofSettingsTarget = Object.assign({ids: ids || [], label}, extras || {});
  }

  async function renderDesk(host, user) {
    const roster = await Client.roster();
    const children = roster.children || [];
    const master = !!(roster && roster.is_master);
    grownPeople = roster.grownups || [];
    const leave = document.getElementById('leave');
    if (leave) leave.hidden = true;
    document.body.dataset.portal = 'ready';
    const settings = document.getElementById('settings');
    if (settings) settings.hidden = true;
    host.insertAdjacentHTML('beforeend', deskHtml(master));
    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.id = 'sign-out';
    signOut.className = 'sign-out-fixed';
    signOut.textContent = 'Sign out';
    document.body.append(signOut);
    signOut.addEventListener('click', () => { signOutDesk().catch(error => showStatus(error.message, true)); });
    const kidsView = host.querySelector('#view-kids');
    const grownView = host.querySelector('#view-grown');
    const showView = name => {
      kidsView.hidden = name !== 'kids';
      if (grownView) grownView.hidden = name !== 'grown';
      host.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
    };
    host.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
    paintKids(host.querySelector('#kids'), children, master, '');
    paintLinks(host.querySelector('#link-picks'), children, roster.grownups || []);
    paintGrown(host.querySelector('#grown-list'), roster.grownups || [], '');
    const grownSearch = host.querySelector('#grown-search');
    if (grownSearch) {
      grownSearch.addEventListener('input', event => {
        paintGrown(host.querySelector('#grown-list'), roster.grownups || [], event.target.value);
      });
    }
    const avatar = bindAvatars(host.querySelector('#add-child'));
    const grownForm = host.querySelector('#add-grownup');
    const grownAvatar = grownForm ? bindAvatars(grownForm) : () => 'garden';
    let photo = '';
    const preview = host.querySelector('#photo-preview');
    const file = host.querySelector('#child-photo');
    file.addEventListener('change', async () => {
      const picked = file.files && file.files[0];
      if (!picked) { photo = ''; preview.hidden = true; preview.replaceChildren(); return; }
      try {
        photo = await shrinkPicture(picked);
        const img = document.createElement('img');
        img.src = photo;
        img.alt = 'Chosen picture';
        preview.replaceChildren(img);
        preview.hidden = false;
      } catch (error) {
        photo = '';
        file.value = '';
        preview.hidden = true;
        showStatus(error.message, true);
      }
    });
    host.querySelector('#clear-photo').addEventListener('click', () => {
      photo = '';
      file.value = '';
      preview.hidden = true;
      preview.replaceChildren();
    });
    host.querySelector('#kid-search').addEventListener('input', event => {
      paintKids(host.querySelector('#kids'), children, master, event.target.value);
    });
    host.querySelector('#add-child').addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      const login = (data.login_name || suggestLogin(data.display_name)).toLowerCase();
      if (!/^[a-z0-9]{2,20}$/.test(login)) { showStatus('Use a short sign-in name, like maya.', true); return; }
      if (String(data.password).length < 6) { showStatus('The secret needs at least 6 characters.', true); return; }
      try {
        showStatus('Adding the child…');
        await Client.invoke('accounts-manage', {
          action: 'create-child',
          display_name: data.display_name,
          login_name: login,
          password: data.password,
          avatar: avatar(),
          avatar_image: photo || null
        });
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    host.querySelector('#link-children')?.addEventListener('submit', async event => {
      event.preventDefault();
      const ids = [...event.target.querySelectorAll('input:checked')].map(box => box.value);
      if (!ids.length) { showStatus('Pick at least one child.', true); return; }
      const also = event.target.querySelector('[name="also_parent_id"]');
      try {
        showStatus('Linking…');
        await eachChunk(ids, part => Client.invoke('accounts-manage', {
          action: 'link-children',
          child_ids: part,
          also_parent_id: also && also.value ? also.value : undefined
        }));
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    host.querySelector('#add-grownup')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      const login = String(data.login_name || '').trim().toLowerCase();
      if (!/^[a-z0-9]{2,20}$/.test(login)) { showStatus('Use a short sign-in name.', true); return; }
      if (String(data.password).length < 6) { showStatus('The secret needs at least 6 characters.', true); return; }
      if (!String(data.confirm_password || '')) { showStatus('Enter your secret to add a grown-up.', true); return; }
      try {
        showStatus('Adding the grown-up…');
        await Client.invoke('accounts-manage', {
          action: 'create-grownup',
          display_name: data.display_name,
          login_name: login,
          password: data.password,
          confirm_password: data.confirm_password,
          avatar: grownAvatar()
        });
        showStatus('Grown-up added. They can sign in with that name.');
        event.target.reset();
      } catch (error) { showStatus(error.message, true); }
    });
    host.addEventListener('click', event => onKidClick(event, host, children, master));
    wireSettingsPush();
    showView('kids');
    const mine = new URLSearchParams(location.search).get('child');
    if (mine) openKid(host, children, master, mine);
  }

  function changedKeys(before, after) {
    const keys = ['voice', 'volume', 'effects', 'calm', 'hintAfter', 'kidControls', 'letters', 'games'];
    return keys.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  }
  function wireSettingsPush() {
    const api = window.GROWN_UPS;
    if (!api || api._deskWrapped) return;
    const original = api.save;
    api.save = next => {
      const ok = original(next);
      const target = window.LittleWoofSettingsTarget;
      if (!target) return ok;
      const before = window.LittleWoofSettingsBaseline || next;
      const keys = changedKeys(before, next);
      (target.ids || []).forEach(id => {
        if (!keys.length) return;
        const flat = Store.projectSettings(Store.readState(id));
        keys.forEach(key => { flat[key] = Array.isArray(next[key]) ? [...next[key]] : next[key]; });
        Client.noteSettings(id, flat);
      });
      if (target.defaults) {
        Client.supabase().rpc('write_game_defaults', {p_settings: next}).catch(error => showStatus(error.message, true));
      }
      window.LittleWoofSettingsBaseline = JSON.parse(JSON.stringify(next));
      return ok;
    };
    api._deskWrapped = true;
  }

  function paintKids(list, children, master, query) {
    const needle = String(query || '').trim().toLowerCase();
    list.replaceChildren();
    const shown = children.filter(child => {
      if (!needle) return true;
      const grown = (child.guardians || []).map(person => `${person.display_name} ${person.login_name || ''}`).join(' ');
      return `${child.display_name} ${child.login_name || ''} ${grown}`.toLowerCase().includes(needle);
    });
    if (!shown.length) {
      const empty = document.createElement('li');
      empty.className = 'kid';
      empty.textContent = children.length ? 'No names match.' : 'No children yet. Add one below.';
      list.append(empty);
      return;
    }
    shown.forEach(child => {
      const row = document.createElement('li');
      row.className = 'kid';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.dataset.kidCheck = '';
      check.value = child.id;
      check.setAttribute('aria-label', `Select ${child.display_name}`);
      const avatar = document.createElement('span');
      avatar.className = 'player-avatar';
      avatar.append(face(child));
      const name = document.createElement('span');
      const links = guardianLine(child, master);
      name.innerHTML = `<strong>${escapeHtml(child.display_name)}</strong><small>${escapeHtml(child.login_name || '')}</small>${links ? `<small>${escapeHtml(links)}</small>` : ''}<small>${escapeHtml(settingsLine(child.id))}</small>`;
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'quiet';
      open.dataset.openKid = child.id;
      open.textContent = 'Open';
      row.append(check, avatar, name, open);
      list.append(row);
    });
  }

  async function onKidClick(event, host, children, master) {
    const open = event.target.closest('[data-open-kid]');
    if (open) { openKid(host, children, master, open.dataset.openKid); return; }
    const action = event.target.closest('[data-bulk]');
    if (!action) return;
    const ids = selectedKids(host);
    const picked = ids.map(id => kidById(children, id)).filter(Boolean);
    if (!picked.length) { showStatus('Pick at least one child.', true); return; }
    const names = picked.map(child => `${child.display_name} (${child.login_name || 'no name'})`).join(', ');
    if (action.dataset.bulk === 'settings') {
      openGameSettings(`Editing: ${names}`, ids);
      return;
    }
    if (action.dataset.bulk === 'defaults' && master) {
      openGameSettings('Editing: game defaults', [], {defaults: true});
      return;
    }
    if (action.dataset.bulk === 'reset') {
      const secret = await askPassword(`Reset progress for ${names}? Sounds they have kept will be cleared.`, 'Reset progress');
      if (!secret) return;
      try {
        const results = await eachChunk(picked, part => Client.invoke('accounts-manage', {
          action: 'reset-progress',
          user_ids: part.map(child => child.id),
          confirm_password: secret
        }));
        results.forEach(row => { if (row.ok) Client.resetProgress(row.id); });
        showStatus(results.map(row => `${row.display_name || 'Child'}: ${row.ok ? 'progress cleared' : row.error}`).join(' ') || 'Nothing changed.');
      } catch (error) { showStatus(error.message, true); }
      return;
    }
    if (action.dataset.bulk === 'delete') {
      const secret = await askPassword(`Delete ${names}? This removes each login, picture, and progress.`, 'Delete');
      if (!secret) return;
      try {
        const results = await eachChunk(picked, part => Client.invoke('accounts-manage', {
          action: 'delete-child',
          child_ids: part.map(child => child.id),
          confirm_password: secret
        }));
        showStatus(results.map(row => `${row.display_name || 'Child'}: ${row.ok ? 'deleted' : row.error}`).join(' ') || 'Nothing changed.');
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    }
  }

  function openKid(host, children, master, id) {
    const child = kidById(children, id);
    const panel = host.querySelector('#kid-panel');
    if (!child || !panel) return;
    panel.hidden = false;
    const guardians = child.guardians || [];
    const destinations = grownPeople.filter(person => {
      const login = String(person.login_name || '').toLowerCase();
      const display = String(person.display_name || '').trim().toLowerCase();
      if (login === 'brandy' || display === 'brandy') return false;
      return !guardians.some(link => link.id === person.id);
    });
    const move = master && guardians.length && destinations.length
      ? `<div class="grid" id="move-child">${field('From', `<select id="move-from">${guardians.map(person => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.display_name)} (${escapeHtml(person.login_name || 'no name')})</option>`).join('')}</select>`)}${field('To', `<select id="move-to">${destinations.map(person => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.display_name)} (${escapeHtml(person.login_name || 'no name')})</option>`).join('')}</select>`)}<button type="button" class="quiet" id="kid-move">Move</button></div>`
      : '';
    panel.innerHTML = `<h2>${escapeHtml(child.display_name)}</h2><p class="player-lead">${escapeHtml(child.login_name || '')}. ${escapeHtml(guardianLine(child, master) || settingsLine(id))}. ${escapeHtml(settingsLine(id))}.</p><div id="live-progress" class="player-lead">Loading progress…</div><form id="edit-child" class="grid">${field('Name', `<input name="display_name" value="${escapeHtml(child.display_name)}" required maxlength="40">`)}${field('Sign-in name', `<input name="login_name" value="${escapeHtml(child.login_name || '')}" minlength="2" maxlength="20" required>`)}${field('New secret', '<input name="password" type="password" minlength="6" autocomplete="new-password">')}${avatarPicker(child.avatar || 'garden')}<button type="submit">Save changes</button></form><p class="row-actions"><button type="button" class="quiet" id="kid-settings">Game settings</button><button type="button" class="quiet" id="kid-reset-defaults">Reset to game defaults</button><button type="button" class="quiet" id="kid-reset">Reset progress</button><button type="button" class="quiet" id="kid-unlink">Unlink</button><button type="button" id="kid-delete">Delete</button></p>${move}`;
    const editAvatar = bindAvatars(panel);
    panel.querySelector('#edit-child').addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      const login = String(data.login_name || '').trim().toLowerCase();
      const nextSecret = String(data.password || '');
      const loginChanged = login !== String(child.login_name || '');
      let confirm;
      if (loginChanged || nextSecret) {
        confirm = await askPassword(`Save the sign-in changes for ${child.display_name}? Enter your secret.`, 'Save');
        if (!confirm) return;
      }
      try {
        await Client.invoke('accounts-manage', {
          action: 'update-child',
          child_id: id,
          display_name: data.display_name,
          login_name: data.login_name,
          password: nextSecret || undefined,
          confirm_password: confirm || undefined,
          avatar: editAvatar()
        });
        showStatus('Saved.');
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    panel.querySelector('#kid-settings').addEventListener('click', () => openGameSettings(`Editing: ${child.display_name} (${child.login_name || ''})`, [id]));
    panel.querySelector('#kid-reset-defaults').addEventListener('click', () => {
      const state = Store.readState(id);
      const hintAfter = state.settings && state.settings.hintAfter;
      state.settings = hintAfter ? {hintAfter} : {};
      Store.writeState(id, state);
      Client.scheduleSync(id);
      showStatus(`${child.display_name} is using game defaults.`);
    });
    panel.querySelector('#kid-reset').addEventListener('click', async () => {
      const secret = await askPassword(`Reset progress for ${child.display_name}? Sounds they have kept will be cleared.`, 'Reset progress');
      if (!secret) return;
      try {
        await Client.invoke('accounts-manage', {action: 'reset-progress', user_id: id, confirm_password: secret});
        Client.resetProgress(id);
        showStatus(`${child.display_name}: progress cleared`);
      } catch (error) { showStatus(error.message, true); }
    });
    panel.querySelector('#kid-unlink').addEventListener('click', async () => {
      const secret = await askPassword(`Unlink ${child.display_name}? The child stays.`, 'Unlink');
      if (!secret) return;
      try {
        await Client.invoke('accounts-manage', {action: 'unlink-child', child_id: id, confirm_password: secret});
        showStatus('Link removed.');
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    panel.querySelector('#kid-move')?.addEventListener('click', async () => {
      const fromId = panel.querySelector('#move-from')?.value || '';
      const toId = panel.querySelector('#move-to')?.value || '';
      if (!fromId || !toId) { showStatus('Choose who has this child, and who should have them next.', true); return; }
      const secret = await askPassword(`Move ${child.display_name} to another grown-up?`, 'Move');
      if (!secret) return;
      try {
        await Client.invoke('accounts-manage', {
          action: 'transfer-child',
          child_id: id,
          from_parent_id: fromId,
          to_parent_id: toId,
          confirm_password: secret
        });
        showStatus('Moved.');
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    panel.querySelector('#kid-delete').addEventListener('click', async () => {
      const secret = await askPassword(`Delete ${child.display_name} (${child.login_name || ''})? This removes the login, the picture, and the progress.`, 'Delete');
      if (!secret) return;
      try {
        await Client.invoke('accounts-manage', {action: 'delete-child', child_id: id, confirm_password: secret});
        showStatus(`${child.display_name}: deleted`);
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    watchProgress(id, panel.querySelector('#live-progress'));
  }

  function watchProgress(id, box) {
    const paint = (data, offline) => {
      const letters = [];
      const progress = data && data.progress || {};
      for (const world of ['post', 'space', 'silk']) {
        Object.keys((progress[world] && progress[world].letters) || {}).forEach(letter => letters.push(letter));
      }
      const unique = [...new Set(letters)].sort().join(' ') || 'none yet';
      const when = data && data.updated_at ? formatWhen(data.updated_at) : 'not yet';
      box.textContent = offline
        ? `Offline. Showing the last known progress. Sounds: ${unique}. Last activity synced at ${when}.`
        : `Sounds: ${unique}. Last activity synced at ${when}.`;
    };
    const load = async () => {
      const cached = Store.readState(id);
      if (navigator.onLine === false) { paint({progress: cached.progress, updated_at: null}, true); return; }
      try {
        const {data, error} = await Client.supabase().rpc('kid_progress', {p_user_id: id});
        if (error) throw new Error(error.message);
        if (data && data.ok === false && data.code === 'not-linked') throw new Error('That child is not linked to you.');
        paint(data, false);
        try { sessionStorage.setItem(`lw-synced-at:${id}`, data.updated_at || ''); } catch (error) { /* ignore */ }
      } catch (error) {
        const when = sessionStorage.getItem(`lw-synced-at:${id}`) || '';
        paint({progress: cached.progress, updated_at: when}, true);
        box.textContent = `${error.message}. ${box.textContent}`;
      }
    };
    load();
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(load, 8000);
  }

  function paintLinks(box, children, grownups) {
    if (!box) return;
    box.replaceChildren();
    if (!children.length) {
      const empty = document.createElement('p');
      empty.className = 'player-lead';
      empty.textContent = 'No children to link yet.';
      box.append(empty);
      return;
    }
    children.forEach(child => {
      const label = document.createElement('label');
      label.className = 'check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = child.id;
      label.append(input, document.createTextNode(`${child.display_name} (${child.login_name || 'no name'})`));
      box.append(label);
    });
    const others = (grownups || []).filter(person => !person.self);
    if (!others.length) return;
    const label = document.createElement('label');
    label.append(document.createTextNode('Also link to'));
    const select = document.createElement('select');
    select.name = 'also_parent_id';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'Just me';
    select.append(none);
    others.forEach(person => {
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = `${person.display_name} (${person.login_name || 'no name'})`;
      select.append(option);
    });
    label.append(select);
    box.append(label);
  }

  async function paintGrown(box, people, query) {
    if (!box) return;
    const needle = String(query || '').trim().toLowerCase();
    const shown = (people || []).filter(person => {
      if (!needle) return true;
      return `${person.display_name} ${person.login_name || ''}`.toLowerCase().includes(needle);
    });
    box.replaceChildren();
    if (!shown.length) {
      const empty = document.createElement('p');
      empty.className = 'player-lead';
      empty.textContent = people.length ? 'No names match.' : 'No other grown-ups yet.';
      box.append(empty);
      return;
    }
    shown.forEach(person => {
      const row = document.createElement('div');
      row.className = 'kid';
      const canDelete = !person.self && !person.is_master;
      if (canDelete) {
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.dataset.grownCheck = '';
        check.value = person.id;
        check.setAttribute('aria-label', `Select ${person.display_name}`);
        row.append(check);
      }
      const avatar = document.createElement('span');
      avatar.className = 'player-avatar';
      avatar.append(face(person));
      const name = document.createElement('span');
      const you = person.self ? '<small>You</small>' : '';
      name.innerHTML = `<strong>${escapeHtml(person.display_name)}</strong><small>${escapeHtml(person.login_name || '')}</small>${you}`;
      row.append(avatar, name);
      box.append(row);
    });
    const deletable = shown.filter(person => !person.self && !person.is_master);
    if (deletable.length) {
      const actions = document.createElement('p');
      actions.className = 'row-actions';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Delete';
      button.addEventListener('click', async () => {
        const chosen = [...box.querySelectorAll('[data-grown-check]:checked')]
          .map(input => deletable.find(person => person.id === input.value))
          .filter(Boolean);
        if (!chosen.length) { showStatus('Pick at least one grown-up.', true); return; }
        const names = chosen.map(person => `${person.display_name} (${person.login_name || 'no name'})`).join(', ');
        const secret = await askPassword(`Delete ${names}? The login goes away. Children stay.`, 'Delete');
        if (!secret) return;
        try {
          const results = await eachChunk(chosen, part => Client.invoke('accounts-manage', {
            action: 'delete-grownup',
            grownup_ids: part.map(person => person.id),
            confirm_password: secret
          }));
          const gone = new Set(results.filter(row => row.ok).map(row => row.id));
          showStatus(results.map(row => `${row.display_name || 'Grown-up'}: ${row.ok ? 'deleted' : row.error}`).join(' ') || 'Nothing changed.');
          paintGrown(box, people.filter(person => !gone.has(person.id)), query);
        } catch (error) { showStatus(error.message, true); }
      });
      actions.append(button);
      box.append(actions);
    }
  }

  function deskHtml(master) {
    const grownTab = master ? '<button type="button" class="view-tab" data-view="grown" aria-pressed="false">Grown-ups</button>' : '';
    const grownView = master ? `<section id="view-grown" class="view" hidden><h2>Grown-ups</h2><p class="player-lead">Add a grown-up. They sign in with the short name you choose. Children stay if a grown-up is removed.</p><form id="add-grownup" class="grid">${field('Name', '<input name="display_name" required maxlength="40">')}${field('Sign-in name', '<input name="login_name" minlength="2" maxlength="20" autocapitalize="none" autocomplete="off" required>')}${field('Their secret', '<input name="password" type="password" minlength="6" autocomplete="new-password" required>')}<p class="player-lead">Six characters is enough.</p>${field('Your secret', '<input name="confirm_password" type="password" autocomplete="current-password" required>')}<p class="player-lead">Enter your own secret to add this login.</p><span>Lucy pictures</span>${avatarPicker('garden')}<button type="submit">Add this grown-up</button></form><label>Search<input id="grown-search" type="search" placeholder="Name or sign-in"></label><div id="grown-list"></div></section>` : '';
    const link = master ? `<form id="link-children" class="grid"><h2>Link existing children</h2><p class="player-lead">Pick them from the list. No need to type a name or a secret.</p><div id="link-picks"></div><button type="submit" class="quiet">Link the picked children</button></form>` : '';
    const defaults = master ? '<button type="button" class="quiet" data-bulk="defaults">Game defaults</button>' : '';
    return `<p class="view-tabs" role="tablist"><button type="button" class="view-tab" data-view="kids" aria-pressed="true">Kids</button>${grownTab}</p><a class="quiet account-link" href="account.html">My account</a><section id="view-kids" class="view"><h2>Children</h2><label>Search<input id="kid-search" type="search" placeholder="Name or sign-in"></label><ul class="kids" id="kids"></ul><p class="row-actions"><button type="button" class="quiet" data-bulk="settings">Game settings</button>${defaults}<button type="button" class="quiet" data-bulk="reset">Reset progress</button><button type="button" data-bulk="delete">Delete</button></p><div id="kid-panel" hidden></div><form id="add-child" class="grid"><h2>Add a child</h2>${field('Name', '<input name="display_name" required maxlength="40">')}${field('Picture from this device', '<input id="child-photo" name="photo" type="file" accept="image/*">')}<p id="photo-preview" class="photo-preview" hidden></p><button type="button" class="quiet" id="clear-photo">Use a Lucy picture instead</button><span>Lucy pictures</span>${avatarPicker('garden')}${field('Sign-in name', '<input name="login_name" minlength="2" maxlength="20" autocapitalize="none" autocomplete="off" placeholder="maya">')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="new-password" required>')}<p class="player-lead">Six characters is the only rule.</p><button type="submit">Add this child</button></form>${link}</section>${grownView}<dialog id="danger" aria-labelledby="danger-text"><p id="danger-text"></p><label>Your secret<input id="danger-phrase" type="password" autocomplete="current-password"></label><div class="dialog-actions"><button type="button" id="danger-go" disabled>Continue</button><button type="button" class="quiet" id="danger-cancel">Cancel</button></div></dialog>`;
  }
})();
