(() => {
'use strict';
const $ = id => document.getElementById(id);
const A = window.ACCOUNTS;
let roster = [], rosterFor = null, rosterVersion = 0, switchingOwner = false, rosterRequest = null;
let grownupsFor = null, pendingGrownup = null;
let freshness = 'checking', pendingAction = null, profileFor = null;
const cacheKey = id => 'lwl-portal-progress-'+id;
const worlds = {post: "Lucy's Letter Post", space: "Lucy's Moonboat", silk: "Ribbon Road"};
const notice = (message, error = false) => {
  $('account-status').textContent = message;
  $('account-status').classList.toggle('error', error);
};
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function errorText(error) { return error && error.message ? error.message : 'That did not work. Please try again.'; }
function wireForm(id, action, success) {
  const form = $(id);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    const output = form.querySelector('.form-result');
    const button = form.querySelector('button[type="submit"]');
    output.classList.remove('error');
    output.textContent = 'One moment…';
    form.setAttribute('aria-busy', 'true'); button.disabled = true;
    const fields = Object.fromEntries(new FormData(form));
    try {
      await action(fields);
      output.textContent = success;
      if(!['profile-form','child-profile-form'].includes(id)) form.reset();
      if (id === 'create-child-form') $('avatar-preview').hidden = true;
    } catch (error) {
      output.textContent = errorText(error);
      output.classList.add('error');
    } finally {
      form.removeAttribute('aria-busy'); button.disabled = false;
      form.querySelectorAll('input[type="password"]').forEach(input => { input.value = ''; });
    }
  });
}
function choices(selector, records, label) {
  document.querySelectorAll(selector).forEach(select => {
    const selected = select.value;
    const first = select.options[0].cloneNode(true);
    if(select.id==='link-child-choice'){first.value='';first.textContent='Choose a child';}
    select.replaceChildren(first);
    records.forEach(record => {
      const option = element('option', label(record));
      option.value = record.id; select.append(option);
    });
    if (records.some(record => record.id === selected)) select.value = selected;
  });
}
function renderRoster() {
  choices('.child-choice', roster, child => `${child.display_name} (${child.handle})`);
  const list = $('children-list'); list.replaceChildren();
  for (const child of roster) {
    const item = element('li');
    const copy = element('div');
    copy.append(element('strong', child.display_name), element('small', `Login: ${child.handle}`));
    copy.append(element('small', child.progress ? `${child.progress.snapshot.count} rounds · ${new Set(child.progress.snapshot.rounds.map(r=>r.letter)).size} letters · ${freshness === 'live' ? 'Live from server' : 'Last known · offline or connection unavailable'}` : 'Progress unavailable · connection needed'));
    const open = element('button', 'Open progress page', 'quiet-button');
    open.type = 'button'; open.setAttribute('aria-label', `Open ${child.display_name}'s progress page`);
    open.addEventListener('click', async () => {
      if (switchingOwner) return;
      switchingOwner = true; open.disabled = true;
      $('settings-link').inert = true;
      $('settings-link').setAttribute('aria-disabled', 'true');
      try { await A.selectOwner(child); $('progress').scrollIntoView({block: 'start'}); notice(`Opened ${child.display_name}'s progress page.`); }
      catch (error) { notice(errorText(error), true); }
      finally {
        switchingOwner = false; open.disabled = false;
        $('settings-link').inert = false;
        $('settings-link').removeAttribute('aria-disabled');
      }
    });
    const avatar = element('span', child.avatar || '🐶', 'child-avatar');
    if (child.avatar?.startsWith('data:image/')) { const picture = element('img'); picture.src = child.avatar; picture.alt = ''; avatar.replaceChildren(picture); }
    item.append(avatar, copy, open); list.append(item);
  }
  $('roster-status').textContent = roster.length ? `${roster.length} linked ${roster.length === 1 ? 'child' : 'children'}` : 'No children linked yet. Make a login below, or link an existing child.';
}
function loadRoster({fresh=false}={}) {
  if(rosterRequest)return fresh ? rosterRequest.then(()=>loadRoster({fresh:true})) : rosterRequest;
  rosterRequest=fetchRoster().finally(()=>{rosterRequest=null;});
  return rosterRequest;
}
async function fetchRoster() {
  const profile = A.profile;
  if (!profile || profile.role !== 'grownup') return;
  const version = ++rosterVersion;
  $('roster-status').textContent = 'Opening your kids…';
  try {
    const links = await A.rest(`guardians?adult_id=eq.${encodeURIComponent(profile.id)}&select=child_id`);
    const ids = links.map(link => link.child_id);
    const children = ids.length ? await A.rest(`profiles?id=in.(${ids.map(encodeURIComponent).join(',')})&select=*&order=display_name`) : [];
    if (version !== rosterVersion || A.profile?.id !== profile.id) return;
    const progress = await Promise.all(children.map(child => A.readProgress(child.id)));
    if (version !== rosterVersion || A.profile?.id !== profile.id) return;
    roster = children.map((child,index)=>({...child,progress:progress[index]}));
    freshness = 'live';
    try {localStorage.setItem(cacheKey(profile.id),JSON.stringify(roster));} catch {}
    renderRoster(); render();
    try {
      const available = await A.manage('list-linkable-children');
      if(version===rosterVersion)choices('#link-child-choice',available.children,child=>`${child.display_name} (${child.handle})`);
    } catch { const option=element('option','Connection needed to choose a child');option.value='';$('link-child-choice').replaceChildren(option); }
  } catch (error) {
    if (version === rosterVersion) {
      freshness = 'offline';
      if(!roster.length)try {roster=JSON.parse(localStorage.getItem(cacheKey(profile.id)))||[];} catch {}
      renderRoster(); render();
      $('roster-status').textContent = `Last-known data · offline or connection unavailable. ${errorText(error)}`;
    }
  }
}
function render() {
  const profile = A.profile;
  const signedIn = Boolean(A.session && profile);
  $('signed-out').hidden = signedIn;
  $('signed-in').hidden = !signedIn;
  document.querySelectorAll('[data-adult]').forEach(node => { node.hidden = !signedIn || profile.role !== 'grownup'; });
  document.querySelectorAll('[data-master]').forEach(node => { node.hidden = !signedIn || profile.role !== 'grownup' || profile.is_master !== true; });
  if (!signedIn) {
    grownupsFor = null; $('grownups-list').replaceChildren();
    rosterFor = null; profileFor = null; roster = []; rosterVersion++; freshness='checking';
    document.querySelector('.title').textContent = 'Grown-up portal';
    notice('Sign in to manage your kids.');
    return;
  }
  const owner = A.owner || profile;
  if(owner.role==='child' && $('child-profile-form').dataset.childProfile!==owner.id+':'+owner.handle){const form=$('child-profile-form');form.dataset.childProfile=owner.id+':'+owner.handle;form.elements.handle.value=owner.handle;form.elements.display_name.value=owner.display_name;}
  const adult = profile.role === 'grownup';
  if (profile.is_master === true && grownupsFor !== profile.id) { grownupsFor = profile.id; void loadGrownups(); }
  document.querySelectorAll('[data-child]').forEach(node => { node.hidden = adult; });
  document.querySelector('.title').textContent = adult ? 'Grown-up portal' : 'Your progress page';
  $('progress').hidden = adult && owner.id === profile.id;
  $('progress-link').hidden = adult && owner.id === profile.id;
  $('back-to-me').textContent = adult ? 'Close child progress page' : 'Back to my progress page';
  const child = roster.find(child=>child.id===owner.id);
  const snapshot = adult ? child?.progress?.snapshot || {} : A.snapshot || {};
  $('child-management').hidden = !adult || owner.id===profile.id;
  $('management-child').textContent = `Manage ${owner.display_name} (${owner.handle})`;
  if(adult && profileFor!==profile.handle){
    profileFor=profile.handle;
    const form=$('profile-form'); form.elements.handle.value=profile.handle; form.elements.display_name.value=profile.display_name;
    for(const input of form.querySelectorAll('[name=avatar]'))input.checked=input.value===profile.avatar;
    $('profile-avatar-preview').hidden=!profile.avatar?.startsWith('data:image/');
    if(!$('profile-avatar-preview').hidden)$('profile-avatar-preview').src=profile.avatar;
  }
  const rounds = snapshot.rounds || [];
  $('identity-title').textContent = profile.display_name;
  const identityAvatar=$('identity-avatar');identityAvatar.replaceChildren();
  if(profile.avatar?.startsWith('data:image/')){const img=element('img');img.src=profile.avatar;img.alt='';identityAvatar.append(img);}else identityAvatar.textContent=profile.avatar||'🐶';
  $('login-name').textContent = `Login: ${profile.handle} · ${profile.role === 'child' ? 'Child' : 'Grown-up'}`;
  $('owner-label').textContent = owner.id === profile.id ? `This progress page belongs to ${profile.display_name}.` : `Viewing ${owner.display_name}'s progress page · login ${owner.handle}`;
  $('progress-title').lastChild.textContent = owner.id === profile.id ? 'Your progress' : `${owner.display_name}'s progress`;
  $('back-to-me').hidden = owner.id === profile.id;
  $('round-count').textContent = adult && !child?.progress ? '—' : String(snapshot.count ?? rounds.length);
  $('letter-total').textContent = adult && !child?.progress ? '—' : String(new Set(rounds.map(round => round.letter).filter(Boolean)).size);
  const worldList = $('world-progress'); worldList.replaceChildren();
  for (const [key, name] of Object.entries(worlds)) {
    const item = element('li');
    item.append(element('b', name), element('strong', adult && !child?.progress ? '—' : String(rounds.filter(round => round.world === key).length)), element('span', 'rounds completed'));
    worldList.append(item);
  }
  const achievements = $('achievements'); achievements.replaceChildren();
  (snapshot.achievements?.length ? snapshot.achievements : [adult && !child?.progress ? 'Checking milestones…' : 'Your first milestone is waiting. Play a round to begin.']).forEach(text => achievements.append(element('li', text)));
  $('sync-status').textContent = adult ? (child?.progress ? `${freshness === 'live' ? 'Live from server' : 'Last-known data · offline or connection unavailable'} · Checked ${new Date(child.progress.checkedAt).toLocaleString()}. Updates automatically.` : 'Checking server progress…') : A.status || 'Your progress page is open.';
  if (rosterFor !== profile.id && profile.role === 'grownup') { rosterFor = profile.id; loadRoster({fresh:true}); }
  notice(owner.id === profile.id ? `Welcome, ${profile.display_name}. ${adult ? 'Manage your kids below.' : 'Your progress page is ready.'}` : `Viewing ${owner.display_name}'s progress page.`);
}
if (!A) { notice('Accounts could not open. Reload this page when you are online.', true); return; }
async function avatarPicture(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('Choose a picture this browser can open.'); }
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 256 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff8e5'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .85);
  } finally { URL.revokeObjectURL(url); }
}
$('avatar-upload').addEventListener('change', async () => {
  const preview = $('avatar-preview'); preview.hidden = true;
  if (!$('avatar-upload').files.length) return;
  try { preview.src = await avatarPicture($('avatar-upload').files[0]); preview.hidden = false; }
  catch (error) { $('avatar-upload').value = ''; notice(errorText(error), true); }
});
document.querySelectorAll('#create-child-form [name="avatar"]').forEach(input => input.addEventListener('change', () => {
  $('avatar-upload').value = ''; $('avatar-preview').hidden = true;
}));
wireForm('signin-form', fields => A.signIn(fields.handle.trim(), fields.password, {role:'grownup'}), 'Signed in. Your progress page is ready.');
wireForm('create-grownup-form', async fields => { await A.manage('create-grownup', {...fields, handle: fields.handle.trim()}); await loadGrownups(); }, 'Grown-up account created. Share their login with them.');
wireForm('create-child-form', async fields => {
  delete fields.avatar_file;
  if ($('avatar-upload').files.length) fields.avatar = await avatarPicture($('avatar-upload').files[0]);
  fields.handle = fields.handle.trim();
  await A.manage('create-child', fields); await loadRoster({fresh:true});
}, 'Child account created. Keep their login name and password wherever they play.');
wireForm('link-child-form', async fields => { await A.manage('link-child', fields); await loadRoster({fresh:true}); }, 'Child linked. Their existing progress stays together.');
wireForm('reset-password-form', fields => A.manage('reset-child-password', fields), 'Password changed. Use the new password next time this child signs in.');
wireForm('own-password-form', fields => A.changePassword(fields.password), 'Your password changed. Use the new password next time you sign in.');
$('sync-now').addEventListener('click', async () => {
  $('sync-now').disabled = true;
  try { if(A.profile?.role==='grownup') await loadRoster({fresh:true}); else await A.sync(); render(); }
  catch (error) { notice(errorText(error), true); }
  finally { $('sync-now').disabled = false; }
});
$('back-to-me').addEventListener('click', async () => {
  try { await A.selectOwner(A.profile); render(); }
  catch (error) { notice(errorText(error), true); }
});
$('sign-out').addEventListener('click', async () => {
  $('sign-out').disabled = true;
  try {
    await A.signOut(); location.href='../index.html';
  } catch (error) { notice(errorText(error), true); }
  finally { $('sign-out').disabled = false; }
});
$('profile-avatar-upload').addEventListener('change',async()=>{
  const upload=$('profile-avatar-upload'), preview=$('profile-avatar-preview');
  if(!upload.files.length)return;
  try {preview.src=await avatarPicture(upload.files[0]);preview.hidden=false;}
  catch(error){upload.value='';notice(errorText(error),true);}
});
document.querySelectorAll('#profile-form [name=avatar]').forEach(input=>input.addEventListener('change',()=>{
  $('profile-avatar-upload').value='';$('profile-avatar-preview').hidden=true;
}));
wireForm('child-profile-form',async fields=>{
  const child=A.owner;
  if(child?.role!=='child')throw new Error('Open a child first.');
  const {profile}=await A.manage('edit-child-profile',{...fields,child_id:child.id});
  await A.selectOwner(profile);await loadRoster({fresh:true});
},'Child profile saved. Use the new username next time.');
wireForm('profile-form',async fields=>{
  delete fields.avatar_file;
  if(!$('profile-avatar-preview').hidden)fields.avatar=$('profile-avatar-preview').src;
  await A.editProfile(fields);
},'Profile saved. Use this username next time you sign in.');
async function loadGrownups() {
  if (A.profile?.is_master !== true) return;
  const actor = A.profile.id;
  try {
    const {grownups} = await A.manage('list-grownups');
    if (A.profile?.id !== actor) return;
    choices('#grownup-choice', grownups.filter(person => !person.is_master), person => `${person.display_name} (${person.handle})`);
    const list = $('grownups-list'); list.replaceChildren();
    for (const person of grownups) {
      const item = element('li'), copy = element('div');
      copy.append(element('strong', person.display_name), element('small', `Login: ${person.handle}${person.is_master ? ' · Master' : ''}`));
      item.append(copy);
      if (!person.is_master) {
        const button = element('button', 'Delete grown-up…', 'quiet-button'); button.type = 'button';
        button.setAttribute('aria-label', `Delete ${person.display_name} (${person.handle})`);
        button.addEventListener('click', () => {
          pendingGrownup = person;
          $('confirm-grownup-title').textContent = `Delete ${person.display_name} (${person.handle})?`;
          $('confirm-grownup-result').textContent = '';
          $('confirm-grownup').showModal(); $('cancel-grownup').focus();
        });
        item.append(button);
      }
      list.append(item);
    }
    $('grownups-status').textContent = '';
  } catch (error) { $('grownups-status').textContent = errorText(error); }
}
wireForm('reset-grownup-password-form', fields => A.manage('reset-grownup-password', fields), 'Password changed. Share the new password with this grown-up.');
$('cancel-grownup').addEventListener('click', () => { $('confirm-grownup').close(); pendingGrownup = null; });
$('confirm-grownup').addEventListener('close', () => { pendingGrownup = null; });
$('confirm-grownup-action').addEventListener('click', async () => {
  if (!pendingGrownup) return;
  $('confirm-grownup-action').disabled = true; $('cancel-grownup').disabled = true;
  try {
    await A.manage('delete-grownup', {grownup_id: pendingGrownup.id, confirm: 'delete-grownup'});
    $('confirm-grownup').close(); pendingGrownup = null;
    await loadGrownups(); await loadRoster({fresh:true});
    notice('Grown-up account deleted. Kids and their progress are kept.');
  } catch (error) { $('confirm-grownup-result').textContent = errorText(error); }
  finally { $('confirm-grownup-action').disabled = false; $('cancel-grownup').disabled = false; }
});
function confirmChild(action) {
  const child=A.owner;
  if(!child || child.id===A.profile.id)return;
  pendingAction={action,child};
  const deleting=action==='delete-child';
  $('confirm-title').textContent=deleting?`Delete ${child.display_name}'s account?`:`Reset ${child.display_name}'s progress?`;
  $('confirm-copy').textContent=deleting?'This permanently deletes their login, picture, progress and links for every grown-up. This cannot be undone.':'This erases every completed round and milestone for every grown-up. Their login, picture and play settings stay. This cannot be undone.';
  $('confirm-child-action').textContent=deleting?'Permanently delete child':'Reset all progress';
  $('confirm-result').textContent='';$('confirm-child').showModal();$('cancel-child').focus();
}
$('delete-child').addEventListener('click',()=>confirmChild('delete-child'));
$('reset-progress').addEventListener('click',()=>confirmChild('reset-child-progress'));
$('cancel-child').addEventListener('click',()=>{$('confirm-child').close();pendingAction=null;});
$('confirm-child-action').addEventListener('click',async()=>{
  if(!pendingAction)return;
  const {action,child}=pendingAction;
  $('confirm-child-action').disabled=true;$('cancel-child').disabled=true;
  try {
    await A.manage(action,{child_id:child.id,confirm:action});
    if(action==='delete-child')await A.selectOwner(A.profile);else await A.sync();
    await loadRoster({fresh:true});
    $('confirm-child').close();pendingAction=null;
    notice(action==='delete-child'?'Child account permanently deleted.':'Progress reset. The account and settings are kept.');
  }catch(error){$('confirm-result').textContent=errorText(error);}
  finally{$('confirm-child-action').disabled=false;$('cancel-child').disabled=false;}
});
const refreshRoster=()=>{if(A.profile?.role==='grownup'&&!document.hidden)void loadRoster();};
window.addEventListener('online',refreshRoster);
window.addEventListener('offline',()=>{freshness='offline';renderRoster();render();});
window.addEventListener('focus',refreshRoster);
document.addEventListener('visibilitychange',refreshRoster);
setInterval(refreshRoster,15000);
A.subscribe(render);
Promise.resolve(A.ready).then(render).catch(error => {
  render(); notice(errorText(error), true);
});
})();
