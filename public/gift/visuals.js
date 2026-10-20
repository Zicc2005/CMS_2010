// Bouquet artwork, layers and portrait positions come from iungocquynh_2/eomeo.
window.GiftVisuals = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  // The silhouette comes from occupied grid cells, never from a heart mask.
  const heartRows = ['..###.###..','.#########.','###########','###########','.#########.','..#######..','...#####...','....###....','.....#.....'];
  function random(seed) { const value=Math.sin(seed*127.1+311.7)*43758.5453; return value-Math.floor(value); }
  function seam(row,col) { return random(row*37+col*19)>.5?1:-1; }
  function piecePath(row,col) {
    let path='M0 0';
    // Neighbours share the same seam with opposite outward normals.
    const edges=[[0,0,100,0,0,-1,-seam(row,col)],[100,0,100,100,1,0,seam(row,col+1)],
      [100,100,0,100,0,1,seam(row+1,col)],[0,100,0,0,-1,0,-seam(row,col)]];
    // Horizontal and vertical seams use separate keys, matching each neighbour.
    edges[0][6]=-seam(row*2,col);
    edges[2][6]=seam((row+1)*2,col);
    edges[1][6]=seam(row*2+1,col+1);
    edges[3][6]=-seam(row*2+1,col);
    for(const [x,y,ex,ey,nx,ny,sign] of edges){
      const point=(along,out)=>`${(x+(ex-x)*along+nx*out*sign).toFixed(2)} ${(y+(ey-y)*along+ny*out*sign).toFixed(2)}`;
      path+=`L${point(.36,0)}C${point(.43,0)} ${point(.42,4)} ${point(.39,8)}C${point(.27,24)} ${point(.73,24)} ${point(.61,8)}C${point(.58,4)} ${point(.57,0)} ${point(.64,0)}L${ex} ${ey}`;
    }
    return path+'Z';
  }
  function svg(tag, attrs = {}) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  function makeCard(photos) {
    const target = document.querySelector('#puzzleHeart');
    const canvas = svg('svg', { viewBox: '0 0 100 100', class: 'puzzle-svg', role: 'img', 'aria-label': 'Những mảnh ảnh ghép thành trái tim' });
    const defs = svg('defs'); canvas.append(defs);
    const tiles = svg('g', {class:'puzzle-assembly'}); canvas.append(tiles);
    const size=8.15;
    for (let row=0;row<heartRows.length;row++) for (let col=0;col<heartRows[row].length;col++) {
      if(heartRows[row][col]!== '#')continue;
      const index=row*11+col, id=`piece-${index}`,path=piecePath(row,col);
      const clip=svg('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
      clip.append(svg('path',{d:path,transform:`scale(${size/100})`}));defs.append(clip);
      const cell=svg('g',{transform:`translate(${5.2+col*size} ${12+row*size})`});
      const angle=random(index+1)*Math.PI*2,radius=48+random(index+7)*55;
      const delay=.12+random(index+12)*2.8+row*.07;
      const dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius;
      const piece=svg('g',{class:'puzzle-tile',style:`--delay:${delay.toFixed(3)}s;--flight:${(1.6+random(index+5)*.55).toFixed(3)}s;--dx:${dx.toFixed(2)}px;--dy:${dy.toFixed(2)}px;--mx:${(dx*.24-dy*.17).toFixed(2)}px;--my:${(dy*.24+dx*.17).toFixed(2)}px;--turn:${((random(index+9)-.5)*440).toFixed(2)}deg;--tilt:${((random(index+3)-.5)*28).toFixed(2)}deg`});
      // Bigger photos continue across several interlocking pieces, like a puzzle.
      const photoCol=Math.floor(col/4),photoRow=Math.floor(row/5);
      piece.append(svg('image',{href:photos[(photoRow*3+photoCol)%photos.length],x:-(col%4)*size-2,y:-(row%5)*size-2,width:size*4+4,height:size*5+4,preserveAspectRatio:'xMidYMid slice','clip-path':`url(#${id})`}));
      piece.append(svg('path',{class:'puzzle-seam',d:path,transform:`scale(${size/100})`,fill:'none',stroke:'#fff3df','stroke-width':2.2,'stroke-linejoin':'round'}));
      cell.append(piece);tiles.append(cell);
    }
    target.replaceChildren(canvas);
  }
  const stage = document.querySelector('#bouquetStage');
  const flowerScene = document.querySelector('#flowers');
  let revealingAt = null;
  function place(node, layout) {
    node.style.cssText=`left:${layout.x/10}%;top:${layout.y/12.8}%;width:${layout.width/10}%;height:${layout.height/12.8}%;--rotation:${layout.rotate||0}deg;--flip:${layout.flip?-1:1};z-index:${layout.z};`;
  }
  function buildBouquet(photos) {
    stage.replaceChildren();
    const {parts,blooms,portraits}=window.BOUQUET_LAYOUT;
    photos=[...new Set(photos)].slice(0,6);
    // Old drafts may have fewer than six photos: reflow, never repeat a face.
    const count=photos.length;
    const rows=count<=3?[count]:[Math.ceil(count/2),Math.floor(count/2)];
    const layout=count===6?portraits:rows.flatMap((size,row)=>Array.from({length:size},(_,i)=>({
      x:500+(i-(size-1)/2)*250-135,y:rows.length===1?220:135+row*240,
      width:270,height:410,rotate:(i-(size-1)/2)*7,z:14+row*10+i
    })));
    for (const [index,part] of [...parts,...blooms.map(p=>({...p,kind:'bloom'})),{asset:'bow',x:265,y:810,width:470,height:294,z:50,kind:'bow'}].entries()) {
      const img = new Image();img.src=`assets/bouquet-intro/${part.asset}.webp`;img.alt='';img.draggable=false;
      img.className=`bouquet-part bouquet-${part.kind}`;place(img,part);
      img.style.setProperty('--arrive',`${Math.min(index*.045,.65)}s`);
      stage.append(img);
    }
    layout.forEach((part,index)=>{
      const frame=document.createElement('span');frame.className='bouquet-part bouquet-photo';place(frame,part);
      frame.style.setProperty('--reveal-delay',`${[1.28,.24,.54,.08,.76,.96][index]}s`);
      const photo=new Image();photo.src=photos[index];photo.alt='Kỷ niệm '+(index+1);frame.append(photo);stage.append(frame);
    });
  }
  function reset(id) {
    if(id==='flowers'||id==='opening') {
      revealingAt=null;flowerScene.classList.remove('revealing');
      document.querySelector('.flower-caption').textContent='Chạm vào bó hoa để hé lộ những kỷ niệm ♥';
    }
  }
  function reveal(time) {
    if(revealingAt!==null)return;
    revealingAt=time;flowerScene.classList.add('revealing');
    document.querySelector('.flower-caption').textContent='Những điều dịu dàng đều dành cho em ♥';
  }
  function update(time,done) {
    if(revealingAt!==null && time-revealingAt>3.8){revealingAt=null;done();}
  }
  return {makeCard,buildBouquet,reset,reveal,update};
})();
