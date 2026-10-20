const $=selector=>document.querySelector(selector);
let content,revision,dirty=false,busy=false;
const textFields=['title','sender','recipient','pin','hint','cardTitle','signature','letter','giftLetter','flyingText','holdHint','envelopeSub','envelopeTitle','envelopeDesc','galleryMode','galleryInterval','galleryEffect'];
function notice(message,error=false){$('#status').textContent=message;$('#status').classList.toggle('error',error);}
function changed(){dirty=true;$('#save-state').textContent='Có thay đổi chưa lưu';}
async function api(url,options={}){
  const response=await fetch(url,{...options,headers:{'X-CMS-Request':'1',...options.headers}});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Không thể thực hiện yêu cầu.');return result;
}
async function run(task){
  if(busy)return;busy=true;document.body.classList.add('loading');
  const fields=[...document.querySelectorAll('button,input,textarea,select')];fields.forEach(e=>e.disabled=true);
  try{await task();}catch(error){notice(error.message,true);}
  finally{busy=false;document.body.classList.remove('loading');fields.forEach(e=>{if(e.isConnected)e.disabled=false;});$('#save').disabled=!content;}
}
function element(tag,props={},text){const node=document.createElement(tag);Object.assign(node,props);if(text!==undefined)node.textContent=text;return node;}
function assetUrl(path){return '/'+path;}
function audio(path){return element('audio',{src:assetUrl(path),controls:true,preload:'metadata'});}
function uploadControl(label,accept,handler){const wrapper=element('label',{className:'upload'},label);const input=element('input',{type:'file',accept});input.addEventListener('change',()=>{const file=input.files[0];if(file)run(()=>handler(file));});wrapper.append(input);return wrapper;}
async function upload(file){
  notice('Đang tải '+file.name+'…');
  return (await api('/api/upload?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file})).path;
}
const imageAccept='image/jpeg,image/png,image/webp,image/gif';
function renderImageSlot(key,selector,title){
  const slot=$(selector),settings=element('div');
  settings.append(element('strong',{},title),element('p',{},'Chọn ảnh có sẵn hoặc tải ảnh riêng. Không thay đổi ảnh ở các phần khác.'));
  const select=element('select');select.setAttribute('aria-label',title);
  const choices=[...new Set([content[key],...content.photos,...content.bouquetPhotos])];
  choices.forEach(path=>{
    const index=content.photos.indexOf(path);
    select.append(element('option',{value:path},index>=0?'Ảnh kỷ niệm '+(index+1):path===content[key]?'Ảnh riêng đang chọn':'Ảnh bó hoa '+(content.bouquetPhotos.indexOf(path)+1)));
  });
  select.value=content[key];select.onchange=()=>{content[key]=select.value;changed();renderImageSlots();};
  settings.append(select,uploadControl('Tải ảnh riêng',imageAccept,async file=>{
    content[key]=await upload(file);changed();renderImageSlots();notice('Đã chọn '+title.toLowerCase()+'. Bấm Lưu để áp dụng.');
  }));
  slot.replaceChildren(element('img',{src:assetUrl(content[key]),alt:title}),settings);
}
function renderImageSlots(){
  renderImageSlot('lockImage','#lock-image-slot','Ảnh màn hình mở quà');
  renderImageSlot('letterImage','#letter-image-slot','Ảnh trong lá thư');
}
function renderCollection(key,selector){
  const photos=content[key],grid=$(selector);grid.replaceChildren();
  photos.forEach((path,index)=>{
    const card=element('div',{className:'photo-card'});card.append(element('img',{src:assetUrl(path),alt:'Ảnh '+(index+1)}));
    const actions=element('div',{className:'photo-actions'});
    const left=element('button',{type:'button',title:'Đưa lên trước'},'←');left.setAttribute('aria-label','Đưa ảnh '+(index+1)+' lên trước');left.onclick=()=>{if(index){[photos[index-1],photos[index]]=[path,photos[index-1]];changed();renderPhotos();}};
    const right=element('button',{type:'button',title:'Đưa ra sau'},'→');right.setAttribute('aria-label','Đưa ảnh '+(index+1)+' ra sau');right.onclick=()=>{if(index<photos.length-1){[photos[index+1],photos[index]]=[path,photos[index+1]];changed();renderPhotos();}};
    const remove=element('button',{type:'button',title:'Bỏ khỏi bộ ảnh này'},'×');remove.setAttribute('aria-label','Bỏ ảnh '+(index+1));remove.onclick=()=>{
      if(key==='photos' && photos.length===1)return notice('Mục Kỷ niệm cần ít nhất một ảnh.',true);
      photos.splice(index,1);
      if(key==='photos')content.music.playlist.forEach(song=>{if(song.cover===path)song.cover=photos[0];});
      changed();renderPhotos();
    };
    actions.append(left,right,remove);card.append(actions);grid.append(card);
  });
}
function renderPhotos(){
  $('#photo-count').textContent=`${content.photos.length} / 24`;
  $('#bouquet-count').textContent=`${content.bouquetPhotos.length} ảnh`;
  const missing=Math.max(0,6-content.bouquetPhotos.length),warning=$('#bouquet-warning');
  warning.textContent=missing?`Cần thêm ${missing} ảnh khác nhau cho bó hoa. Có thể lưu nháp; xuất website cần đủ 6 ảnh.`:'Đã đủ ảnh cho bó hoa. Sáu ảnh đầu tiên sẽ xuất hiện trên bó hoa.';
  warning.classList.toggle('ready',missing===0);
  renderCollection('photos','#photo-grid');renderCollection('bouquetPhotos','#bouquet-grid');renderImageSlots();
}
function renderMusic(){
  if (!content.music) content.music = {};
  if (content.music.letter === undefined) content.music.letter = '';
  const slots = $('#audio-slots');
  slots.replaceChildren();

  const slotDefs = [
    {
      key: 'intro',
      title: 'Nhạc khi ghép lịch',
      badge: 'Mở màn',
      desc: 'Giai điệu du dương phát khi người ấy hoàn thành trò chơi lật lịch 20/10.',
      canRecord: false,
      canClear: false
    },
    {
      key: 'gallery',
      title: '🎙️ Ghi âm mục Ảnh (Kỷ niệm)',
      badge: content.music.gallery === 'gift/assets/greeting-20-10.mp3' ? 'Giọng AI mẫu' : content.music.gallery ? 'Giọng thu âm riêng' : 'Đang tắt tiếng',
      desc: 'Giọng nói cất lên khi mở xem Ảnh. Thay thế file giọng AI mẫu (greeting-20-10.mp3) bằng file thu âm của bạn từ điện thoại hoặc thu âm trực tiếp.',
      canRecord: true,
      canClear: true,
      defaultFile: 'gift/assets/greeting-20-10.mp3'
    },
    {
      key: 'letter',
      title: '💌 🎙️ Ghi âm đọc Lá thư',
      badge: content.music.letter ? 'Giọng thu âm riêng' : 'Tùy chọn (Chưa có)',
      desc: 'File giọng nói thì thầm đọc lá thư khi người ấy mở phong bì. Bạn có thể tự thu âm giọng mình đọc bức thư để tạo bất ngờ ngập tràn cảm xúc.',
      canRecord: true,
      canClear: true
    },
    {
      key: 'gift',
      title: 'Nhạc trong Quà tặng',
      badge: 'Thế giới quà',
      desc: 'Nhạc nền phát khi người ấy nhấn giữ trái tim bước sang vườn hoa và quà.',
      canRecord: false,
      canClear: false
    }
  ];

  for(const slot of slotDefs){
    const card = element('div', { className: 'audio-card' });
    const top = element('div', { className: 'audio-card-top' });
    top.append(
      element('h3', {}, slot.title),
      element('span', { className: 'audio-badge' + (slot.badge.includes('riêng') ? ' custom' : slot.badge.includes('tắt') || slot.badge.includes('Chưa') ? ' empty' : '') }, slot.badge)
    );
    card.append(top);

    card.append(element('p', { className: 'audio-card-desc' }, slot.desc));

    const currentVal = content.music[slot.key];
    const fileName = currentVal ? currentVal.split('/').pop() : 'Chưa thiết lập âm thanh';
    card.append(element('span', { className: 'file-name' }, fileName));

    if (currentVal) {
      card.append(audio(currentVal));
    }

    const actions = element('div', { className: 'audio-actions' });
    actions.append(uploadControl('📁 Tải file âm thanh', 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,.m4a,.webm', async file => {
      content.music[slot.key] = await upload(file);
      changed();
      renderMusic();
      notice('Đã chọn âm thanh mới cho ' + slot.title + '. Bấm Lưu để áp dụng.');
    }));

    if (slot.canRecord) {
      const recBtn = element('button', { type: 'button', className: 'btn-sm record' }, '🎙️ Thu âm Mic');
      recBtn.onclick = () => window.openVoiceRecorder(slot.key, slot.title);
      actions.append(recBtn);
    }

    if (slot.defaultFile && currentVal !== slot.defaultFile) {
      const defBtn = element('button', { type: 'button', className: 'btn-sm' }, '🔄 Dùng lại giọng AI');
      defBtn.onclick = () => {
        content.music[slot.key] = slot.defaultFile;
        changed();
        renderMusic();
        notice('Đã khôi phục file giọng AI mẫu. Bấm Lưu để áp dụng.');
      };
      actions.append(defBtn);
    }

    if (slot.canClear && currentVal) {
      const clearBtn = element('button', { type: 'button', className: 'btn-sm danger' }, '❌ Tắt âm thanh');
      clearBtn.onclick = () => {
        content.music[slot.key] = '';
        changed();
        renderMusic();
        notice('Đã tắt âm thanh mục này. Bấm Lưu để áp dụng.');
      };
      actions.append(clearBtn);
    }

    card.append(actions);
    slots.append(card);
  }

  const list=$('#playlist');list.replaceChildren();
  content.music.playlist.forEach((song,index)=>{
    const row=element('div',{className:'song-row'});

    // 1. Cover box: thumbnail + dropdown + upload
    const coverBox=element('div',{className:'song-cover-box'});
    const thumb=element('img',{src:assetUrl(song.cover || content.photos[0]),alt:'Bìa bài '+(index+1),className:'song-thumb'});
    const select=element('select',{className:'song-cover-select'});
    select.setAttribute('aria-label','Chọn ảnh bìa bài '+(index+1));

    const choices=[...new Set([...content.photos, ...content.bouquetPhotos, song.cover].filter(Boolean))];
    choices.forEach(path=>{
      const pIdx=content.photos.indexOf(path);
      const bIdx=content.bouquetPhotos.indexOf(path);
      const label=pIdx>=0 ? `Ảnh kỷ niệm ${pIdx+1}` : bIdx>=0 ? `Ảnh bó hoa ${bIdx+1}` : 'Ảnh riêng';
      select.append(element('option',{value:path},label));
    });
    select.value=song.cover || content.photos[0];
    select.onchange=()=>{
      song.cover=select.value;
      thumb.src=assetUrl(song.cover);
      changed();
    };

    const upControl=uploadControl('Đổi ảnh',imageAccept,async file=>{
      const newPath=await upload(file);
      song.cover=newPath;
      thumb.src=assetUrl(song.cover);
      changed();
      renderMusic();
      notice('Đã đổi ảnh bìa bài "'+song.title+'". Bấm Lưu để áp dụng.');
    });
    upControl.className='upload song-cover-upload';

    coverBox.append(thumb,select,upControl);

    // 2. Fields box: Title + Artist/Dedication
    const fieldsBox=element('div',{className:'song-fields-box'});
    const title=element('input',{value:song.title,maxLength:100,required:true,placeholder:'Tên bài hát (VD: Chúc)',className:'song-title-input'});
    title.setAttribute('aria-label','Tên bài nhạc '+(index+1));
    title.oninput=()=>{song.title=title.value;changed();};

    const artist=element('input',{value:song.artist!==undefined?song.artist:'Dành tặng em',maxLength:100,placeholder:'Lời đề từ (VD: Dành tặng em)',className:'song-artist-input'});
    artist.setAttribute('aria-label','Lời đề từ bài '+(index+1));
    artist.oninput=()=>{song.artist=artist.value;changed();};
    fieldsBox.append(title,artist);

    // 3. Audio player
    const audioEl=audio(song.src);

    // 4. Remove button
    const remove=element('button',{type:'button',className:'song-remove-btn'},'Bỏ');
    remove.setAttribute('aria-label','Bỏ bài nhạc '+(index+1));
    remove.onclick=()=>{
      if(content.music.playlist.length===1)return notice('Danh sách cần ít nhất một bài nhạc.',true);
      content.music.playlist.splice(index,1);
      changed();
      renderMusic();
    };

    row.append(coverBox,fieldsBox,audioEl,remove);
    list.append(row);
  });

  const distBtn=$('#distribute-covers-btn');
  if(distBtn){
    distBtn.onclick=()=>{
      if(!content.music.playlist.length || !content.photos.length) return;
      content.music.playlist.forEach((song,idx)=>{
        song.cover=content.photos[idx % content.photos.length];
      });
      changed();
      renderMusic();
      notice('Đã tự động gán ảnh kỷ niệm riêng biệt cho từng bài hát (chống trùng ảnh). Bấm Lưu để áp dụng.');
    };
  }
}
function renderBackground(){const media=element(content.background.type==='video'?'video':'img',{src:assetUrl(content.background.src)});if(media.tagName==='VIDEO'){media.muted=true;media.controls=true;media.preload='metadata';}else media.alt='Nền website';$('#background-preview').replaceChildren(media);}
function fill(){
  textFields.forEach(key=>{
    const el=$(`[name="${key}"]`);
    if(el) el.value=content[key]!==undefined?content[key]:(key==='galleryInterval'?4:key==='galleryMode'?'rails':key==='galleryEffect'?'fade':'');
  });
  $('[name="wishes"]').value=content.wishes.join('\n');
  renderPhotos();renderMusic();renderBackground();
}
function gather(){
  textFields.forEach(key=>{
    const el=$(`[name="${key}"]`);
    if(el){
      if(key==='galleryInterval')content[key]=parseInt(el.value,10)||4;
      else content[key]=el.value.trim();
    }
  });
  content.wishes=$('[name="wishes"]').value.split('\n').map(s=>s.trim()).filter(Boolean);
}
async function save(){
  gather();const result=await api('/api/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content,revision})});
  content=result.content;revision=result.revision;renderPhotos();dirty=false;$('#save-state').textContent='Đã lưu · '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});notice('Đã lưu. Trang xem trước sẽ dùng nội dung mới khi tải lại.');
}
$('#cms-form').addEventListener('submit',event=>event.preventDefault());
textFields.concat('wishes').forEach(key=>{
  const el=$(`[name="${key}"]`);
  if(el){el.addEventListener('input',changed);el.addEventListener('change',changed);}
});
$('#save').onclick=()=>{if($('#cms-form').reportValidity())run(save);};
function bindPhotoUpload(selector,key){
  $(selector).onchange=event=>{
    const files=[...event.target.files];event.target.value='';if(!files.length)return;
    run(async()=>{
      if(content[key].length+files.length>24)throw new Error('Mỗi bộ có tối đa 24 ảnh.');
      let duplicates=0;
      try{for(const file of files){const path=await upload(file);if(content[key].includes(path)){duplicates++;continue;}content[key].push(path);changed();}}
      finally{renderPhotos();}
      notice(duplicates?`Đã bỏ qua ${duplicates} ảnh trùng. Bấm Lưu để lưu bộ ảnh.`:'Đã thêm ảnh. Có thể đổi thứ tự bằng các nút mũi tên.');
    });
  };
}
bindPhotoUpload('#photo-files','photos');bindPhotoUpload('#bouquet-files','bouquetPhotos');
$('#copy-bouquet').onclick=()=>{content.bouquetPhotos=[...content.photos];changed();renderPhotos();notice('Đã sao chép bộ ảnh kỷ niệm sang bó hoa. Từ đây hai bộ ảnh được chỉnh riêng.');};
$('#song-files').onchange=event=>{const files=[...event.target.files];event.target.value='';if(!files.length)return;run(async()=>{if(content.music.playlist.length+files.length>12)throw new Error('Danh sách tối đa 12 bài.');try{for(const file of files){const src=await upload(file);const chosenCover=content.photos[content.music.playlist.length % content.photos.length]||content.photos[0];content.music.playlist.push({title:file.name.replace(/\.[^.]+$/,'').slice(0,100),artist:'Dành tặng em',src,cover:chosenCover});changed();}}finally{renderMusic();}notice('Đã thêm bài nhạc. Bấm Lưu để áp dụng.');});};
$('#background-file').onchange=event=>{const file=event.target.files[0];event.target.value='';if(!file)return;run(async()=>{content.background={src:await upload(file),type:/\.(mp4|webm)$/i.test(file.name)?'video':'image'};changed();renderBackground();notice('Đã chọn nền mới. Bấm Lưu để áp dụng.');});};
async function downloadZipFile(url, suggestedFilename) {
  notice('Đang chuẩn bị file ZIP để tải về máy…');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Không thể tải file ZIP từ máy chủ');
  const blob = await response.blob();

  // Modern File System Access API: lets user choose save directory & filename
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedFilename,
        types: [{
          description: 'Gói ZIP website quà tặng',
          accept: { 'application/zip': ['.zip'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      notice('Đã lưu file ZIP thành công vào thư mục bạn đã chọn! Có thể giải nén hoặc deploy lên Vercel.');
      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        notice('Bạn đã hủy chọn nơi lưu. Bạn có thể nhấn nút "Tải lại file ZIP" bên dưới bất cứ lúc nào.');
        return false;
      }
      console.warn('showSaveFilePicker fallback:', err);
    }
  }

  // Fallback: standard browser download
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = suggestedFilename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    a.remove();
  }, 1500);
  notice('Đang tải file ZIP về máy tính của bạn!');
  return true;
}

