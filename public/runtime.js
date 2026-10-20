async function startSite(){
await window.SITE_READY;
const defaults=window.GIFT_CONFIG;
let config={...defaults};
let enteredPin = "";
let songIndex = 0;
let isPlaying = false;
let wasPlayingBeforeGift = false;

const lockScreen = document.getElementById("lock-screen");
const mainContent = document.getElementById("main-content");
const passDots = document.getElementById("pass-dots");
const numpad = document.getElementById("numpad");
const letterOverlay = document.getElementById("letter-overlay");
const musicOverlay = document.getElementById("music-overlay");
const audioPlayer = document.getElementById("audio-player");
const playPauseBtn = document.getElementById("play-pause-btn");
const progressBar = document.getElementById("progress-bar");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const songTitle = document.getElementById("song-title");
const songArtist = document.getElementById("song-artist");
const albumArt = document.querySelector("#album-art img");
const songListContainer = document.getElementById("song-list");
const imageOverlay = document.getElementById("image-overlay");
const galleryTop = document.getElementById("gallery-top");
const galleryBottom = document.getElementById("gallery-bottom");
const lightboxOverlay = document.getElementById("lightbox-overlay");
const lightboxImg = document.getElementById("lightbox-img");
const giftOverlay = document.getElementById("gift-overlay");
const giftIframe = document.querySelector(".gift-iframe");
const giftModalElement = document.getElementById("gift-modal-element");
const fullscreenGiftBtn = document.getElementById("fullscreen-gift");
const popSound = document.getElementById("pop-sound");
const imageSound = document.getElementById("image-sound");
const musicButton = document.getElementById("btn-music");
const originalMusicButtonHtml = musicButton ? musicButton.innerHTML : "";

let audioContext = null;
let audioAnalyser = null;
let audioVisualizerFrame = null;
let audioVisualizerConnected = false;
let wasPlayingBeforeImage = false;

function normalizeConfig() {
  if (!Array.isArray(config.gallery)) config.gallery = defaults.gallery;
  if (!Array.isArray(config.songs)) config.songs = defaults.songs;
  config.lockImage = normalizeAssetUrl(config.lockImage || defaults.lockImage);
  config.gallery = config.gallery.map(normalizeAssetUrl).filter(Boolean);
  config.songs = config.songs.map((song) => ({
    ...song,
    artist: song.artist || "Dành tặng em",
    cover: normalizeAssetUrl(song.cover),
    src: normalizeAssetUrl(song.src)
  })).filter((song) => song.src);
  document.title = config.title || defaults.title;
  
  const flyingTexts = document.querySelectorAll(".flying-text");
  flyingTexts.forEach((el) => {
    el.textContent = (config.flyingText || defaults.flyingText).toUpperCase();
  });

  const lockPhoto = document.getElementById("lock-photo");
  lockPhoto.classList.remove("is-loaded");
  lockPhoto.removeAttribute("src");
  if (config.lockImage) {
    lockPhoto.onload = () => lockPhoto.classList.add("is-loaded");
    lockPhoto.src = config.lockImage;
  }
  

  document.getElementById("hint-text").textContent = config.hint || "";
}

function normalizeAssetUrl(value) { return String(value || ''); }
function loadBackgroundMedia() {
  const wrap=document.getElementById('bg-media-wrap'), item=config.background;
  if(!item?.src)return;
  const media=document.createElement(item.type==='video'?'video':'img');
  media.id='bg-media';media.src=item.src;
  if(item.type==='video'){media.muted=true;media.loop=true;media.autoplay=true;media.playsInline=true;}
  wrap.replaceChildren(media);document.body.classList.add('has-bg-media');
  if(item.type==='video')document.body.classList.add('has-bg-animated');
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildVinylHtml(song) {
  const cover = song.cover || "img/asset/music.png";
  const bars = Array.from({ length: 18 }, () => "<span></span>").join("");
  return `
    <div class="vinyl-wrap">
      <div class="vinyl-disc">
        <img class="vinyl-img" src="${escapeHtml(cover)}" alt="">
        <span class="vinyl-hole"></span>
      </div>
      <div class="vinyl-wave">${bars}</div>
    </div>
    <span class="song-label">${escapeHtml(song.title)}</span>
  `;
}

function initAudioVisualizer() {
  if (audioVisualizerConnected) return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    audioAnalyser.smoothingTimeConstant = 0.78;
    const source = audioContext.createMediaElementSource(audioPlayer);
    source.connect(audioAnalyser);
    audioAnalyser.connect(audioContext.destination);
    audioVisualizerConnected = true;
  } catch {
    audioAnalyser = null;
  }
}

function startAudioVisualizer() {
  if (audioVisualizerFrame) return;
  initAudioVisualizer();
  if (!audioAnalyser) return;
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

  const data = new Uint8Array(audioAnalyser.frequencyBinCount);
  const half = 9;
  const step = Math.floor(data.length / half);

  function tick() {
    audioVisualizerFrame = requestAnimationFrame(tick);
    audioAnalyser.getByteFrequencyData(data);
    const bars = document.querySelectorAll("#btn-music .vinyl-wave span");
    if (!bars.length) return;

    const values = [];
    for (let index = 0; index < half; index += 1) {
      let sum = 0;
      for (let offset = 0; offset < step; offset += 1) sum += data[index * step + offset];
      values.push(Math.max(2, Math.round(Math.sqrt((sum / step) / 255) * 22)));
    }

    const mirrored = [...values].reverse().concat(values);
    bars.forEach((bar, index) => {
      bar.style.cssText = `height:${mirrored[index] || 2}px !important;animation:none;transition:height 0.06s;`;
    });
  }

  tick();
}

function stopAudioVisualizer() {
  if (audioVisualizerFrame) {
    cancelAnimationFrame(audioVisualizerFrame);
    audioVisualizerFrame = null;
  }
  document.querySelectorAll("#btn-music .vinyl-wave span").forEach((bar) => {
    bar.style.cssText = "";
  });
}

function openImageMusic() {
  if (!imageSound || !imageSound.getAttribute('src')) return;
  if (!audioPlayer.paused) {
    wasPlayingBeforeImage = true;
    pauseSong();
  }
  imageSound.currentTime = 0;
  imageSound.play().catch(() => {});
}

function closeImageMusic() {
  if (!imageSound || !imageSound.getAttribute('src')) return;
  imageSound.pause();
  imageSound.currentTime = 0;
  if (wasPlayingBeforeImage) {
    playSong();
    wasPlayingBeforeImage = false;
  }
}

function updateMusicButton() {
  if (!musicButton) return;
  const song = config.songs && config.songs[songIndex];
  const hasVinyl = Boolean(musicButton.querySelector(".vinyl-disc"));

  if (!song) {
    stopAudioVisualizer();
    musicButton.innerHTML = originalMusicButtonHtml;
    return;
  }

  if (isPlaying) {
    if (!hasVinyl) musicButton.innerHTML = buildVinylHtml(song);
    else {
      const img = musicButton.querySelector(".vinyl-img");
      const label = musicButton.querySelector(".song-label");
      if (img) img.src = song.cover || "img/asset/music.png";
      if (label) label.textContent = song.title;
    }
    musicButton.querySelector(".vinyl-disc")?.classList.remove("paused");
    musicButton.querySelector(".vinyl-wave")?.classList.remove("paused");
    startAudioVisualizer();
    return;
  }

  if (hasVinyl) {
    musicButton.querySelector(".vinyl-disc")?.classList.add("paused");
    musicButton.querySelector(".vinyl-wave")?.classList.add("paused");
    const label = musicButton.querySelector(".song-label");
    if (label) label.textContent = song.title;
  } else {
    musicButton.innerHTML = originalMusicButtonHtml;
  }
  stopAudioVisualizer();
}

function buildNumpad() {
  passDots.innerHTML = "";
  for (let index = 0; index < String(config.pin).length; index += 1) {
    const dot = document.createElement("div");
    dot.className = "dot";
    passDots.appendChild(dot);
  }

  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].forEach((value) => {
    const button = document.createElement("button");
    button.className = value ? "num-btn" : "num-btn blank";
    button.type = "button";
    if (value === "delete") {
      button.classList.add("delete-btn");
      button.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
      button.addEventListener("click", deleteLastDigit);
    } else if (value) {
      button.dataset.value = value;
      button.textContent = value;
      button.addEventListener("click", () => handleInput(value));
    }
    numpad.appendChild(button);
  });
}

