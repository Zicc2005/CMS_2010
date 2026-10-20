// Local Three.js renderer for the photo globe.
import {T as THREE} from './vendor/three.js';

const host=document.querySelector('#globeView');
let renderer, active=false, scene, camera, globe, texture, photoVersion=0;
let dragX=0,dragY=0,dragging=false,lastX=0,lastY=0;
try {
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(40,1,.1,100);
  scene.add(new THREE.AmbientLight(0xffffff,2.2));
  const light=new THREE.DirectionalLight(0xffeadd,2.6);light.position.set(-3,4,6);scene.add(light);
  globe=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.86,metalness:0}));
  scene.add(globe);
} catch(error) {
  host.hidden=true; // Existing DOM sphere remains available without WebGL.
}

function resize(){
  if(!renderer)return;
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);camera.aspect=w/h;
  camera.position.z=(1/Math.tan(Math.PI/9))*Math.max(1,h/w)*1.28;
  camera.updateProjectionMatrix();
}
async function setPhotos(sources){
  if(!renderer)return;
  const version=++photoVersion;
  const images=await Promise.all(sources.map(src=>new Promise(resolve=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=src;
  })));
  if(version!==photoVersion)return;
  const loaded=images.filter(Boolean);if(!loaded.length)return;
  const atlas=document.createElement('canvas');atlas.width=2400;atlas.height=1200;
  const ctx=atlas.getContext('2d'),cols=24,rows=12,tile=100;
  ctx.fillStyle='#eee4dc';ctx.fillRect(0,0,atlas.width,atlas.height);
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const im=loaded[(row*7+col)%loaded.length],crop=Math.min(im.width,im.height);
    ctx.drawImage(im,(im.width-crop)/2,(im.height-crop)/2,crop,crop,col*tile+1,row*tile+1,tile-2,tile-2);
  }
  texture?.dispose();texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  globe.material.map=texture;globe.material.needsUpdate=true;
  document.querySelector('#sphere').classList.add('has-photo-globe');
}
function setActive(value){active=value;if(active)resize();}
function render(time,elapsed,pointer){
  if(!renderer||!active)return;
  globe.rotation.y=time*.18+dragX+pointer.x*.12;
  globe.rotation.x=.13+dragY;
  const enter=1-Math.pow(1-Math.min(1,elapsed/1.6),3);globe.scale.setScalar(.25+enter*.75);
  renderer.render(scene,camera);
}
host.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId);});
host.addEventListener('pointermove',e=>{if(!dragging)return;dragX+=(e.clientX-lastX)/host.clientWidth*Math.PI*2;dragY=Math.max(-1.35,Math.min(1.35,dragY+(e.clientY-lastY)/host.clientHeight*Math.PI));lastX=e.clientX;lastY=e.clientY;});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>host.addEventListener(type,()=>dragging=false));
addEventListener('resize',resize);
window.photoGlobe={ready:!!renderer,setPhotos,setActive,render};
dispatchEvent(new Event('photo-globe-ready'));