$('#export').onclick=()=>{
  if(!$('#cms-form').reportValidity()) return;
  run(async()=>{
    await save();
    notice('Đang đóng gói ảnh, nhạc và cấu hình Vercel…');
    const folderName = $('#folder-name').value.trim();
    let result;
    try {
      result = await api('/api/export', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: folderName, revision })
      });
    } catch (err) {
      if (err.message && err.message.includes('đã được xuất')) {
        if (confirm(`Tên "${folderName}" đã có bản xuất trước đó. Bạn có muốn ghi đè để tải bản ZIP mới nhất không?`)) {
          result = await api('/api/export', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: folderName, revision, overwrite: true })
          });
        } else {
          return;
        }
      } else {
        throw err;
      }
    }
    $('#export-result').hidden = false;
    $('#export-folder').textContent = `Thư mục lưu cục bộ: ${result.folder}`;
    $('#download').href = result.download;
    $('#download').download = `${folderName}.zip`;
    $('#export-preview').href = result.preview;

    // Trigger downloading ZIP and prompt user to choose where to save
    await downloadZipFile(result.download, `${folderName}.zip`);
  });
};

$('#download').onclick = (e) => {
  e.preventDefault();
  const folderName = $('#folder-name').value.trim() || 'mon-qua-20-10';
  const url = $('#download').getAttribute('href');
  if (url && url !== '#') {
    run(async () => {
      await downloadZipFile(url, `${folderName}.zip`);
    });
  }
};
function setupVoiceRecorder() {
  const modal = $('#voice-recorder-modal');
  if (!modal) return;
  const closeBtn = $('#close-voice-modal');
  const startBtn = $('#rec-start-btn');
  const stopBtn = $('#rec-stop-btn');
  const retryBtn = $('#rec-retry-btn');
  const saveBtn = $('#rec-save-btn');
  const timerEl = $('#rec-timer');
  const statusEl = $('#rec-status');
  const previewWrap = $('#rec-preview-wrap');
  const audioPreview = $('#rec-audio-preview');
  const ringEl = $('#rec-ring');

  let voiceTargetKey = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordTimer = null;
  let recordSeconds = 0;
  let recordedBlob = null;

  function resetState() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch(e){}
    }
    clearInterval(recordTimer);
    recordSeconds = 0;
    recordedBlob = null;
    timerEl.textContent = '00:00';
    statusEl.textContent = 'Nhấn Bắt đầu khi bạn sẵn sàng';
    ringEl.classList.remove('recording');
    startBtn.hidden = false;
    stopBtn.hidden = true;
    retryBtn.hidden = true;
    saveBtn.hidden = true;
    previewWrap.hidden = true;
    audioPreview.src = '';
  }

  window.openVoiceRecorder = function(key, title) {
    voiceTargetKey = key;
    $('#voice-modal-title').textContent = '🎙️ Thu âm — ' + title;
    resetState();
    modal.hidden = false;
  };

  closeBtn.onclick = () => {
    resetState();
    modal.hidden = true;
  };

  startBtn.onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                   MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' :
                   MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      }

      mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const actualType = mediaRecorder.mimeType || 'audio/webm';
        recordedBlob = new Blob(audioChunks, { type: actualType });
        audioPreview.src = URL.createObjectURL(recordedBlob);
        previewWrap.hidden = false;
        retryBtn.hidden = false;
        saveBtn.hidden = false;
        stopBtn.hidden = true;
        ringEl.classList.remove('recording');
        statusEl.textContent = 'Đã thu xong (' + formatDuration(recordSeconds) + '). Bấm nghe thử hoặc Lưu để áp dụng.';
      };

      mediaRecorder.start(250);
      recordSeconds = 0;
      timerEl.textContent = '00:00';
      statusEl.textContent = 'Đang thu âm... Hãy nói tự nhiên vào micro!';
      ringEl.classList.add('recording');
      startBtn.hidden = true;
      stopBtn.hidden = false;

      recordTimer = setInterval(() => {
        recordSeconds++;
        timerEl.textContent = formatDuration(recordSeconds);
      }, 1000);

    } catch (err) {
      alert('Không thể truy cập Micro: ' + (err.message || 'Vui lòng cấp quyền micro cho trình duyệt.'));
    }
  };

  stopBtn.onclick = () => {
    clearInterval(recordTimer);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  retryBtn.onclick = () => {
    resetState();
    startBtn.click();
  };

  saveBtn.onclick = async () => {
    if (!recordedBlob || !voiceTargetKey) return;
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang tải lên...';

      const ext = recordedBlob.type.includes('mp4') ? '.m4a' :
                  recordedBlob.type.includes('ogg') ? '.ogg' :
                  recordedBlob.type.includes('wav') ? '.wav' : '.webm';
      const file = new File([recordedBlob], `voice_${voiceTargetKey}_${Date.now()}${ext}`, { type: recordedBlob.type });

      const uploadedPath = await upload(file);
      content.music[voiceTargetKey] = uploadedPath;
      changed();
      renderMusic();
      modal.hidden = true;
      notice('Đã lưu bản ghi âm mới cho ' + voiceTargetKey + '. Bấm Lưu thay đổi để áp dụng.');
    } catch (err) {
      alert('Lỗi lưu bản ghi âm: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '✅ Dùng bản ghi âm này';
    }
  };

  function formatDuration(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  }
}

window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
run(async()=>{
  const result=await api('/api/content');
  content=result.content;
  revision=result.revision;
  fill();
  setupVoiceRecorder();
  $('#save-state').textContent='Nội dung đã lưu';
  notice('');
});
