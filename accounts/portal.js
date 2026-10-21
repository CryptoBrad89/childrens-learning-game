(() => {
'use strict';
const $ = id => document.getElementById(id);
const A = window.ACCOUNTS;
const lucyChoices = window.LUCY_AVATARS;
for (const fieldset of document.querySelectorAll('.avatar-options')) {
  for (const [index, choice] of lucyChoices.entries()) {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'radio'; input.name = 'avatar'; input.value = choice.value; input.checked = index === 0;
    const picture = document.createElement('img'); picture.src = choice.src; picture.alt = '';
    const caption = document.createElement('span'); caption.className = 'sr-only'; caption.textContent = choice.label;
    label.append(input, picture, caption); fieldset.append(label);
  }
}
function profilePicture(container, value) {
  const image = document.createElement('img');
  image.src = value?.startsWith('data:image/') ? value : lucyChoices[0].src;
  image.alt = ''; container.replaceChildren(image);
}
function selectPicture(form, value) {
  const selected = lucyChoices.some(choice => choice.value === value) ? value : lucyChoices[0].value;
  for (const input of form.querySelectorAll('[name=avatar]')) input.checked = input.value === selected;
}

let roster = [], rosterFor = null, rosterVersion = 0, switchingOwner = false, rosterRequest = null;
let grownupsFor = null, editingGrownup = null;
let portalView=location.hash.slice(1)||'kids';
let grownupRoster=[];
const selectedGrownups=new Set();
const selectedKids=new Set();
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
      if(!['profile-form','child-profile-form','grownup-profile-form','reset-password-form','reset-grownup-password-form'].includes(id)) form.reset();
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
function riskyAction(title, people, action) {
  const dialog = $('risky-password-dialog'), form = $('risky-password-form');
  $('risky-password-title').textContent = title;
  $('risky-password-people').replaceChildren(...people.map(person => element('li', `${person.display_name} · Login: ${person.handle}`)));
  $('risky-password').value = ''; $('risky-password-result').textContent = '';
  return new Promise((resolve, reject) => {
    let completed = false, busy = false;
    const close = () => {
      form.removeEventListener('submit', submit); dialog.removeEventListener('close', close);
      dialog.removeEventListener('cancel', cancel); $('risky-password').value = '';
      if (!completed) reject(new Error('Action cancelled.'));
    };
    const cancel = event => { if (busy) event.preventDefault(); };
    const submit = async event => {
      event.preventDefault(); if (busy || !form.reportValidity()) return;
      busy = true; const button = form.querySelector('[type=submit]'); button.disabled = true; $('risky-password-cancel').disabled = true;
      try { const result = await action($('risky-password').value); completed = true; $('risky-password').value = ''; dialog.close(); resolve(result); }
      catch (error) { $('risky-password-result').textContent = errorText(error); $('risky-password').value = ''; $('risky-password').focus(); }
      finally { busy = false; button.disabled = false; $('risky-password-cancel').disabled = false; }
    };
    form.addEventListener('submit', submit); dialog.addEventListener('close', close); dialog.addEventListener('cancel', cancel);
    dialog.showModal(); $('risky-password').focus();
  });
}
$('risky-password-cancel').addEventListener('click', () => $('risky-password-dialog').close());
async function childProgress(children) {
  const progress = new Array(children.length); let next = 0;
  await Promise.all(Array.from({length: Math.min(8, children.length)}, async () => {
    while (next < children.length) { const index = next++; progress[index] = await A.readProgress(children[index].id); }
  }));
  return progress;
}
function choices(selector, records, label) {
  document.querySelectorAll(selector).forEach(select => {
    const selected = select.value;
    const first = select.options[0]?.cloneNode(true);
    select.replaceChildren(...(first && select.id!=='link-child-choice'?[first]:[]));
    records.forEach(record => {
      const option = element('option', label(record));
      option.value = record.id; select.append(option);
    });
    if (records.some(record => record.id === selected)) select.value = selected;
  });
}
function profileLabel(){return A.profile?.is_master?'':'linked ';}
function renderRoster() {
  choices('.child-choice', roster, child => `${child.display_name} (${child.handle})`);
  for(const id of selectedKids)if(!roster.some(child=>child.id===id))selectedKids.delete(id);
  updateBatch();
  const list = $('children-list'); list.replaceChildren();
  for (const child of roster.filter(child=>matches(child,'kid-search'))) {
    const item = element('li');
    const select=element('input');select.type='checkbox';select.value=child.id;select.checked=selectedKids.has(child.id);select.setAttribute('aria-label','Select '+child.display_name);
    select.addEventListener('change',()=>{if(select.checked)selectedKids.add(child.id);else selectedKids.delete(child.id);updateBatch();});
    item.append(select);
    const copy = element('div');
    copy.append(element('strong', child.display_name), element('small', `Login: ${child.handle}`));
    if(A.profile.is_master)copy.append(element('p','Linked to: '+assignment(child.grownups||[]),'assignments'));
    copy.append(element('small', child.progress ? `${child.progress.snapshot.count} rounds · ${new Set(child.progress.snapshot.rounds.map(r=>r.letter)).size} letters · ${freshness === 'live' ? 'Last activity synced at '+new Date(child.progress.checkedAt).toLocaleString() : 'Last known · offline or connection unavailable'}` : 'Progress unavailable · connection needed'));
    const open = element('button', 'Open progress page', 'quiet-button');
    open.type = 'button'; open.setAttribute('aria-label', `Open ${child.display_name}'s progress page`);
    open.addEventListener('click', async () => {
      if (switchingOwner) return;
      switchingOwner = true; open.disabled = true;
      $('settings-link').inert = true;
      $('settings-link').setAttribute('aria-disabled', 'true');
      try { await loadRoster({fresh:true}); await A.selectOwner(child); portalView='kids'; location.hash='kids'; render(); await loadChildGrownups(); $('progress').scrollIntoView({block: 'start'}); notice(`Opened ${child.display_name}'s progress page.`); }
      catch (error) { notice(errorText(error), true); }
      finally {
        switchingOwner = false; open.disabled = false;
        $('settings-link').inert = false;
        $('settings-link').removeAttribute('aria-disabled');
      }
    });
    const avatar = element('span', child.avatar || '🐶', 'child-avatar');
    profilePicture(avatar, child.avatar);
    item.append(avatar, copy, open); list.append(item);
  }
  $('roster-status').textContent = roster.length ? `${roster.length} ${profileLabel()}${roster.length === 1 ? 'child' : 'children'}` : 'No children linked yet. Make a login below, or link an existing child.';
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
    const links = await A.allRows(profile.is_master?'guardians?select=adult_id,child_id':`guardians?adult_id=eq.${encodeURIComponent(profile.id)}&select=adult_id,child_id`);
    const children = await A.allRows('profiles?role=eq.child&select=*&order=display_name');
    const adults=profile.is_master?(await A.manage('list-grownups')).grownups:[profile];
    if (version !== rosterVersion || A.profile?.id !== profile.id) return;
    const progress = await childProgress(children);
    if (version !== rosterVersion || A.profile?.id !== profile.id) return;
    const adultsById=new Map(adults.map(adult=>[adult.id,adult])),grownupsByChild=new Map();
    for(const link of links){const adult=adultsById.get(link.adult_id);if(!adult)continue;if(!grownupsByChild.has(link.child_id))grownupsByChild.set(link.child_id,[]);grownupsByChild.get(link.child_id).push(adult);}
    roster = children.map((child,index)=>({...child,progress:progress[index],grownups:grownupsByChild.get(child.id)||[]}));
    freshness = 'live';
    try {localStorage.setItem(cacheKey(profile.id),JSON.stringify(roster));} catch {}
    renderRoster(); render();
    try {
      if(!profile.is_master)return;
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
    selectedKids.clear();selectedGrownups.clear();
    rosterFor = null; profileFor = null; roster = []; rosterVersion++; freshness='checking';
    document.querySelector('.title').textContent = 'Grown-up portal';
    notice('Sign in to manage your kids.');
    return;
  }
  const owner = A.owner || profile;
  if(owner.role==='child' && $('child-profile-form').dataset.childProfile!==owner.id+':'+owner.handle){const form=$('child-profile-form');form.dataset.childProfile=owner.id+':'+owner.handle;form.elements.handle.value=owner.handle;form.elements.display_name.value=owner.display_name;selectPicture(form, owner.avatar);$('child-avatar-upload').value='';$('child-avatar-preview').hidden=!owner.avatar?.startsWith('data:image/');if(!$('child-avatar-preview').hidden)$('child-avatar-preview').src=owner.avatar;void loadChildGrownups();}
  const adult = profile.role === 'grownup';
  if (profile.is_master === true && grownupsFor !== profile.id) { grownupsFor = profile.id; void loadGrownups(); }
  document.querySelectorAll('[data-child]').forEach(node => { node.hidden = adult; });
  document.querySelector('.title').textContent = adult ? 'Grown-up portal' : 'Your progress page';
  $('progress').hidden = adult && owner.id === profile.id;
  $('child-settings-link').href='../grown-ups/index.html?child='+encodeURIComponent(owner.id);
  $('back-to-me').textContent = adult ? '← Back to Kids' : 'Back to my progress page';
  const child = roster.find(child=>child.id===owner.id);
  const snapshot = adult && owner.id!==profile.id ? child?.progress?.snapshot || {} : A.snapshot || {};
  $('child-management').hidden = !adult || owner.id===profile.id;
  $('management-child').textContent = `Manage ${owner.display_name} (${owner.handle})`;
  if(adult && profileFor!==profile.handle){
    profileFor=profile.handle;
    const form=$('profile-form'); form.elements.handle.value=profile.handle; form.elements.display_name.value=profile.display_name;
    selectPicture(form, profile.avatar);
    $('profile-avatar-preview').hidden=!profile.avatar?.startsWith('data:image/');
    if(!$('profile-avatar-preview').hidden)$('profile-avatar-preview').src=profile.avatar;
  }
  const rounds = snapshot.rounds || [];
  $('identity-title').textContent = profile.display_name;
  const identityAvatar=$('identity-avatar');identityAvatar.replaceChildren();
  profilePicture(identityAvatar, profile.avatar);
  $('login-name').textContent = `Login: ${profile.handle} · ${profile.role === 'child' ? 'Child' : 'Grown-up'}`;
  $('owner-label').textContent = owner.id === profile.id ? `This progress page belongs to ${profile.display_name}.` : `Viewing ${owner.display_name}'s progress page · login ${owner.handle}`;
  $('progress-title').textContent = owner.id === profile.id ? 'Your progress' : `${owner.display_name}'s progress`;
  $('back-to-me').hidden = owner.id === profile.id;
  $('round-count').textContent = adult && owner.id!==profile.id && !child?.progress ? '—' : String(snapshot.count ?? rounds.length);
  $('letter-total').textContent = adult && owner.id!==profile.id && !child?.progress ? '—' : String(new Set(rounds.map(round => round.letter).filter(Boolean)).size);
  const worldList = $('world-progress'); worldList.replaceChildren();
  for (const [key, name] of Object.entries(worlds)) {
    const item = element('li');
    item.append(element('b', name), element('strong', adult && owner.id!==profile.id && !child?.progress ? '—' : String(rounds.filter(round => round.world === key).length)), element('span', 'rounds completed'));
    worldList.append(item);
  }
  const achievements = $('achievements'); achievements.replaceChildren();
  (snapshot.achievements?.length ? snapshot.achievements : [adult && owner.id!==profile.id && !child?.progress ? 'Checking milestones…' : 'Your first milestone is waiting. Play a round to begin.']).forEach(text => achievements.append(element('li', text)));
  $('sync-status').textContent = adult && owner.id!==profile.id ? (child?.progress ? `${freshness === 'live' ? 'Last activity synced at' : 'Last-known activity · connection unavailable · synced at'} ${new Date(child.progress.checkedAt).toLocaleString()}. Updates automatically.` : 'Checking server progress…') : A.status || 'Your progress page is open.';
  if (rosterFor !== profile.id && profile.role === 'grownup') { rosterFor = profile.id; loadRoster({fresh:true}); }
  const passwordChild=$('reset-password-form').elements.child_id;if(passwordChild&&owner.role==='child')passwordChild.value=owner.id;
  applyView();
  if(['Sign in to manage your kids.','Opening the portal…','Signed in. Your progress page is ready.'].includes($('account-status').textContent))notice('');
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
wireForm('create-grownup-form', async fields => { await riskyAction('Create a grown-up login?', [fields], current_password => A.manage('create-grownup', {...fields, handle: fields.handle.trim(), current_password})); await loadGrownups(); }, 'Grown-up account created. Share their login with them.');
wireForm('create-child-form', async fields => {
  delete fields.avatar_file;
  if ($('avatar-upload').files.length) fields.avatar = await avatarPicture($('avatar-upload').files[0]);
  fields.handle = fields.handle.trim();
  await A.manage('create-child', fields); await loadRoster({fresh:true});
}, 'Child account created. Keep their login name and password wherever they play.');
wireForm('link-child-form', async () => {
  const ids=[...$('link-child-choice').selectedOptions].map(option=>option.value).filter(Boolean);
  for(const child_id of ids)await A.manage('link-child',{child_id,grownup_id:$('link-grownup-choice').value});
  await loadRoster({fresh:true});
}, 'Child linked. Their existing progress stays together.');
wireForm('reset-password-form', fields => riskyAction('Change this child’s password?', [roster.find(child=>child.id===fields.child_id)||A.owner], current_password => A.manage('reset-child-password', {...fields,current_password})), 'Password changed. Use the new password next time this child signs in.');
wireForm('own-password-form', fields => riskyAction('Change your password?', [A.profile], current_password => A.changePassword(fields.password,current_password)), 'Your password changed. Use the new password next time you sign in.');
$('back-to-me').addEventListener('click', async () => {
  try { await A.selectOwner(A.profile); render(); }
  catch (error) { notice(errorText(error), true); }
});
$('sign-out').addEventListener('click', async () => {
  $('sign-out').disabled = true;
  try {
    await A.signOut(); location.href='index.html';
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
  delete fields.avatar_file;
  if(!$('child-avatar-preview').hidden)fields.avatar=$('child-avatar-preview').src;
  const save = current_password => A.manage('edit-child-profile',{...fields,child_id:child.id,current_password});
  const {profile}=fields.handle.trim().toLowerCase()===child.handle ? await save() : await riskyAction('Change this child’s username?', [child], save);
  await A.selectOwner(profile);await loadRoster({fresh:true});
},'Child profile saved. Use the new username next time.');
wireForm('profile-form',async fields=>{
  delete fields.avatar_file;
  if(!$('profile-avatar-preview').hidden)fields.avatar=$('profile-avatar-preview').src;
  if (fields.handle.trim().toLowerCase()===A.profile.handle) await A.editProfile(fields);
  else await riskyAction('Change your username?', [A.profile], current_password => A.editProfile({...fields,current_password}));
  await loadGrownups();
},'Profile saved. Use this username next time you sign in.');
async function loadGrownups() {
  if (A.profile?.is_master !== true) return;
  const actor = A.profile.id;
  try {
    const {grownups} = await A.manage('list-grownups');
    if (A.profile?.id !== actor) return;
    choices('#grownup-choice', grownups.filter(person => !person.is_master), person => `${person.display_name} (${person.handle})`);
    grownupRoster=grownups;
    for(const id of ['link-grownup-choice','transfer-source','transfer-destination'])choices('#'+id,grownups,person=>`${person.display_name} (${person.handle})`);
    if(!$('link-grownup-choice').value)$('link-grownup-choice').value=A.profile.id;
    for(const id of selectedGrownups)if(!grownups.some(person=>person.id===id))selectedGrownups.delete(id);
    renderGrownups();
    $('grownups-status').textContent = '';
  } catch (error) { $('grownups-status').textContent = errorText(error); }
}
function renderGrownups(){
    const list = $('grownups-list'); list.replaceChildren();
    for (const person of grownupRoster.filter(person=>matches(person,'grownup-search'))) {
      const item = element('li'), copy = element('div');
      copy.append(element('strong', person.display_name), element('small', `Login: ${person.handle}${person.is_master ? ' · Master' : ''}`));
      const avatar = element('span', person.avatar || '🐶', 'child-avatar');
      profilePicture(avatar, person.avatar);
      const edit=element('button',person.id===A.profile.id?'Edit my profile':'Edit profile','quiet-button');edit.type='button';
      edit.setAttribute('aria-label',`Edit ${person.display_name} (${person.handle})`);
      edit.addEventListener('click',()=>{
        if(person.id===A.profile.id){portalView='account';location.hash='account';render();const panel=$('profile-form').closest('details');panel.open=true;panel.scrollIntoView({block:'start'});$('profile-form').elements.display_name.focus();return;}
        editingGrownup=person;
        const form=$('grownup-profile-form');form.reset();
        form.elements.handle.value=person.handle;form.elements.display_name.value=person.display_name;
        selectPicture(form, person.avatar);
        $('grownup-avatar-preview').hidden=!person.avatar?.startsWith('data:image/');
        if(!$('grownup-avatar-preview').hidden)$('grownup-avatar-preview').src=person.avatar;
        form.querySelector('.form-result').textContent='';
        $('edit-grownup-title').textContent=person.display_name;
        $('edit-grownup-login').textContent='Login: '+person.handle;
        $('grownup-choice').value=person.id;
        $('reset-grownup-progress').hidden=person.is_master;
        $('grownup-linked-kids').textContent='Linked kids: '+(roster.filter(child=>child.grownups?.some(adult=>adult.id===person.id)).map(child=>child.display_name+' ('+child.handle+')').join(', ')||'None');
        $('edit-grownup').showModal();form.elements.display_name.focus();
      });
      item.append(avatar,copy);
      if(person.id!==A.profile.id&&!person.is_master)item.append(edit);
      if (!person.is_master && person.id!==A.profile.id) {
        const check=element('input');check.type='checkbox';check.checked=selectedGrownups.has(person.id);
        check.setAttribute('aria-label',`Select ${person.display_name} (${person.handle})`);
        check.addEventListener('change',()=>{check.checked?selectedGrownups.add(person.id):selectedGrownups.delete(person.id);updateBatch();});
        item.prepend(check);
      }
      list.append(item);
    }
  updateBatch();
}
$('grownup-avatar-upload').addEventListener('change',async()=>{
  const upload=$('grownup-avatar-upload'),preview=$('grownup-avatar-preview');
  if(!upload.files.length)return;
  try{preview.src=await avatarPicture(upload.files[0]);preview.hidden=false;}
  catch(error){upload.value='';const output=$('grownup-profile-form').querySelector('.form-result');output.textContent=errorText(error);output.classList.add('error');}
});
document.querySelectorAll('#grownup-profile-form [name=avatar]').forEach(input=>input.addEventListener('change',()=>{
  $('grownup-avatar-upload').value='';$('grownup-avatar-preview').hidden=true;
}));
wireForm('grownup-profile-form',async fields=>{
  if(!editingGrownup)throw new Error('Choose a grown-up first.');
  delete fields.avatar_file;
  if(!$('grownup-avatar-preview').hidden)fields.avatar=$('grownup-avatar-preview').src;
  const save = current_password => A.manage('edit-grownup-profile',{...fields,grownup_id:editingGrownup.id,current_password});
  const {profile}=fields.handle.trim().toLowerCase()===editingGrownup.handle ? await save() : await riskyAction('Change this grown-up’s username?', [editingGrownup], save);
  editingGrownup=profile;await loadGrownups();
},'Profile saved. Use the new username next time.');
$('close-edit-grownup').addEventListener('click',()=>$('edit-grownup').close());
$('edit-grownup').addEventListener('close',()=>{editingGrownup=null;});
wireForm('reset-grownup-password-form', fields => riskyAction('Change this grown-up’s password?', [grownupRoster.find(person=>person.id===fields.grownup_id)], current_password => A.manage('reset-grownup-password', {...fields,current_password})), 'Password changed. Share the new password with this grown-up.');
function confirmPeople(kind, people, reset=false) {
  if(!people.length)return;
  const kid=kind==='child', dialog=$(kid?'confirm-child':'confirm-grownup');
  pendingAction={kind,people,reset};
  const title=$(kid?'confirm-title':'confirm-grownup-title');
  title.textContent=`${reset?'Reset progress for':'Delete'} ${people.length} ${kid?'kid':'grown-up'}${people.length===1?'':'s'}?`;
  $(kid?'confirm-copy':'confirm-grownup-copy').textContent=reset?'Completed rounds and milestones are erased for every linked grown-up. Logins and game settings stay. This cannot be undone.':kid?'Their logins, pictures and all progress are deleted for every linked grown-up. This cannot be undone.':'Their logins are deleted. Kids and their progress stay. Kids without another linked grown-up stay linked to the master account.';
  const names=$(kid?'confirm-child-names':'confirm-grownup-names');names.replaceChildren();
  people.forEach(person=>names.append(element('li',`${person.display_name} · Login: ${person.handle}`)));
  const input=$(kid?'confirm-child-password':'confirm-grownup-password');input.value='';
  const button=$(kid?'confirm-child-action':'confirm-grownup-action');button.disabled=true;button.textContent=reset?'Reset all progress':'Permanently delete';
  $(kid?'confirm-result':'confirm-grownup-result').textContent='';
  dialog.showModal();$(kid?'cancel-child':'cancel-grownup').focus();
}
for(const kind of ['child','grownup']){
  const prefix='confirm-'+kind;
  $(prefix+'-password').addEventListener('input',()=>{$(prefix+'-action').disabled=!pendingAction||!$(prefix+'-password').value;});
  $('cancel-'+kind).addEventListener('click',()=>$(prefix).close());
  $(prefix).addEventListener('close',()=>{pendingAction=null;$(prefix+'-password').value='';});
  $(prefix).addEventListener('cancel',event=>{if($(prefix).getAttribute('aria-busy')==='true')event.preventDefault();});
  $(prefix+'-action').addEventListener('click',async()=>{
    if(!pendingAction||!$(prefix+'-password').value)return;
    const {people,reset}=pendingAction;$(prefix+'-action').disabled=true;$('cancel-'+kind).disabled=true;$(prefix).setAttribute('aria-busy','true');
    try{
      const action = reset ? (kind==='child'?'reset-children-progress':'reset-grownups-progress') : (kind==='child'?'delete-children':'delete-grownups');
      const {results}=await A.manage(action,{[kind==='child'?'child_ids':'grownup_ids']:people.map(person=>person.id),current_password:$(prefix+'-password').value});
      const message=results.map(result=>{const person=people.find(p=>p.id===result.id);return `${person.display_name} (${person.handle}): ${result.ok?(reset?'progress reset':'deleted'):result.reason}`;}).join('; ');
      for(const result of results)if(result.ok)(kind==='child'?selectedKids:selectedGrownups).delete(result.id);
      $(prefix).close();if($('edit-grownup').open)$('edit-grownup').close();
      await A.selectOwner(A.profile);await loadRoster({fresh:true});await loadGrownups();
      notice(message,results.some(result=>!result.ok));
    }catch(error){$(kind==='child'?'confirm-result':'confirm-grownup-result').textContent=errorText(error);$(prefix+'-password').value='';$(prefix+'-password').focus();}
    finally{$(prefix+'-action').disabled=!$(prefix+'-password').value;$('cancel-'+kind).disabled=false;$(prefix).removeAttribute('aria-busy');}
  });
}
$('delete-child').addEventListener('click',()=>confirmPeople('child',[A.owner]));
$('reset-progress').addEventListener('click',()=>confirmPeople('child',[A.owner],true));
$('delete-edit-grownup').addEventListener('click',()=>{const person=editingGrownup;$('edit-grownup').close();confirmPeople('grownup',[person]);});
const refreshRoster=()=>{if(A.profile?.role==='grownup'&&!document.hidden)void loadRoster();};
window.addEventListener('online',refreshRoster);
window.addEventListener('offline',()=>{freshness='offline';renderRoster();render();});
window.addEventListener('focus',refreshRoster);
document.addEventListener('visibilitychange',refreshRoster);
setInterval(refreshRoster,15000);
function assignment(people){return people.length?[...people].sort((a,b)=>Number(b.id===A.profile.id)-Number(a.id===A.profile.id)||a.display_name.localeCompare(b.display_name)).map(person=>person.id===A.profile.id?'You':`${person.display_name} (${person.handle})`).join(' · '):'No grown-up assigned';}
function matches(person,id){const term=$(id).value.trim().toLocaleLowerCase();return `${person.display_name} ${person.handle} ${(person.grownups||[]).map(adult=>adult.display_name+' '+adult.handle).join(' ')}`.toLocaleLowerCase().includes(term);}
function updateBatch(){
  $('kid-batch').hidden=!selectedKids.size;$('grownup-batch').hidden=!selectedGrownups.size;
  $('kid-selected-count').textContent=selectedKids.size+' selected';$('grownup-selected-count').textContent=selectedGrownups.size+' selected';
  $('edit-selected-kids').disabled=!selectedKids.size;
  $('edit-selected-kids').textContent=selectedKids.size?'Settings for '+selectedKids.size+' selected kids':'Settings for selected kids';
}
function selectKids(){for(const child of roster.filter(c=>matches(c,'kid-search')))selectedKids.add(child.id);renderRoster();updateBatch();}
$('select-kids').addEventListener('click',selectKids);
$('select-all-kids').addEventListener('click',()=>{for(const child of roster)selectedKids.add(child.id);renderRoster();updateBatch();});
function selectGrownups(){for(const person of grownupRoster.filter(p=>!p.is_master&&p.id!==A.profile.id&&matches(p,'grownup-search')))selectedGrownups.add(person.id);renderGrownups();}
for(const id of ['select-all-grownups','select-grownups'])$(id).addEventListener('click',selectGrownups);
$('clear-kids').addEventListener('click',()=>{selectedKids.clear();renderRoster();updateBatch();});
$('clear-grownups').addEventListener('click',()=>{selectedGrownups.clear();renderGrownups();});
$('kid-search').addEventListener('input',renderRoster);$('grownup-search').addEventListener('input',renderGrownups);
$('delete-selected-kids').addEventListener('click',()=>confirmPeople('child',roster.filter(p=>selectedKids.has(p.id))));
$('reset-selected-kids').addEventListener('click',()=>confirmPeople('child',roster.filter(p=>selectedKids.has(p.id)),true));
$('delete-selected-grownups').addEventListener('click',()=>confirmPeople('grownup',grownupRoster.filter(p=>selectedGrownups.has(p.id))));
$('edit-selected-kids').addEventListener('click',()=>{
  const target=new URL('../grown-ups/index.html',location.href);
  const selection=crypto.randomUUID();
  sessionStorage.setItem('lwl-child-selection:'+selection,JSON.stringify({actor:A.profile.id,expires:Date.now()+30*60*1000,ids:[...selectedKids]}));
  target.searchParams.set('selection',selection);
  location.href=target.href;
});
const createAdult=$('create-grownup-form').closest('details');
function applyView(){
  const adult=A.profile?.role==='grownup', child=adult&&A.owner?.id!==A.profile.id;
  $('delete-child-shortcut').hidden=!adult||!child;
  $('transfer-child').hidden=!A.profile?.is_master||!child;
  $('share-child').hidden=!A.profile?.is_master||!child;
  if(portalView==='adults'&&!A.profile?.is_master)portalView='kids';
  $('my-account-page').hidden=adult?portalView!=='account':true;
  $('people').hidden=!adult||portalView!=='kids'||child;
  $('progress').hidden=adult?!((portalView==='kids'&&child)||portalView==='account'):false;
  $('child-management').hidden=!adult||!child||portalView!=='kids';
  createAdult.hidden=!A.profile?.is_master||portalView!=='adults';
  $('grownups').hidden=!A.profile?.is_master||portalView!=='adults';
  $('kids-view').setAttribute('aria-pressed',String(portalView==='kids'));
  $('adults-view').setAttribute('aria-pressed',String(portalView==='adults'));
  $('my-account').hidden=!adult;
  $('reset-own-progress').hidden=!adult||A.profile.is_master||portalView!=='account';
  for(const id of ['profile-form','own-password-form'])$(id).closest('details').hidden=Boolean(A.profile?.is_master);
}
async function navigate(view){
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  portalView=view;location.hash=view;
  if(view==='account')await A.selectOwner(A.profile);
  render();
}
for(const [id,view] of [['kids-view','kids'],['adults-view','adults'],['my-account','account']])$(id).addEventListener('click',()=>void navigate(view));
window.addEventListener('hashchange',()=>{portalView=location.hash.slice(1)||'kids';if(portalView==='account'&&A.profile)void A.selectOwner(A.profile).then(render);else render();});
// Password actions live inside the person's editor; the selected ID stays explicit.
$('child-password-slot').append($('reset-password-form').closest('details'));
$('grownup-password-slot').append($('reset-grownup-password-form').closest('details'));
for(const id of ['child-choice','grownup-choice']){const node=$(id)||document.querySelector('.child-choice');if(node)node.closest('label').hidden=true;}
$('child-avatar-upload').addEventListener('change',async()=>{
  const upload=$('child-avatar-upload'),preview=$('child-avatar-preview');
  if(!upload.files.length)return;
  try{preview.src=await avatarPicture(upload.files[0]);preview.hidden=false;}catch(error){upload.value='';notice(errorText(error),true);}
});
document.querySelectorAll('#child-profile-form [name=avatar]').forEach(input=>input.addEventListener('change',()=>{$('child-avatar-upload').value='';$('child-avatar-preview').hidden=true;}));
async function loadChildGrownups(){
  const child=A.owner;if(child?.role!=='child')return;
  try{
    const {grownups}=await A.manage('list-child-grownups',{child_id:child.id});
    if(A.owner.id!==child.id)return;
    $('child-grownups').replaceChildren();
    for(const person of grownups){
      const row=element('li',assignment([person]));
      if(A.profile.is_master||person.id===A.profile.id){
        const unlink=element('button','Unlink…','quiet-button');unlink.type='button';
        unlink.addEventListener('click',async()=>{
          try{const result=await riskyAction('Unlink this grown-up and child?', [person,child], current_password=>A.manage('unlink-child',{child_id:child.id,grownup_id:person.id,current_password}));await A.selectOwner(A.profile);await loadRoster({fresh:true});notice(result.kept_with_master?'This is the last link. The child stays with the master.':result.rehomed?'Link removed. The child and progress are kept with the master.':'Link removed. The child and progress are kept.');}catch(error){notice(errorText(error),true);}
        });row.append(unlink);
      }
      $('child-grownups').append(row);
    }
  }catch(error){$('child-grownups').textContent=errorText(error);}
}
$('delete-child-shortcut').addEventListener('click',()=>confirmPeople('child',[A.owner]));
$('reset-own-progress').addEventListener('click', () => {
  $('confirm-own-identity').textContent = `${A.profile.display_name} · Login: ${A.profile.handle}`;
  $('confirm-own-result').textContent = ''; $('confirm-own-password').value = '';
  $('confirm-own-reset-dialog').showModal(); $('cancel-own-reset').focus();
});
$('cancel-own-reset').addEventListener('click', () => $('confirm-own-reset-dialog').close());
$('confirm-own-reset-dialog').addEventListener('close',()=>{$('confirm-own-password').value='';});
$('confirm-own-reset').addEventListener('click', async () => {
  if (!$('confirm-own-password').reportValidity()) return;
  const button = $('confirm-own-reset'); button.disabled = true; $('cancel-own-reset').disabled = true;
  try {
    await A.manage('reset-own-progress', {current_password: $('confirm-own-password').value});
    await A.selectOwner(A.profile);
    $('confirm-own-reset-dialog').close(); render(); notice('Your game progress has been reset. You can start fresh.');
  } catch (error) { $('confirm-own-result').textContent = errorText(error); $('confirm-own-password').value=''; $('confirm-own-password').focus(); }
  finally { button.disabled = false; $('cancel-own-reset').disabled = false; }
});
$('confirm-own-reset-dialog').addEventListener('cancel',event=>{if($('confirm-own-reset').disabled)event.preventDefault();});
$('reset-grownup-progress').addEventListener('click',()=>{const person=editingGrownup;$('edit-grownup').close();confirmPeople('grownup',[person],true);});
let transferPeople=[];
function openTransfer(people){
  if(!people.length){notice('Choose at least one child.',true);return;}
  transferPeople=people;
  $('transfer-names').textContent=people.map(child=>`${child.display_name} (${child.handle})`).join(', ');
  $('transfer-form').querySelector('.form-result').textContent='';
  $('transfer-dialog').showModal();$('cancel-transfer').focus();
}
$('transfer-selected-kids').addEventListener('click',()=>openTransfer(roster.filter(child=>selectedKids.has(child.id))));
$('transfer-child').addEventListener('click',()=>openTransfer([A.owner]));
$('cancel-transfer').addEventListener('click',()=>$('transfer-dialog').close());
wireForm('transfer-form',async fields=>{
  const source=grownupRoster.find(person=>person.id===fields.source_id),destination=grownupRoster.find(person=>person.id===fields.destination_id);
  const affected=[...transferPeople,...(source?[{...source,display_name:'From: '+source.display_name}]:[]),...(destination?[{...destination,display_name:'To: '+destination.display_name}]:[])];
  const {results}=await riskyAction('Transfer these kids?', affected, current_password=>A.manage('transfer-children',{...fields,child_ids:transferPeople.map(child=>child.id),current_password}));
  const message=results.map(result=>{const child=transferPeople.find(child=>child.id===result.id);return `${child.display_name} (${child.handle}): ${result.ok?'transferred':result.reason}`;}).join('; ');
  $('transfer-dialog').close();for(const result of results)if(result.ok)selectedKids.delete(result.id);await A.selectOwner(A.profile);await loadRoster({fresh:true});notice(message,results.some(result=>!result.ok));
},'Transfer finished.');
$('share-child').addEventListener('click',async()=>{
  const child=A.owner;await A.selectOwner(A.profile);render();const details=$('link-child-form').closest('details');details.open=true;$('link-child-choice').value=child.id;details.scrollIntoView({block:'start'});
});
A.subscribe(render);
Promise.resolve(A.ready).then(async()=>{if(portalView==='account'&&A.profile)await A.selectOwner(A.profile);render();}).catch(error => {
  render(); notice(errorText(error), true);
});
})();
