(() => {
'use strict';
const A=window.ACCOUNTS, dialog=document.getElementById('login-dialog'), form=document.getElementById('child-signin-form');
const layouts=document.getElementById('layouts'), status=document.getElementById('login-status');
const again=document.getElementById('continue-player');
function openLogin(){
  layouts.hidden=true;document.body.dataset.homeStep='login';
  if(!dialog.matches(':modal')){if(dialog.open)dialog.close();dialog.showModal();}
  again.hidden=!A?.profile;
  if(!again.hidden)again.textContent='Continue as '+A.profile.display_name;
}
function showLayouts(){
  if(!A?.guest && !A?.session)return openLogin();
  document.getElementById('change-player').textContent=A.session?'👋 Not me? Sign out':'Sign in to save';
  layouts.hidden=false;dialog.close();document.body.dataset.homeStep='layouts';
  const games=window.GROWN_UPS.load().games;
  const cards=[...document.querySelectorAll('[data-world]')];
  const defaultLayout=games.includes('silk')?'silk':games[0];
  for(const card of cards){
    card.hidden=!games.includes(card.dataset.world);
    card.toggleAttribute('aria-current',card.dataset.world===defaultLayout);
    if(card.dataset.world===defaultLayout)card.setAttribute('aria-current','true');
    const target=new URL(card.getAttribute('href'),location.href);
    if(A.guest)target.searchParams.set('mode','guest');else target.searchParams.delete('mode');
    card.href=target.href;
  }
  document.getElementById('layout-picker').style.setProperty('--worlds',games.length);
  document.getElementById('saving-notice').textContent=A.guest?'Playing without saving. Progress, achievements and settings will not be saved.':'Your discoveries and settings belong to '+A.profile.display_name+'.';
  document.getElementById('layout-title').focus();
}
dialog.addEventListener('cancel',event=>event.preventDefault());
form.addEventListener('submit',async event=>{
  event.preventDefault();if(form.getAttribute('aria-busy')==='true')return;form.setAttribute('aria-busy','true');const button=form.querySelector('button');button.disabled=true;status.classList.remove('error');status.textContent='Signing in…';
  try{await A.signIn(form.elements.handle.value,form.elements.password.value);await A.selectOwner(A.profile);showLayouts();}
  catch(error){status.textContent=error.message;status.classList.add('error');}
  finally{button.disabled=false;form.removeAttribute('aria-busy');form.elements.password.value='';}
});
document.getElementById('play-unsaved').addEventListener('click',async()=>{await A.startGuest();showLayouts();});
again.addEventListener('click',async()=>{try{await A.selectOwner(A.profile);showLayouts();}catch(error){status.textContent=error.message;}});
document.getElementById('change-player').addEventListener('click',async()=>{form.reset();await A.signOut();status.textContent='';openLogin();});
openLogin();
if(new URL(location.href).searchParams.has('expired'))status.textContent='Signed out for safety. Your saved play is waiting for your next sign-in.';
A.subscribe(()=>{if(!A.session&&!A.guest)openLogin();});
A.ready.then(()=>{if(document.body.dataset.homeStep==='login')openLogin();if(new URL(location.href).searchParams.has('layouts')&&(A.session||A.guest))showLayouts();}).catch(()=>{status.textContent='Sign-in storage is unavailable. You can still play without saving.';});
})();
