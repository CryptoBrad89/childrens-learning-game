/* Who is playing, on a shared screen. A classroom remembers only its code.
 * The child's secret signs that child in. At home a parent is already signed
 * in and taps their own child's picture.
 */
(function (root) {
  'use strict';
  const Store = () => root.LittleWoofStore;
  const Client = () => root.LittleWoofClient;
  const Avatars = () => root.LittleWoofAvatars;
  let chosen = null;

  function $(id) { return document.getElementById(id); }
  function status(message, bad) {
    const el = $('player-status');
    el.textContent = message || '';
    el.classList.toggle('bad', !!bad);
  }
  function show(id, on) { const el = $(id); if (el) el.hidden = !on; }

  function activate(person) {
    Store().writeActive(person);
    Client().setLearner(person.learnerId);
    Store().project(Store().readState(person.learnerId));
    if (root.GROWN_UPS && root.GROWN_UPS.reload) root.GROWN_UPS.reload();
    delete document.documentElement.dataset.account;
    document.dispatchEvent(new CustomEvent('little-woof-applied'));
    renderSigned(person);
    if (root.LittleWoof) root.LittleWoof.paint();
    Client().syncNow().catch(error => status(error.message, true));
  }

  function renderSigned(person) {
    show('player-signed', true);
    show('class-form', false);
    show('roster', false);
    $('player-name').textContent = `${person.displayName} is playing`;
    $('player-avatar').innerHTML = Avatars().svg(person.avatar, person.displayName);
  }

  function renderPictures(children, {password}) {
    show('class-form', false);
    show('roster', true);
    show('player-signed', false);
    const pictures = $('pictures');
    pictures.innerHTML = '';
    chosen = null;
    show('secret-form', false);
    for (const child of children) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picture';
      button.dataset.login = child.login_name;
      button.innerHTML = `${Avatars().svg(child.avatar, child.display_name)}<span>${child.display_name}</span>`;
      button.addEventListener('click', () => {
        [...pictures.children].forEach(item => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        chosen = child;
        if (password) {
          show('secret-form', true);
          $('secret').value = '';
          $('secret').focus();
        } else {
          activate({
            learnerId: child.id,
            displayName: child.display_name,
            avatar: child.avatar,
            loginName: child.login_name
          });
        }
      });
      pictures.appendChild(button);
    }
  }

  async function showClass(code) {
    show('player-signed', false);
    show('roster', false);
    show('class-form', true);
    if (code) $('class-code').value = code;
  }

  async function openCode(code) {
    status('Looking for that classroom…');
    let found = null;
    try {
      found = await Client().lookupClass(code);
    } catch (error) {
      const cached = Store().roster();
      if (cached && cached.code === code.trim().toUpperCase()) found = cached;
      else { status(navigator.onLine ? error.message : 'This screen has not saved that classroom yet. Connect once, then it will work offline.', true); return; }
    }
    if (!found || !found.found) { status('No classroom uses that code.', true); return; }
    Store().rememberClass(found.code, found);
    status(`${found.name}. Tap a picture. A grown-up types the secret.`);
    renderPictures(found.children, {password: true});
  }

  async function start() {
    $('player').hidden = false;
    const signed = $('all-done');
    signed.addEventListener('click', async () => {
      const user = await Client().sessionUser().catch(() => null);
      Store().clearActive();
      Client().setLearner(null);
      Store().clearProjection();
      if (user && Client().roleOf(user) === 'child') await Client().signOut();
      location.reload();
    });
    $('class-form').addEventListener('submit', event => {
      event.preventDefault();
      openCode($('class-code').value);
    });
    $('change-class').addEventListener('click', () => {
      Store().forgetClass();
      showClass('');
      status('');
    });
    $('show-secret').addEventListener('click', () => {
      const input = $('secret');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      $('show-secret').textContent = showing ? 'Show' : 'Hide';
      $('show-secret').setAttribute('aria-pressed', String(!showing));
    });
    $('secret-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!chosen) return;
      const secret = $('secret').value;
      if (secret.length < 6) { status('The secret needs at least 6 characters.', true); return; }
      status('Signing in…');
      try {
        const user = await Client().signInChild(chosen.login_name, secret);
        const meta = user.user_metadata || {};
        activate({
          learnerId: user.id,
          displayName: meta.display_name || chosen.display_name,
          avatar: meta.avatar || chosen.avatar,
          loginName: meta.login_name || chosen.login_name
        });
        status('');
      } catch (error) { status(error.message, true); }
    });

    let user = null;
    try { user = await Client().sessionUser(); } catch (error) { user = null; }
    const person = Store().readActive();
    if (user && person && (user.id === person.learnerId || Client().roleOf(user) === 'parent')) {
      delete document.documentElement.dataset.account;
      renderSigned(person);
      return;
    }
    document.documentElement.dataset.account = 'locked';
    if (user && Client().roleOf(user) === 'child') {
      const meta = user.user_metadata || {};
      activate({
        learnerId: user.id,
        displayName: meta.display_name || 'Friend',
        avatar: meta.avatar || 'pup',
        loginName: meta.login_name || ''
      });
      return;
    }
    if (user && Client().roleOf(user) === 'parent') {
      try {
        const mine = await Client().roster();
        status('Tap who is playing at home.');
        renderPictures(mine.children || [], {password: false});
        if (!(mine.children || []).length) status('No child is linked yet. A grown-up can add one from For grown-ups.', true);
      } catch (error) { status(error.message, true); }
      return;
    }
    const remembered = Store().classCode();
    if (remembered) await openCode(remembered);
    else showClass('');
  }

  root.LittleWoofChooser = {start};
})(typeof globalThis !== 'undefined' ? globalThis : this);
