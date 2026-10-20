// A full horizontal turn per viewport-width drag, with vertical orbit and easing.
window.UniverseView = (() => {
  const host=document.querySelector('#spiralItems');
  let active=false,dragging=false,lastX=0,lastY=0,yaw=0,pitch=0,targetYaw=0,targetPitch=0,hoverX=0,hoverY=0,holdUntil=0,lastFrame=0;
  const clamp=value=>Math.max(-1.35,Math.min(1.35,value));
  const touched=()=>{holdUntil=performance.now()+6500;};
  host.addEventListener('pointerdown',event=>{
    if(!active||!event.isPrimary||event.button!==0)return;
    event.preventDefault();dragging=true;lastX=event.clientX;lastY=event.clientY;
    hoverX=0;hoverY=0;host.setPointerCapture(event.pointerId);host.classList.add('dragging');touched();
  });
  host.addEventListener('pointermove',event=>{
    if(!active)return;
    if(dragging){targetYaw+=(event.clientX-lastX)/host.clientWidth*Math.PI*2;targetPitch=clamp(targetPitch+(event.clientY-lastY)/host.clientHeight*Math.PI);lastX=event.clientX;lastY=event.clientY;touched();}
    else if(event.pointerType==='mouse'){hoverX=(event.clientX/innerWidth-.5)*1.7;hoverY=(event.clientY/innerHeight-.5)*.85;touched();}
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,()=>{dragging=false;host.classList.remove('dragging');});
  host.addEventListener('pointerleave',()=>{if(!dragging){hoverX=0;hoverY=0;}});
  host.addEventListener('keydown',event=>{
    if(!active||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();hoverX=0;hoverY=0;
    if(event.key==='Home'){targetYaw=0;targetPitch=0;}
    else if(event.key==='ArrowLeft')targetYaw-=.3;
    else if(event.key==='ArrowRight')targetYaw+=.3;
    else targetPitch=clamp(targetPitch+(event.key==='ArrowDown'?.2:-.2));
    touched();
  });
  return {
    setActive(value){active=value;if(!value){dragging=false;host.classList.remove('dragging');}else{yaw=targetYaw=0;pitch=targetPitch=0;hoverX=hoverY=0;holdUntil=0;lastFrame=performance.now();}},
    canAdvance(){return !dragging&&performance.now()>holdUntil;},
    update(){const now=performance.now(),ease=1-Math.exp(-Math.min((now-lastFrame)/1000,.1)*12);lastFrame=now;yaw+=(targetYaw+hoverX-yaw)*ease;pitch+=(clamp(targetPitch+hoverY)-pitch)*ease;},
    project(point,time){
      const a=yaw+time*.055,cy=Math.cos(a),sy=Math.sin(a),cx=Math.cos(pitch),sx=Math.sin(pitch);
      const x=point.x*cy+point.z*sy,z=point.z*cy-point.x*sy;
      const y=point.y*cx-z*sx,depth=z*cx+point.y*sx;
      const perspective=2.8/(3.1-depth);
      return {x:x*perspective,y:y*perspective,z:depth,scale:perspective};
    }
  };
})();
