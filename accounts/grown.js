/* Served grown-ups' corner: sign in, then manage children.
 * file:// never reaches this file's work, so the reading gate stays for the
 * local prototype and its checks.
 * There is no public signup. An admin who is already signed in adds grown-ups.
 * The page does not show groups or codes.
 */
(function () {
  'use strict';
  if (location.protocol === 'file:') return;
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
  function avatarPicker(selected = 'pup') {
    return `<div class="choices" role="group" aria-label="Picture">${Avatars.IDS.map(id => `<button type="button" class="avatar-pick" data-avatar="${id}" aria-pressed="${id === selected}" aria-label="${Avatars.AVATARS[id].label}">${Avatars.svg(id)}</button>`).join('')}</div>`;
  }
  function bindAvatars(root) {
    let current = 'pup';
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
    if (child.avatar_image && PICTURE.test(child.avatar_image)) {
      const img = document.createElement('img');
      img.src = child.avatar_image;
      img.alt = '';
      return img;
    }
    const holder = document.createElement('span');
    holder.innerHTML = Avatars.svg(child.avatar || 'pup');
    return holder;
  }
  function paintKids(list, children) {
    list.replaceChildren();
    if (!children.length) {
      const empty = document.createElement('li');
      empty.className = 'kid';
      empty.textContent = 'No children yet. Add one below.';
      list.append(empty);
      return;
    }
    children.forEach(child => {
      const row = document.createElement('li');
      row.className = 'kid';
      const avatar = document.createElement('span');
      avatar.className = 'player-avatar';
      avatar.append(face(child));
      const name = document.createElement('span');
      name.innerHTML = `<strong>${escapeHtml(child.display_name)}</strong><small>${escapeHtml(child.login_name || '')}</small>`;
      row.append(avatar, name);
      list.append(row);
    });
  }

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
    return `<h2>Grown-up sign-in</h2><p class="player-lead">Use the email and secret you already have. An admin who is already signed in can add another grown-up.</p><form class="grid" id="grown-sign-in">${field('Email', '<input name="email" type="email" autocomplete="username" required>')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="current-password" required>')}<button type="submit">Sign in</button></form>`;
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

  function showDeviceSettings() {
    const settings = $('#settings');
    if (!settings) return;
    settings.hidden = false;
    settings.dataset.open = 'true';
    document.body.dataset.view = 'settings';
  }

  async function renderDesk(host, user) {
    const roster = await Client.roster();
    const children = roster.children || [];
    const admin = isAdmin(user, roster);
    host.insertAdjacentHTML('beforeend', deskHtml(children, admin, Client.roleOf(user)));
    paintKids(host.querySelector('#kids'), children);
    const avatar = bindAvatars(host);
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
    host.querySelector('#link-child')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        showStatus('Linking…');
        await Client.invoke('accounts-manage', {action: 'link-child', login_name: data.login_name, password: data.password});
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    host.querySelector('#new-secret')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      if (String(data.password).length < 6) { showStatus('The secret needs at least 6 characters.', true); return; }
      try {
        await Client.invoke('accounts-manage', {action: 'reset-password', login_name: data.login_name, password: data.password});
        showStatus('New secret saved.');
        event.target.reset();
      } catch (error) { showStatus(error.message, true); }
    });
    host.querySelector('#add-grownup')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      if (String(data.password).length < 6) { showStatus('The secret needs at least 6 characters.', true); return; }
      try {
        showStatus('Adding the grown-up…');
        await Client.invoke('accounts-manage', {
          action: 'create-grownup',
          display_name: data.display_name,
          email: data.email,
          password: data.password,
          can_admin: event.target.querySelector('[name="can_admin"]').checked
        });
        showStatus('Grown-up added. They can sign in with that email.');
        event.target.reset();
      } catch (error) { showStatus(error.message, true); }
    });
    host.querySelector('#sign-out').addEventListener('click', async () => {
      await Client.signOut();
      Store.clearActive();
      Store.clearProjection();
      location.href = '../index.html';
    });
    showDeviceSettings();
  }

  function deskHtml(children, admin, role) {
    const reset = children.length ? `<form id="new-secret" class="grid"><h2>New secret</h2>${field('Sign-in name', `<input name="login_name" value="${escapeHtml(children[0].login_name || '')}" required>`)}${field('New secret', '<input name="password" type="password" minlength="6" required>')}<button type="submit" class="quiet">Save the new secret</button></form>` : '';
    const link = role === 'parent' ? `<form id="link-child" class="grid"><h2>Link a child</h2><p class="player-lead">Type the sign-in name and secret a grown-up already set.</p>${field('Sign-in name', '<input name="login_name" required autocapitalize="none">')}${field('Secret', '<input name="password" type="password" minlength="6" required>')}<button type="submit" class="quiet">Link</button></form>` : '';
    const grown = admin ? `<form id="add-grownup" class="grid"><h2>Add a grown-up</h2><p class="player-lead">Only an admin who is already signed in can add another grown-up.</p>${field('Name', '<input name="display_name" required maxlength="40">')}${field('Email', '<input name="email" type="email" autocomplete="off" required>')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="new-password" required>')}<label class="check"><input name="can_admin" type="checkbox"> They can add other grown-ups</label><button type="submit">Add this grown-up</button></form>` : '';
    return `<h2>Children</h2><ul class="kids" id="kids"></ul><form id="add-child" class="grid"><h2>Add a child</h2>${field('Name', '<input name="display_name" required maxlength="40">')}${field('Picture from this device', '<input id="child-photo" name="photo" type="file" accept="image/*">')}<p id="photo-preview" class="photo-preview" hidden></p><button type="button" class="quiet" id="clear-photo">Use the icon instead</button><span>Or pick an icon</span>${avatarPicker('fox')}${field('Sign-in name', '<input name="login_name" minlength="2" maxlength="20" autocapitalize="none" autocomplete="off" placeholder="maya">')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="new-password" required>')}<p class="player-lead">Six characters is the only rule. A pin plus initials works: 7234ab.</p><button type="submit">Add this child</button></form>${link}${reset}${grown}<button type="button" class="quiet" id="sign-out">Sign out</button>`;
  }
})();
