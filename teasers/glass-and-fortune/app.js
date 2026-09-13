(() => {
  'use strict';
  const R=globalThis.GFRules,game=new globalThis.GFToy(),$=id=>document.getElementById(id);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const sample=[{n:3,c:'ruby'},{n:2,c:'sapphire'},{n:3,c:'emerald'},{n:5,c:'amber'},{n:6,c:'amethyst'}];
  const names={num:'TURN',hue:'TINT',full:'RECAST'};
  let frame=0,animation=null,sound=false,audio=null;
  const diceButtons=Array.from({length:5},(_,i)=>{
    const el=document.createElement('button');el.className='die sample';el.type='button';
    el.innerHTML='<span class="sigil" aria-hidden="true"></span><span class="pip" aria-hidden="true"></span><span class="cname" aria-hidden="true"></span>';
    el.addEventListener('click',()=>{if(game.select(i)){renderControls();announce(selectionText());}});
    el.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||!game.dice.length||game.busy)return;
      e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?4:(i+(e.key==='ArrowLeft'?4:1))%5;
      game.select(next);renderControls();diceButtons[next].focus();announce(selectionText());
    });
    $('tray').append(el);return el;
  });
  $('colour-guide').innerHTML=R.COLORS.map(c=>`<span data-colour="${c.id}"><b style="--swatch:${c.hex}" aria-hidden="true">${c.symbol}</b>${c.name}</span>`).join('<i aria-hidden="true">›</i>')+'<i aria-hidden="true">↻</i>';
  function announce(text){$('announcement').textContent=text;}
  function describe(d){return `${R.COLORS.find(c=>c.id===d.c).name} ${d.n}`;}
  function selectionText(){return game.selected<0?'Select a die to bend its number or colour.':`Die ${game.selected+1} selected · ${describe(game.dice[game.selected])}`;}
  function difference(value){return value>0?`+${value}`:value<0?`−${Math.abs(value)}`:'No change';}
  function explanation(result){
    const number={FIVEFOLD:'All five dice show the same number',FOURFOLD:'Four dice share a number',FULLHOUSE:'Three of one number and two of another',STRAIGHT:'Five numbers in sequence',TRIAD:'Three dice share a number',TWINPAIR:'Two separate pairs of matching numbers',PAIR:'Two dice share a number',SCATTERED:'No matching numbers or five-number run'}[result.ev.numberKey];
    const colour=result.ev.allSameColor?'all five share one colour':result.ev.allDiffColor?'all five have different colours':null;
    return `${number}${colour?`; ${colour}`:''}.`;
  }
  function renderControls(){
    const rolled=game.dice.length>0,can=rolled&&!game.busy&&game.selected>=0&&game.remaining>0;
    const dice=rolled?game.dice:sample;
    diceButtons.forEach((el,i)=>{
      const d=dice[i],c=R.COLORS.find(c=>c.id===d.c);
      el.style.setProperty('--c',c.hex);el.querySelector('.pip').textContent=d.n;el.querySelector('.sigil').textContent=c.symbol;el.querySelector('.cname').textContent=c.name;
      el.classList.toggle('sample',!rolled);el.classList.toggle('sel',rolled&&i===game.selected);
      el.setAttribute('aria-label',`${!rolled?'Preview: ':''}die ${i+1}, ${c.name}, ${c.symbol}, number ${d.n}`);
      el.setAttribute('aria-pressed',String(rolled&&i===game.selected));el.setAttribute('aria-disabled',String(!rolled||game.busy));el.tabIndex=rolled?0:-1;
    });
    $('roll').setAttribute('aria-disabled',String(game.busy));
    $('roll-label').textContent=game.busy?'The glass is settling…':rolled?'Roll a Fresh Hand':'Roll the Dice';
    $('selection').textContent=game.busy?'A moment for the glass to settle.':rolled?selectionText():'Five pieces of glass. One small negotiation with fate.';
    $('allowance').textContent=`${game.remaining} / 3 Favour`;
    $('favours').textContent=Array.from({length:3},(_,i)=>i<game.remaining?'◆':'◇').join(' ');
    $('phase').textContent=!rolled?'01 / Invite fortune':game.completed?'03 / Fortune, rewritten':'02 / A hand of possibilities';
    $('round-note').textContent=rolled?'The whole hand scores together.':'Five dice. Your possibility.';
    $('bend-hint').textContent=!rolled?'After rolling, select a die. Each bend costs 1 Favour.':game.remaining===0?'All three Favour spent. Roll a fresh hand to begin again.':game.selected<0?'Select any die above. Each bend costs 1 Favour.':'Bend the selected die. Each action costs 1 Favour.';
    for(const [id,kind] of [['turn','num'],['tint','hue'],['recast','full']]){
      $(id).setAttribute('aria-disabled',String(!can));
      $(id).setAttribute('aria-label',`${names[kind]}${!can?' unavailable':''}. ${kind==='num'?'Raise number by one, wrapping 6 to 1':kind==='hue'?'Advance to the next colour':'Reroll both number and colour'}. Costs 1 Favour.`);
    }
    $('turn-detail').textContent=game.selected<0?'Number +1 · 6 → 1':`${game.dice[game.selected].n} → ${game.dice[game.selected].n%6+1} · same colour`;
    $('tint-detail').textContent=game.selected<0?'Next colour in the cycle':`Next: ${R.COLORS.find(c=>c.id===R.bendDie(game.dice[game.selected],'hue').c).name}`;
    document.querySelectorAll('[data-colour]').forEach(el=>el.classList.toggle('current',game.selected>=0&&el.dataset.colour===game.dice[game.selected].c));
  }
  function renderReading(){
    const r=game.result;
    $('result-kicker').textContent=r?(game.last?'After your bend':'The glass has spoken'):'Your fortune awaits';
    $('hand-name').textContent=r?r.name:'What will the glass reveal?';
    $('explanation').textContent=r?explanation(r):'Numbers make the hand. Colours can make it extraordinary.';
    $('formula').textContent=r?`(${R.HANDS[r.key].chips} hand chips + ${r.pipSum} number total) × ${r.mult} = ${r.score} · rounded`:'Every die has a number, a colour, and a symbol.';
    $('score').textContent=r?r.score.toLocaleString():'—';
    $('delta').textContent=game.previous?`${difference(r.score-game.previous.score)}${r.score===game.previous.score?'':' points'}`:r?'Your opening hand':'Roll to discover';
    $('change').textContent=game.last?`${names[game.last.kind]}: ${describe(game.last.before)} → ${describe(game.last.after)}. Score ${game.previous.score} → ${r.score}. Opening hand: ${game.initial.score}.`:'Three small chances to change your hand. Use any mix of bends.';
  }
  function stopAudio(){if(audio){audio.pause();audio.currentTime=0;}}
  function playSound(){
    if(!sound||document.hidden)return;
    if(!audio){audio=new Audio('assets/roll.wav');audio.volume=.35;audio.preload='none';}
    audio.currentTime=0;const promise=audio.play();if(promise)promise.catch(()=>{});
  }
  function clearAnimation(){cancelAnimationFrame(frame);frame=0;animation=null;diceButtons.forEach(el=>el.classList.remove('rolling','pulse'));}
  function tick(now){
    if(!animation||document.hidden)return;
    if(animation.last!==null)animation.elapsed+=Math.min(now-animation.last,50);
    animation.last=now;
    if(animation.elapsed>=animation.duration){
      const token=animation.token;clearAnimation();
      if(game.settle(token)){renderControls();renderReading();announce(`${game.result.name}. ${game.result.score} points. ${explanation(game.result)} ${game.previous?`Before ${game.previous.score}, after ${game.result.score}. `:''}${game.remaining} Favour remaining.${game.completed?' Round complete. Roll a fresh hand to play again.':''}`);}
    }else frame=requestAnimationFrame(tick);
  }
  function animate(token,kind){
    clearAnimation();renderControls();
    animation={token,elapsed:0,last:null,duration:motion.matches?280:kind==='roll'?650:420};
    if(!motion.matches)diceButtons.forEach((el,i)=>{if(kind==='roll'||i===game.selected)el.classList.add(kind==='roll'||kind==='full'?'rolling':'pulse');});
    if(kind==='roll'||kind==='full')playSound();
    frame=requestAnimationFrame(tick);
  }
  $('roll').addEventListener('click',event=>{if(event.detail>1)return;const token=game.roll();if(token!==null)animate(token,'roll');});
  for(const [id,kind] of [['turn','num'],['tint','hue'],['recast','full']])$(id).addEventListener('click',event=>{if(event.detail>1)return;const token=game.bend(kind);if(token!==null)animate(token,kind);});
  for(const id of ['roll','turn','tint','recast'])$(id).addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();});
  $('restart').addEventListener('click',()=>{clearAnimation();stopAudio();game.reset();renderControls();renderReading();announce('Table reset. Three Favour ready. Roll the Dice to begin.');$('roll').focus();});
  $('sound').addEventListener('click',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').textContent=sound?'Sound on':'Sound off';if(sound)playSound();else stopAudio();});
  document.addEventListener('visibilitychange',()=>{
    document.documentElement.classList.toggle('paused',document.hidden);
    cancelAnimationFrame(frame);if(animation)animation.last=null;
    if(document.hidden)stopAudio();else if(animation)frame=requestAnimationFrame(tick);
  });
  motion.addEventListener('change',()=>{if(motion.matches){diceButtons.forEach(el=>el.classList.remove('rolling','pulse'));if(animation)animation.duration=280;}});
  renderControls();renderReading();
})();
