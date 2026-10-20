const $ = selector => document.querySelector(selector);
let content, revision, dirty = false, busy = false;
let lastExportBlob = null;
const textFields = ['title', 'sender', 'recipient', 'pin', 'hint', 'cardTitle', 'signature', 'letter', 'giftLetter', 'flyingText', 'holdHint', 'envelopeSub', 'envelopeTitle', 'envelopeDesc', 'galleryMode', 'galleryInterval', 'galleryEffect'];

const customBlobs = new Map();
const objectUrls = new Map();

// IndexedDB persistence for user-uploaded blobs
const DB_NAME = 'GiftCMSDB', STORE_NAME = 'blobs';
function getDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveBlobToIndexedDB(key, blob) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
  } catch (e) {
    console.warn('IndexedDB save failed:', e);
  }
}
async function loadAllBlobsFromIndexedDB() {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          customBlobs.set(cursor.key, cursor.value);
          objectUrls.set(cursor.key, URL.createObjectURL(cursor.value));
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('IndexedDB load failed:', e);
  }
}

function notice(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function changed() {
  dirty = true;
  $('#save-state').textContent = 'Có thay đổi chưa lưu';
}

async function run(task) {
  if (busy) return;
  busy = true;
  document.body.classList.add('loading');
  const fields = [...document.querySelectorAll('button,input,textarea,select')];
  fields.forEach(e => e.disabled = true);
  try {
    await task();
  } catch (error) {
    notice(error.message, true);
  } finally {
    busy = false;
    document.body.classList.remove('loading');
    fields.forEach(e => { if (e.isConnected) e.disabled = false; });
    $('#save').disabled = !content;
  }
}

function element(tag, props = {}, text) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (text !== undefined) node.textContent = text;
  return node;
}

function assetUrl(path) {
  if (!path) return '';
  if (objectUrls.has(path)) return objectUrls.get(path);
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;
  path = path.replace(/^\/+/, '');
  if (path.startsWith('public/')) return '/' + path;
  return '/public/' + path;
}

function audio(path) {
  return element('audio', { src: assetUrl(path), controls: true, preload: 'metadata' });
}

function uploadControl(label, accept, handler) {
  const wrapper = element('label', { className: 'upload' }, label);
  const input = element('input', { type: 'file', accept });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) run(() => handler(file));
  });
  wrapper.append(input);
  return wrapper;
}

async function upload(file) {
  notice('Đang xử lý ' + file.name + '…');
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '.bin';
  const path = 'uploads/' + hash + ext;

  customBlobs.set(path, file);
  const blobUrl = URL.createObjectURL(file);
  objectUrls.set(path, blobUrl);

  await saveBlobToIndexedDB(path, file);
  return path;
}

const imageAccept = 'image/jpeg,image/png,image/webp,image/gif';

function renderImageSlot(key, selector, title) {
  const slot = $(selector), settings = element('div');
  settings.append(element('strong', {}, title), element('p', {}, 'Chọn ảnh có sẵn hoặc tải ảnh riêng. Không thay đổi ảnh ở các phần khác.'));
  const select = element('select');
  select.setAttribute('aria-label', title);
  const choices = [...new Set([content[key], ...content.photos, ...content.bouquetPhotos].filter(Boolean))];
  choices.forEach(path => {
    const index = content.photos.indexOf(path);
    select.append(element('option', { value: path }, index >= 0 ? 'Ảnh kỷ niệm ' + (index + 1) : path === content[key] ? 'Ảnh riêng đang chọn' : 'Ảnh bó hoa ' + (content.bouquetPhotos.indexOf(path) + 1)));
  });
  select.value = content[key];
  select.onchange = () => {
    content[key] = select.value;
    changed();
    renderImageSlots();
  };
  settings.append(select, uploadControl('Tải ảnh riêng', imageAccept, async file => {
    content[key] = await upload(file);
    changed();
    renderImageSlots();
    notice('Đã chọn ' + title.toLowerCase() + '. Bấm Lưu để áp dụng.');
  }));
  slot.replaceChildren(element('img', { src: assetUrl(content[key]), alt: title }), settings);
}

function renderImageSlots() {
  renderImageSlot('lockImage', '#lock-image-slot', 'Ảnh màn hình mở quà');
  renderImageSlot('letterImage', '#letter-image-slot', 'Ảnh trong lá thư');
}

