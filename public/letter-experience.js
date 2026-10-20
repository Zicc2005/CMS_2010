window.LetterExperience = (() => {
  const overlay=document.getElementById('letter-overlay');
  const scene=document.getElementById('letter-scene');
  const paper=document.getElementById('mail-paper');
  const reader=document.getElementById('mail-reader');
  const openButton=document.getElementById('open-envelope');
  const closeButton=document.getElementById('close-letter');
  const bloom=document.getElementById('bloom-overlay');
  const invitation=document.getElementById('bloom-invitation');
  const main=document.getElementById('main-content');
  const status=document.getElementById('mail-status');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');

  const letterSound = document.getElementById('letter-sound');
  const voiceWidget = document.getElementById('letter-voice-widget');
  const voiceBtn = document.getElementById('letter-voice-btn');
  const voiceIcon = document.getElementById('letter-voice-icon');
  const voiceTime = document.getElementById('letter-voice-time');
  const audioPlayer = document.getElementById('audio-player');
  let currentVoiceSrc = '';
  let wasPlayingBeforeLetter = false;
  let state='idle', timers=new Set();

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  function stopVoice() {
    if (letterSound) {
      letterSound.pause();
      letterSound.currentTime = 0;
    }
    if (voiceBtn) voiceBtn.classList.remove('playing');
    if (voiceIcon) voiceIcon.textContent = '▶';
    if (wasPlayingBeforeLetter && audioPlayer) {
      audioPlayer.play().catch(() => {});
      wasPlayingBeforeLetter = false;
    }
  }

  function playVoice() {
    if (!letterSound || !currentVoiceSrc) return;
    if (audioPlayer && !audioPlayer.paused) {
      wasPlayingBeforeLetter = true;
      audioPlayer.pause();
    }
    letterSound.play().then(() => {
      if (voiceBtn) voiceBtn.classList.add('playing');
      if (voiceIcon) voiceIcon.textContent = '❚❚';
    }).catch(() => {});
  }

  function toggleVoice() {
    if (!letterSound || !currentVoiceSrc) return;
    if (letterSound.paused) {
      playVoice();
    } else {
      letterSound.pause();
      if (voiceBtn) voiceBtn.classList.remove('playing');
      if (voiceIcon) voiceIcon.textContent = '▶';
    }
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVoice();
    });
  }

  if (letterSound) {
    letterSound.addEventListener('timeupdate', () => {
      if (voiceTime && letterSound.duration) {
        voiceTime.textContent = formatTime(letterSound.currentTime) + ' / ' + formatTime(letterSound.duration);
      }
    });
    letterSound.addEventListener('ended', () => {
      if (voiceBtn) voiceBtn.classList.remove('playing');
      if (voiceIcon) voiceIcon.textContent = '▶';
      if (wasPlayingBeforeLetter && audioPlayer) {
        audioPlayer.play().catch(() => {});
        wasPlayingBeforeLetter = false;
      }
    });
  }

  function later(callback,ms){const id=setTimeout(()=>{timers.delete(id);callback();},reduced.matches?Math.min(ms,120):ms);timers.add(id);}
  function clearTimers(){timers.forEach(clearTimeout);timers.clear();}
  function fit(){
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const isMobile = vw <= 600 || vh <= 720;

    // Stage height: ensure stage fits comfortably in viewport
    const stageMargin = isMobile ? (vh <= 650 ? 28 : 44) : 80;
    const height = Math.min(vh - stageMargin, 740);
    scene.style.setProperty('--stage-h', `${height}px`);

    const width = scene.clientWidth;
    const envelopeHeight = width * 859 / 1349;

    // Sealed bottom: centered vertically
    const sealedBottom = Math.max(15, (height - envelopeHeight) / 2);
    scene.style.setProperty('--sealed-bottom', `${sealedBottom}px`);

    // When open, envelope bottom
    const envOpenBottom = isMobile ? 8 : 12;
    scene.style.setProperty('--env-open-bottom', `${envOpenBottom}px`);

    // Base bottom of paper inside envelope
    const paperBaseBottom = isMobile ? 22 : 32;
    scene.style.setProperty('--paper-base-bottom', `${paperBaseBottom}px`);

    // Clearance from top of scene to paper top (ensuring paper is lowered and safely below close button/safe area)
    const topOffset = isMobile ? (vh <= 650 ? 46 : 56) : 80;
    scene.style.setProperty('--paper-top-margin', `${topOffset}px`);

    // Paper bottom when open: stays inside envelope
    const paperReadBottom = Math.max(envOpenBottom + 35, Math.min(envOpenBottom + envelopeHeight * 0.42, isMobile ? 70 : 115));
    const readY = Math.max(20, paperReadBottom - paperBaseBottom);
    scene.style.setProperty('--paper-read-y', `${readY}px`);

    // Paper height fits between paperReadBottom and topOffset
    const maxPaperH = (height - topOffset) - (paperBaseBottom + readY);
    const paperH = Math.max(260, Math.min(isMobile ? 470 : 530, maxPaperH));
    scene.style.setProperty('--paper-h', `${paperH}px`);
  }
  function fillLetter(text,photo){
    const body=document.getElementById('letter-body');body.replaceChildren();
    String(text||'').split(/\n\s*\n/).filter(Boolean).forEach(paragraph=>{const p=document.createElement('p');p.textContent=paragraph;body.append(p);});
    const image=document.getElementById('mail-photo');image.src=photo||'gift/assets/photo-1.jpg';
    reader.scrollTop=0;
  }
  function open({text,photo,voice}){
    clearTimers();state='sealed';main.inert=true;
    bloom.hidden=true;bloom.className='';invitation.inert=true;
    scene.dataset.state='sealed';scene.classList.remove('flap-behind','paper-out','content-revealed');
    paper.inert=true;paper.setAttribute('aria-hidden','true');
    openButton.disabled=false;openButton.hidden=false;
    fillLetter(text,photo);overlay.inert=false;overlay.classList.add('active');
    fit();document.getElementById('mail-hint').textContent='Chạm phong bì để mở thư';
    status.textContent='Phong thư đã sẵn sàng. Chạm vào phong bì để mở.';

    currentVoiceSrc = voice || '';
    if (currentVoiceSrc && letterSound) {
      letterSound.src = currentVoiceSrc;
      if (voiceWidget) voiceWidget.hidden = false;
      if (voiceTime) voiceTime.textContent = '0:00';
      if (voiceIcon) voiceIcon.textContent = '▶';
      if (voiceBtn) voiceBtn.classList.remove('playing');
    } else {
      if (voiceWidget) voiceWidget.hidden = true;
      if (letterSound) letterSound.removeAttribute('src');
    }

    openButton.focus({preventScroll:true});
  }
  function unfold(){
    if(state!=='sealed')return;
    state='opening';scene.dataset.state='opening';openButton.disabled=true;
    document.getElementById('mail-hint').textContent='';status.textContent='Đang mở thư…';
    // 1. Nắp lật mở nhanh chóng, dứt khoát
    later(()=>scene.classList.add('flap-behind'), 120);
    // 2. Giấy trượt lên và nội dung chữ & ảnh xuất hiện đồng điệu ngay cùng nhịp lướt của giấy (không hề có khoảng nghỉ trắng xóa)
    later(()=>{
      scene.classList.add('paper-out');
      scene.classList.add('content-revealed');
    }, 160);
    later(()=>{
      state='open';scene.dataset.state='open';paper.inert=false;paper.setAttribute('aria-hidden','false');
      openButton.hidden=true;status.textContent='Thư đã mở. Em có thể cuộn để đọc hết nội dung.';
      reader.focus({preventScroll:true});
      if (currentVoiceSrc) {
        playVoice();
      }
    }, 620);
  }
  function buildBlooms(){
    const layer=document.getElementById('bloom-flowers');layer.replaceChildren();
    const columns=innerWidth<600?4:7,rows=5;
    for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
      const img=new Image();img.src=`gift/assets/bouquet-intro/rose-${(row+col)%3===0?'ivory':'pink'}.webp`;img.alt='';img.className='bloom-flower';
      const x=(col/columns*100)+(row%2?6:-3),y=row/rows*100;
      const distance=Math.hypot((x-50)/100,(y-50)/100);
      const size=Math.max(innerWidth/columns,innerHeight/rows)*1.85;
      img.style.cssText=`left:${x}%;top:${y}%;width:${size}px;--bloom-delay:${(distance*.9).toFixed(2)}s;--bloom-rotation:${((row*31+col*23)%60)-30}deg;`;
      layer.append(img);
    }
  }
  function showBloom(){
    overlay.classList.remove('active');overlay.inert=true;
    state='blooming';buildBlooms();bloom.hidden=false;bloom.className='blooming';
    invitation.inert=true;status.textContent='Hoa nở dành tặng em.';
    later(()=>{
      state='invitation';bloom.classList.add('inviting');invitation.inert=false;
      document.getElementById('bloom-gift').focus({preventScroll:true});
    },2100);
  }
  function close(){
    if(!['sealed','opening','open'].includes(state))return;
    stopVoice();
    const wasSealed=state==='sealed';clearTimers();state='closing';scene.dataset.state='closing';
    paper.inert=true;paper.setAttribute('aria-hidden','true');openButton.disabled=true;
    closeButton.focus({preventScroll:true});
    scene.classList.remove('content-revealed');
    later(()=>scene.classList.remove('paper-out'),200);
    later(()=>scene.classList.remove('flap-behind'),450);
    later(showBloom,wasSealed?320:850);
  }
  function leave(target){
    stopVoice();
    if(!['blooming','invitation'].includes(state))return;
    clearTimers();state='idle';bloom.hidden=true;bloom.className='';invitation.inert=true;
    main.inert=false;
    const button=document.getElementById(target||'btn-letter');button.focus({preventScroll:true});
    if(target)button.click();
  }
  function cancel(){
    stopVoice();
    clearTimers();state='idle';overlay.classList.remove('active');overlay.inert=true;
    bloom.hidden=true;bloom.className='';invitation.inert=true;paper.inert=true;
  }
  openButton.addEventListener('click',unfold);
  closeButton.addEventListener('click',close);
  document.getElementById('bloom-gift').addEventListener('click',()=>leave('btn-gift'));
  document.getElementById('bloom-images').addEventListener('click',()=>leave('btn-image'));
  document.getElementById('bloom-menu').addEventListener('click',()=>leave());
  document.addEventListener('keydown',event=>{
    if(state==='idle')return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(['blooming','invitation'].includes(state))leave();else close();return;}
    if(event.key!=='Tab')return;
    const container=bloom.hidden?overlay:bloom;
    const elements=[...container.querySelectorAll('button,[tabindex="0"]')].filter(e=>!e.disabled&&!e.hidden&&!e.closest('[inert]')&&e.getClientRects().length);
    if(!elements.length){event.preventDefault();return;}
    const index=elements.indexOf(document.activeElement);
    if(event.shiftKey&&(index<=0)){event.preventDefault();elements.at(-1).focus();}
    else if(!event.shiftKey&&(index<0||index===elements.length-1)){event.preventDefault();elements[0].focus();}
  },true);
  addEventListener('resize',fit);
  return {open,close,cancel};
})();
