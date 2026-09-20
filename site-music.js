(() => {
  'use strict';
  if (location.pathname.toLowerCase().includes('/teasers/')) return;
  const key = 'b3d-site-music-v1';
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(key)) || {}; } catch (_) {}
  const audio = new Audio('sounds/site_music_1.mp3');
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.25;
  let enabled = saved.enabled === true;
  let time = Number.isFinite(saved.time) && saved.time >= 0 ? saved.time : 0;
  const control = document.getElementById('site-music-control');
  if (!control) return;
  const button = control.querySelector('button');
  const volume = control.querySelector('input');
  volume.value = Math.round(audio.volume * 100);
  function persist() {
    try { sessionStorage.setItem(key, JSON.stringify({enabled, volume:audio.volume, time:audio.currentTime || time})); } catch (_) {}
  }
  function render() {
    button.textContent = audio.paused ? '♫ Play music' : 'Ⅱ Pause music';
    button.setAttribute('aria-pressed', String(!audio.paused));
  }
  function pause() { enabled = false; audio.pause(); persist(); render(); }
  async function play() {
    enabled = true;
    try { await audio.play(); } catch (_) { /* Leave a usable play button when autoplay is blocked. */ }
    persist(); render();
  }
  audio.addEventListener('loadedmetadata', () => {
    if (time && Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = time % audio.duration;
    time = 0;
  }, {once:true});
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('error', () => { enabled=false; persist(); button.textContent='Music unavailable'; button.disabled=true; });
  button.addEventListener('click', () => audio.paused ? play() : pause());
  volume.addEventListener('input', () => { audio.volume = Number(volume.value) / 100; persist(); });
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  // Yield to trailers, station previews, and embedded games/radio.
  document.addEventListener('play', event => {
    if (event.target !== audio && !event.target.muted) pause();
  }, true);
  document.addEventListener('click', event => {
    if (event.target.closest('.wrfm-play, .wrfm-play-all, a[href="#live-station"], a[href*="/wrfm/"], a[href^="teasers/"]')) pause();
  });
  window.addEventListener('blur', () => {
    setTimeout(() => { if (document.activeElement?.tagName === 'IFRAME') pause(); }, 0);
  });
  if (enabled) play();
})();