function renderCollection(key, selector) {
  const photos = content[key], grid = $(selector);
  grid.replaceChildren();
  photos.forEach((path, index) => {
    const card = element('div', { className: 'photo-card' });
    card.append(element('img', { src: assetUrl(path), alt: 'Ảnh ' + (index + 1) }));
    const actions = element('div', { className: 'photo-actions' });
    const left = element('button', { type: 'button', title: 'Đưa lên trước' }, '←');
    left.setAttribute('aria-label', 'Đưa ảnh ' + (index + 1) + ' lên trước');
    left.onclick = () => {
      if (index) {
        [photos[index - 1], photos[index]] = [path, photos[index - 1]];
        changed();
        renderPhotos();
      }
    };
    const right = element('button', { type: 'button', title: 'Đưa ra sau' }, '→');
    right.setAttribute('aria-label', 'Đưa ảnh ' + (index + 1) + ' ra sau');
    right.onclick = () => {
      if (index < photos.length - 1) {
        [photos[index + 1], photos[index]] = [path, photos[index + 1]];
        changed();
        renderPhotos();
      }
    };
    const remove = element('button', { type: 'button', title: 'Bỏ khỏi bộ ảnh này' }, '×');
    remove.setAttribute('aria-label', 'Bỏ ảnh ' + (index + 1));
    remove.onclick = () => {
      if (key === 'photos' && photos.length === 1) return notice('Mục Kỷ niệm cần ít nhất một ảnh.', true);
      photos.splice(index, 1);
      if (key === 'photos') content.music.playlist.forEach(song => { if (song.cover === path) song.cover = photos[0]; });
      changed();
      renderPhotos();
    };
    actions.append(left, right, remove);
    card.append(actions);
    grid.append(card);
  });
}

function renderPhotos() {
  $('#photo-count').textContent = `${content.photos.length} / 24`;
  $('#bouquet-count').textContent = `${content.bouquetPhotos.length} ảnh`;
  const missing = Math.max(0, 6 - content.bouquetPhotos.length), warning = $('#bouquet-warning');
  warning.textContent = missing ? `Cần thêm ${missing} ảnh khác nhau cho bó hoa. Có thể lưu nháp; xuất website cần đủ 6 ảnh.` : 'Đã đủ ảnh cho bó hoa. Sáu ảnh đầu tiên sẽ xuất hiện trên bó hoa.';
  warning.classList.toggle('ready', missing === 0);
  renderCollection('photos', '#photo-grid');
  renderCollection('bouquetPhotos', '#bouquet-grid');
  renderImageSlots();
}

