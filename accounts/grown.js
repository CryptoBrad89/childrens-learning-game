/* Served grown-ups' corner: a real sign-in instead of the number-word gate.
 * file:// never reaches this file's work, so the reading gate stays for the
 * local prototype and its checks.
 */
(function () {
  'use strict';
  if (location.protocol === 'file:') return;
  const Client = window.LittleWoofClient;
  const Store = window.LittleWoofStore;
  const Avatars = window.LittleWoofAvatars;
  const $ = selector => document.querySelector(selector);

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
  function avatarPicker(selected = 'pup') {
    return `<div class="choices" role="group" aria-label="Picture">${Avatars.IDS.map(id => `<button type="button" class="avatar-pick" data-avatar="${id}" aria-pressed="${id === selected}" aria-label="${Avatars.AVATARS[id].label}">${Avatars.svg(id)}</button>`).join('')}</div>`;
  }
  function bindAvatars(root, onPick) {
    let current = 'pup';
    root.querySelectorAll('[data-avatar]').forEach(button => {
      if (button.getAttribute('aria-pressed') === 'true') current = button.dataset.avatar;
      button.addEventListener('click', () => {
        current = button.dataset.avatar;
        root.querySelectorAll('[data-avatar]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        if (onPick) onPick(current);
      });
    });
    return () => current;
  }
  function suggestLogin(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  }

  async function start() {
    const gate = $('#gate');
    if (gate) gate.hidden = true;
    const host = document.createElement('section');
    host.id = 'account';
    host.className = 'account';
    host.innerHTML = '<p id="account-status" class="status" role="status"></p>';
    gate.after(host);
    const user = await Client.sessionUser();
    if (!user) { renderSign(host, false); return; }
    const role = Client.roleOf(user);
    if (role === 'child') { renderChildBlocked(host); return; }
    await renderDesk(host, role);
  }

  function renderSign(host, creating) {
    host.insertAdjacentHTML('beforeend', creating ? signupForm() : signInForm());
    const form = host.querySelector('form');
    const swap = host.querySelector('[data-swap]');
    if (swap) swap.addEventListener('click', () => { host.innerHTML = '<p id="account-status" class="status" role="status"></p>'; renderSign(host, !creating); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (String(data.password || '').length < 6) { showStatus('The secret needs at least 6 characters. A pin and initials is enough, like 7234ab.', true); return; }
      try {
        if (creating) {
          showStatus('Creating the account…');
          await Client.invoke('accounts-public', {
            email: data.email, password: data.password, display_name: data.display_name, role: data.role
          });
        }
        showStatus('Signing in…');
        await Client.signIn(String(data.email).trim(), data.password);
        if (creating && data.role === 'teacher') {
          const room = await Client.createClass(data.classroom_name || 'My class', data.classroom_code || '');
          sessionStorage.setItem('lw-class-code', room.code);
        }
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
  }
  function signInForm() {
    return `<h2>Sign in</h2><p class="player-lead">Teachers and parents use an email. The only rule for the secret is 6 characters, so 7234ab is a fine password.</p><form class="grid">${field('Email', '<input name="email" type="email" autocomplete="username" required>')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="current-password" required>')}<button type="submit">Sign in</button></form><button type="button" class="quiet" data-swap>Create a grown-up account</button>`;
  }
  function signupForm() {
    return `<h2>Create a grown-up account</h2><form class="grid">${field('Your name', '<input name="display_name" required maxlength="40">')}${field('Email', '<input name="email" type="email" autocomplete="username" required>')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="new-password" required>')}<label>I am<select name="role"><option value="teacher">a teacher</option><option value="parent">a parent</option></select></label>${field('Class name', '<input name="classroom_name" value="Morning class">')}${field('Class code, optional', '<input name="classroom_code" minlength="4" maxlength="10" autocapitalize="characters" autocomplete="off">')}<button type="submit">Create and sign in</button></form><button type="button" class="quiet" data-swap>I already have an account</button>`;
  }

  function renderChildBlocked(host) {
    host.insertAdjacentHTML('beforeend', `<h2>A grown-up needs to sign in.</h2><p class="player-lead">This screen is signed in as a child, so the settings stay hidden. Signing a grown-up in ends the child's turn. Sign the child in again afterwards.</p><button type="button" id="switch-grownup">Sign in as a grown-up</button>`);
    host.querySelector('#switch-grownup').addEventListener('click', async () => {
      await Client.signOut();
      Store.clearActive();
      Store.clearProjection();
      location.reload();
    });
  }

  function wrapSave() {
    const original = window.GROWN_UPS.save;
    window.GROWN_UPS.save = function (next) {
      const ok = original.call(window.GROWN_UPS, next);
      const id = sessionStorage.getItem('lw-settings-child');
      if (id) Client.noteSettings(id, window.GROWN_UPS.settings);
      return ok;
    };
  }

  async function renderDesk(host, role) {
    wrapSave();
    const roster = await Client.roster();
    const room = roster.classroom;
    const children = roster.children || [];
    const selected = sessionStorage.getItem('lw-settings-child');
    const ready = sessionStorage.getItem('lw-settings-ready');
    if (!(selected && ready === selected) && children[0]) {
      await useChild(children[0].id);
      return;
    }

    host.insertAdjacentHTML('beforeend', deskHtml(role, room, children, selected));
    if (selected && ready === selected) openSettings(children, selected);
    const intro = document.querySelector('#sheet .intro');
    if (intro) intro.textContent = 'Changes save for this child and follow them to the next Chromebook, tablet or home screen.';
    host.querySelector('#make-class')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        const room = await Client.createClass(data.classroom_name, data.classroom_code || '');
        sessionStorage.setItem('lw-class-code', room.code);
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    const picker = host.querySelector('#child-picker');
    if (picker) picker.addEventListener('change', () => useChild(picker.value));
    const avatar = bindAvatars(host);
    host.querySelector('#add-child')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      const login = (data.login_name || suggestLogin(data.display_name)).toLowerCase();
      if (String(data.password).length < 6) { showStatus('The secret needs at least 6 characters.', true); return; }
      try {
        showStatus('Adding the child…');
        await Client.invoke('accounts-manage', {
          action: 'create-child', display_name: data.display_name, login_name: login, password: data.password, avatar: avatar()
        });
        sessionStorage.removeItem('lw-settings-ready');
        location.reload();
      } catch (error) { showStatus(error.message, true); }
    });
    host.querySelector('#link-child')?.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      try {
        showStatus('Linking…');
        await Client.invoke('accounts-manage', {action: 'link-child', login_name: data.login_name, password: data.password});
        sessionStorage.removeItem('lw-settings-ready');
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
    host.querySelector('#sign-out').addEventListener('click', async () => {
      await Client.signOut();
      Store.clearActive();
      Store.clearProjection();
      sessionStorage.removeItem('lw-settings-child');
      sessionStorage.removeItem('lw-settings-ready');
      location.href = '../index.html';
    });
  }

  function openSettings(children, id) {
    const settings = $('#settings');
    settings.hidden = false;
    settings.dataset.open = 'true';
    document.body.dataset.view = 'settings';
    const leave = document.querySelector('#leave .fill-label');
    if (leave) leave.textContent = 'Back to the games';
    const layer = document.querySelector('#leave .fill-layer .fill-label');
    if (layer) layer.textContent = 'Back to the games';
  }

  async function useChild(id) {
    showStatus('Opening this child…');
    sessionStorage.setItem('lw-settings-child', id);
    await Client.pull(id);
    Store.project(Store.readState(id));
    sessionStorage.setItem('lw-settings-ready', id);
    location.reload();
  }

  function deskHtml(role, room, children, selected) {
    const options = children.map(child => `<option value="${child.id}" ${child.id === selected ? 'selected' : ''}>${child.display_name}</option>`).join('');
    const classBit = room
      ? `<p>Classroom code <span class="code">${room.code}</span></p><p class="player-lead">${room.name}. Put this code on each shared screen once. Any child can then use any Chromebook.</p>`
      : (role === 'teacher' ? `<form id="make-class" class="grid"><h2>Name the class</h2>${field('Class name', '<input name="classroom_name" required value="Morning class">')}${field('Code, optional', '<input name="classroom_code" minlength="4" maxlength="10" autocapitalize="characters">')}<button type="submit">Create the class</button></form>` : '');
    const picker = children.length ? `<label>Whose settings<select id="child-picker">${options}</select></label>` : '<p>Add a child to choose their letters, sound and worlds.</p>';
    const add = role === 'teacher' ? `<form id="add-child" class="grid"><h2>Add a child</h2>${field('Name', '<input name="display_name" required maxlength="40">')}<span>Picture</span>${avatarPicker('fox')}${field('Sign-in name', '<input name="login_name" minlength="2" maxlength="20" autocapitalize="none" autocomplete="off" placeholder="maya">')}${field('Secret', '<input name="password" type="password" minlength="6" autocomplete="new-password" required>')}<p class="player-lead">Six characters is the only rule. A pin plus initials works: 7234ab.</p><button type="submit">Add this child</button></form>` : `<form id="link-child" class="grid"><h2>Link your child</h2><p class="player-lead">Type the sign-in name and secret their teacher set. After that, tap their picture at home.</p>${field('Sign-in name', '<input name="login_name" required autocapitalize="none">')}${field('Secret', '<input name="password" type="password" minlength="6" required>')}<button type="submit">Link</button></form>`;
    const reset = children.length ? `<form id="new-secret" class="grid"><h2>New secret</h2>${field('Sign-in name', `<input name="login_name" value="${children.find(child => child.id === selected)?.login_name || children[0].login_name}" required>`)}${field('New secret', '<input name="password" type="password" minlength="6" required>')}<button type="submit" class="quiet">Save the new secret</button></form>` : '';
    return `${classBit}${picker}${add}${reset}<button type="button" class="quiet" id="sign-out">Sign out</button>`;
  }
})();
