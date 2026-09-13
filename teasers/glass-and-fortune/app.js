(() => {
  'use strict';
  const R=globalThis.GFRules,game=new globalThis.GFToy(),$=id=>document.getElementById(id);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const names={num:'TURN',hue:'TINT',full:'RECAST'};
  const steps=[
    ['Select the Cobalt 2.','You already have two 3s: a Pair. Select the highlighted third die so we can make another 3.'],
    ['Press TURN: 2 becomes 3.','TURN raises only the number. Three matching numbers make a Triad. This costs 1 Favour.'],
    ['Press TINT: Cobalt becomes Jade.','TINT moves one colour to the right in the guide. Five different colours strengthen your Triad.'],
    ['Select the Amber 5.','RECAST rerolls both number and colour, so it is a gamble. Here, TURN can guarantee a stronger hand. Select the highlighted Amber die.'],
    ['Press TURN: 5 becomes 6.','A second 6 completes a Full House: three 3s and two 6s. All five colours are different too.'],
    ['Press Cast This Hand.','Your hand is worth 678 points. Casting banks all five dice together and completes this practice Reading.']
  ];
  let frame=0,animation=null,sound=true,music=null,effect=null;
  const diceButtons=Array.from({length:5},(_,i)=>{
    const el=document.createElement('button');el.className='die';el.type='button';
    el.innerHTML='<span class="sigil" aria-hidden="true"></span><span class="pip" aria-hidden="true"></span><span class="cname" aria-hidden="true"></span>';
    el.addEventListener('click',()=>select(i));
    el.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||game.busy||game.phase!=='live')return;
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?4:(i+(event.key==='ArrowLeft'?4:1))%5;
      if(game.mode==='tutorial'){diceButtons[next].focus();return;}
      select(next);diceButtons[next].focus();
    });
    $('tray').append(el);return el;
  });
  $('colour-guide').innerHTML=R.COLORS.map(c=>`<span class="colour-chip" data-colour="${c.id}" style="--c:${c.hex}"><b aria-hidden="true">${c.symbol}</b>${c.name}</span>`).join('');
  function announce(text){$('announcement').textContent=text;}
  function colour(id){return R.COLORS.find(c=>c.id===id);}
  function describe(d){return `${colour(d.c).name} ${d.n}`;}
  function disabled(id,value){$(id).setAttribute('aria-disabled',String(value));}
  function explanation(r){
    const number={FIVEFOLD:'All five dice show the same number',FOURFOLD:'Four dice share a number',FULLHOUSE:'Three of one number and two of another',STRAIGHT:'Five numbers in sequence',TRIAD:'Three dice share a number',TWINPAIR:'Two separate pairs of matching numbers',PAIR:'Two dice share a number',SCATTERED:'No matching numbers or five-number run'}[r.ev.numberKey];
    return number+(r.ev.allSameColor?'; all five share one colour':r.ev.allDiffColor?'; all five have different colours':'')+'.';
  }
  function coachText(){
    if(game.mode==='tutorial')return game.step<6?steps[game.step]:['You persuaded fate.','You made a Spectrum Full House. Now try one Reading with your own dice.'];
    if(game.phase==='awaiting')return ['Your turn. Roll five dice.','Reach 80 points in up to three casts. Each cast gives you three Favour to bend your dice before banking the hand.'];
    if(game.phase==='between')return ['Your score is banked. Roll again.',`${game.total} points banked. You need ${game.target-game.total} more. Your next cast brings three fresh Favour.`];
    if(game.phase==='done')return game.total>=game.target?['First Omen complete.','You reached the target. That is one Reading: roll, bend, then cast.']:['The glass has the last word.','You used all three casts. Try First Omen again with a fresh set of dice.'];
    if(game.remaining===0)return ['No Favour left. Cast your hand.','Bending is finished for this cast. Press Cast This Hand to add its points to your Reading score.'];
    if(game.selected<0)return ['Read your hand. Choose a die.',`Select one die to try TURN, TINT or RECAST. You can also cast this hand now for ${game.result.score} points without spending Favour.`];
    return [`${describe(game.dice[game.selected])} selected.`,'TURN raises its number. TINT advances its colour. RECAST randomly rolls both. Each costs 1 Favour; cast whenever you are ready.'];
  }
  function guidedTarget(){
    return ({0:diceButtons[2],1:$('turn'),2:$('tint'),3:diceButtons[3],4:$('turn'),5:$('cast'),6:$('next')})[game.step];
  }
  function focusNext(){if(game.mode==='tutorial'&&!game.busy)guidedTarget()?.focus({preventScroll:true});}
  function select(i){
    if(!game.select(i)){if(game.mode==='tutorial'&&!game.busy)announce(coachText().join(' '));return;}
    render();announce(coachText().join(' '));focusNext();
  }
  function render(){
    $('welcome').hidden=game.mode!=='welcome';$('board').hidden=game.mode==='welcome';
    $('board').dataset.busy=String(game.busy);$('board').dataset.phase=game.phase;$('board').dataset.mode=game.mode;
    if(game.mode==='welcome')return;
    const tutorial=game.mode==='tutorial',done=game.phase==='done';
    $('mode-label').textContent=tutorial?'Guided practice · follow the highlight':'Reading I · website demo';
    $('reading-title').textContent=tutorial?'Morrow stacked the glass.':R.FIRST_READING.name;
    $('total').textContent=game.total;$('target').textContent=game.target;
    $('needed').textContent=game.total>=game.target?'Target reached':`${game.target-game.total} needed to pass`;
    $('progress').setAttribute('aria-valuemax',game.target);$('progress').setAttribute('aria-valuenow',Math.min(game.total,game.target));
    $('progress').setAttribute('aria-valuetext',`${game.total} of ${game.target} points`);
    $('progress-fill').style.width=Math.min(100,game.total/game.target*100)+'%';
    const [title,copy]=coachText();$('coach-title').textContent=title;$('coach-copy').textContent=copy;
    $('step-label').textContent=tutorial?(done?'Practice complete':`Morrow’s lesson · ${game.step+1} / 6`):'Morrow’s table tip';
    const shown=game.dice.length?game.dice:R.TUTORIAL_DICE;
    diceButtons.forEach((el,i)=>{
      const d=shown[i],c=colour(d.c);el.style.setProperty('--c',c.hex);
      el.querySelector('.pip').textContent=d.n;el.querySelector('.sigil').textContent=c.symbol;el.querySelector('.cname').textContent=c.name;
      el.classList.toggle('preview',!game.dice.length);el.classList.toggle('sel',game.selected===i);
      el.setAttribute('aria-label',`${!game.dice.length?'Example ':''}die ${i+1}, ${c.name}, ${c.symbol}, number ${d.n}`);
      el.setAttribute('aria-pressed',String(game.selected===i));el.setAttribute('aria-disabled',String(!game.canSelect(i)));
      el.tabIndex=game.dice.length?0:-1;
    });
    $('selection').textContent=game.busy?'The glass is settling…':!game.dice.length?'Five example dice. Roll to get your own hand.':game.selected<0?'Select one die. All five still score together.':`Selected: die ${game.selected+1} · ${describe(game.dice[game.selected])}`;
    const selected=game.dice[game.selected],ci=selected?R.COLORS.findIndex(c=>c.id===selected.c):-1;
    document.querySelectorAll('[data-colour]').forEach((el,i)=>{el.classList.toggle('current',i===ci);el.classList.toggle('next',ci>=0&&i===(ci+1)%6);});
    $('colour-note').textContent=selected?`${colour(selected.c).name} → next TINT: ${R.COLORS[(ci+1)%6].name}`:'One step to the right. Sea Glass wraps to Garnet.';
    for(const [id,kind] of [['turn','num'],['tint','hue'],['recast','full']])disabled(id,!game.canBend(kind));
    $('turn-detail').textContent=selected?`${selected.n} → ${selected.n%6+1} · 1 Favour`:'Raise number · 1 Favour';
    $('tint-detail').textContent=selected?`${colour(selected.c).name} → ${R.COLORS[(ci+1)%6].name} · 1 Favour`:'Next colour · 1 Favour';
    for(const id of ['sort-number','sort-colour'])disabled(id,tutorial||game.busy||game.phase!=='live');
    $('casts-left').textContent=game.castsLeft;$('allowance').textContent=`${game.remaining} / 3 Favour`;
    $('favours').textContent=Array.from({length:3},(_,i)=>i<game.remaining?'◆':'◇').join(' ');
    const r=game.result;
    $('hand-name').textContent=r?r.name:'Your hand awaits';
    $('result-label').textContent=done||game.phase==='between'?'Last hand · score banked':'Current hand · not yet cast';
    $('score').textContent=r?r.score:'—';$('explanation').textContent=r?explanation(r):'Roll first. Then you can change a die or cast the hand.';
    const diff=game.previous?r.score-game.previous.score:0;
    $('delta').textContent=game.previous?(diff===0?'No change':`${diff>0?'+':'−'}${Math.abs(diff)} after ${names[game.last.kind]}`):'';
    $('change').textContent=game.last?`${names[game.last.kind]}: ${describe(game.last.before)} → ${describe(game.last.after)}. Score ${game.previous.score} → ${r.score}.`:'';
    $('formula').textContent=r?`(${R.HANDS[r.key].chips} hand chips + ${r.pipSum} number total) × ${r.mult} = ${r.score}, rounded. All five dice count.`:'Your hand score will appear here.';
    $('roll').hidden=tutorial||!['awaiting','between'].includes(game.phase);
    $('roll').textContent=game.phase==='between'?'Roll the Next Cast':'Roll the Dice';disabled('roll',game.busy);
    $('cast').hidden=done||game.phase==='awaiting'||game.phase==='between';disabled('cast',!game.canCast());
    $('cast-hint').textContent=tutorial&&game.step<5?'Follow the highlighted step. We’ll cast the finished hand together.':done?'Reading finished.':game.phase==='between'?'Three fresh Favour with the next cast.':game.phase==='awaiting'?'Roll first. The Reading begins here.':`Cast to bank ${r.score} points. Unspent Favour is fine.`;
    $('bend-hint').textContent=tutorial&&game.step<6?steps[game.step][0]:done?'Reading complete.':game.remaining===0?'All Favour spent. You can still cast this hand.':'Each bend costs 1 Favour. TURN wraps 6 → 1; RECAST can roll the same values.';
    $('rule-text').textContent=tutorial?'Practise TURN and TINT; learn when RECAST is a gamble.':'An open table. Learn what the glass can do.';
    $('outcome').hidden=!done;
    $('outcome-title').textContent=tutorial?'Practice complete · 678 points':game.total>=game.target?'First Omen complete.':'A new fortune is waiting.';
    $('outcome-copy').textContent=tutorial?'You took a Pair worth 51 points to a Spectrum Full House worth 678. Now try First Omen: target 80, up to three casts, three Favour per cast.':`You banked ${game.total} points against a target of ${game.target}. ${game.total>=game.target?'You have learned the rhythm of the table.':'Try again; the next hand may tell a different story.'}`;
    $('next').textContent=tutorial?'Play Reading I →':'Play First Omen Again →';
    $('help').hidden=tutorial||done;
    document.querySelectorAll('.tutorial-target').forEach(el=>el.classList.remove('tutorial-target'));
    if(tutorial&&!game.busy)guidedTarget()?.classList.add('tutorial-target');
  }
  function syncMusic(){
    if(!sound||document.hidden){music?.pause();return;}
    const track=game.mode==='reading'?'reading.mp3':'tutorial.mp3';
    if(!music||music.dataset.track!==track){music?.pause();music=new Audio('assets/'+track);music.dataset.track=track;music.loop=true;music.preload='none';music.volume=.28;}
    music.play().catch(()=>{}); // A browser can require the next user gesture; the controls stay usable.
  }
  function stopEffects(){if(effect){effect.pause();effect.currentTime=0;}}
  function playEffect(){
    if(!sound||document.hidden)return;
    if(!effect){effect=new Audio('assets/roll.wav');effect.volume=.25;effect.preload='none';}
    effect.currentTime=0;effect.play().catch(()=>{});
  }
  function clearAnimation(){cancelAnimationFrame(frame);frame=0;animation=null;diceButtons.forEach(el=>el.classList.remove('rolling','pulse'));}
  function tick(now){
    if(!animation||document.hidden)return;
    if(animation.last!==null)animation.elapsed+=now-animation.last;
    animation.last=now;
    if(animation.elapsed>=animation.duration){
      const token=animation.token;clearAnimation();
      if(game.settle(token)){render();announce(`${coachText().join(' ')} ${game.result.name}. ${game.result.score} points. ${game.remaining} Favour left.`);focusNext();if(game.phase==='done')$('outcome-title').focus({preventScroll:true});}
    }else frame=requestAnimationFrame(tick);
  }
  function animate(token,kind){
    if(token===null)return;
    clearAnimation();render();animation={token,elapsed:0,last:null,duration:motion.matches?280:kind==='roll'?560:400};
    if(!motion.matches)diceButtons.forEach((el,i)=>{if(kind==='roll'||kind==='cast'||i===game.selected)el.classList.add(kind==='roll'?'rolling':'pulse');});
    if(kind==='roll'||kind==='full')playEffect();
    syncMusic();frame=requestAnimationFrame(tick);
  }
  function begin(mode){
    clearAnimation();stopEffects();if(mode==='tutorial')game.tutorial();else game.reading();
    render();syncMusic();if(mode==='tutorial')focusNext();else $('roll').focus({preventScroll:true});
    $('board').scrollIntoView({block:'start',behavior:'instant'});announce(coachText().join(' '));
  }
  function click(id,handler){$(id).addEventListener('click',event=>{if(event.detail>1)return;handler();});$(id).addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();});}
  click('start',()=>begin('tutorial'));click('skip',()=>begin('reading'));click('next',()=>{if(game.phase==='done')begin('reading');});
  click('help',()=>begin('tutorial'));click('replay-lesson',()=>begin('tutorial'));
  click('roll',()=>animate(game.roll(),'roll'));click('cast',()=>animate(game.cast(),'cast'));
  for(const [id,kind] of [['turn','num'],['tint','hue'],['recast','full']])click(id,()=>animate(game.bend(kind),kind));
  for(const [id,kind] of [['sort-number','number'],['sort-colour','colour']])click(id,()=>{if(game.sort(kind)){render();announce('Dice arranged by '+kind+'.');}});
  click('restart',()=>{clearAnimation();stopEffects();music?.pause();game.reset();render();$('start').focus();announce('Restarted. Begin the guided hand or skip to Reading I.');});
  click('sound',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').textContent=sound?'Music on':'Music off';$('music-note').textContent=sound?'Game music starts when you begin. Mute it at any time.':'Music is off. You can turn it on at any time.';if(!sound)stopEffects();syncMusic();});
  document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('paused',document.hidden);cancelAnimationFrame(frame);if(animation)animation.last=null;if(document.hidden){music?.pause();stopEffects();}else{if(game.mode!=='welcome')syncMusic();if(animation)frame=requestAnimationFrame(tick);}});
  motion.addEventListener('change',()=>{if(motion.matches){diceButtons.forEach(el=>el.classList.remove('rolling','pulse'));if(animation)animation.duration=280;}});
  render();
})();