function updateDots() {
  [...passDots.children].forEach((dot, index) => {
    dot.classList.toggle("active", index < enteredPin.length);
  });
}

function handleInput(value) {
  if (lockScreen.classList.contains("unlocked")) return;
  if (enteredPin.length >= String(config.pin).length) return;
  enteredPin += value;
  updateDots();
  if (enteredPin.length === String(config.pin).length) {
    if (enteredPin === String(config.pin)) window.CalendarScore.prepare();
    setTimeout(checkPin, 280);
  }
}

function checkPin() {
  if (enteredPin === String(config.pin)) unlock();
  else fail();
}

function unlock() {
  lockScreen.classList.add("unlocked");
  lockScreen.inert = true;
  startIntro();
  enteredPin = "";
  updateDots();
}

function fail() {
  const lockContent = document.querySelector(".lock-content");
  const passDotsContainer = document.getElementById("pass-dots");
  
  lockContent.classList.add("shake");
  if (passDotsContainer) {
    passDotsContainer.classList.add("error");
  }
  
  if (navigator.vibrate) navigator.vibrate(200);
  
  setTimeout(() => {
    lockContent.classList.remove("shake");
    if (passDotsContainer) {
      passDotsContainer.classList.remove("error");
    }
    enteredPin = "";
    updateDots();
  }, 600);
}