function renderMusic() {
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

  for (const slot of slotDefs) {
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

  const list = $('#playlist');
  list.replaceChildren();
  content.music.playlist.forEach((song, index) => {
    const row = element('div', { className: 'song-row' });

    // 1. Cover box: thumbnail + dropdown + upload
    const coverBox = element('div', { className: 'song-cover-box' });
    const thumb = element('img', { src: assetUrl(song.cover || content.photos[0]), alt: 'Bìa bài ' + (index + 1), className: 'song-thumb' });
    const select = element('select', { className: 'song-cover-select' });
    select.setAttribute('aria-label', 'Chọn ảnh bìa bài ' + (index + 1));

    const choices = [...new Set([...content.photos, ...content.bouquetPhotos, song.cover].filter(Boolean))];
    choices.forEach(path => {
      const pIdx = content.photos.indexOf(path);
      const bIdx = content.bouquetPhotos.indexOf(path);
      const label = pIdx >= 0 ? `Ảnh kỷ niệm ${pIdx + 1}` : bIdx >= 0 ? `Ảnh bó hoa ${bIdx + 1}` : 'Ảnh riêng';
      select.append(element('option', { value: path }, label));
    });
    select.value = song.cover || content.photos[0];
    select.onchange = () => {
      song.cover = select.value;
      thumb.src = assetUrl(song.cover);
      changed();
    };

    const upControl = uploadControl('Đổi ảnh', imageAccept, async file => {
      const newPath = await upload(file);
      song.cover = newPath;
      thumb.src = assetUrl(song.cover);
      changed();
      renderMusic();
      notice('Đã đổi ảnh bìa bài "' + song.title + '". Bấm Lưu để áp dụng.');
    });
    upControl.className = 'upload song-cover-upload';

    coverBox.append(thumb, select, upControl);

    // 2. Fields box: Title + Artist/Dedication
    const fieldsBox = element('div', { className: 'song-fields-box' });
    const title = element('input', { value: song.title, maxLength: 100, required: true, placeholder: 'Tên bài hát (VD: Chúc)', className: 'song-title-input' });
    title.setAttribute('aria-label', 'Tên bài nhạc ' + (index + 1));
    title.oninput = () => {
      song.title = title.value;
      changed();
    };

    const artist = element('input', { value: song.artist !== undefined ? song.artist : 'Dành tặng em', maxLength: 100, placeholder: 'Lời đề từ (VD: Dành tặng em)', className: 'song-artist-input' });
    artist.setAttribute('aria-label', 'Lời đề từ bài ' + (index + 1));
    artist.oninput = () => {
      song.artist = artist.value;
      changed();
    };
    fieldsBox.append(title, artist);

    // 3. Audio player
    const audioEl = audio(song.src);

    // 4. Remove button
    const remove = element('button', { type: 'button', className: 'song-remove-btn' }, 'Bỏ');
    remove.setAttribute('aria-label', 'Bỏ bài nhạc ' + (index + 1));
    remove.onclick = () => {
      if (content.music.playlist.length === 1) return notice('Danh sách cần ít nhất một bài nhạc.', true);
      content.music.playlist.splice(index, 1);
      changed();
      renderMusic();
    };

    row.append(coverBox, fieldsBox, audioEl, remove);
    list.append(row);
  });

  const distBtn = $('#distribute-covers-btn');
  if (distBtn) {
    distBtn.onclick = () => {
      if (!content.music.playlist.length || !content.photos.length) return;
      content.music.playlist.forEach((song, idx) => {
        song.cover = content.photos[idx % content.photos.length];
      });
      changed();
      renderMusic();
      notice('Đã tự động gán ảnh kỷ niệm riêng biệt cho từng bài hát (chống trùng ảnh). Bấm Lưu để áp dụng.');
    };
  }
}

function renderBackground() {
  const media = element(content.background.type === 'video' ? 'video' : 'img', { src: assetUrl(content.background.src) });
  if (media.tagName === 'VIDEO') {
    media.muted = true;
    media.controls = true;
    media.preload = 'metadata';
  } else media.alt = 'Nền website';
  $('#background-preview').replaceChildren(media);
}

function fill() {
  textFields.forEach(key => {
    const el = $(`[name="${key}"]`);
    if (el) el.value = content[key] !== undefined ? content[key] : (key === 'galleryInterval' ? 4 : key === 'galleryMode' ? 'rails' : key === 'galleryEffect' ? 'fade' : '');
  });
  $('[name="wishes"]').value = (content.wishes || []).join('\n');
  renderPhotos();
  renderMusic();
  renderBackground();
}

function gather() {
  textFields.forEach(key => {
    const el = $(`[name="${key}"]`);
    if (el) {
      if (key === 'galleryInterval') content[key] = parseInt(el.value, 10) || 4;
      else content[key] = el.value.trim();
    }
  });
  content.wishes = $('[name="wishes"]').value.split('\n').map(s => s.trim()).filter(Boolean);
}

async function save() {
  gather();
  localStorage.setItem('gift_cms_content', JSON.stringify(content));
  revision = 'local-' + Date.now();
  renderPhotos();
  dirty = false;
  $('#save-state').textContent = 'Đã lưu · ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  notice('✅ Đã lưu thay đổi vào trình duyệt!');
}

$('#cms-form').addEventListener('submit', event => event.preventDefault());
textFields.concat('wishes').forEach(key => {
  const el = $(`[name="${key}"]`);
  if (el) {
    el.addEventListener('input', changed);
    el.addEventListener('change', changed);
  }
});
$('#save').onclick = () => {
  if ($('#cms-form').reportValidity()) run(save);
};

const resetBtn = $('#reset-default');
if (resetBtn) {
  resetBtn.onclick = () => {
    if (confirm('Bạn có chắc muốn khôi phục toàn bộ nội dung về mẫu gốc ban đầu không?')) {
      localStorage.removeItem('gift_cms_content');
      location.reload();
    }
  };
}

function bindPhotoUpload(selector, key) {
  $(selector).onchange = event => {
    const files = [...event.target.files];
    event.target.value = '';
    if (!files.length) return;
    run(async () => {
      if (content[key].length + files.length > 24) throw new Error('Mỗi bộ có tối đa 24 ảnh.');
      let duplicates = 0;
      try {
        for (const file of files) {
          const path = await upload(file);
          if (content[key].includes(path)) {
            duplicates++;
            continue;
          }
          content[key].push(path);
          changed();
        }
      } finally {
        renderPhotos();
      }
      notice(duplicates ? `Đã bỏ qua ${duplicates} ảnh trùng. Bấm Lưu để lưu bộ ảnh.` : 'Đã thêm ảnh. Có thể đổi thứ tự bằng các nút mũi tên.');
    });
  };
}
bindPhotoUpload('#photo-files', 'photos');
bindPhotoUpload('#bouquet-files', 'bouquetPhotos');

$('#copy-bouquet').onclick = () => {
  content.bouquetPhotos = [...content.photos];
  changed();
  renderPhotos();
  notice('Đã sao chép bộ ảnh kỷ niệm sang bó hoa. Từ đây hai bộ ảnh được chỉnh riêng.');
};

$('#song-files').onchange = event => {
  const files = [...event.target.files];
  event.target.value = '';
  if (!files.length) return;
  run(async () => {
    if (content.music.playlist.length + files.length > 12) throw new Error('Danh sách tối đa 12 bài.');
    try {
      for (const file of files) {
        const src = await upload(file);
        const chosenCover = content.photos[content.music.playlist.length % content.photos.length] || content.photos[0];
        content.music.playlist.push({
          title: file.name.replace(/\.[^.]+$/, '').slice(0, 100),
          artist: 'Dành tặng em',
          src,
          cover: chosenCover
        });
        changed();
      }
    } finally {
      renderMusic();
    }
    notice('Đã thêm bài nhạc. Bấm Lưu để áp dụng.');
  });
};

$('#background-file').onchange = event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  run(async () => {
    content.background = {
      src: await upload(file),
      type: /\.(mp4|webm)$/i.test(file.name) ? 'video' : 'image'
    };
    changed();
    renderBackground();
    notice('Đã chọn nền mới. Bấm Lưu để áp dụng.');
  });
};

