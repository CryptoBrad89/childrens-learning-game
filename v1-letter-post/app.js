(async () => {
'use strict';
if (location.protocol !== 'file:') {
  if (!window.ACCOUNTS) { location.replace('../index.html'); return; }
  try { await window.ACCOUNTS.ready; } catch { if(!window.ACCOUNTS.guest){ location.replace('../index.html'); return; } }
  if (!window.ACCOUNTS.session && !window.ACCOUNTS.guest) { location.replace('../index.html'); return; }
  await window.ACCOUNTS.sync();
  if(!window.ACCOUNTS.guest && window.ACCOUNTS.owner.id!==window.ACCOUNTS.profile.id)await window.ACCOUNTS.selectOwner(window.ACCOUNTS.profile);
  window.GROWN_UPS.settings = window.GROWN_UPS.load();
}
const C=window.CONCEPT, $=s=>document.querySelector(s), main=$('#main');
const letters=[["A","apple","/ă/"],["B","ball","/b/"],["C","cat","/k/"],["D","duck","/d/"],["E","egg","/ĕ/"],["F","fish","/f/"],["G","goat","/g/"],["H","hat","/h/"],["I","insect","/ĭ/"],["J","jellyfish","/j/"],["K","kite","/k/"],["L","leaf","/l/"],["M","moon","/m/"],["N","nest","/n/"],["O","octopus","/ŏ/"],["P","pig","/p/"],["Q","quilt","/kw/"],["R","rabbit","/r/"],["S","sun","/s/"],["T","tiger","/t/"],["U","umbrella","/ŭ/"],["V","van","/v/"],["W","web","/w/"],["X","fox","/ks/"],["Y","yak","/y/"],["Z","zebra","/z/"]].map(([letter,word,sound])=>({letter,word,sound}));
const assetBase=C.assetBase||'assets';
const audioPath=file=>file.startsWith('assets/')?assetBase+file.slice(6):file;
const A=window.GAME_AUDIO;
const F=window.Fun, post=C.kind==='post';
const key='little-woof-'+C.kind+'-theme';
const grown=window.GROWN_UPS?.settings||{}, chosen=letters.filter(l=>!grown.letters||grown.letters.includes(l.letter)), pool=chosen.length?chosen:letters;
const volume=Math.min(1,Math.max(0,(grown.volume??100)/100)), all=pool.length===letters.length;
const accounts=location.protocol==='file:'?null:window.ACCOUNTS;
let progressOwner=accounts?.owner?.id||null;
let theme=0, storageOK=true, muted=grown.voice===false, state='home', current=letters[0], visited=new Set(progressOwner?accounts.snapshot.rounds.map(round=>round.letter):[]), misses=0, choices=[], busy=false, route=0, voiceToken=0, player=null, resolveClip=null, pauseTimer=null, roundId=null;
const layout=window.createLetterLayout?.({pool,visited,post,main,ico,grown,saved:()=>Boolean(progressOwner)});
try { const saved=Number(window.ACCOUNTS?.guest ? 0 : window.ACCOUNTS?.owner && location.protocol !== 'file:' ? window.ACCOUNTS.snapshot.themes[C.kind] : localStorage.getItem(key)); if(Number.isInteger(saved)&&saved>=0&&saved<C.themes.length) theme=saved; }catch(e){storageOK=false;}
function setTheme(value){F.cancel();theme=value;document.body.dataset.theme=String(value);try{if(window.ACCOUNTS?.guest){}else if(window.ACCOUNTS?.owner && location.protocol !== 'file:'){if(window.ACCOUNTS.snapshot.themes[C.kind]!==value)window.ACCOUNTS.setSetting('theme.'+C.kind,value).catch(()=>announce('Could not save your color.'));}else localStorage.setItem(key,String(value));}catch(e){storageOK=false;$('#storage').textContent='Theme saved for this visit only.';} }
const wave=()=>'<span class="sound-wave" aria-hidden="true">'+Array.from({length:5},(_,i)=>`<i style="--i:${i}"></i>`).join('')+'</span>';
const pic=(mood='default',line='',small=false)=>`<figure class="lucy ${mood==='celebrate'?'mood-happy':''} ${small?'small':''}">${line?`<div class="speech">${line}</div>`:''}<div class="lucy-portrait"><img src="${assetBase}/lucy-${mood}.jpg" alt="Lucy the golden retriever${mood==='celebrate'?', celebrating':''}" draggable="false"><span class="lucy-paw" aria-hidden="true">${ico('paw')}</span><span class="visor-glint" aria-hidden="true"></span></div><figcaption>${ico('paw')} LUCY</figcaption></figure>`;
function header(){ $('#header').innerHTML=`<a class="brand" href="#main" aria-label="Letters with Lucy, back to this world’s home"><span class="brand-mark">${ico(C.kind==='space'?'star':'paw')}</span><span>Letters with Lucy<small>Little Sounds Big Discovery</small></span></a><div class="controls"${grown.kidControls===false?' hidden':''}><button class="tool" id="mute" aria-label="${muted?'Turn sound on':'Mute sound'}" aria-pressed="${muted}">${ico(muted?'mute':'sound')}</button><div class="theme-control"><label for="theme" aria-label="Color theme">${ico('palette')}</label><select id="theme" aria-label="Color theme">${C.themes.map((t,i)=>`<option value="${i}">${t}</option>`).join('')}</select></div></div>`;
 $('#theme').value=String(theme); $('#theme').addEventListener('change',e=>{setTheme(Number(e.target.value));announce(C.themes[theme]+' theme');F.weather(theme);}); $('#mute').onclick=()=>{muted=!muted;if(window.ACCOUNTS?.owner)window.ACCOUNTS.setSetting('voice',!muted).catch(()=>announce('Could not save sound choice.'));F.mute(muted);stopVoice();$('#mute').innerHTML=ico(muted?'mute':'sound');$('#mute').setAttribute('aria-pressed',String(muted));$('#mute').setAttribute('aria-label',muted?'Turn sound on':'Mute sound');announce(muted?'Sound off. Follow the pictures.':'Sound on. Tap a speaker to listen.');};
 $('#footer').innerHTML=`<span class="footer-note">${ico('paw')} Made for little explorers · ages 3–4</span><a href="../index.html?layouts">Choose a layout</a>`;
 $('.brand').onclick=e=>{e.preventDefault();go('home');};
 setTheme(theme);
}
function announce(text){$('#announcer').textContent=text;}
function stopVoice(){F.voice(false);voiceToken++;clearTimeout(pauseTimer);pauseTimer=null;if(player){player.pause();player.onended=null;player.onerror=null;player=null;} if(resolveClip){resolveClip(false);resolveClip=null;} document.body.classList.remove('talking');}
async function voice(files){stopVoice();const mine=voiceToken;if(muted||document.hidden)return true;F.voice(true);document.body.classList.add('talking');for(const source of files){if(mine!==voiceToken)return false;if(typeof source==='number'){await new Promise(resolve=>{resolveClip=resolve;pauseTimer=setTimeout(()=>{pauseTimer=null;resolveClip=null;resolve(true);},source);});continue;}const file=audioPath(source);const ok=await new Promise(resolve=>{const a=new Audio(file);a.volume=volume;player=a;resolveClip=resolve;a.onended=()=>{if(mine===voiceToken)resolveClip=null;resolve(true);};a.onerror=()=>{if(mine===voiceToken){resolveClip=null;announce('Audio could not play. You can still match the pictures.');}resolve(false);};a.play().catch(()=>{if(mine===voiceToken){resolveClip=null;announce('Tap the speaker to hear the sound.');}resolve(false);});});if(!ok||mine!==voiceToken){if(mine===voiceToken){document.body.classList.remove('talking');F.voice(false);}return false;}} if(mine===voiceToken){player=null;document.body.classList.remove('talking');F.voice(false);}return true;}
function letterAudio(){return [A.letters[current.letter].name,A.letters[current.letter].sound];}
function wordAudio(l){return A.words[l.word];}
function shuffle(a){return a.map(x=>({x,r:Math.random()})).sort((a,b)=>a.r-b.r).map(o=>o.x);}
const progressScope=()=>progressOwner?'saved progress':'this visit';
const progressNote=()=>progressOwner?'Saved across all games.':'Yours for this visit.';
const completedCount=()=>pool.filter(letter=>visited.has(letter.letter)).length;
const pickerLabel=letter=>'Play letter '+letter+(progressOwner&&visited.has(letter)?', completed':'');
function badges(l){return visited.has(l.letter)?`<span class="visited" aria-label="${progressOwner?'completed':'played this visit'}">${ico('check')}</span>`:'';}
function pickers(type){if(layout)return layout.pickers(type);return `<div class="picker-shelf ${type}-shelf" role="region" aria-label="${all?'Choose a letter, A to Z. Scroll for more letters.':'Choose a letter. '+pool.length+' chosen for today.'}"><div class="letter-list ${type}" aria-label="Choose a letter">${pool.map((l,i)=>`<button data-letter="${l.letter}" aria-label="${pickerLabel(l.letter)}" style="--i:${i};--tilt:${[-5,3,-2,4,-3,5][i%6]}deg"><span class="letter-decoration" aria-hidden="true"></span><span class="pick-glyph">${l.letter}<small>${l.letter.toLowerCase()}</small></span><span class="pick-caption">${C.kind==='post'?'OPEN ME':C.kind==='garden'?'plant me':C.kind==='silk'?'follow me':'explore'}</span>${badges(l)}</button>`).join('')}</div></div>`;}
function collection(){if(layout)return layout.collection();return `<aside class="collection ${post?'stamp-album':'constellation'}" aria-label="${post?'Stamp collection':C.kind==='silk'?'Sound thread':'Sound constellation'}: ${progressScope()}"><div class="collection-heading"><strong>${post?'YOUR STAMP STRIP':C.kind==='silk'?'YOUR SOUND THREAD':'YOUR LITTLE CONSTELLATION'}</strong><span>${completedCount()} of ${pool.length} · ${progressScope()}</span></div><div class="collection-slots" role="region" tabindex="0" aria-label="${all?'All 26 letters':pool.length===1?'1 letter':'All '+pool.length+' letters'}. Scroll to see more.">${pool.map(l=>`<div class="collection-slot ${visited.has(l.letter)?'collected':''}" aria-label="${l.letter}${visited.has(l.letter)?progressOwner?', completed':', collected this visit':', ready to explore'}"><span class="collection-symbol" aria-hidden="true">${visited.has(l.letter)?(post?ico('paw'):ico('star')):ico('star')}</span><b>${l.letter}</b><span>${visited.has(l.letter)?l.word:'·'}</span></div>`).join('')}</div><p>${post?'A stamp for each sound you deliver.':C.kind==='silk'?'A little sparkle for each sound you find.':'A star for each sound you explore.'} ${progressNote()}</p></aside>`;}
function renderProgress(){
 if(layout){layout.refresh();return;}
 main.querySelectorAll('.letter-list [data-letter]').forEach(button=>{
  button.querySelector('.visited')?.remove();
  button.insertAdjacentHTML('beforeend',badges({letter:button.dataset.letter}));
  button.setAttribute('aria-label',pickerLabel(button.dataset.letter));
 });
 const old=$('.collection');
 if(old){
  const left=old.querySelector('.collection-slots').scrollLeft;
  old.outerHTML=collection();
  $('.collection-slots').scrollLeft=left;
 }
}
function refreshProgress(){
 const owner=accounts.owner?.id||null,ownerChanged=owner!==progressOwner;
 if(!owner&&!ownerChanged)return;
 const next=new Set(owner?accounts.snapshot.rounds.map(round=>round.letter):[]);
 if(!ownerChanged&&next.size===visited.size&&[...next].every(letter=>visited.has(letter)))return;
 progressOwner=owner;
 visited.clear();for(const letter of next)visited.add(letter);
 if(ownerChanged){
  layout?.complete(null);
  go('home',{focus:false,transition:false});
 }else if(!busy)renderProgress();
}
function home(){
 if(layout)return layout.home(pic);
 if(C.home)return C.home({pic,pickers,collection,ico,count:pool.length});
 if(C.kind==='post')return `<section class="screen home post-home"><div class="post-intro"><p class="eyebrow"><span class="tiny-star">✳</span> A special delivery of sounds</p><h1>Lucy’s<br>Letter <em>Post.</em></h1><p class="lead">Little letters.<br>Very big adventures.</p><div class="post-sticker" aria-hidden="true">SOUND<br>MAIL ${ico('paw')}</div><div class="route-card"><span>YOUR LITTLE MISSION</span><p>${ico('sound')} Listen <b>→</b> ${ico('star')} Find <b>→</b> ${ico('check')} Deliver</p></div></div><div class="post-office"><div class="office-top">${pic('default','A letter for you!')}<span class="office-number" aria-hidden="true">№ 01<br>✳</span></div><div class="sorting-shelf"><div class="shelf-title"><span>Pick a letter to open</span>${ico('back')}</div>${pickers('envelopes')}</div></div>${collection()}<div class="post-bottom"><span>LETTERS WITH LUCY POST</span><span>Every sound goes somewhere lovely. ${ico('star')}</span></div></section>`;
 if(C.kind==='garden')return `<section class="screen home garden-home"><div class="garden-heading"><p class="eyebrow">A little wonder, every day</p><h1>Lucy’s<br><em>Sound Garden</em></h1><p class="lead">Pick a seed. Hear a sound.<br>See what grows.</p></div><div class="garden-lucy">${pic('default','Let’s grow together!')}<div class="garden-sign">OUR HAPPY PLACE</div></div><div class="garden-bed"><div class="garden-ground" aria-hidden="true"></div><div class="garden-flower left" aria-hidden="true">${draw('flower')}</div><div class="garden-flower right" aria-hidden="true">${draw('leaf')}</div><div class="seed-label">Which sound shall we grow?</div>${pickers('seeds')}<div class="garden-path" aria-hidden="true">· &nbsp; · &nbsp; · &nbsp; · &nbsp; · &nbsp; · &nbsp; · &nbsp; ·</div></div><div class="garden-bottom"><span>${ico('sound')} A sound</span><i></i><span>${ico('paw')} A little discovery</span><i></i><span>${ico('star')} Something lovely grows</span></div></section>`;
 return `<section class="screen home space-home"><div class="captain-panel"><p class="eyebrow">Small steps. Cosmic discoveries.</p><h1>Lucy’s<br><em>Moonboat</em></h1><p class="lead">A whole sky <br>of little sounds.</p><div class="captain">${pic('default','Ready, little explorer?')}<span class="captain-label">CAPTAIN LUCY · READY TO GO</span></div></div><div class="star-map"><div class="map-heading"><span>THE SOUND CONSTELLATION</span><span class="map-mark">✦</span><span>${pool.length===1?'1 LITTLE WORLD':pool.length+' LITTLE WORLDS'}</span></div><div class="map-orbit" aria-hidden="true"></div><div class="map-orbit second" aria-hidden="true"></div><div class="map-caption">Tap a world. Find its sound.</div>${pickers('planets')}${collection()}<div class="map-ship" aria-hidden="true">${draw('rocket')}<span>One tiny adventure at a time.</span></div></div></section>`;
}
function stepbar(n){return `<div class="stepbar"><button class="back" data-action="${state==='match'?'listen':'home'}">${ico('back')} ${state==='match'?'Listen':'Home'}</button><span class="steps-label">${['','Listen','Find','Hooray'][n]}</span><div class="steps" aria-label="Step ${n} of 3">${[1,2,3].map(i=>`<span class="${i<=n?'done':''}"></span>`).join('')}</div></div>`;}
function soundCard(){return `<button class="listen-letter" data-action="replay" aria-label="${state==='match'?'Hear the sound for letter '+current.letter:'Hear letter '+current.letter+' and its sound'}"><span class="letter-corner" aria-hidden="true">${C.kind==='post'?'SOUND MAIL':C.kind==='garden'?'A LITTLE SEED':C.kind==='silk'?'A LITTLE SOUND':'SOUND SIGNAL'}</span><span class="glyph">${current.letter}<small>${current.letter.toLowerCase()}</small></span><span class="sound-label">${ico('sound')} Hear ${current.sound}</span>${wave()}${post?'<span class="mail-flap" aria-hidden="true"></span>':'<span class="signal-orbit" aria-hidden="true"></span>'}</button>`;}
function listen(){const wording=C.kind==='post'?['You’ve got sound mail!','Open your ears. Listen with Lucy.','Find its picture']:C.kind==='garden'?['A tiny sound is growing.','Listen. Can you say it with Lucy?','Let’s grow!']:C.kind==='silk'?['Follow a little sound.','Listen. Can you say it with Lucy?','Find its picture']:['A sound from the stars.','Listen closely, little explorer.','Find its picture'];return `<section class="screen play listen">${stepbar(1)}<div class="listen-layout"><div class="listen-intro"><p class="eyebrow">${C.kind==='post'?'SPECIAL DELIVERY':C.kind==='garden'?'IN OUR GARDEN':C.kind==='silk'?'ALONG RIBBON ROAD':'INCOMING TRANSMISSION'}</p><h1 class="play-title">${wording[0]}</h1><p class="play-copy">${wording[1]}</p><div class="guide-lucy">${pic('specs',current.letter+' says '+current.sound)}</div></div><div class="listen-work">${soundCard()}<button class="primary continue" data-action="match">${wording[2]} ${ico('arrow')}</button><p class="small-note">Tap the letter to hear it again.</p></div></div></section>`;}
function match(){return `<section class="screen play match">${stepbar(2)}<div class="match-layout"><div class="match-prompt"><div><p class="eyebrow">${C.kind==='post'?'SORT THE SOUND MAIL':C.kind==='garden'?'A LITTLE HELP TO GROW':C.kind==='silk'?'A LITTLE DISCOVERY':'LOOK THROUGH THE TELESCOPE'}</p><h1 class="play-title">What ${current.letter==='X'?'ends':'starts'} <br>with ${current.sound}?</h1><p class="play-copy">Tap a picture.</p></div><div class="match-sound">${soundCard()}</div><div class="match-lucy">${pic('specs')}</div></div><div class="match-work"><div class="choices">${choices.map(l=>`<button class="choice" data-answer="${l.letter}" aria-label="${l.word}">${wordPicture(l.word)}<span class="word">${l.word} ${ico('sound')}</span></button>`).join('')}</div><p class="feedback" role="status">${C.kind==='post'?'Which picture belongs in this letter?':C.kind==='garden'?'Find a picture to make your flower bloom.':'Which picture has our little sound?'}</p></div></div></section>`;}
function celebrate(){const labels=C.kind==='post'?['Delivered with love!','ONE HAPPY DELIVERY','Sound mail, delivered.']:C.kind==='garden'?['Look what you grew!','A LITTLE SOUND BLOSSOM','Your garden has a new flower.']:C.kind==='silk'?['You found a little sparkle!','A NEW SOUND ON YOUR THREAD','Follow a sound. Find a little wonder.']:['You lit up the sky!','A NEW STAR IS SHINING','A little sound. A big discovery.'];return `<section class="screen celebration">${stepbar(3)}<div class="celebration-layout"><div class="reward-art"><div class="reward-ring" aria-hidden="true"></div><span class="burst-label">${labels[1]}</span>${wordPicture(current.word)}<span class="reward-letter">${current.letter}<small>${current.letter.toLowerCase()}</small></span><span class="reward-stamp" aria-hidden="true">${post?'<b>DELIVERED</b>':ico('star')}</span>${post||F.evidence.reduced?'':'<span class="world-stars" aria-hidden="true"><i data-particle="reward">✦</i><i data-particle="reward">✦</i><i data-particle="reward">✦</i><i data-particle="reward">✦</i><i data-particle="reward">✦</i><i data-particle="reward">✦</i></span>'}</div><div class="celebration-copy"><p class="eyebrow">${labels[2]}</p><h1 class="finish-title">${labels[0]}</h1><p class="word-line">${current.letter==='X'?'Fox ends with x.':current.letter+' is for '+current.word+'.'}</p><div class="finish-actions"><button class="primary" data-action="next">Another sound ${ico('arrow')}</button><button class="secondary" data-action="home">${ico('home')} Home</button></div><button class="replay-prompt reward-replay" data-action="reward-replay">${ico('sound')} Hear ${current.word} again</button></div><div class="celebration-lucy">${pic('celebrate','We did it!')}</div></div>${collection()}</section>`;}
async function go(next,{focus=true,transition=true,keepVoice=false}={}){if(!keepVoice)stopVoice();F.cancel();const mine=++route;state=next;busy=true;if(transition)await F.exit();if(route!==mine)return false;main.innerHTML=next==='home'?home():next==='listen'?listen():next==='match'?match():celebrate();document.body.dataset.screen=next;busy=false;if(focus){main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});} layout?.enter(next);if(next==='home'&&transition)F.home();if(next==='celebrate'){if(!layout){const strip=$('.collection-slots'),slot=strip.children[Math.max(0,pool.indexOf(current))];strip.scrollLeft=slot.offsetLeft-(strip.clientWidth-slot.offsetWidth)/2;}celebrationMoment(mine);}return true;}
async function celebrationMoment(mine){if(await F.reward()&&route===mine)await F.lucy('nod');}
async function start(letter){layout?.select(letter);roundId=window.ACCOUNTS?.owner?crypto.randomUUID():null;current=letters.find(l=>l.letter===letter)||letters[0];misses=0;choices=shuffle([current,...shuffle(letters.filter(l=>l!==current&&l.sound!==current.sound&&(current.letter==='X'||l.word[0]!==current.word[0]))).slice(0,2)]);if(!await go('listen'))return;const mine=route;if(!await F.open())return;if(route===mine)voice(letterAudio());}
async function continueMatch(button){if(busy||state!=='listen')return;busy=true;stopVoice();const mine=route;if(await F.press(button)&&route===mine){await go('match');}}
async function replay(reward=false){if(busy)return;stopVoice();F.cancel();const mine=route,token=voiceToken;if(!await F.replay())return;if(route===mine&&token===voiceToken)voice(reward?[wordAudio(current)]:state==='match'?[A.letters[current.letter].sound]:letterAudio());}
const retryClips = ['../audio/feedback/lucy-uh-oh.mp3','../audio/feedback/lucy-try-again.mp3','../audio/feedback/lucy-oops-try-again.mp3'];
let retryBag=[];
function nextRetry(){if(!retryBag.length)retryBag=shuffle(retryClips);return retryBag.pop();}
async function answer(button){
 if(busy)return;
 stopVoice();F.cancel();
 const mine=route,selected=letters.find(l=>l.letter===button.dataset.answer);
 if(selected!==current){
  misses++;
  button.classList.add('tried');
  $('.feedback').textContent=`That’s ${selected.word}. Try another picture.`;
  F.wrong(button);
  await voice([wordAudio(selected),200,nextRetry()]);
  return;
 }
 busy=true;
 const unlock=()=>{busy=false;document.querySelectorAll('.choice').forEach(b=>b.removeAttribute('aria-disabled'));};
 document.querySelectorAll('.choice').forEach(b=>b.setAttribute('aria-disabled','true'));
 if(document.hidden){unlock();return;}
 const completionCount=visited.size+(visited.has(current.letter)?0:1);
 voice([wordAudio(selected),A.feedback.cheers[completionCount%2]]);
 await F.correct(button);
 if(route!==mine)return;
 if((accounts?.owner?.id||null)!==progressOwner){refreshProgress();return;}
 const newCompletion=!visited.has(current.letter);
 if(window.ACCOUNTS?.owner){
  try{await window.ACCOUNTS.recordRound(C.kind,current.letter,misses,roundId);}
  catch{unlock();announce('Could not save this sound. Free some browser storage and try again.');return;}
 }
 if(route!==mine)return;
 if(newCompletion)layout?.complete(current.letter);
 visited.add(current.letter);go('celebrate',{keepVoice:true});
}
main.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||!main.contains(b)||b.getAttribute('aria-disabled')==='true'||(busy&&b.dataset.action!=='home'))return;if(layout?.click(b))return;if(b.dataset.letter){start(b.dataset.letter);return;}if(b.dataset.answer){answer(b);return;}const a=b.dataset.action;if(a==='home')go('home');if(a==='start')start(pool[0].letter);if(a==='listen'){if(await go('listen'))replay();}if(a==='match'&&state==='listen')continueMatch(b);if(a==='replay')replay();if(a==='next')start(pool[(pool.indexOf(current)+1)%pool.length].letter);if(a==='reward-replay')replay(true);});
main.addEventListener('keydown',e=>{if(layout?.keydown(e))return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;const group=e.target.closest('.letter-list,.choices');if(!group)return;const buttons=[...group.querySelectorAll('button')];const i=buttons.indexOf(e.target);if(i<0)return;e.preventDefault();let jump=(e.key==='ArrowLeft'||e.key==='ArrowUp')?-1:1;buttons[(i+jump+buttons.length)%buttons.length].focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state!=='home'){go('home');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice();});
header();go('home',{focus:false});
accounts?.subscribe(refreshProgress);
})();