function deleteLastDigit() {
  enteredPin = enteredPin.slice(0, -1);
  updateDots();
}

function createHeart() {
  if (document.hidden || !lockScreen.classList.contains("unlocked") || !introOverlay.hidden || giftOverlay.classList.contains("active") || letterOverlay.classList.contains("active") || !document.getElementById("bloom-overlay").hidden) return;
  const heart = document.createElement("div");
  heart.className = "heart";
  if (Math.random() > 0.55) {
    const img = document.createElement("img");
    img.src = [
      "gift/assets/flower-heart-still.jpg",
      "gift/assets/flower-heart-still.jpg",
      "gift/assets/flower-heart-still.jpg"
    ][Math.floor(Math.random() * 3)];
    img.style.width = `${30 + Math.random() * 30}px`;
    img.style.height = "auto";
    heart.appendChild(img);
  } else {
    heart.textContent = ["❤", "💖", "💗", "💓", "💕", "🌸"][Math.floor(Math.random() * 6)];
    heart.style.fontSize = `${12 + Math.random() * 22}px`;
  }
  heart.style.left = `${Math.random() * 100}%`;
  heart.style.animationDuration = `${3 + Math.random() * 3}s`;
  heart.style.opacity = `${0.5 + Math.random() * 0.5}`;
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 6200);
}

function loadSong(song) {
  if (!song) return;
  audioPlayer.src = song.src;
  if (song.cover) albumArt.src = song.cover;
  else albumArt.removeAttribute("src");
  songTitle.textContent = song.title;
  songArtist.textContent = song.artist || "Dành tặng em";
  updateSongListUI();
  updateMusicButton();
}

function renderSongList() {
  songListContainer.innerHTML = "";
  config.songs.forEach((song, index) => {
    const item = document.createElement("div");
    item.className = "song-item";
    item.innerHTML = `
      <img src="${song.cover}" alt="">
      <div class="song-item-info">
        <span class="song-item-title"></span>
        <span class="song-item-artist"></span>
      </div>
    `;
    item.querySelector(".song-item-title").textContent = song.title;
    item.querySelector(".song-item-artist").textContent = song.artist || "Dành tặng em";
    item.addEventListener("click", () => {
      songIndex = index;
      loadSong(config.songs[songIndex]);
      playSong();
    });
    songListContainer.appendChild(item);
  });
}

