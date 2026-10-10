/* Run from the site root: node tools/build-studio.cjs
 * Rebuild images with --assets (requires sharp, or B3D_SHARP pointing to it).
 * Shared sections have explicit markers; personal project content stays in its HTML page.
 */
const fs=require('node:fs');
const path=require('node:path');
require('../studio-data.js');
const projects=globalThis.B3DProjects;
const root=path.resolve(__dirname,'..');
process.chdir(root);
const statement='Brok3n by Design is an independent game studio where each project is designed, directed, and built by a single creator using modern creative tools.';
const credit='Independently created by Brok3n by Design.';
const trademark='<sup class="tm-mark" aria-label="trademark">™</sup>';
const projectHeadings={
  'glass-and-fortune.html':'GLASS &amp; FORTUNE',
  'bid-and-buried.html':'Bid &amp; Buried',
  'speck.html':'SPECK',
  'wrfm.html':'WRFM Radio Station',
  'pocket-wilds.html':'Pocket Wilds',
  'labyrinth-fate.html':'THE MAZE',
  'macabre-dolls.html':'Macabre Dolls',
  'juicebox.html':'Juicebox',
  'doqi.html':'DOQI'
};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function write(file,text){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===text)return;
  fs.writeFileSync(file,text);
}
function progressBadge(p){
  const r=p.progress;
  const percent=r.remaining===null?'Not yet reported':r.remaining+'%';
  const panel='<div class="progress-panel"><h3>Progress report</h3><p class="progress-status">'+esc(p.status)+'</p><div class="progress-number"><span>Content remaining</span><strong>'+percent+'</strong></div>'+(r.remaining===null?'':'<meter min="0" max="100" value="'+r.remaining+'" aria-label="Content remaining: '+percent+'">'+percent+'</meter>')+'<p class="progress-caption">Images, audio, music, voice, and other content.</p><dl><div><dt>'+(p.id==='wrfm'?'Availability':'Testing / demo ETA')+'</dt><dd>'+esc(r.testing)+'</dd></div><div><dt>Full release ETA</dt><dd>'+esc(r.release)+'</dd></div></dl><p class="progress-caption">Estimates may change; content remaining is not overall game completion.</p></div>';
  return '<div class="progress-report" style="--report-accent:'+p.accent+'"><button type="button" class="progress-trigger" aria-label="Open progress report for '+esc(p.title)+'"><span class="progress-symbol" aria-hidden="true">◔</span> Progress</button><template>'+panel+'</template></div>';
}
function block(s,pattern){const match=pattern.exec(s);if(!match)return null;const start=match.index;const tag=match[0].match(/^<(\w+)/)[1];const tokens=new RegExp('<\\/?'+tag+'\\b[^>]*>','g');tokens.lastIndex=start;let depth=0,m;while((m=tokens.exec(s))){depth+=m[0][1]==='/'?-1:1;if(depth===0)return {start,end:tokens.lastIndex,text:s.slice(start,tokens.lastIndex)};}throw Error('Unclosed '+tag);}
function replaceBlock(s,pattern,html){const b=block(s,pattern);return b?s.slice(0,b.start)+html+s.slice(b.end):s;}
function wrapBlock(s,pattern,summary){const b=block(s,pattern);if(!b)return s;if(s.slice(Math.max(0,b.start-250),b.start).includes('<summary>'+summary))return s;return s.slice(0,b.start)+'<details class="studio-disclosure"><summary>'+summary+'</summary>\n'+b.text+'\n</details>'+s.slice(b.end);}
function nav(active){return '<!-- STUDIO NAV START -->\n<nav class="studio-nav" aria-label="Main navigation"><a class="brand" href="home.html"><img src="images/studio/b3d-header.webp" alt="Brok3n by Design" width="230" height="52">'+trademark+'</a><div class="studio-links">'+[['home.html#demos','Teasers'],['home.html#current','Shelf'],['about.html','About'],['follow-development.html','Follow'],['passport.html','Passport']].map(([url,label])=>'<a href="'+url+'"'+(url===active?' aria-current="page"':'')+'>'+label+'</a>').join('')+'<a class="studio-x-cta" href="https://x.com/brok3nbydesign" target="_blank" rel="noopener"><img src="images/studio/studio-mark.svg" alt="" width="32" height="32">Follow on X <span aria-hidden="true">↗</span></a></div></nav>\n<!-- STUDIO NAV END -->';}
const utility='<!-- STUDIO LINKS START -->\n<div class="studio-utility"><a href="passport.html">Studio Passport <span data-passport-count></span></a><a href="settings.html">Effects &amp; sound</a><a href="press-kit.html">Press kit</a><a href="index.html?intro=1">Watch intro</a></div>\n<!-- STUDIO LINKS END -->';
function shell(file,title,description,body){return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+' | Brok3n by Design</title><meta name="description" content="'+esc(description)+'"><link rel="icon" href="images/studio/studio-mark.svg"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=VT323&display=swap" rel="stylesheet"><meta property="og:title" content="'+esc(title)+' | Brok3n by Design"><meta property="og:description" content="'+esc(description)+'"><meta property="og:type" content="website"><meta property="og:image" content="https://brok3nbydesign.com/images/studio/b3d.png"><meta property="og:url" content="https://brok3nbydesign.com/'+file+'"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="site-effects.css?v=20260912-titles"><link rel="stylesheet" href="studio.css"><script src="studio-data.js" defer></script><script src="studio-core.js" defer></script><script src="site-effects.js?v=20260912-titles" defer></script></head><body class="studio-page"><a class="skip-link" href="#main-content">Skip to content</a>'+nav(file)+'<main class="studio-wrap" id="main-content" tabindex="-1">'+body+'</main><footer class="studio-footer"><p>'+credit+'</p>'+utility+'<p class="studio-small">© 2026 Brok3n by Design™. All rights reserved.</p></footer></body></html>\n';}
function conceptSVG(id,title,subtitle,accent){const maze=id==='labyrinth-fate'?'<path d="M760 80h300v300H840V160h140v140h-60v-60M760 80v420h390V20H680v560h500" fill="none" stroke="'+accent+'" stroke-width="12" opacity=".28"/>':id==='cyoa'?'<path d="M930 70v155m0 0L780 365m150-140l150 140M780 365v120m300-120v120" fill="none" stroke="'+accent+'" stroke-width="12" opacity=".35"/>':'<rect x="810" y="120" width="200" height="310" rx="25" fill="none" stroke="'+accent+'" stroke-width="10" opacity=".25"/><path d="M940 120V55h90" fill="none" stroke="'+accent+'" stroke-width="12" opacity=".3"/>';
return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="#0e1712"/><path d="M0 690h1200M60 0v750" stroke="#293c30"/>'+maze+'<text x="90" y="120" font-family="monospace" font-size="20" letter-spacing="6" fill="'+accent+'">BROK3N BY DESIGN / LAB NOTES</text><text x="90" y="540" font-family="sans-serif" font-weight="700" font-size="72" fill="#f1f4ed">'+esc(title)+'</text><text x="90" y="610" font-family="monospace" font-size="27" fill="'+accent+'">'+esc(subtitle)+'</text></svg>';}
for(const id of ['labyrinth-fate','juicebox']){const p=projects.find(p=>p.id===id);write(p.image,conceptSVG(id,p.title,p.hook,p.accent));}
write('images/studio/studio-mark.svg','<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="12" fill="#080808"/><path d="M32 32h192v192H32z" fill="none" stroke="#d71920" stroke-width="4"/><text x="128" y="169" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="122" fill="#f1f1f2">B<tspan fill="#d71920">3</tspan></text></svg>');
write('images/studio/studio-wordmark.svg','<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="280" viewBox="0 0 1200 280"><rect width="1200" height="280" fill="#0b130e"/><text x="60" y="135" font-family="monospace" font-weight="bold" font-size="80" fill="#ff686e">BROK3N BY DESIGN</text><text x="64" y="207" font-family="sans-serif" font-size="28" fill="#d4e2d8">Independently created by Brok3n by Design.</text></svg>');

const shelf='<section id="current" class="section"><div class="shelf-heading" id="released"><div><p class="eyebrow">INSERT A CARTRIDGE</p><h2>Choose your next world.</h2><p class="shelf-intro">Start here: choose a cartridge, hear it click into place, and see where the project stands. Explore the project pages for development updates, playable previews, and a closer look at each world.</p></div><button type="button" class="studio-button" data-random-project hidden>Take me somewhere strange ↗</button></div><div class="shelf-controls" id="shelf-controls" hidden><div class="shelf-filters" aria-label="Filter projects">'+[['all','Everything'],['play','Play & listen'],['development','In development'],['experiments','Experiments & archive']].map(([id,label])=>'<button type="button" class="studio-button" data-shelf-filter="'+id+'" aria-pressed="'+(id==='all')+'">'+label+'</button>').join('')+'</div><p id="shelf-count" class="studio-small" role="status"></p></div><div class="projects-grid project-shelf" data-project-shelf>'+projects.map((p,i)=>'<article class="project-card" data-category="'+p.category+'" style="--project-accent:'+p.accent+'"><img class="shelf-cover" src="images/studio/cover/'+p.id+'.webp" alt="'+esc(p.title)+' '+(p.category==='experiments'?'concept artwork':'project artwork')+'" loading="lazy" width="720" height="450"><div class="shelf-card-body"><div class="shelf-status">'+esc(p.status)+'<span class="shelf-number">'+String(i+1).padStart(2,'0')+'</span></div><h3>'+esc(p.title)+'</h3>'+(p.liveUrl?'<a class="shelf-quick-play" href="'+p.liveUrl+'" target="_blank" rel="noopener">'+esc(p.liveCta)+' ↗</a>':'')+'<p class="shelf-hook">'+esc(p.hook)+'</p><p class="shelf-description">'+esc(p.description)+'</p><a class="btn btn-secondary" href="'+p.id+'.html" aria-label="Explore '+esc(p.title)+'">Explore project →</a>'+(p.teaser?'<a class="shelf-teaser-link" href="'+p.teaser+'" target="_blank" rel="noopener" aria-label="'+esc(p.teaserCta)+' for '+esc(p.title)+'">'+esc(p.teaserCta)+' ↗</a>':'')+(p.trailer?'<a class="shelf-trailer-link" href="'+p.trailer+'" aria-label="Watch trailer for '+esc(p.title)+'">Watch trailer →</a>':'')+'</div></article>').join('')+'</div><p class="shelf-note">Choose “Play &amp; listen” for something available now. Development cartridges open the latest notes; archive entries preserve experiments and ideas for later.</p></section>';
const fresh='<section id="upcoming" class="section upcoming-section"><p class="eyebrow">NOW ON THE WORKBENCH</p><h2>What’s coming up</h2><p class="section-intro">The three games at the front of the studio right now—one nearing wider testing, one playable and still evolving, and one growing quietly behind the scenes.</p><div class="fresh-notes"><a href="glass-and-fortune.html#build-status"><time>NEXT UP</time><h3>Preparing the Reading</h3><p>Glass &amp; Fortune is moving through private alpha toward playtesting, release preparation, screenshots, and a proper trailer.</p><span>Glass &amp; Fortune →</span></a><a href="pocket-wilds.html#build-status"><time>PLAYABLE &amp; EVOLVING</time><h3>The wilds keep changing</h3><p>Pocket Wilds is playable now while balance, encounters, presentation, and the shape of the adventure continue to evolve.</p><span>Pocket Wilds →</span></a><a href="speck.html#build-status"><time>TAKING SHAPE</time><h3>A world built from almost nothing</h3><p>Speck is in private development, with its shared world, creation tools, homestead, and survival systems taking form one pass at a time.</p><span>Speck →</span></a></div></section>';
const passportBanner='<section class="section passport-banner"><span class="passport-mark" aria-hidden="true">◈</span><div><p class="eyebrow">A RECORD OF YOUR WANDERING</p><h3>Your Studio Passport</h3><p>Visit worlds. Find small secrets. Collect a stamp along the way.</p></div><a href="passport.html" class="studio-button">Open passport <span data-passport-count></span> →</a></section>';

write('passport.html',shell('passport.html','Studio Passport','Visit worlds, discover secrets, and keep a free local collection of studio stamps.','<p class="eyebrow">BROK3N BY DESIGN / VISITOR RECORD</p><h1>Studio Passport</h1><p class="studio-lead">A little proof that you were here. Visit the projects, take the long way around, and keep an eye out for things that don’t quite belong.</p><div class="passport-top"><div><p class="eyebrow">DISCOVERIES COLLECTED</p><div class="passport-count" data-passport-count>0 / 17</div><progress id="passport-progress" max="17" value="0" aria-label="Collected passport stamps"></progress></div><p class="studio-lead" data-passport-storage>Saved in this browser. Back up your passport to keep it or move it to another device.</p></div><noscript><p>Enable JavaScript to collect and view stamps. You can still explore every project from the <a href="home.html#current">shelf</a>.</p></noscript><div class="passport-grid" data-passport-grid></div><section class="passport-tools" data-passport-tools hidden><h2>Keep your discoveries</h2><p>No account or paid service. Your stamps stay on this website in this browser. Clearing site data or leaving a private session can erase them. A backup lets you move them to another device or browser.</p><div class="studio-actions"><button class="studio-button" id="passport-export" type="button">Download backup</button><button class="studio-button" id="passport-reset" type="button">Reset passport</button></div><label for="passport-import">Restore a passport backup (.json, up to 64 KB)</label><input type="file" id="passport-import" accept=".json,application/json"><div id="passport-reset-panel" class="passport-reset-panel" hidden><p>Reset the discoveries in this browser? Download a backup first if you want to keep them.</p><div class="studio-actions"><button class="studio-button" type="button" id="passport-cancel-reset">Keep my passport</button><button class="studio-button" type="button" id="passport-confirm-reset">Reset discoveries</button></div></div><p role="status" id="passport-message"></p></section><section class="terminal-box"><p class="eyebrow">AN UNATTENDED TERMINAL</p><h2>Where to next?</h2><form id="studio-terminal"><label for="terminal-command">Enter a command. Try help or secrets.</label><div class="studio-actions"><input id="terminal-command" name="command" autocomplete="off" maxlength="40" spellcheck="false"><button type="submit" class="studio-button">Run command ↵</button></div></form><p id="terminal-output" role="status" class="studio-small">games · shelf · radio · about · passport · random · secrets</p></section>'));
write('settings.html',shell('settings.html','Effects & sound','Make the studio website comfortable: choose effects, particles, sounds, and intro preferences.','<p class="eyebrow">SET THE ATMOSPHERE</p><h1>Make yourself comfortable.</h1><p class="studio-lead">Keep the strange. Choose how much it moves.</p><section class="studio-settings"><fieldset><legend>Website preferences</legend><label><input type="checkbox" data-preference="effects">Animations and hover effects</label><label><input type="checkbox" data-preference="particles">Cursor particles</label><label><input type="checkbox" data-preference="sound">Cartridge sound effects</label><label><input type="checkbox" data-preference="skipIntro">Go straight to the games next time</label></fieldset><p class="studio-small">Your device’s reduced-motion setting takes priority. Sound effects start off. These settings control the website; the radio and games have their own controls.</p><p id="settings-message" role="status"></p><noscript><p>JavaScript is required to save preferences.</p></noscript><a class="studio-button" href="index.html?intro=1">Watch the intro</a></section>'));
write('press-kit.html',shell('press-kit.html','Press kit',statement,'<p class="eyebrow">FOR WRITERS, STREAMERS & CURIOUS PEOPLE</p><h1>Press kit</h1><p class="studio-lead">The studio, in its own words. Project artwork, useful links, and a direct line for questions.</p><section class="studio-card"><h2>About the studio</h2><p id="studio-description">'+statement+'</p><p>'+credit+'</p><div class="studio-actions"><button type="button" class="studio-button" data-copy-studio hidden>Copy studio description</button><a class="studio-button" href="press/studio-facts.txt" download>Download factsheet</a><a class="studio-button" href="mailto:brok3nbydesign@pm.me">Contact the studio</a></div><p id="copy-message" role="status"></p></section><section id="brand-film"><h2>Brand film &amp; trailers</h2><p>Watch the released Brok3n by Design brand film, or visit the YouTube channel for more studio trailers.</p><div class="studio-actions"><a class="studio-button primary" href="https://youtu.be/zhIMgJ5sl7Q" target="_blank" rel="noopener">Watch the brand film ↗</a><a class="studio-button" href="https://x.com/brok3nbydesign/status/2108530273004421284?s=20" target="_blank" rel="noopener">View on X ↗</a><a class="studio-button" href="https://www.youtube.com/@Brok3n-j8j" target="_blank" rel="noopener">YouTube trailers ↗</a></div></section><section><h2>Studio marks</h2><p class="studio-small">Official studio logo and compact B3 mark for press and editorial use.</p><div class="studio-grid"><article class="studio-card"><img src="images/studio/x-logo2.png" alt="Brok3n by Design B3 thumbnail" width="220" height="203" class="press-brand-thumbnail"><h3>B3 thumbnail</h3><p class="studio-small">Current studio thumbnail and social artwork.</p><a href="images/studio/x-logo2.png" download>Download B3 thumbnail (PNG)</a></article><article class="studio-card"><img src="images/studio/b3d-web.webp" alt="Brok3n by Design wordmark"><a href="images/studio/b3d.png" download>Download studio logo (PNG)</a></article><article class="studio-card"><img src="images/studio/studio-mark.svg" alt="B3 studio mark" style="max-height:160px;object-fit:contain"><a href="images/studio/studio-mark.svg" download>Download B3 mark (SVG)</a></article></div></section><section><h2>Projects & selected artwork</h2><p>Check each project page for its latest status before publishing. Concept artwork is identified separately from playable games.</p><div class="studio-grid">'+projects.map(p=>'<article class="studio-card"><img src="images/studio/cover/'+p.id+'.webp" alt="'+esc(p.title)+' artwork" loading="lazy" width="720" height="450"><p class="eyebrow">'+esc(p.status)+'</p><h3>'+esc(p.title)+'</h3><p>'+esc(p.description)+'</p><p><a href="'+p.id+'.html">Project details</a> · <a href="'+p.image+'" download>Download artwork</a></p></article>').join('')+'</div></section>'));
write('press/studio-facts.txt',statement+'\n\n'+credit+'\n\nWebsite: https://brok3nbydesign.com/\nContact: brok3nbydesign@pm.me\nSocial: https://x.com/brok3nbydesign\n\nYouTube trailers: https://www.youtube.com/@Brok3n-j8j\nBrand film (released): https://youtu.be/zhIMgJ5sl7Q\nBrand film on X: https://x.com/brok3nbydesign/status/2108530273004421284\nStudio thumbnail: https://brok3nbydesign.com/images/studio/x-logo2.png\n\nPROJECTS\n'+projects.map(p=>p.title+' — '+p.status+'\n'+p.description+'\nhttps://brok3nbydesign.com/'+p.id+'.html\n').join('\n')+'\nCheck project pages for current availability.\n');

for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))){
  if(['passport.html','settings.html','press-kit.html','lumina-dice.html'].includes(file))continue;
  let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
  // Retire old site music as one unit. Home's first script also contains working carousel/player code.
  s=s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,script=>{
    if(!script.includes('bgMusic'))return script;
    if(file==='home.html'&&script.includes('// Pocket Wilds Carousel'))return '<script>\n'+script.slice(script.indexOf('// Pocket Wilds Carousel'));
    if(file==='home.html'&&script.includes('trailerModal'))return '<script>\n(function(){const modal=document.getElementById("trailerModal"),video=document.getElementById("homeTrailer"),openBtn=document.getElementById("watchTrailerBtn"),closeBtn=document.getElementById("trailerClose");function close(){modal.classList.remove("open");document.body.style.overflow="";video.pause();openBtn.focus();}openBtn.addEventListener("click",()=>{modal.classList.add("open");document.body.style.overflow="hidden";video.currentTime=0;video.play().catch(()=>{});closeBtn.focus();});closeBtn.addEventListener("click",close);modal.addEventListener("click",e=>{if(e.target===modal)close();});document.addEventListener("keydown",e=>{if(!modal.classList.contains("open"))return;if(e.key==="Escape")close();if(e.key==="Tab"){const focusable=[...modal.querySelectorAll("button,video[controls]")];const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});})();\n</script>';
    return '';
  });
  s=s.replace(/\s*<audio\b[^>]*id="bgMusic"[^>]*>[\s\S]*?<\/audio>/g,'').replace(/\s*<button\b[^>]*id="musicBtn"[^>]*>[\s\S]*?<\/button>/g,'');
  s=s.replace(/<style>\s*\.floating-music-btn\s*\{[\s\S]*?<\/style>/g,'').replace(/\s*<div class="nav-center">\s*<canvas id="visualizer"><\/canvas>\s*<\/div>/g,'');
  if(!s.includes('href="studio.css"'))s=s.replace('<script src="site-effects.js?v=20260912-titles" defer></script>','<link rel="stylesheet" href="studio.css">\n  <script src="studio-data.js" defer></script>\n  <script src="studio-core.js" defer></script>\n  <script src="site-effects.js?v=20260912-titles" defer></script>');
  s=s.replaceAll('href="index.html"','href="index.html?intro=1"');
  if(file!=='index.html'&&file!=='pocket-wilds-changelog.html'){
    if(s.includes('<!-- STUDIO NAV START -->'))s=s.replace(/<!-- STUDIO NAV START -->[\s\S]*?<!-- STUDIO NAV END -->/,nav(file));
    else s=replaceBlock(s,/<nav>/,nav(file));
  }
  if(s.includes('<footer>')&&!s.includes('<!-- STUDIO LINKS START -->'))s=s.replace('</footer>',utility+'\n</footer>');
  if(file==='home.html')s=s.replace(/<!-- In Development -->[\s\S]*?<!-- About -->/,'<!-- In Development -->\n'+shelf+'\n'+passportBanner+'\n'+fresh+'\n<!-- About -->');
  if(file==='about.html'){
    const history=block(s,/<section class="section">\s*<h2>How I Got Here<\/h2>/);
    if(history&&!s.includes('studio-timeline')){
      const timeline='<section class="section"><h2>A few chapters from the studio</h2><div class="studio-timeline"><div><p class="eyebrow">CREATIVE ROOTS</p><h3>Games, video, and sound</h3><p>A lifelong love of games, shaped by years of image, video, and audio editing.</p></div><div><p class="eyebrow">EARLY EXPLORATIONS</p><h3>Dolls, departments, and strange ideas</h3><p>Concept artwork and interactive experiments helped shape the studio’s creative practice.</p></div><div><p class="eyebrow">WORLDS YOU CAN VISIT</p><h3>The wilds and the airwaves</h3><p><a href="pocket-wilds.html">Pocket Wilds</a> and <a href="wrfm.html">WRFM</a> turn those interests into experiences you can explore.</p></div></div><details class="studio-disclosure"><summary>Read the longer story</summary>'+history.text+'</details></section>';
      s=s.slice(0,history.start)+timeline+s.slice(history.end);
    }
  }
  if(['glass-and-fortune.html','speck.html','wrfm.html','pocket-wilds.html'].includes(file))s=wrapBlock(s,/<(?:section|div) class="section statusboard"[^>]*>/,'Development details & complete feature inventory');
  if(file==='glass-and-fortune.html'){
    s=s.replace(/\s*<div class="gallery-item" hidden><img src="images\/dice\/glass-(?:08|09|10)\.png"[^>]*><\/div>/g,'').replace('<div class="status status-flow">Flow</div>','<div class="status status-flow">Private alpha</div>');
  }
  if(file==='speck.html')s=s.replace(/<div class="status[^>]*>FLOW<\/div>/g,'').replace('<h1>SPECK</h1>','<h1>SPECK</h1>');
  if(file==='doqi.html'){
    if(!s.includes('class="eyebrow">Department of Questionable Inventions'))s=s.replace('<h1>DOQI</h1>','<h1>DOQI</h1>\n      <p class="eyebrow">Department of Questionable Inventions</p>');
    s=s.replace('<div class="status">PROTOTYPE</div>','<div class="status">PROTOTYPE · ON HOLD</div>');
    s=s.replaceAll('Currently a prototype.','A prototype currently on hold.');
  }
  if(file==='macabre-dolls.html'){
    s=s.replace('A prototype from Brok3n by Design.','Concept artwork from Brok3n by Design. The game has not been developed.');
    s=s.replace('<div class="status">PROTOTYPE</div>','<div class="status">CONCEPT ARCHIVE</div>').replaceAll('Currently in the prototype stage.','Concept artwork and ideas; the game has not been developed.').replaceAll('The project is currently in the prototype stage.','The game has not been developed. This page collects concept artwork and early ideas.').replaceAll('Macabre Dolls gameplay screenshot','Macabre Dolls concept layout').replace('<h2>Features</h2>','<h2>Creative direction</h2>').replace('<h2>Roadmap</h2>','<h2>Ideas for future development</h2>');
  }
  if(file==='juicebox.html'){
    s=s.replace('<div class="hero-image">[ Concept Still ]</div>','<img class="concept-art" src="images/studio/juicebox.svg" alt="Juicebox production notebook title artwork">');
    s=replaceBlock(s,/<div class="section">\s*<h2>Gallery<\/h2>/,'<section class="section"><h2>Production notebook</h2><p>Character, voice, and short-form storytelling are being explored. Finished stills and clips will be shared as they are ready.</p></section>');
  }
  if(file==='cyoa.html'){
    s=s.replace('<div class="hero-image">[ CYOA Story Interface Placeholder ]</div>','<img class="concept-art" src="images/studio/cyoa.svg" alt="Branching paths illustration for CYOA">');
    s=replaceBlock(s,/<div class="section">\s*<h2>Gallery<\/h2>/,'<section class="section"><h2>Story notebook</h2><p>The first complete story path is in development. Scenes and choices will be shared when they are ready to explore.</p></section>');
  }
  if(file==='labyrinth-fate.html')s=replaceBlock(s,/<div class="hero-placeholder">/,'<img class="concept-art" src="images/studio/labyrinth-fate.svg" alt="An unfinished maze, the visual motif for The Maze">');
  if(file==='follow-development.html')s=replaceBlock(s,/<section class="future-card">/,'<section class="future-card"><p class="eyebrow">BEFORE YOU SUBSCRIBE</p><h2>A taste of the Field Notes</h2><p>Build updates, playable discoveries, and a closer look at how each project is taking shape.</p><p><a href="glass-and-fortune.html#build-status">Read the Glass &amp; Fortune development notes →</a></p><p><a href="pocket-wilds-changelog.html">Browse the Pocket Wilds update log →</a></p></section>');
  if(file==='subscribed.html')s=s.replace('<h1>YOU\'RE IN</h1>','<h1>CHECK YOUR INBOX</h1>').replace('Thanks for joining the Field Notes.','Thanks for signing up for the Field Notes.').replace('href="home.html#released" class="btn btn-primary"','href="https://brok3nbydesign.com/pocket-wilds/" class="btn btn-primary"').replace('Explore Games &amp; Projects','Play Pocket Wilds');
  if(file==='pocket-wilds.html'&&!s.includes('First steps in the wilds')){
    s=s.replace('<div class="status">PLAYABLE NOW • CONTENT-COMPLETE</div>','<div class="status">PLAYABLE BETA · BROWSER · KEYBOARD &amp; TOUCH</div>');
    s=s.replace('<h2>Overview</h2>','<h2>Overview</h2><details class="studio-disclosure"><summary>First steps in the wilds</summary><p>Create a hero, head into the overworld, and learn the rhythm of real-time exploration. At a boss encounter, the fight switches to tactical dice decisions. Your first goal is to get comfortable with both sides of the adventure.</p><a href="#controls">See the controls →</a></details>');
    s=s.replace('<h2>Controls</h2>','<h2 id="controls">Controls</h2>');
  }
  if(file==='speck.html'&&!s.includes('Public multiplayer is not open yet.'))s=s.replace('<h1>SPECK</h1>','<h1>SPECK</h1><p class="studio-small">Private development. Public multiplayer is not open yet.</p>');
  if(file==='wrfm.html'&&!s.includes('Keep the station with you'))s=s.replace('<h2>Overview</h2>','<h2>Overview</h2><div class="studio-card"><h3>Keep the station with you</h3><p>Host Vera Lang has the microphone. Open the station in its own tab to keep listening while you explore the studio website.</p><a class="studio-button" href="https://brok3nbydesign.com/wrfm/" target="_blank" rel="noopener">Open the radio in a new tab ↗</a></div>');
  if(file==='pocket-wilds-changelog.html'&&!s.includes('class="log-month"')){
    const entries=[...s.matchAll(/<section class="build">[\s\S]*?<\/section>/g)];
    const grouped=new Map();for(const e of entries.slice(1)){const date=(e[0].match(/<time>([^<]+)/)||[])[1]||'';const month=date.startsWith('AUG')?'August 2026':'July 2026';if(!grouped.has(month))grouped.set(month,[]);grouped.get(month).push(e[0]);}
    if(entries.length)s=s.slice(0,entries[0].index)+'<div class="log-search" hidden><label for="log-search">Search updates</label><input type="search" id="log-search" placeholder="Dice, controls, crafting…"><p id="log-count" role="status"></p></div>'+entries[0][0]+[...grouped].map(([month,items])=>'<details class="log-month"><summary>'+month+' · '+items.length+' earlier updates</summary>'+items.join('\n')+'</details>').join('\n')+s.slice(entries.at(-1).index+entries.at(-1)[0].length);
  }
  const project=projects.find(p=>p.id+'.html'===file);
  const share=project?project.id:'studio';
  const meta='<meta property="og:image" content="https://brok3nbydesign.com/images/studio/share/'+share+'.jpg">';
  if(s.includes('property="og:image"'))s=s.replace(/<meta property="og:image"[^>]*>/,meta);else s=s.replace('</head>',meta+'\n</head>');
  if(!s.includes('rel="canonical"'))s=s.replace('</head>','<link rel="canonical" href="https://brok3nbydesign.com/'+(file==='index.html'?'':file)+'">\n</head>');
  if(file!=='index.html'&&!s.includes('class="skip-link"')){
    const main=/<main\b[^>]*>/.exec(s);
    if(main){if(!main[0].includes('id='))s=s.replace(main[0],main[0].replace('>',' id="main-content" tabindex="-1">'));else if(!main[0].includes('id="main-content"'))s=s.replace(main[0],main[0]+'<span id="main-content" tabindex="-1"></span>');}
    else s=s.replace(/<div class="(?:hero|container)">/,match=>match.replace('>',' id="main-content" tabindex="-1">'));
    s=s.replace(/<body([^>]*)>/,'<body$1>\n<a class="skip-link" href="#main-content">Skip to content</a>');
  }
  if(file!=='index.html'&&!s.includes('id="main-content"'))s=s.replace('<div class="wrap">','<div class="wrap" id="main-content" tabindex="-1">');
  if(file==='home.html')s=s.replace('<h1>BROK3N BY DESIGN</h1>','<h1>BROK3N BY DESIGN'+trademark+'</h1>');
  if(projectHeadings[file])s=s.replace('<h1>'+projectHeadings[file]+'</h1>','<h1>'+projectHeadings[file]+trademark+'</h1>');
  s=s.replaceAll('© 2026 Brok3n by Design. All rights broken.','© 2026 Brok3n by Design™. All rights reserved.');
  s=s.replaceAll('© 2026 Brok3n by Design</p>','© 2026 Brok3n by Design™. All rights reserved.</p>');
  write(file,s);
}

// Apply reports after page generation so shared rebuilds preserve the catalogue data.
for(const file of ['home.html',...projects.map(p=>p.id+'.html')]){
  let s=fs.readFileSync(file,'utf8');
  s=s.replace(/<!-- PROGRESS REPORT START -->[\s\S]*?<!-- PROGRESS REPORT END -->/g,'');
  const badge=p=>'<!-- PROGRESS REPORT START -->'+progressBadge(p)+'<!-- PROGRESS REPORT END -->';
  if(file==='home.html'){
    for(const p of projects){
      const heading='<p class="shelf-hook">'+esc(p.hook)+'</p>';
      s=s.replace(heading,badge(p)+heading);
    }
  }else{
    const p=projects.find(p=>p.id+'.html'===file);
    s=s.replace(/(<h1>[\s\S]*?<\/h1>)/,'$1'+badge(p));
  }
  if(!s.includes('src="progress-report.js"'))s=s.replace('</head>','<script src="progress-report.js" defer></script>\n</head>');
  write(file,s);
}

const siteMusicControl='<div class="site-music" id="site-music-control" role="group" aria-label="Background music"><button type="button" aria-pressed="false">♫ Play music</button><label><span class="sr-only">Music volume</span><input type="range" min="0" max="100" step="1" aria-label="Music volume"></label></div>';
// Only studio pages get the shared track; standalone teasers keep their own audio.
for(const file of fs.readdirSync('.').filter(file=>file.endsWith('.html'))){
  let s=fs.readFileSync(file,'utf8');
  if(!s.includes('src="site-music.js"'))s=s.replace('</head>','<link rel="stylesheet" href="site-music.css">\n<script src="site-music.js" defer></script>\n</head>');
  if(!s.includes('id="site-music-control"'))s=s.replace('</body>',siteMusicControl+'\n</body>');
  write(file,s);
}

async function assets(){
  if(!process.argv.includes('--assets'))return;
  const sharp=require(process.env.B3D_SHARP||'sharp');
  for(const p of projects){
    fs.mkdirSync('images/studio/cover',{recursive:true});fs.mkdirSync('images/studio/share',{recursive:true});
    await sharp(p.image).resize(720,450,{fit:'cover'}).webp({quality:83}).toFile('images/studio/cover/'+p.id+'.webp');
    const art=await sharp(p.image).resize(1200,630,{fit:'cover'}).toBuffer();
    const overlay=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect y="400" width="1200" height="230" fill="#07100c" opacity=".95"/><text x="50" y="470" font-family="sans-serif" font-size="50" font-weight="bold" fill="#fff">'+esc(p.title)+'</text><text x="52" y="520" font-family="sans-serif" font-size="25" fill="'+p.accent+'">'+esc(p.hook)+'</text><text x="52" y="583" font-family="monospace" font-size="22" fill="#d9e5dc">Independently created by Brok3n by Design.</text></svg>');
    await sharp(art).composite([{input:overlay}]).jpeg({quality:88}).toFile('images/studio/share/'+p.id+'.jpg');
  }
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0b130e"/><rect x="35" y="35" width="1130" height="560" rx="12" fill="none" stroke="#ff686e" stroke-width="2"/><text x="80" y="150" font-family="monospace" font-size="22" letter-spacing="6" fill="#9abdA5">INDEPENDENT GAME STUDIO</text><text x="75" y="285" font-family="monospace" font-weight="bold" font-size="82" fill="#ff686e">BROK3N BY DESIGN</text><text x="80" y="385" font-family="sans-serif" font-size="32" fill="#e6eee7">Strange games. Worlds worth exploring.</text><text x="80" y="520" font-family="sans-serif" font-size="25" fill="#a5bbac">Independently created by Brok3n by Design.</text></svg>';
  await sharp(Buffer.from(svg)).jpeg({quality:90}).toFile('images/studio/share/studio.jpg');
}
assets().then(()=>console.log('Studio pages rebuilt. '+projects.length+' projects in the shared catalogue.')).catch(error=>{console.error(error);process.exitCode=1;});
