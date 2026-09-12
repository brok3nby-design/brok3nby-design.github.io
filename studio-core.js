(() => {
  'use strict';
  const projects = window.B3DProjects || [];
  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const PREF_KEY = 'b3d-preferences-v1';
  const SAVE_KEY = 'b3d-passport-v1';
  const defaults = {effects:true, particles:true, sound:false, skipIntro:false};
  let preferences = {...defaults};
  try {
    const stored = JSON.parse(localStorage.getItem(PREF_KEY));
    for (const key of Object.keys(defaults)) if (typeof stored?.[key] === 'boolean') preferences[key] = stored[key];
  } catch (_) {}
  const applyPreferences = () => {
    root.classList.toggle('b3d-still', motion.matches || !preferences.effects);
    root.classList.toggle('b3d-no-particles', !preferences.particles);
    window.dispatchEvent(new CustomEvent('b3d:preferences'));
  };
  window.B3DPreferences = {
    get: key => preferences[key],
    motionAllowed: () => preferences.effects && !motion.matches,
    set(key, value) {
      if (!Object.hasOwn(defaults, key) || typeof value !== 'boolean') return false;
      preferences[key] = value;
      let saved = true;
      try { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); } catch (_) { saved = false; }
      applyPreferences();
      return saved;
    }
  };
  motion.addEventListener('change', applyPreferences);
  applyPreferences();

  const secrets = [
    {id:'about',title:'Curious human',hint:'Read the story behind the studio.',path:'about.html',symbol:'◈'},
    {id:'scrolled',title:'The long way down',hint:'A page has more to it than its first screen.',symbol:'↓'},
    {id:'cartridge',title:'Blow on it first',hint:'Pick something from the project shelf.',path:'home.html#current',symbol:'▣'},
    {id:'robot',title:'Robot whisperer',hint:'Someone small is patrolling the footer.',symbol:'▤'},
    {id:'door',title:'Door? What door?',hint:'Look low and right on the homepage.',path:'home.html',symbol:'⌑'},
    {id:'konami',title:'Absolutely normal website',hint:'An old ten-key code. Two ups, two downs…',symbol:'✦'},
    {id:'random',title:'Trust the strange',hint:'Let the studio choose your next stop.',path:'home.html#current',symbol:'↗'}
  ];
  const stamps = projects.map(p => ({id:'visit-'+p.id,title:p.title,hint:'Visit the '+p.title+' project page.',path:p.id+'.html',symbol:'▣',project:true})).concat(secrets);
  const allowed = new Set(stamps.map(s => s.id));
  let save = {version:1,stamps:{}};
  let durable = true;
  function validSave(value) {
    if (!value || value.version !== 1 || !value.stamps || typeof value.stamps !== 'object' || Array.isArray(value.stamps)) throw new Error('This is not a version 1 Studio Passport backup.');
    const clean = {};
    for (const [id, date] of Object.entries(value.stamps)) {
      if (!allowed.has(id) || typeof date !== 'string' || !Number.isFinite(Date.parse(date))) throw new Error('The backup contains an unknown stamp or invalid date.');
      clean[id] = new Date(date).toISOString();
    }
    return {version:1,stamps:clean};
  }
  try { const stored = localStorage.getItem(SAVE_KEY); if (stored) save = validSave(JSON.parse(stored)); } catch (_) {}
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); durable = true; } catch (_) { durable = false; }
    renderPassport();
  }
  function unlock(id) {
    if (!allowed.has(id) || save.stamps[id]) return false;
    save.stamps[id] = new Date().toISOString();
    persist();
    return true;
  }
  window.B3DPassport = {unlock,has:id => Boolean(save.stamps[id])};
  // Carry over the old session-only discoveries once, before retiring that storage.
  try {
    for (const item of secrets) if (sessionStorage.getItem('b3d_achievement_'+item.id) === '1') {
      save.stamps[item.id] ||= new Date().toISOString();
      sessionStorage.removeItem('b3d_achievement_'+item.id);
    }
  } catch (_) {}
  const pageId = location.pathname.split('/').pop().replace(/\.html$/, '');
  if (projects.some(p => p.id === pageId)) unlock('visit-'+pageId);
  persist();
  window.addEventListener('storage', event => {
    if (event.key === SAVE_KEY) {
      try { save = event.newValue ? validSave(JSON.parse(event.newValue)) : {version:1,stamps:{}}; renderPassport(); } catch (_) {}
    }
    if (event.key === PREF_KEY) {
      try {
        const value = JSON.parse(event.newValue) || defaults;
        for (const key of Object.keys(defaults)) preferences[key] = typeof value[key] === 'boolean' ? value[key] : defaults[key];
        applyPreferences();
      } catch (_) {}
    }
  });
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function renderPassport() {
    const count = Object.keys(save.stamps).length;
    document.querySelectorAll('[data-passport-count]').forEach(n => { n.textContent = count+' / '+stamps.length; });
    const grid = document.querySelector('[data-passport-grid]');
    if (!grid) return;
    grid.replaceChildren();
    const progress = document.querySelector('#passport-progress');
    progress.max = stamps.length; progress.value = count;
    for (const stamp of stamps) {
      const earned = save.stamps[stamp.id];
      const card = el('article',undefined,'passport-stamp'+(earned?' is-earned':''));
      const icon = el('span',earned?stamp.symbol:'?', 'stamp-icon'); icon.setAttribute('aria-hidden','true');
      card.append(icon, el('p',earned?'STAMP COLLECTED':(stamp.project?'WORLD TO VISIT':'UNDISCOVERED'),'eyebrow'),el('h2',stamp.title));
      card.append(el('p',earned?'Collected '+new Date(earned).toLocaleDateString():stamp.hint));
      if (stamp.path) {const link=el('a',stamp.project?'Visit project →':'Explore →');link.href=stamp.path;card.append(link);}
      grid.append(card);
    }
    const note = document.querySelector('[data-passport-storage]');
    if (note) note.textContent = durable ? 'Saved in this browser. Back up your passport to keep it or move it to another device.' : 'Your browser is blocking saves. Discoveries last for this page only; download a backup before leaving.';
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content],{type}));
    const link=el('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function initPassport() {
    const grid = document.querySelector('[data-passport-grid]');
    if (!grid) return;
    document.querySelectorAll('[data-passport-tools]').forEach(n=>{n.hidden=false;});
    const message=document.querySelector('#passport-message');
    document.querySelector('#passport-export').addEventListener('click',()=>{
      download('brok3n-studio-passport.json',JSON.stringify(save,null,2),'application/json');
      message.textContent='Backup downloaded. It contains only stamp names and discovery dates.';
    });
    document.querySelector('#passport-import').addEventListener('change',async event=>{
      const file=event.target.files[0]; if(!file)return;
      try {
        if(file.size>65536)throw new Error('Choose a passport backup smaller than 64 KB.');
        const imported=validSave(JSON.parse(await file.text()));
        for(const [id,date] of Object.entries(imported.stamps)) if(!save.stamps[id]||date<save.stamps[id])save.stamps[id]=date;
        persist();message.textContent=durable?'Backup restored. Your existing discoveries were kept.':'Restored for this page. Browser storage is unavailable; keep your backup.';
      } catch(error){message.textContent='Could not restore: '+error.message;}
      event.target.value='';
    });
    const resetPanel=document.querySelector('#passport-reset-panel');
    document.querySelector('#passport-reset').addEventListener('click',()=>{resetPanel.hidden=false;document.querySelector('#passport-cancel-reset').focus();});
    document.querySelector('#passport-cancel-reset').addEventListener('click',()=>{resetPanel.hidden=true;document.querySelector('#passport-reset').focus();});
    document.querySelector('#passport-confirm-reset').addEventListener('click',()=>{
      save={version:1,stamps:{}};persist();resetPanel.hidden=true;message.textContent='Passport reset. Your display settings are unchanged.';document.querySelector('#passport-reset').focus();
    });
    renderPassport();
  }
  function initShelf() {
    const shelf=document.querySelector('[data-project-shelf]');if(!shelf)return;
    const cards=[...shelf.querySelectorAll('[data-category]')];
    const buttons=[...document.querySelectorAll('[data-shelf-filter]')];
    const count=document.querySelector('#shelf-count');
    document.querySelector('#shelf-controls').hidden=false;
    function filter(value) {
      const known=['all','play','development','experiments'];if(!known.includes(value))value='all';
      cards.forEach(card=>{card.hidden=value!=='all'&&card.dataset.category!==value;});
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.shelfFilter===value)));
      count.textContent=cards.filter(c=>!c.hidden).length+' projects on the shelf';
    }
    buttons.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.shelfFilter)));
    filter(new URLSearchParams(location.search).get('shelf')||'all');
  }
  function randomProject() {
    const choices=projects.filter(p=>p.id!==pageId);
    if(!choices.length)return;
    unlock('random');
    location.assign(choices[Math.floor(Math.random()*choices.length)].id+'.html');
  }
  function initSettings() {
    document.querySelectorAll('[data-preference]').forEach(input=>{
      input.checked=preferences[input.dataset.preference];
      input.addEventListener('change',()=>{
        const saved=window.B3DPreferences.set(input.dataset.preference,input.checked);
        document.querySelector('#settings-message').textContent=saved?'Settings saved.':'Applied for this page. Your browser is blocking storage.';
      });
      window.addEventListener('b3d:preferences',()=>{input.checked=preferences[input.dataset.preference];});
    });
  }
  function initTerminal() {
    const form=document.querySelector('#studio-terminal');if(!form)return;
    form.addEventListener('submit',event=>{
      event.preventDefault();const input=form.querySelector('input');const command=input.value.trim().toLowerCase();
      const output=document.querySelector('#terminal-output');
      const routes={games:'home.html#released',shelf:'home.html#current',radio:'wrfm.html',about:'about.html',passport:'passport.html'};
      if(command==='random'){randomProject();return;}
      if(routes[command]){location.assign(routes[command]);return;}
      output.textContent=command==='secrets'?'Start at the bottom of the homepage. Watch for someone very small.':'Commands: games, shelf, radio, about, passport, random, secrets, help.';
      input.select();
    });
  }
  function initLog() {
    const input=document.querySelector('#log-search');if(!input)return;
    const entries=[...document.querySelectorAll('.build')];
    const details=[...document.querySelectorAll('.log-month')];
    const previous=new Map();
    input.closest('.log-search').hidden=false;
    input.addEventListener('input',()=>{
      const query=input.value.trim().toLowerCase();
      if(query&&!previous.size)details.forEach(d=>previous.set(d,d.open));
      entries.forEach(entry=>{entry.hidden=Boolean(query)&&!entry.textContent.toLowerCase().includes(query);});
      details.forEach(d=>{d.hidden=![...d.querySelectorAll('.build')].some(e=>!e.hidden);d.open=query?!d.hidden:(previous.get(d)||false);});
      if(!query)previous.clear();
      document.querySelector('#log-count').textContent=entries.filter(e=>!e.hidden).length+' updates';
    });
  }
  function initDisclosureLinks() {
    const reveal=()=>{
      let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch(_){return;}
      if(!target)return;
      let parent=target;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    };
    window.addEventListener('hashchange',reveal);reveal();
  }
  function boot() {
    initPassport();initShelf();initSettings();initTerminal();initLog();initDisclosureLinks();
    document.querySelectorAll('[data-random-project]').forEach(button=>{button.hidden=false;button.addEventListener('click',randomProject);});
    document.querySelectorAll('[data-copy-studio]').forEach(button=>{
      button.hidden=false;button.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(document.querySelector('#studio-description').textContent.trim());document.querySelector('#copy-message').textContent='Studio description copied.';}
        catch(_){document.querySelector('#copy-message').textContent='Select and copy the studio description above.';}
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