function updateSongListUI() {
  [...songListContainer.children].forEach((item, index) => {
    item.classList.toggle("active", index === songIndex);
  });
}

function playSong() {
  if (!audioPlayer.src) return;
  isPlaying = true;
  playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  updateMusicButton();
  audioPlayer.play().catch(() => {});
}

function pauseSong() {
  isPlaying = false;
  playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  audioPlayer.pause();
  updateMusicButton();
}

function prevSong() {
  if (!config.songs.length) return;
  songIndex = (songIndex - 1 + config.songs.length) % config.songs.length;
  loadSong(config.songs[songIndex]);
  playSong();
}

function nextSong() {
  if (!config.songs.length) return;
  songIndex = (songIndex + 1) % config.songs.length;
  loadSong(config.songs[songIndex]);
  playSong();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function updateProgress() {
  const percent = audioPlayer.duration ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
  progress.style.width = `${percent}%`;
  currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
  durationEl.textContent = formatTime(audioPlayer.duration);
}

function setProgress(event) {
  const width = progressBar.clientWidth;
  const clickX = event.offsetX;
  if (audioPlayer.duration) audioPlayer.currentTime = (clickX / width) * audioPlayer.duration;
}

function populateGallery() {
  galleryTop.innerHTML = "";
  galleryBottom.innerHTML = "";
  const photos = [...new Set(config.gallery)];
  galleryTop.dataset.count = photos.length;
  photos.forEach((src) => galleryTop.appendChild(createGalleryImage(src)));
}

function createGalleryImage(src) {
  const wrapper = document.createElement("button");
  wrapper.type = "button";
  wrapper.setAttribute("aria-label", "Xem ảnh kỷ niệm");
  wrapper.className = "gallery-img-wrap";
  const img = document.createElement("img");
  img.src = src;
  img.alt = "Ảnh kỷ niệm";
  img.loading = "eager";
  wrapper.appendChild(img);
  wrapper.addEventListener("click", (event) => {
    event.preventDefault();
    openLightbox(src);
  });
  return wrapper;
}

function openLightbox(src) {
  lightboxImg.src = src;
  lightboxOverlay.classList.add("active");
}

function closeAllOverlays() {
  if (window.GalleryExperience) {
    window.GalleryExperience.close();
  } else {
    imageOverlay?.classList.remove("active");
  }
  if (lightboxOverlay) {
    lightboxOverlay.classList.remove("active");
    if (lightboxImg) lightboxImg.src = "";
  }
  letterOverlay?.classList.remove("active");
  musicOverlay?.classList.remove("active");
  window.LetterExperience?.cancel?.();
  closeImageMusic();
}

function openGift() {
  closeAllOverlays();
  if (lightboxOverlay) {
    lightboxOverlay.classList.remove("active");
    if (lightboxImg) lightboxImg.src = "";
  }
  giftOverlay.classList.add("active");
  mainContent.inert = true;
  if (!audioPlayer.paused) { wasPlayingBeforeGift = true; pauseSong(); }
  giftIframe.hidden = false;
  giftIframe.src = "gift/index.html";
  document.getElementById("close-gift").focus();
}
window.openGift = openGift;

function closeGiftCleanup() {
  giftOverlay.classList.remove("active");
  giftIframe.removeAttribute("src");
  mainContent.inert = !lockScreen.classList.contains("unlocked");
  if (document.fullscreenElement === giftModalElement) document.exitFullscreen().catch(() => {});
  if (wasPlayingBeforeGift) {
    audioPlayer.play().catch(() => {});
    wasPlayingBeforeGift = false;
  }
}

document.getElementById("btn-letter").addEventListener("click", () => {
  closeAllOverlays();
  window.LetterExperience.open({
    text: config.letter || defaults.letter,
    photo: config.letterImage || config.gallery[0],
    voice: config.music?.letter || ""
  });
});

document.getElementById("btn-music").addEventListener("click", () => {
  closeAllOverlays();
  musicOverlay.classList.add("active");
});
document.getElementById("close-music").addEventListener("click", () => musicOverlay.classList.remove("active"));
playPauseBtn.addEventListener("click", () => (isPlaying ? pauseSong() : playSong()));
document.getElementById("prev-btn").addEventListener("click", prevSong);
document.getElementById("next-btn").addEventListener("click", nextSong);
audioPlayer.addEventListener("timeupdate", updateProgress);
audioPlayer.addEventListener("play", () => {
  isPlaying = true;
  updateMusicButton();
});
audioPlayer.addEventListener("pause", () => {
  if (!audioPlayer.ended) {
    isPlaying = false;
    updateMusicButton();
  }
});
audioPlayer.addEventListener("ended", () => {
  updateMusicButton();
  nextSong();
});
progressBar.addEventListener("click", setProgress);

document.getElementById("btn-image").addEventListener("click", () => {
  closeAllOverlays();
  if (window.GalleryExperience) {
    window.GalleryExperience.open({
      photos: config.gallery,
      mode: config.galleryMode || 'slideshow',
      interval: config.galleryInterval || 4,
      title: config.flyingText || defaults.flyingText
    });
  } else {
    populateGallery();
    imageOverlay.classList.add("active");
  }
  openImageMusic();
});
document.getElementById("close-image").addEventListener("click", () => {
  if (window.GalleryExperience) {
    window.GalleryExperience.close();
  } else {
    imageOverlay.classList.remove("active");
  }
  closeImageMusic();
});
imageOverlay.addEventListener("click", (event) => {
  if (event.target === imageOverlay) {
    if (window.GalleryExperience) {
      window.GalleryExperience.close();
    } else {
      imageOverlay.classList.remove("active");
    }
    closeImageMusic();
  }
});
document.getElementById("gallery-goto-gift")?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllOverlays();
  openGift();
});
document.getElementById("close-lightbox").addEventListener("click", () => lightboxOverlay.classList.remove("active"));
lightboxOverlay.addEventListener("click", (event) => {
  if (event.target === lightboxOverlay) lightboxOverlay.classList.remove("active");
});

