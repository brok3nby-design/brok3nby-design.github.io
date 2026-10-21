(() => {
  const prefs=window.B3DPreferences;
  if(prefs?.get('skipIntro')&&!new URLSearchParams(location.search).has('intro')){location.replace('home.html');return;}
  const remember=document.querySelector('#remember-intro');
  const note=document.querySelector('#intro-note');
  if(!remember)return;
  remember.closest('label').hidden=false;
  remember.checked=Boolean(prefs?.get('skipIntro'));
  remember.addEventListener('change',()=>{const saved=prefs?.set('skipIntro',remember.checked);note.textContent=saved?'Preference saved.':'Your browser is blocking saved preferences.';});
})();