function contentAssets(site) {
  const assets = new Set();
  const add = (p) => {
    if (p && typeof p === 'string' && !p.startsWith('http://') && !p.startsWith('https://') && !p.startsWith('data:') && !p.startsWith('blob:')) {
      assets.add(p.replace(/^\/+/, ''));
    }
  };
  (site.photos || []).forEach(add);
  add(site.lockImage);
  add(site.letterImage);
  (site.bouquetPhotos || []).forEach(add);
  if (site.background && site.background.src) add(site.background.src);
  if (site.music) {
    add(site.music.intro);
    add(site.music.gift);
    add(site.music.gallery);
    add(site.music.letter);
    (site.music.playlist || []).forEach(song => {
      add(song.src);
      add(song.cover);
    });
  }
  return assets;
}

// Client-Side ZIP Packaging (100% Zero-Backend, Pure Browser JSZip)
async function exportZipClientSide(folderName) {
  if (typeof JSZip === 'undefined') {
    throw new Error('Thư viện tạo file ZIP (JSZip) chưa tải xong. Hãy tải lại trang và thử lại.');
  }

  notice('Đang gom tệp giao diện và tài nguyên...');
  const zip = new JSZip();
  const rootDir = zip.folder(folderName);

  // 1. Base template files from window.TEMPLATE_FILES
  const files = window.TEMPLATE_FILES || [];
  let loaded = 0;
  for (const relPath of files) {
    try {
      notice(`Đang nạp tệp (${Math.round((loaded / Math.max(1, files.length)) * 100)}%): ${relPath}`);
      const res = await fetch('/public/' + relPath);
      if (res.ok) {
        const blob = await res.blob();
        rootDir.file(relPath, blob);
      }
    } catch (e) {
      console.warn('Lỗi tải tệp template:', relPath, e);
    }
    loaded++;
  }

  // 2. Referenced assets from content (photos, custom uploads, audio)
  const assets = contentAssets(content);
  for (const assetPath of assets) {
    if (customBlobs.has(assetPath)) {
      rootDir.file(assetPath, customBlobs.get(assetPath));
    } else {
      if (!files.includes(assetPath)) {
        try {
          const res = await fetch('/public/' + assetPath);
          if (res.ok) {
            const blob = await res.blob();
            rootDir.file(assetPath, blob);
          }
        } catch (e) {
          console.warn('Lỗi tải asset:', assetPath, e);
        }
      }
    }
  }

  // 3. Injected content/site.json
  rootDir.file('content/site.json', JSON.stringify(content, null, 2) + '\n');

  // 4. Injected deployment configuration files
  rootDir.file('DEPLOY.md', `# Triển khai website Quà tặng 20/10 lên Vercel\n\n1. Giải nén file ZIP này hoặc đẩy các tệp bên trong lên GitHub repository của bạn.\n2. Truy cập https://vercel.com, bấm "Add New... -> Project" và import repository đó.\n3. Vercel tự động nhận diện cấu hình website tĩnh (không cần build command).\n4. Bấm "Deploy" để nhận đường link chia sẻ món quà gửi đến người ấy!\n`);
  rootDir.file('.gitignore', `.vercel/\n.DS_Store\nThumbs.db\n`);
  rootDir.file('vercel.json', JSON.stringify({
    version: 2,
    framework: null,
    buildCommand: null,
    outputDirectory: '.',
    headers: [
      {
        source: '/content/site.json',
        headers: [
          { key: 'Cache-Control', 'value': 'no-store, no-cache, must-revalidate' }
        ]
      }
    ]
  }, null, 2) + '\n');

  // 5. Generate ZIP
  notice('Đang nén toàn bộ thành file ZIP…');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  }, (metadata) => {
    notice(`Đang nén file ZIP: ${metadata.percent.toFixed(0)}%`);
  });

  return zipBlob;
}