document.getElementById("btn-gift").addEventListener("click", openGift);
document.getElementById("close-gift").addEventListener("click", closeGiftCleanup);
giftOverlay.addEventListener("click", (event) => {
  if (event.target === giftOverlay) closeGiftCleanup();
});
fullscreenGiftBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) giftModalElement.requestFullscreen?.().catch(() => {});
  else document.exitFullscreen?.();
});

let popBuffer = null;
let popAudioContext = null;

async function preloadPopSound() {
  try {
    const soundSrc = popSound ? popSound.getAttribute("src") || "pop.mp3" : "pop.mp3";
    const response = await fetch(soundSrc);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    popAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    popBuffer = await popAudioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.warn("Failed to preload pop sound, falling back to Audio element:", error);
  }
}

function playPopSound() {
  if (popBuffer && popAudioContext) {
    if (popAudioContext.state === "suspended") {
      popAudioContext.resume().catch(() => {});
    }
    try {
      const source = popAudioContext.createBufferSource();
      source.buffer = popBuffer;
      source.connect(popAudioContext.destination);
      source.start(0);
      return;
    } catch (error) {
      console.warn("Web Audio playback failed, falling back:", error);
    }
  }
  if (popSound) {
    const clone = popSound.cloneNode();
    clone.play().catch(() => {});
  }
}

window.addEventListener("click", () => {
  playPopSound();
}, true);

document.addEventListener("keydown", (event) => {
  if (lockScreen.classList.contains("unlocked")) return;
  if (event.key >= "0" && event.key <= "9") handleInput(event.key);
  if (event.key === "Backspace") deleteLastDigit();
});

