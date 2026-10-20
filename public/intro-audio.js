// Original short music-box melody for the calendar only.
window.CalendarScore = (() => {
  const audio=document.getElementById('calendar-music');
  const button=document.getElementById('intro-sound');
  let active=false, enabled=true, fadeFrame=0, session=0;
  function update(){
    button.textContent=!audio.paused&&enabled?'♫':'Bật nhạc ♫';
    button.setAttribute('aria-label',!audio.paused&&enabled?'Tắt nhạc lịch':'Bật nhạc lịch');
    button.setAttribute('aria-pressed',String(!audio.paused&&enabled));
  }
  function prepare(){
    // Called directly from the final PIN key/tap to unlock mobile audio.
    if(!enabled)return;
    audio.volume=0;audio.currentTime=0;
    audio.play().catch(()=>{});
  }
  function play(){
    const token=++session;
    cancelAnimationFrame(fadeFrame);
    audio.volume=0;
    audio.play().then(()=>{
      if(!active||!enabled||token!==session){if(!active||!enabled)audio.pause();return;}
      update();const start=performance.now();
      const fade=now=>{if(token!==session)return;const progress=Math.max(0,Math.min(1,(now-start)/650));audio.volume=.32*progress;if(progress<1)fadeFrame=requestAnimationFrame(fade);};
      fadeFrame=requestAnimationFrame(fade);
    }).catch(update);
  }
  function start(){active=true;audio.currentTime=0;if(enabled)play();else update();}
  function stop(){active=false;session++;cancelAnimationFrame(fadeFrame);audio.pause();audio.currentTime=0;update();}
  button.addEventListener('click',()=>{
    enabled=audio.paused;
    if(enabled&&active)play();else{session++;cancelAnimationFrame(fadeFrame);audio.pause();update();}
  });
  audio.addEventListener('ended',update);
  document.addEventListener('visibilitychange',()=>{
    if(!active)return;
    if(document.hidden){session++;cancelAnimationFrame(fadeFrame);audio.pause();}
    else if(enabled)play();
  });
  return {prepare,start,stop};
})();
