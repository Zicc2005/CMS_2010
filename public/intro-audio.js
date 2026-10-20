// Ultra-reliable mobile audio loader and controller for calendar intro
window.CalendarScore = (() => {
  const audio = document.getElementById('calendar-music');
  const button = document.getElementById('intro-sound');
  let active = false, enabled = true, fadeFrame = 0, session = 0, prepared = false;

  function update() {
    if (!button || !audio) return;
    const isPlaying = !audio.paused && enabled;
    button.textContent = isPlaying ? '♫' : 'Bật nhạc ♫';
    button.setAttribute('aria-label', isPlaying ? 'Tắt nhạc lịch' : 'Bật nhạc lịch');
    button.setAttribute('aria-pressed', String(isPlaying));
  }

  function prepare() {
    // Warm up audio buffer on first interaction so it's ready instantaneously
    if (prepared || !audio) return;
    prepared = true;
    try {
      audio.load();
    } catch (e) {}
  }

  function play() {
    if (!audio) return;
    const token = ++session;
    cancelAnimationFrame(fadeFrame);
    try { audio.volume = 0.35; } catch (e) {}

    const promise = audio.play();
    if (promise && typeof promise.then === 'function') {
      promise.then(() => {
        if (!active || !enabled || token !== session) {
          if (!active || !enabled) audio.pause();
          return;
        }
        update();
      }).catch(err => {
        console.warn('Audio play was not allowed or failed:', err);
        update();
      });
    } else {
      update();
    }
  }

  function start() {
    active = true;
    if (enabled && audio) {
      if (audio.paused) {
        try { audio.currentTime = 0; } catch (e) {}
        play();
      } else {
        update();
      }
    } else {
      update();
    }
  }

  function stop() {
    active = false;
    session++;
    cancelAnimationFrame(fadeFrame);
    if (audio) {
      audio.pause();
      try { audio.currentTime = 0; } catch (e) {}
    }
    update();
  }

  if (button) {
    button.addEventListener('click', () => {
      if (!audio) return;
      enabled = audio.paused;
      if (enabled && active) {
        play();
      } else {
        session++;
        cancelAnimationFrame(fadeFrame);
        audio.pause();
        update();
      }
    });
  }

  if (audio) {
    audio.addEventListener('ended', update);
    audio.addEventListener('pause', update);
    audio.addEventListener('play', update);
  }

  document.addEventListener('visibilitychange', () => {
    if (!active || !audio) return;
    if (document.hidden) {
      session++;
      cancelAnimationFrame(fadeFrame);
      audio.pause();
    } else if (enabled) {
      play();
    }
  });

  return { prepare, start, stop };
})();
