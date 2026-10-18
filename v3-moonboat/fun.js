/* Route-owned paper rain is independent of transient interaction effects. */
(() => {
'use strict';
const post=window.CONCEPT.kind==='post', $=s=>document.querySelector(s);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let active=null, epoch=0, muted=false, speaking=false, audio=null;
const sources=new Set(), gains=new Set();
const stats={effects:0,maxEffects:0,maxParticles:0,sfxStarted:0,sfxWhileMuted:0,sfxDuringVoice:0};
function hush(){for(const s of sources){try{s.stop();}catch{}s.disconnect();}sources.clear();for(const g of gains)g.disconnect();gains.clear();}
function unlock(){if(muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{ /* Visual play remains available. */ }}
document.addEventListener('pointerdown',unlock,{capture:true});
document.addEventListener('keydown',e=>{if(['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))unlock();},{capture:true});
function sound(kind){
 if(muted||speaking||document.hidden||!audio||audio.state!=='running')return;
 hush();
 const now=audio.currentTime, gain=audio.createGain();gain.connect(audio.destination);gains.add(gain);
 const sequence=kind==='reward'?[392,494,587]:kind==='weather'?[440,554]:kind==='open'?[post?170:360,post?230:540]:[post?250:620];
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);
 sequence.forEach((hz,i)=>{const s=audio.createOscillator();s.type=post?'triangle':'sine';s.frequency.setValueAtTime(hz,now);if(kind==='open'&&post)s.frequency.exponentialRampToValueAtTime(hz*.55,now+.16);s.connect(gain);sources.add(s);s.onended=()=>{sources.delete(s);s.disconnect();if(!sources.size){gain.disconnect();gains.delete(gain);}};s.start(now+i*.028);s.stop(now+.2);});
 if(post&&kind==='open'){
  const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.15),audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.6;
  const noise=audio.createBufferSource();noise.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1500;noise.connect(filter);filter.connect(gain);sources.add(noise);noise.onended=()=>{sources.delete(noise);noise.disconnect();filter.disconnect();};noise.start(now);noise.stop(now+.15);
 }
 stats.sfxStarted++; // Read-only evidence for the QA harness; no child data.
}
function cancelMoment(){epoch++;if(active){active.cancel();active=null;}stats.effects=0;document.body.removeAttribute('data-effect');$('#confetti .theme-weather')?.remove();hush();}
function cancel(){cancelMoment();$('#confetti').replaceChildren();}
async function moment(el,frames,{duration=440,name='moment',cue=null,setup=null}={}){
 cancelMoment();const mine=epoch;
 if(reduce.matches||!el||document.hidden)return true;
 if(setup)setup();
 if(cue)sound(cue);
 stats.maxParticles=Math.max(stats.maxParticles,document.querySelectorAll('[data-particle]').length);stats.effects=1;stats.maxEffects=Math.max(stats.maxEffects,stats.effects);document.body.dataset.effect=name;
 const animation=el.animate(frames,{duration,easing:'cubic-bezier(.22,.75,.25,1)',fill:'none'});active=animation;
 let complete=true;try{await animation.finished;}catch{complete=false;}
 if(epoch!==mine)return false;
 active=null;stats.effects=0;document.body.removeAttribute('data-effect');
 return complete;
}
function createParticles(theme){
 const host=$('#confetti');host.replaceChildren();if(reduce.matches||document.hidden)return null;
 const group=document.createElement('div');group.className=`theme-weather weather-${theme}`;
 for(let i=0;i<6;i++){const p=document.createElement('i');p.dataset.particle='';p.style.setProperty('--n',i);group.append(p);}host.append(group);
 stats.maxParticles=Math.max(stats.maxParticles,document.querySelectorAll('[data-particle]').length);return group;
}
const paperShapes={
 heart:'<path d="M32 56C-9 31 6 1 25 12l7 7 7-7C58 1 73 31 32 56z"/><path class="paper-inset" d="M12 17c-7 10 0 22 20 39C7 43 0 25 12 17z"/>',
 envelope:'<path d="M6 14h52v37H6z"/><path class="paper-fold" d="m7 15 25 21 25-21M7 50l18-19m32 19L39 31"/>',
 stamp:'<path d="M13 6h5l2 3 3-3h5l3 3 3-3h5l3 3 3-3h6v5l-3 3 3 3v5l-3 3 3 3v5l-3 3 3 3v6l-3 3 3 3v6h-6l-3-3-3 3h-5l-3-3-3 3h-5l-3-3-3 3h-5v-6l3-3-3-3v-5l3-3-3-3v-5l3-3-3-3v-5l3-3-3-3z"/><path class="paper-inset" d="M21 16h23v32H21z"/><path class="paper-mark" d="M32 25c-9-9-18 5 0 15 18-10 9-24 0-15z"/>',
 curl:'<path d="M17 5c32 0 34 18 13 27-16 7-13 17 12 19l-2 10C3 56 1 35 25 25 40 19 32 15 16 15z"/><path class="paper-inset" d="M25 25c15-6 7-10-9-10l1-10c27 0 32 13 8 20zM15 39c-7 13 6 20 25 22l2-10c-16-1-25-5-27-12z"/>',
 star:'<path d="m32 4 8 19 20 3-15 14 4 21-17-11-18 11 4-21L3 26l21-3z"/><path class="paper-inset" d="m32 4 1 30 16 27-17-11-18 11 19-27z"/>',
 crescent:'<path d="M45 5C8 0 0 46 30 58c12 5 23 1 29-9C28 58 14 24 45 5z"/><path class="paper-inset" d="M45 5C8 0 0 46 30 58 8 37 20 13 45 5z"/>',
 planet:'<path d="M52 30a20 20 0 1 1-40 0 20 20 0 0 1 40 0z"/><path class="paper-inset" d="M23 13c-11 17-4 32 13 37C8 55 1 22 23 13z"/><path class="paper-ring" d="M11 27C-10 50 9 57 40 39c29-17 30-32 7-24l3 6c10-3 4 6-14 16C17 48 6 48 15 34z"/>'
};
const paperFall=[
 {lane:7,phase:-24,drift:18,size:1.5,turn:115},
 {lane:24,phase:18,drift:-23,size:0.9,turn:-95},
 {lane:43,phase:-12,drift:15,size:0.78,turn:125},
 {lane:68,phase:30,drift:-21,size:1.05,turn:-115},
 {lane:86,phase:-28,drift:24,size:0.88,turn:105},
 {lane:94,phase:16,drift:-18,size:0.8,turn:-135},
 {lane:14,phase:-24,drift:18,size:1.48,turn:115},
 {lane:33,phase:18,drift:-23,size:0.92,turn:-95},
 {lane:64,phase:-12,drift:15,size:0.8,turn:125},
 {lane:80,phase:30,drift:-21,size:1.1,turn:-115},
 {lane:93,phase:-28,drift:24,size:0.84,turn:105},
 {lane:5,phase:16,drift:-18,size:0.96,turn:-135},
 {lane:20,phase:-24,drift:18,size:0.82,turn:115},
 {lane:40,phase:18,drift:-23,size:1.5,turn:-95},
 {lane:71,phase:-12,drift:15,size:1.02,turn:125},
 {lane:88,phase:30,drift:-21,size:0.9,turn:-115},
 {lane:8,phase:-28,drift:24,size:0.86,turn:105},
 {lane:28,phase:16,drift:-18,size:0.98,turn:-135},
 {lane:57,phase:-24,drift:18,size:0.78,turn:115},
 {lane:78,phase:18,drift:-23,size:1.55,turn:-95},
 {lane:92,phase:-12,drift:15,size:0.92,turn:125},
 {lane:17,phase:30,drift:-21,size:0.84,turn:-115},
 {lane:48,phase:-28,drift:24,size:0.8,turn:105},
 {lane:69,phase:16,drift:-18,size:0.96,turn:-135}
];
function createPaperRain(){
 const host=$('#confetti');host.querySelector('.paper-rain')?.remove();
 if(reduce.matches||document.hidden)return;
 const group=document.createElement('div');group.className='paper-rain';
 const shapes={post:['envelope','stamp','heart','curl'],space:['star','crescent','planet','curl'],silk:['heart','curl','star','curl']}[window.CONCEPT.kind]||['star','crescent','planet','curl'];
 paperFall.forEach((piece,i)=>{
  const shape=shapes[i%shapes.length],p=document.createElement('span');p.dataset.particle='';p.dataset.paper=shape;
  p.style.cssText=`--lane:${piece.lane}%;--start:0vh;--phase:${piece.phase}deg;--drift:${piece.drift}px;--delay:${-Math.round(i/paperFall.length*(3100+(i%4)*180))}ms;--size:${piece.size};--turn:${piece.turn}deg;--flutter:${i%2?-1:1};--tone:var(${['--accent','--accent2','--focus','--ink'][i%4]});--flight:${3100+(i%4)*180}ms`;
  p.innerHTML=`<span class="paper-flutter"><svg class="paper-piece" viewBox="0 0 64 64" aria-hidden="true">${paperShapes[shape]}</svg></span>`;group.append(p);
 });
 host.append(group);stats.maxParticles=Math.max(stats.maxParticles,document.querySelectorAll('[data-particle]').length);
}
async function lucy(pose){const el=(pose==='paw'||pose==='salute')?$('.lucy-paw'):pose==='glint'?$('.visor-glint'):$('.lucy-portrait');const transform=(pose==='paw'||pose==='salute')?['rotate(-15deg) translateY(10px)','rotate(0) translateY(-5px)','rotate(-15deg) translateY(0)']:pose==='tilt'?['rotate(0)','rotate(-5deg)','rotate(0)']:pose==='glint'?['translateX(-8px)','translateX(14px)','translateX(0)']:['rotate(0)','rotate(4deg) translateY(3px)','rotate(0)'];return moment(el,transform.map(transform=>({transform})),{duration:380,name:'lucy-'+pose});}
async function home(){
 const mine=epoch;
 if(!await moment($(post?'.open-sign':'.map-ship .art'),post?[{transform:'rotate(-15deg)'},{transform:'rotate(-4deg)'},{transform:'rotate(-7deg)'}]:[{transform:'translate(-28px,14px) rotate(2deg)'},{transform:'translate(-8px,-8px) rotate(15deg)'},{transform:'rotate(22deg)'}],{duration:650,name:'intro'}))return;
 // Each route gets one finite idle greeting, never a repeating timer.
 if(document.body.dataset.screen!=='home'||epoch!==mine+1)return;
 if(!await lucy(post?'paw':'salute'))return;
 if(!post&&!await lucy('glint'))return;
 if(!await lucy('tilt'))return;
 await moment($(post?'.open-sign':'.map-mark'),post?[{transform:'rotate(-7deg)'},{transform:'rotate(-3deg)'},{transform:'rotate(-7deg)'}]:[{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(1)'}],{duration:500,name:'idle-once'});
}
window.Fun={cancel,home,lucy,
 exit(){return moment($('.screen'),[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-8px)'}],{duration:180,name:'screen-exit'});},
 correct(button){return moment(button,[{transform:'translateY(0) scale(1)'},{transform:'translateY(-12px) scale(1.055)',offset:.4},{transform:'translateY(2px) scale(.985)',offset:.75},{transform:'translateY(0) scale(1)'}],{duration:480,name:'correct-bounce'});},
 mute(value){muted=value;hush();},
 voice(value){speaking=value;if(value)hush();},
 press(button){return moment(button,[{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:160,name:post?'paper-press':'orbit-squish'});},
 open(){return post?moment($('.listen .mail-flap'),[{transform:'rotateX(0)'},{transform:'rotateX(160deg)'}],{duration:500,name:'envelope-open',cue:'open'}):moment($('.listen .signal-orbit'),[{transform:'rotate(-55deg) scale(.87)',opacity:.4},{transform:'rotate(0) scale(1)',opacity:1}],{duration:500,name:'orbit-tune',cue:'open'});},
 replay(){return moment($('.listen-letter')||$('.reward-art'),[{transform:'scale(1)'},{transform:'scale(1.055) rotate(-2deg)'},{transform:'scale(1)'}],{duration:330,name:post?'ink-ring':'signal-ring',cue:'tap'});},
 async hint(button){button.classList.add('miss-active');try{return await moment(button,[{transform:'translateX(0)'},{transform:'translateX(-5px) rotate(-1deg)',offset:.23},{transform:'translateX(4px) rotate(1deg)',offset:.48},{transform:'translateX(-2px)',offset:.72},{transform:'translateX(0)'}],{duration:480,name:'gentle-miss',cue:'tap'});}finally{button.classList.remove('miss-active');}},
 reward(){return moment($(post?'.reward-stamp':'.reward-art'),post?[{transform:'translateY(-16px) rotate(-8deg) scale(1.2)'},{transform:'translateY(0) rotate(12deg) scale(1)',offset:704/4400},{transform:'translateY(0) rotate(12deg) scale(1)'}]:[{transform:'scale(.92) rotate(-7deg)',opacity:.4},{transform:'scale(1.04) rotate(3deg)',opacity:1,offset:396/4400},{transform:'scale(1) rotate(0)',opacity:1,offset:792/4400},{transform:'scale(1) rotate(0)',opacity:1}],{duration:4400,name:post?'delivery-stamp':'world-awakens',cue:'reward',setup:createPaperRain});},
 get evidence(){return {...stats,particles:document.querySelectorAll('[data-particle]').length,active:active?1:0,sources:sources.size,muted,speaking,reduced:reduce.matches};}
};
// Theme particles must be created after moment clears the preceding effect.
window.Fun.weather=async theme=>{cancel();if(reduce.matches||document.hidden)return true;if(document.body.dataset.screen==='celebrate'){createPaperRain();sound('weather');return true;}const group=createParticles(theme);const mine=epoch;document.body.dataset.effect='theme-weather';sound('weather');stats.maxParticles=Math.max(stats.maxParticles,document.querySelectorAll('[data-particle]').length);stats.effects=1;stats.maxEffects=Math.max(stats.maxEffects,1);const a=group.animate([{transform:'translateY(-12px)',opacity:0},{transform:'translateY(0)',opacity:1,offset:.25},{transform:'translateY(22px)',opacity:0}],{duration:650,easing:'ease-out'});active=a;try{await a.finished;}catch{return false;}if(epoch!==mine)return false;active=null;stats.effects=0;document.body.removeAttribute('data-effect');$('#confetti').replaceChildren();return true;};
reduce.addEventListener('change',()=>{cancel();if(reduce.matches)document.querySelectorAll('[data-particle]').forEach(p=>p.remove());else if(document.body.dataset.screen==='celebrate')createPaperRain();});
document.addEventListener('visibilitychange',()=>{document.body.dataset.motion=document.hidden?'paused':'ready';if(document.hidden){active?.pause();hush();}else if(active?.playState==='paused')active.play();});
window.addEventListener('pagehide',cancel);
})();