function resetLockState() {
  window.LetterExperience.cancel();
  lockScreen.classList.remove("unlocked");
  lockScreen.inert = false;
  mainContent.inert = true;
  stopIntro();
  lightboxOverlay.classList.remove("active");
  mainContent.classList.add("main-content-hidden");
  mainContent.classList.remove("main-content-visible");
  
  enteredPin = "";
  updateDots();
  
  letterOverlay.classList.remove("active");
  musicOverlay.classList.remove("active");
  imageOverlay.classList.remove("active");
  window.GalleryExperience?.close();
  closeImageMusic();
  closeGiftCleanup();
  
  pauseSong();
  introFrame.src = "gift/index.html?mode=intro";
  
  const lockContent = document.querySelector(".lock-content");
  lockContent.classList.add("shake");
  if (navigator.vibrate) navigator.vibrate(200);
  setTimeout(() => {
    lockContent.classList.remove("shake");
  }, 500);
}

document.getElementById("btn-reset-lock").addEventListener("click", resetLockState);

const introOverlay = document.getElementById("intro-overlay");
const introFrame = document.getElementById("intro-frame");
const introContinueBtn = document.getElementById("intro-continue");
function startIntro() {
  mainContent.inert = true;
  introOverlay.hidden = false;
  if (introContinueBtn) {
    introContinueBtn.classList.remove("ready");
    setTimeout(() => {
      if (!introOverlay.hidden) introContinueBtn.classList.add("ready");
    }, 5200);
  }
  if (!introFrame.src || !introFrame.src.includes('gift/index.html')) {
    introFrame.src = "gift/index.html?mode=intro";
  }
  window.CalendarScore.start();
}
function stopIntro() {
  window.CalendarScore.stop();
  introOverlay.hidden = true;
  if (introContinueBtn) introContinueBtn.classList.remove("ready");
  introFrame.removeAttribute("src");
}
function finishIntro() {
  if (introOverlay.hidden || !lockScreen.classList.contains("unlocked")) return;
  stopIntro();
  mainContent.inert = false;
  mainContent.classList.remove("main-content-hidden");
  mainContent.classList.add("main-content-visible");
  document.getElementById("btn-gift").focus();
}
if (introContinueBtn) introContinueBtn.addEventListener("click", finishIntro);
window.addEventListener("message", (event) => {
  if (event.source === introFrame.contentWindow && event.origin === location.origin) {
    if (event.data?.type === "calendar-puzzle-ready") {
      if (introContinueBtn) introContinueBtn.classList.add("ready");
    }
    if (event.data?.type === "calendar-complete") finishIntro();
  }
  if (event.source === giftIframe.contentWindow && event.origin === location.origin && event.data?.type === "close-gift") closeGiftCleanup();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && giftOverlay.classList.contains("active")) closeGiftCleanup();
});

async function init() {
  try {
    loadBackgroundMedia();
    preloadPopSound().catch(() => {});
    normalizeConfig();
    if (config.music?.gallery) {
      imageSound.src = config.music.gallery;
    } else {
      imageSound.removeAttribute("src");
    }
    document.getElementById("calendar-music").src=config.music.intro;
    introFrame.src = "gift/index.html?mode=intro";
    buildNumpad();
    renderSongList();
    loadSong(config.songs[songIndex]);
    for (let index = 0; index < 10; index += 1) setTimeout(createHeart, Math.random() * 3000);
    setInterval(createHeart, 400);
  } catch (error) {
    document.body.innerHTML = `<main style="padding:32px;font-family:Arial,sans-serif;color:#ad1457;text-align:center">
      <h1>Chưa tải được dữ liệu</h1>
      <p>${error.message}</p>
      <button onclick="location.reload()" style="padding:12px 18px;border:0;border-radius:8px;background:#d81b60;color:white;font-weight:700">Tải lại</button>
    </main>`;
  }
}

await init();

}
startSite().catch(error=>{console.error(error);document.querySelector("#hint-text").textContent="Không tải được nội dung. Vui lòng tải lại trang.";});