async function saveBlobToDisk(blob, suggestedFilename) {
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
      notice('✅ Đã lưu file ZIP thành công vào máy tính của bạn!');
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
  notice('✅ Đang tải file ZIP về máy tính của bạn!');
  return true;
}

$('#export').onclick = () => {
  if (!$('#cms-form').reportValidity()) return;
  run(async () => {
    await save();
    const rawName = $('#folder-name').value.trim() || 'mon-qua-20-10';
    const folderName = rawName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    notice('Đang khởi tạo trình đóng gói ZIP…');

    const zipBlob = await exportZipClientSide(folderName);
    lastExportBlob = zipBlob;

    $('#export-result').hidden = false;
    $('#export-folder').textContent = `Tên gói quà tặng: ${folderName}`;
    $('#download').href = '#';
    $('#export-preview').href = '/public/index.html';

    await saveBlobToDisk(zipBlob, `${folderName}.zip`);
  });
};

$('#download').onclick = (e) => {
  e.preventDefault();
  const rawName = $('#folder-name').value.trim() || 'mon-qua-20-10';
  const folderName = rawName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (lastExportBlob) {
    run(async () => {
      await saveBlobToDisk(lastExportBlob, `${folderName}.zip`);
    });
  } else {
    $('#export').click();
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
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        recordedBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        audioPreview.src = URL.createObjectURL(recordedBlob);
        previewWrap.hidden = false;
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250);
      ringEl.classList.add('recording');
      statusEl.textContent = 'Đang thu âm... Hãy nói tự nhiên và chân thật nhất';
      startBtn.hidden = true;
      stopBtn.hidden = false;

      recordSeconds = 0;
      recordTimer = setInterval(() => {
        recordSeconds++;
        timerEl.textContent = formatDuration(recordSeconds);
      }, 1000);

    } catch (err) {
      alert('Không thể mở micro: ' + err.message + '\nHãy cấp quyền truy cập micro trong trình duyệt.');
    }
  };

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      clearInterval(recordTimer);
      ringEl.classList.remove('recording');
      statusEl.textContent = 'Đã thu xong! Bạn có thể nghe thử bên dưới:';
      stopBtn.hidden = true;
      retryBtn.hidden = false;
      saveBtn.hidden = false;
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
      saveBtn.textContent = 'Đang lưu...';

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

async function loadContent() {
  await loadAllBlobsFromIndexedDB();

  // 1. Check local storage
  const saved = localStorage.getItem('gift_cms_content');
  if (saved) {
    try {
      content = JSON.parse(saved);
      revision = 'local-' + Date.now();
      return;
    } catch (e) {
      console.warn('Corrupt local storage, falling back to template', e);
    }
  }

  // 2. Fetch default template site.json
  const urls = ['/public/content/site.json', 'public/content/site.json', 'content/site.json'];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        content = await res.json();
        revision = 'default-' + Date.now();
        return;
      }
    } catch (e) {}
  }

  throw new Error('Không thể tải tệp nội dung mẫu site.json');
}

window.addEventListener('beforeunload', event => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

run(async () => {
  await loadContent();
  fill();
  setupVoiceRecorder();
  $('#save-state').textContent = localStorage.getItem('gift_cms_content') ? 'Nội dung đã lưu (Bộ nhớ máy)' : 'Mẫu thiết kế mặc định';
  notice('');
});
