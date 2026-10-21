/* My account. A grown-up edits their own name, picture, and secret.
 * A child who opens this page is sent home. They cannot edit a name here.
 */
(function () {
  'use strict';
  if (location.protocol === 'file:') return;
  const Client = window.LittleWoofClient;
  const Store = window.LittleWoofStore;
  const $ = selector => document.querySelector(selector);
  const PICTURE = /^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i;

  document.addEventListener('DOMContentLoaded', () => { start().catch(error => showStatus(error.message, true)); });

  function showStatus(message, bad) {
    const el = document.querySelector('#account-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('bad', !!bad);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
  }
  function field(label, html) {
    return `<label>${label}${html}</label>`;
  }
  function pictures() {
    const api = window.LittleWoofPictures;
    return api ? api.PICTURES : [];
  }
  function picker(selected) {
    const api = window.LittleWoofPictures;
    return `<div class="choices" role="group" aria-label="Picture">${pictures().map(item => `<button type="button" class="avatar-pick" data-avatar="${item.id}" aria-pressed="${item.id === selected}" aria-label="${escapeHtml(item.label)}"><img src="${api.src(item.id)}" alt=""></button>`).join('')}</div>`;
  }
  function bindAvatars(root, selected) {
    let current = selected || 'garden';
    root.querySelectorAll('[data-avatar]').forEach(button => {
      button.addEventListener('click', () => {
        current = button.dataset.avatar;
        root.querySelectorAll('[data-avatar]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      });
    });
    return () => current;
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
  function formatWhen(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'not yet';
    return date.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'});
  }
  async function signOut() {
    await Client.signOut();
    Store.clearActive();
    Store.clearProjection();
    location.href = 'index.html';
  }

  async function start() {
    const gate = $('#gate');
    const host = document.createElement('section');
    host.id = 'account';
    host.className = 'account player';
    host.innerHTML = '<p id="account-status" class="status" role="status"></p>';
    gate.after(host);
    let user = null;
    try { user = await Client.sessionUser(); } catch (error) { user = null; }
    if (!user) {
      host.insertAdjacentHTML('beforeend', '<h2>Sign in first.</h2><p class="player-lead">My account opens after grown-up sign-in.</p><a class="account-link" href="index.html">Grown-up sign-in</a>');
      return;
    }
    if (Client.roleOf(user) === 'child') {
      host.insertAdjacentHTML('beforeend', '<h2>This page is for a grown-up.</h2><p class="player-lead">Your grown-up looks after your name.</p><a class="account-link" href="../index.html">Back to the games</a>');
      return;
    }
    const roster = await Client.roster();
    render(host, user, roster || {});
  }

  function render(host, user, roster) {
    const meta = user.user_metadata || {};
    const name = roster.display_name || meta.display_name || '';
    const login = roster.login_name || meta.login_name || '';
    const avatar = roster.avatar || meta.avatar || 'garden';
    const signOutButton = document.createElement('button');
    signOutButton.type = 'button';
    signOutButton.id = 'sign-out';
    signOutButton.className = 'sign-out-fixed';
    signOutButton.textContent = 'Sign out';
    document.body.append(signOutButton);
    signOutButton.addEventListener('click', () => { signOut().catch(error => showStatus(error.message, true)); });
    host.insertAdjacentHTML('beforeend', `<a class="account-link" href="index.html">Kids</a><form id="self" class="grid">${field('Name', `<input name="display_name" value="${escapeHtml(name)}" required maxlength="40">`)}${field('Sign-in name', `<input name="login_name" value="${escapeHtml(login)}" minlength="2" maxlength="20" autocapitalize="none" required>`)}${field('New secret', '<input name="password" type="password" minlength="6" autocomplete="new-password">')}${field('Current secret', '<input name="confirm_password" type="password" autocomplete="current-password">')}<p class="player-lead">Leave the new secret blank to keep it. Enter your current secret when you change your sign-in name or secret.</p>${field('Picture from this device', '<input id="self-photo" type="file" accept="image/*">')}<p id="photo-preview" class="photo-preview" hidden></p><button type="button" class="quiet" id="clear-photo">Use a Lucy picture instead</button><span>Lucy pictures</span>${picker(avatar)}<button type="submit">Save my account</button></form><section id="mine"><h2>Your progress</h2><p id="live-progress" class="player-lead">Loading progress…</p><button type="button" id="self-reset">Reset my progress</button></section><dialog id="reset-ask" aria-labelledby="reset-text"><p id="reset-text">Reset your progress? Sounds you have kept will be cleared.</p><label>Your secret<input id="reset-phrase" type="password" autocomplete="current-password"></label><div class="dialog-actions"><button type="button" id="reset-go" disabled>Reset progress</button><button type="button" class="quiet" id="reset-cancel">Cancel</button></div></dialog>`);
    const avatarOf = bindAvatars(host, avatar);
    host.querySelectorAll('[data-avatar]').forEach(button => {
      button.addEventListener('click', () => {
        cleared = true;
        photo = '';
        file.value = '';
        preview.hidden = true;
        preview.replaceChildren();
      });
    });
    const existing = roster.avatar_image && PICTURE.test(roster.avatar_image) ? roster.avatar_image : '';
    let photo = '';
    let cleared = false;
    const preview = host.querySelector('#photo-preview');
    const file = host.querySelector('#self-photo');
    file.addEventListener('change', async () => {
      const picked = file.files && file.files[0];
      if (!picked) return;
      try {
        photo = await shrinkPicture(picked);
        cleared = false;
        const img = document.createElement('img');
        img.src = photo;
        img.alt = 'Chosen picture';
        preview.replaceChildren(img);
        preview.hidden = false;
      } catch (error) {
        photo = '';
        file.value = '';
        showStatus(error.message, true);
      }
    });
    host.querySelector('#clear-photo').addEventListener('click', () => {
      photo = '';
      cleared = true;
      file.value = '';
      preview.hidden = true;
      preview.replaceChildren();
    });
    host.querySelector('#self').addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      const loginName = String(data.login_name || '').trim().toLowerCase();
      if (!/^[a-z0-9]{2,20}$/.test(loginName)) { showStatus('Use a short sign-in name.', true); return; }
      if (data.password && String(data.password).length < 6) { showStatus('The secret needs at least 6 characters.', true); return; }
      const loginChanged = loginName !== login;
      const nextSecret = String(data.password || '');
      if ((loginChanged || nextSecret) && !String(data.confirm_password || '')) {
        showStatus('Enter your current secret to change your sign-in name or secret.', true);
        return;
      }
      try {
        showStatus('Saving…');
        await Client.invoke('accounts-manage', {
          action: 'update-self',
          display_name: data.display_name,
          login_name: loginName,
          password: nextSecret || undefined,
          confirm_password: data.confirm_password || undefined,
          avatar: avatarOf(),
          avatar_image: photo || undefined,
          clear_image: cleared && !photo
        });
        const active = Store.readActive();
        if (active && active.learnerId === user.id) {
          active.displayName = String(data.display_name).trim();
          active.loginName = loginName;
          active.avatar = avatarOf();
          active.avatarImage = photo || (cleared ? '' : existing);
          Store.writeActive(active);
        }
        showStatus('Saved.');
        event.target.querySelector('[name="password"]').value = '';
        const currentSecret = event.target.querySelector('[name="confirm_password"]');
        if (currentSecret) currentSecret.value = '';
      } catch (error) { showStatus(error.message, true); }
    });
    host.querySelector('#self-reset').addEventListener('click', async () => {
      const secret = await askReset();
      if (!secret) return;
      try {
        await Client.invoke('accounts-manage', {action: 'reset-progress', user_id: user.id, confirm_password: secret});
        Client.resetProgress(user.id);
        showStatus('Your progress is cleared.');
        watch(user.id, host.querySelector('#live-progress'));
      } catch (error) { showStatus(error.message, true); }
    });
    watch(user.id, host.querySelector('#live-progress'));
  }

  function askReset() {
    const dialog = document.getElementById('reset-ask');
    const phrase = dialog.querySelector('#reset-phrase');
    const go = dialog.querySelector('#reset-go');
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
      go.onclick = () => { if (go.disabled) return; finish(phrase.value); dialog.close(); };
      dialog.querySelector('#reset-cancel').onclick = () => { finish(null); dialog.close(); };
    });
  }

  function watch(id, box) {
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
        paint(data, false);
      } catch (error) {
        paint({progress: cached.progress, updated_at: null}, true);
      }
    };
    load();
    setInterval(load, 8000);
  }
})();
