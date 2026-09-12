(() => {
  const prefs=window.B3DPreferences;
  if(prefs?.get('skipIntro')&&!new URLSearchParams(location.search).has('intro')){location.replace('home.html');return;}
  const video=document.querySelector('#splashVideo');
  const button=document.querySelector('#intro-pause');
  const remember=document.querySelector('#remember-intro');
  const note=document.querySelector('#intro-note');
  if(!video||!button)return;
  let manuallyPaused=false;
  const label=()=>{button.textContent=video.paused?'Play intro':'Pause intro';button.setAttribute('aria-pressed',String(!video.paused));};
  video.addEventListener('play',label);video.addEventListener('pause',label);
  button.hidden=false;
  remember.closest('label').hidden=false;
  remember.checked=Boolean(prefs?.get('skipIntro'));
  remember.addEventListener('change',()=>{const saved=prefs?.set('skipIntro',remember.checked);note.textContent=saved?'Preference saved.':'Your browser is blocking saved preferences.';});
  button.addEventListener('click',()=>{if(video.paused){manuallyPaused=false;video.play().catch(()=>{note.textContent='The intro could not play. You can still enter the site.';});}else{manuallyPaused=true;video.pause();}});
  const sync=()=>{if(document.hidden||!prefs?.motionAllowed())video.pause();else if(!manuallyPaused)video.play().catch(()=>{});label();};
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('b3d:preferences',sync);
  sync();
})();
