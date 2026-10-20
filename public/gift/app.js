const introMode = new URLSearchParams(location.search).get('mode') === 'intro';
if (introMode) {
  document.documentElement.classList.add('intro-mode');
  const op = document.getElementById('opening');
  if (op) { op.classList.remove('active'); op.setAttribute('aria-hidden', 'true'); op.inert = true; }
  const cd = document.getElementById('card');
  if (cd) { cd.classList.add('active'); cd.removeAttribute('aria-hidden'); cd.inert = false; }
}

async function startGift(){
await window.SITE_READY;
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
document.body.classList.toggle('intro-mode',introMode);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const personal=window.GIFT_PERSONAL;
document.querySelector('#opening h1').textContent=`Gửi ${personal.name}, bằng cả trái tim`;
const photoSources=window.GIFT_CONFIG.gallery;
let current=introMode ? 'card' : 'opening',sceneTime=0,globalTime=0,paused=false,started=false,last=performance.now(),letterCount=0,pointer={x:0,y:0};
const duration={card: introMode ? Infinity : 10.5, spiral:14, burst:4, gallery:4};const next={card:'spiral',spiral:'sphere',sphere:'burst',burst:'gallery',gallery:'envelopeScene'};
const music=$('#music');music.src=window.GIFT_CONFIG.music.gift;music.volume=.6;
function setMusic(playing){if(playing){music.play().then(()=>{$('#mute').textContent='♫';$('#mute').setAttribute('aria-label','Tắt nhạc');}).catch(()=>{$('#mute').textContent='♪';$('#mute').setAttribute('aria-label','Bật nhạc');});}else{music.pause();$('#mute').textContent='♪';$('#mute').setAttribute('aria-label','Bật nhạc');}}
function show(id){if(introMode&&id!=='card'){parent.postMessage({type:'calendar-complete'},location.origin);return;}current=id;sceneTime=0;window.GiftVisuals.reset(id);window.UniverseView.setActive(id==='spiral');window.photoGlobe?.setActive(id==='sphere');$$('.scene').forEach(e=>{e.classList.toggle('active',e.id===id);e.setAttribute('aria-hidden',String(e.id!==id));e.inert=e.id!==id;});if(id==='letter'){letterCount=0;$('#typedLetter').textContent='';}if(id==='opening'){started=false;music.currentTime=0;}const order=['opening','flowers','card','spiral','sphere','burst','gallery','envelopeScene','letter'];$('#progress i').style.width=`${order.indexOf(id)/(order.length-1)*100}%`;if(id==='card'||introMode){setTimeout(()=>{document.body.classList.add('puzzle-assembled');const cd=document.getElementById('card');if(cd)cd.classList.add('puzzle-assembled');if(parent&&parent!==window){parent.postMessage({type:'calendar-puzzle-ready'},location.origin);}},5200);}}
$$('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));$('#envelope').onclick=()=>show('letter');$('#replay').onclick=()=>{setMusic(false);show('opening');};$('#mute').onclick=()=>setMusic(music.paused);$('#pause').onclick=()=>{paused=!paused;document.body.classList.toggle('paused',paused);$('#pause').textContent=paused?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',paused?'Tiếp tục':'Tạm dừng');if(paused){music.pause();}else if(started)setMusic(true);};$('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
function makeCard(){window.GiftVisuals.makeCard(photoSources);}
const weekdays=['CN','T2','T3','T4','T5','T6','T7'];const cal=$('#calendar');weekdays.forEach(d=>{let s=document.createElement('span');s.textContent=d;s.className='weekday';cal.append(s);});for(let i=0;i<4;i++)cal.append(document.createElement('span'));for(let d=1;d<=31;d++){let s=document.createElement('span');s.textContent=d;if(d===20){s.className='special';s.setAttribute('aria-label','20 tháng 10');s.innerHTML='<svg class="date-heart" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 90C38 78 5 56 5 30C5 4 38 0 50 22C62 0 95 4 95 30C95 56 62 78 50 90Z"/></svg><b>20</b>';}cal.append(s);}
for(let i=0;i<18;i++){const stem=document.createElement('span');stem.className='stem-flower';stem.style.cssText=`--h:${24+(i*17)%45}%;--a:${(i*7)%22-11}deg;--c:${['#f7e6a1','#fff3ed','#c6a9e2','#96b2e0'][i%4]}`;stem.innerHTML=`<i>${['✿','❀','✾'][i%3]}</i>`;$('#card .flower-border').append(stem);}
let spiral=[],sphere=[],burst=[],endPhotos=[],images=[];
let wishes=personal.wishes;
function buildPhotos(){for(const id of ['spiralItems','sphereItems','burstItems','galleryItems','lastPhotos'])$('#'+id).replaceChildren();spiral=[];sphere=[];burst=[];endPhotos=[];images=photoSources.map(src=>{const im=new Image();im.src=src;return im;});for(let i=0;i<100;i++){
  let e; const photo=i%5===0, floatingHeart=i%7===0&&!photo;
  if(photo){e=document.createElement('img');e.src=photoSources[(i/5)%photoSources.length];e.alt='Ảnh kỷ niệm';e.className='flying-photo';}
  else {e=document.createElement('span');e.className=floatingHeart?'universe-heart':'flying-word';e.textContent=floatingHeart?'♥':wishes[i%wishes.length];}
  $('#spiralItems').append(e);
  const y=1-2*(i+.5)/100,r=Math.sqrt(1-y*y),angle=i*2.399963;
  spiral.push({e,photo,heart:floatingHeart,x:Math.cos(angle)*r,y,z:Math.sin(angle)*r,phase:i*2.4});
}
const n=210;for(let i=0;i<n;i++){const e=document.createElement('img');e.src=photoSources[i%photoSources.length];e.alt='';e.className='sphere-photo';$('#sphereItems').append(e);const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=i*2.399963;sphere.push({e,x:Math.cos(a)*r,y,z:Math.sin(a)*r});}
for(let i=0;i<72;i++){const e=document.createElement('img');e.src=photoSources[i%photoSources.length];e.alt='';e.className='flying-photo';$('#burstItems').append(e);burst.push({e,x:(Math.random()-.5)*2,y:(Math.random()-.5)*2,z:Math.random(),a:(Math.random()-.5)*90});}
for(let i=0;i<30;i++){const e=document.createElement('img');e.src=photoSources[i%photoSources.length];e.alt='Ảnh kỷ niệm '+(i%photoSources.length+1);$('#galleryItems').append(e);}
for(let i=0;i<6;i++){const e=document.createElement('img');e.src=photoSources[i%photoSources.length];e.alt='Ảnh kỷ niệm';e.className='last-photo';$('#lastPhotos').append(e);endPhotos.push(e);}makeCard();window.GiftVisuals.buildBouquet(window.GIFT_CONFIG.bouquetPhotos);window.photoGlobe?.setPhotos(photoSources);}
function applyPersonal(){$$('.recipient').forEach(e=>e.textContent=personal.name||'Em');$('.sender').textContent=personal.sender;$('.paper-inside').textContent='Gửi '+personal.name+' !';$('#cardTitle').textContent=personal.title;$('#holdHint').textContent=personal.button;$('.letter-paper .signature').textContent=personal.signature;wishes=personal.wishes;}applyPersonal();buildPhotos();
const c=$('#space'),ctx=c.getContext('2d');let w=innerWidth,h=innerHeight,dpr=1;
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}resize();addEventListener('resize',resize);addEventListener('pointermove',e=>{pointer.x=(e.clientX/w-.5);pointer.y=(e.clientY/h-.5);});
const stars=Array.from({length:300},()=>({x:Math.random(),y:Math.random(),z:Math.random(),p:Math.random()*Math.PI*2}));
const dust=Array.from({length:1500},()=>({a:Math.random()*Math.PI*2,r:Math.sqrt(Math.random()),y:Math.random(),p:Math.random()*6}));
function canvasDraw(t){if(introMode&&current==='card')return;ctx.fillStyle='#080311';ctx.fillRect(0,0,w,h);const g=ctx.createRadialGradient(w*.5,h*.7,0,w*.5,h*.7,Math.max(w,h)*.65);g.addColorStop(0,'#29103c');g.addColorStop(.4,'#170921');g.addColorStop(1,'#07030d');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(const s of stars){const x=(s.x*w+pointer.x*s.z*10+w)%w,y=(s.y*h-t*(2+s.z*5)+h*100)%h;ctx.globalAlpha=.15+s.z*.5+Math.sin(t*.7+s.p)*.12;ctx.fillStyle=s.z>.8?'#fff4e4':'#b9a1c9';ctx.beginPath();ctx.arc(x,y,s.z*1.25+.2,0,7);ctx.fill();}ctx.globalAlpha=1;
if(['opening','spiral','sphere','envelopeScene'].includes(current)){const cx=w/2,cy=h*.69,rx=Math.min(w*.34,400);for(const p of dust){let angle=p.a+t*.08,r=p.r;ctx.globalAlpha=(1-r)*.3;ctx.fillStyle='#eac1ed';ctx.fillRect(cx+Math.cos(angle)*r*rx,cy+Math.sin(angle)*r*rx*.23,1,1);}ctx.globalAlpha=1;const spot=ctx.createRadialGradient(cx,cy,0,cx,cy,45);spot.addColorStop(0,'#ffd8ffcc');spot.addColorStop(.08,'#fac9fa77');spot.addColorStop(.3,'#ce74ed22');spot.addColorStop(1,'#bd66ed00');ctx.fillStyle=spot;ctx.fillRect(cx-45,cy-45,90,90);}
if(current==='opening'){for(let i=0;i<110;i++){let p=dust[i],y=h*.65-p.y*h*.5,x=w/2+Math.sin(p.a+t*.2)*Math.min(w*.2,180)*(.4+p.y*.6);ctx.globalAlpha=.2;ctx.fillStyle='#edb7ff';ctx.fillRect(x,y,.8,.8);}ctx.globalAlpha=1;}}
function updateSpiral(t){
  window.UniverseView.update();
  const enter=Math.min(1,sceneTime/1.2);
  for(const p of spiral){
    const view=window.UniverseView.project(p,t);
    const x=view.x*w*.58,y=view.y*h*.6+Math.sin(t*.3+p.phase)*8;
    p.e.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${view.scale}) rotate(${Math.sin(p.phase+t*.12)*4}deg)`;
    p.e.style.opacity=(.4+(view.z+1)*.3)*enter;
    p.e.style.zIndex=Math.round((view.z+1)*100);
    if(p.photo){p.e.style.width=`${w<600?82:120}px`;p.e.style.height=`${w<600?107:155}px`;}
  }
}
function updateSphere(t){const radius=Math.min(w*.37,h*.36,285),a=t*.26+pointer.x*.4,ca=Math.cos(a),sa=Math.sin(a),tilt=.18;const enter=Math.min(1,sceneTime/1.8),out=1;for(const p of sphere){const x=p.x*ca+p.z*sa,z=p.z*ca-p.x*sa,y=p.y*Math.cos(tilt)-z*Math.sin(tilt),zz=z*Math.cos(tilt)+p.y*Math.sin(tilt);const persp=650/(650-zz*radius),tile=radius*.18*persp;p.e.style.width=`${tile}px`;p.e.style.height=`${tile*1.05}px`;p.e.style.transform=`translate(-50%,-50%) translate(${x*radius*persp*enter}px,${y*radius*persp*enter}px) rotate(${x*-8}deg)`;p.e.style.opacity=(zz<-.1?.18:.95)*enter*out;p.e.style.zIndex=Math.round((zz+1)*100);p.e.style.filter=`brightness(${.55+(zz+1)*.3})`;}}
function updateBurst(){const d=sceneTime/4;for(const p of burst){const z=(p.z+d*.7)%1,scale=.2+z*z*2.3;p.e.style.width=`${w<600?75:115}px`;p.e.style.height=`${w<600?90:135}px`;p.e.style.transform=`translate(-50%,-50%) translate(${p.x*w*.8*scale}px,${p.y*h*.7*scale}px) rotate(${p.a*d}deg) scale(${scale})`;p.e.style.opacity=Math.min(1,z*3);p.e.style.zIndex=Math.round(z*100);}}
function updateLast(t){endPhotos.forEach((e,i)=>{const a=i/6*Math.PI*2+t*.15,z=Math.cos(a),rx=Math.min(w*.32,210);e.style.transform=`translate(-50%,-50%) translate(${Math.sin(a)*rx}px,${Math.sin(a*2)*65}px) scale(${.6+(z+1)*.2}) rotate(${Math.sin(a)*8}deg)`;e.style.opacity=.45+(z+1)*.25;e.style.zIndex=Math.round((z+1)*5);});}
function frame(now){const dt=document.hidden?0:Math.min((now-last)/1000,.25);last=now;if(!paused){sceneTime+=dt;globalTime+=dt;if(duration[current]&&sceneTime>duration[current]&&(current!=='spiral'||window.UniverseView.canAdvance()))show(next[current]);}const t=reduced?0:globalTime;canvasDraw(t);if(current==='spiral')updateSpiral(t);if(current==='sphere'){if(window.photoGlobe?.ready)window.photoGlobe.render(t,sceneTime,pointer);else updateSphere(t);}if(current==='flowers')window.GiftVisuals.update(sceneTime,()=>show('spiral'));if(current==='burst')updateBurst();if(current==='envelopeScene'||current==='letter')updateLast(t);if(current==='letter'&&!paused){let n=Math.min(personal.letter.length,Math.floor(Math.max(0,sceneTime-.8)*27));if(n!==letterCount){letterCount=n;$('#typedLetter').textContent=personal.letter.slice(0,n);}}requestAnimationFrame(frame);}show(introMode?'card':'opening');requestAnimationFrame(frame);


// Giữ liên tục 1,2 giây; thả tay, đổi tab hoặc mất focus sẽ hủy.
const heartButton = $('#begin');
let holdFrame = null, holdStarted = null, holdKeyboard = false;
function cancelHold() {
  cancelAnimationFrame(holdFrame);
  holdStarted = null;
  heartButton.classList.remove('holding');
  ['--hold-x','--hold-y','--hold-turn','--hold-scale','--hold-light'].forEach(name => heartButton.style.removeProperty(name));
}
function beginHold() {
  if (holdStarted !== null || current !== 'opening' || paused) return;
  holdStarted = performance.now();
  heartButton.classList.add('holding');
  function tick(now) {
    if (holdStarted === null) return;
    const ratio = Math.max(0, Math.min(1, (now - holdStarted) / 1200));
    // The flowers tremble faster and wider as the hold builds up.
    const strength = ratio * ratio;
    const phase = ratio * (30 + 25 * ratio);
    const amplitude = .3 + 7 * strength;
    heartButton.style.setProperty('--hold-x', `${(Math.sin(phase) * amplitude).toFixed(2)}px`);
    heartButton.style.setProperty('--hold-y', `${(Math.sin(phase * 1.37) * amplitude * .45).toFixed(2)}px`);
    heartButton.style.setProperty('--hold-turn', `${(Math.sin(phase * .85) * ( .15 + 2 * strength)).toFixed(2)}deg`);
    heartButton.style.setProperty('--hold-scale', (1 + .035 * ratio).toFixed(3));
    heartButton.style.setProperty('--hold-light', (1 + .16 * ratio).toFixed(3));
    if (ratio === 1) { cancelHold(); started = true; setMusic(true); show('flowers'); if(holdKeyboard) $('#flowerHeart').focus(); }
    else holdFrame = requestAnimationFrame(tick);
  }
  holdFrame = requestAnimationFrame(tick);
}
heartButton.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button !== 0) return;
  e.preventDefault(); holdKeyboard=false; heartButton.setPointerCapture(e.pointerId); beginHold();
});
['pointerup','pointercancel','lostpointercapture','blur'].forEach(type => heartButton.addEventListener(type, cancelHold));
heartButton.addEventListener('contextmenu', e => e.preventDefault());
heartButton.addEventListener('keydown', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) { holdKeyboard=true; beginHold(); } } });
heartButton.addEventListener('keyup', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); cancelHold(); } });
addEventListener('blur', cancelHold);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelHold(); });
$('#pause').addEventListener('click', cancelHold);
// A touch released after holding the heart must not also click the new flower.
let flowerPressStarted = false;
$('#flowerHeart').addEventListener('pointerdown', () => { flowerPressStarted = current === 'flowers'; });
$('#flowerHeart').addEventListener('pointercancel', () => { flowerPressStarted = false; });
$('#flowerHeart').addEventListener('click', event => {
  if (current !== 'flowers' || (event.detail > 0 && !flowerPressStarted)) return;
  flowerPressStarted = false;
  window.GiftVisuals.reveal(sceneTime);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !introMode) parent.postMessage({type:'close-gift'}, location.origin); });

window.addEventListener('photo-globe-ready',()=>{window.photoGlobe.setPhotos(photoSources);window.photoGlobe.setActive(current==='sphere');});

}
startGift().catch(error=>{console.error(error);document.querySelector('#holdHint').textContent='Chưa tải được nội dung. Vui lòng tải lại trang.';});
