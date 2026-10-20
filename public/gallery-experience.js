// ==========================================================================
// GALLERY EXPERIENCE — DUAL-TRACK RUNNING RAILS (RAY CHẠY 2 HÀNG VÔ TẬN)
// Hàng trên: chạy sang trái (scroll-left)
// Hàng dưới: chạy qua phải (scroll-right)
// Tạm dừng khi rê chuột / chạm tay (hover pause), Full-Res Lightbox chống vỡ ảnh.
// ==========================================================================
window.GalleryExperience = (() => {
  let photos = [];
  let currentIndex = 0;
  let isOpened = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let pauseTimer = null;

  // DOM Elements
  let overlay, modal, galleryContainer;
  let galleryTop, galleryTopClone, galleryBottom, galleryBottomClone;
  let trackTop, trackBottom;
  let titleTop, titleBottom;
  let lightboxOverlay, lightboxImg, lightboxCounter, lightboxPrev, lightboxNext, closeLightbox;

  function initElements() {
    overlay = document.getElementById('image-overlay');
    modal = overlay?.querySelector('.image-modal');
    galleryContainer = document.getElementById('gallery-container');

    galleryTop = document.getElementById('gallery-top');
    galleryTopClone = document.getElementById('gallery-top-clone');
    galleryBottom = document.getElementById('gallery-bottom');
    galleryBottomClone = document.getElementById('gallery-bottom-clone');

    trackTop = document.getElementById('gallery-track-top');
    trackBottom = document.getElementById('gallery-track-bottom');

    titleTop = document.getElementById('gallery-flying-top');
    titleBottom = document.getElementById('gallery-flying-bottom');

    lightboxOverlay = document.getElementById('lightbox-overlay');
    lightboxImg = document.getElementById('lightbox-img');
    lightboxCounter = document.getElementById('lightbox-counter');
    lightboxPrev = document.getElementById('lightbox-prev');
    lightboxNext = document.getElementById('lightbox-next');
    closeLightbox = document.getElementById('close-lightbox');
  }

  function createCard(src, photoIndex, badgeNum) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-img-wrap';
    card.setAttribute('aria-label', `Xem ảnh kỷ niệm ${photoIndex + 1} ở độ nét cao`);
    card.dataset.index = String(photoIndex);

    const img = document.createElement('img');
    img.src = src;
    img.alt = `Ảnh kỷ niệm ${photoIndex + 1}`;
    img.loading = 'eager';

    const zoomHint = document.createElement('span');
    zoomHint.className = 'gallery-zoom-hint';
    zoomHint.textContent = '🔍 Phóng to';

    const badge = document.createElement('span');
    badge.className = 'gallery-card-badge';
    badge.textContent = `${String(badgeNum).padStart(2, '0')}`;

    card.appendChild(zoomHint);
    card.appendChild(img);
    card.appendChild(badge);

    card.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(photoIndex);
    });

    return card;
  }

  function populateRails() {
    if (!galleryTop || !galleryBottom) return;

    // Clear previous contents
    galleryTop.innerHTML = '';
    if (galleryTopClone) galleryTopClone.innerHTML = '';
    galleryBottom.innerHTML = '';
    if (galleryBottomClone) galleryBottomClone.innerHTML = '';

    // 1. Top Rail: runs to the LEFT (Card 1, Card 2, ...)
    photos.forEach((src, idx) => {
      galleryTop.appendChild(createCard(src, idx, idx + 1));
      if (galleryTopClone) {
        galleryTopClone.appendChild(createCard(src, idx, idx + 1));
      }
    });

    // 2. Bottom Rail: runs to the RIGHT (reversed order for visual richness)
    const reversed = [...photos].reverse();
    reversed.forEach((src) => {
      const origIdx = photos.indexOf(src);
      galleryBottom.appendChild(createCard(src, origIdx, origIdx + 1));
      if (galleryBottomClone) {
        galleryBottomClone.appendChild(createCard(src, origIdx, origIdx + 1));
      }
    });
  }

  function bindEvents() {
    // Overlay backdrop dismiss
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) close();
      };
    }

    // Lightbox Controls
    if (closeLightbox) closeLightbox.onclick = () => closeLightboxModal();
    if (lightboxOverlay) {
      lightboxOverlay.onclick = (e) => {
        if (e.target === lightboxOverlay) closeLightboxModal();
      };
    }
    if (lightboxPrev) lightboxPrev.onclick = (e) => { e.stopPropagation(); lightboxNav(-1); };
    if (lightboxNext) lightboxNext.onclick = (e) => { e.stopPropagation(); lightboxNav(1); };

    // Go to Gift directly from Gallery
    const gotoGift = document.getElementById('gallery-goto-gift');
    if (gotoGift) {
      gotoGift.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
        if (typeof window.openGift === 'function') {
          window.openGift();
        } else {
          document.getElementById('btn-gift')?.click();
        }
      };
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!isOpened && !lightboxOverlay?.classList.contains('active')) return;

      if (lightboxOverlay?.classList.contains('active')) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); lightboxNav(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNav(1); }
        if (e.key === 'Escape') { e.preventDefault(); closeLightboxModal(); }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });

    // Touch events on gallery container to temporarily pause tracks while inspecting
    if (galleryContainer) {
      galleryContainer.addEventListener('touchstart', () => {
        trackTop?.classList.add('is-paused');
        trackBottom?.classList.add('is-paused');
        if (pauseTimer) clearTimeout(pauseTimer);
      }, { passive: true });

      galleryContainer.addEventListener('touchend', () => {
        if (pauseTimer) clearTimeout(pauseTimer);
        pauseTimer = setTimeout(() => {
          trackTop?.classList.remove('is-paused');
          trackBottom?.classList.remove('is-paused');
        }, 1400);
      }, { passive: true });
    }

    // Touch Swipe in Lightbox
    if (lightboxOverlay) {
      lightboxOverlay.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      lightboxOverlay.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].screenX - touchStartX;
        const dy = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) lightboxNav(1);
          else lightboxNav(-1);
        }
      }, { passive: true });
    }
  }

  function openLightbox(index) {
    if (!lightboxOverlay || !lightboxImg) return;
    currentIndex = (index + photos.length) % photos.length;
    lightboxImg.src = photos[currentIndex];
    if (lightboxCounter) {
      lightboxCounter.textContent = `${currentIndex + 1} / ${photos.length}`;
    }
    lightboxOverlay.classList.add('active');
  }

  function closeLightboxModal() {
    if (lightboxOverlay) lightboxOverlay.classList.remove('active');
  }

  function lightboxNav(delta) {
    openLightbox(currentIndex + delta);
  }

  function open(opts = {}) {
    initElements();
    bindEvents();
    isOpened = true;

    photos = [...new Set(opts.photos || [])];
    if (!photos.length) return;

    if (opts.title) {
      const upper = opts.title.toUpperCase();
      if (titleTop) titleTop.textContent = upper;
      if (titleBottom) titleBottom.textContent = upper;
    }

    populateRails();

    if (overlay) overlay.classList.add('active');
  }

  function close() {
    isOpened = false;
    if (overlay) overlay.classList.remove('active');
    closeLightboxModal();
  }

  return {
    open,
    close,
    openLightbox
  };
})();
