(() => {
  'use strict';
  const R=globalThis.GFRules,game=new globalThis.GFToy(),$=id=>document.getElementById(id);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const names={num:'TURN',hue:'TINT',full:'RECAST'};
  const tutorialVoice={
    start:['morrow_tutorial_welcome.mp3','tutorial_01_pair.mp3'],
    1:['tutorial_02_turn.mp3'], 2:['tutorial_03_tint.mp3'],
    3:['tutorial_04_full_house_choice.mp3'], 4:['tutorial_05_full_house_turn.mp3'],
    5:['tutorial_04_cast.mp3'], 6:['tutorial_05_complete.mp3','tutorial_07_playtest_invite.mp3']
  };
  const choiceCueAt={
    'tutorial_01_pair.mp3':{step:0,seconds:5},
    'tutorial_04_full_house_choice.mp3':{step:3,seconds:10.4}
  };
  const handVoice={
    SCATTERED:'hand_poor_omen.mp3',PAIR:'hand_pair.mp3',TWINPAIR:'hand_twin_pair.mp3',TRIAD:'hand_triad.mp3',STRAIGHT:'hand_glass_run.mp3',FULLHOUSE:'hand_full_house.mp3',FOURFOLD:'hand_fourfold.mp3',FLUSH:'hand_stained_flush.mp3',SPECTRUM:'hand_full_spectrum.mp3',FIVEFOLD:'hand_five_of_fortune.mp3',NOVA:'hand_perfect_fortune.mp3',SPECTRUM_FIVE:'hand_prismatic_five.mp3',STAINED_STRAIGHT:'hand_stained_run.mp3',SPECTRUM_STRAIGHT:'hand_spectrum_run.mp3',STAINED_FOURFOLD:'hand_stained_fourfold.mp3',SPECTRUM_FOURFOLD:'hand_spectrum_fourfold.mp3',STAINED_FULLHOUSE:'hand_stained_full_house.mp3',SPECTRUM_FULLHOUSE:'hand_spectrum_full_house.mp3',STAINED_TRIAD:'hand_stained_triad.mp3',SPECTRUM_TRIAD:'hand_spectrum_triad.mp3',STAINED_TWINPAIR:'hand_stained_twin_pair.mp3',SPECTRUM_TWINPAIR:'hand_spectrum_twin_pair.mp3',STAINED_PAIR:'hand_stained_pair.mp3',SPECTRUM_PAIR:'hand_spectrum_pair.mp3'
  };
  const steps=[
    ['Select the circled Cobalt 2.','You already have two 3s: a Pair. The white circle points to the die to choose; it is not selected yet. Select it so we can make another 3.'],
    ['Press TURN: 2 becomes 3.','TURN raises only the number. Three matching numbers make a Triad. This costs 1 Favour.'],
    ['Press TINT: Cobalt becomes Jade.','You have two Cobalt dice and no Jade. TINT changes the selected Cobalt to Jade, giving you five different colours. Your three 3s stay the same: the Triad becomes a stronger Spectrum Triad.'],
    ['Select the circled Amber 5.','Now all five colours are different: Garnet, Cobalt, Jade, Amber and Violet. Your score rose from 145 to 583! RECAST is a gamble; TURN can guarantee another improvement. Choose the circled Amber 5.'],
    ['Press TURN: 5 becomes 6.','A second 6 completes a Full House: three 3s and two 6s. All five colours are different too.'],
    ['Press Cast This Hand.','Your hand is worth 678 points. Casting banks all five dice together and completes this practice Reading.']
  ];
  let frame=0,animation=null,sound=true,voiceEnabled=true,music=null,effect=null,voice=null,voiceQueue=[],voiceRevision=0,choiceCueStep=-1;
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
    return ({0:diceButtons[2],1:$('turn'),2:$('tint'),3:diceButtons[3],4:$('turn'),5:$('cast'),6:$('playtest-link')})[game.step];
  }
  function focusNext(){
    if(game.mode!=='tutorial'||game.busy)return;
    if([0,3].includes(game.step)&&choiceCueStep!==game.step){$('coach-title').focus({preventScroll:true});return;}
    guidedTarget()?.focus({preventScroll:true});
  }
  function revealChoiceCue(step=game.step){
    if(game.mode!=='tutorial'||game.busy||game.step!==step||![0,3].includes(step))return;
    choiceCueStep=step;render();guidedTarget()?.focus({preventScroll:true});
  }
  function armChoiceCue(file,audio){
    const cue=choiceCueAt[file];if(!cue||game.step!==cue.step)return;
    if(!audio){revealChoiceCue(cue.step);return;}
    const reveal=()=>{if(audio.currentTime+.04<cue.seconds)return;audio.removeEventListener('timeupdate',reveal);revealChoiceCue(cue.step);};
    audio.addEventListener('timeupdate',reveal);audio.addEventListener('ended',()=>revealChoiceCue(cue.step),{once:true});reveal();
  }
  function updateChoiceMarker(){
    const marker=$('tutorial-choice-marker'),target=document.querySelector('.tutorial-choice');
    const hidden=!target||game.mode!=='tutorial'||game.busy;
    marker.toggleAttribute('hidden',hidden);
    if(hidden)return;
    const r=target.getBoundingClientRect();
    Object.assign(marker.style,{left:`${r.left-17}px`,top:`${r.top-17}px`,width:`${r.width+34}px`,height:`${r.height+34}px`});
  }
  addEventListener('resize',updateChoiceMarker);
  addEventListener('scroll',updateChoiceMarker,{passive:true});
  new ResizeObserver(updateChoiceMarker).observe($('board'));
  function select(i){
    if(!game.select(i)){if(game.mode==='tutorial'&&!game.busy)announce(coachText().join(' '));return;}
    render();announce(coachText().join(' '));focusNext();
    if(game.mode==='tutorial')speak(tutorialVoice[game.step]);else speak('morrow_die_selected.mp3');
  }
  function render(){
    $('welcome').hidden=game.mode!=='welcome';$('board').hidden=game.mode==='welcome';
    $('board').dataset.busy=String(game.busy);$('board').dataset.phase=game.phase;$('board').dataset.mode=game.mode;
    if(game.mode==='welcome'){$('tutorial-choice-marker').setAttribute('hidden','');return;}
    const tutorial=game.mode==='tutorial',done=game.phase==='done';
    $('mode-label').textContent=tutorial?'Guided practice · Morrow’s table':'Reading I · website demo';
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
    $('playtest-invite').hidden=!tutorial;
    $('next').classList.toggle('primary',!tutorial);$('next').classList.toggle('text-button',tutorial);
    $('next').textContent=tutorial?'Play Reading I →':'Play First Omen Again →';
    $('help').hidden=tutorial||done;
    document.querySelectorAll('.tutorial-target,.tutorial-choice').forEach(el=>el.classList.remove('tutorial-target','tutorial-choice'));
    if(tutorial&&!game.busy){
      if([0,3].includes(game.step)){if(choiceCueStep===game.step)guidedTarget()?.classList.add('tutorial-choice');}
      else guidedTarget()?.classList.add('tutorial-target');
    }
    updateChoiceMarker();
  }
  function syncMusic(){
    if(!sound||document.hidden){music?.pause();return;}
    const track=game.mode==='reading'?'reading.mp3':'tutorial.mp3';
    if(!music||music.dataset.track!==track){music?.pause();music=new Audio('assets/'+track);music.dataset.track=track;music.loop=true;music.preload='none';music.volume=.28;}
    music.volume=voice&&!voice.paused ? .06 : .28;
    music.play().catch(()=>{}); // A browser can require the next user gesture; the controls stay usable.
  }
  function stopVoice(){
    voiceRevision++;
    voiceQueue=[];
    if(voice){voice.pause();voice.currentTime=0;voice=null;}
    if(music&&sound)music.volume=.28;
  }
  function speak(files){
    const queue=(Array.isArray(files)?files:[files]).filter(Boolean);
    if(!voiceEnabled||document.hidden||!queue.length){if(game.mode==='tutorial'&&[0,3].includes(game.step))revealChoiceCue();return;}
    stopVoice();voiceQueue=queue;const revision=voiceRevision;
    const next=()=>{
      if(revision!==voiceRevision)return;
      const file=voiceQueue.shift();
      if(!file){if(music&&sound)music.volume=.28;return;}
      voice=new Audio('assets/voice/'+file);voice.preload='auto';voice.volume=.92;
      if(music&&sound)music.volume=.06;
      let advanced=false;const advance=()=>{if(advanced)return;advanced=true;next();};
      voice.addEventListener('playing',()=>armChoiceCue(file,voice),{once:true});
      voice.addEventListener('ended',advance,{once:true});
      voice.addEventListener('error',()=>{armChoiceCue(file,null);advance();},{once:true});
      voice.play().catch(()=>{if(music&&sound)music.volume=.28;armChoiceCue(file,null);advance();});
    };
    next();
  }
  function speakAfterSettle(operation){
    if(game.mode==='tutorial'){
      if(operation==='bend')speak(tutorialVoice[game.step]);
      else if(operation==='cast')speak(tutorialVoice[6]);
      return;
    }
    if(operation==='roll')speak('choose_a_die.mp3');
    else if(operation==='bend'){
      if(game.previous&&game.result.score<game.previous.score)speak('morrow_bad_bend_01.mp3');
      else if(game.remaining===0)speak('morrow_favour_empty.mp3');
    }else if(operation==='cast'){
      const reaction=game.phase==='done'&&game.total>=game.target?'morrow_reading_complete_01.mp3':game.result.score>=150?'morrow_strong_cast_01.mp3':game.result.score<45?'morrow_weak_cast_01.mp3':'morrow_general_cast_01.mp3';
      speak([handVoice[game.result.key],reaction]);
    }
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
      const token=animation.token,operation=game.pending;clearAnimation();
      if(game.settle(token)){render();announce(`${coachText().join(' ')} ${game.result.name}. ${game.result.score} points. ${game.remaining} Favour left.`);focusNext();speakAfterSettle(operation);if(game.phase==='done')(game.mode==='tutorial'?$('playtest-link'):$('outcome-title')).focus({preventScroll:true});}
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
    clearAnimation();stopEffects();choiceCueStep=-1;if(mode==='tutorial')game.tutorial();else game.reading();
    render();syncMusic();if(mode==='tutorial'){focusNext();speak(tutorialVoice.start);}else{ $('roll').focus({preventScroll:true});speak('reading_01_first_omen.mp3'); }
    $('board').scrollIntoView({block:'start',behavior:'instant'});announce(coachText().join(' '));
  }
  function click(id,handler){$(id).addEventListener('click',event=>{if(event.detail>1)return;handler();});$(id).addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();});}
  click('start',()=>begin('tutorial'));click('skip',()=>begin('reading'));click('next',()=>{if(game.phase==='done')begin('reading');});
  click('help',()=>begin('tutorial'));click('replay-lesson',()=>begin('tutorial'));
  click('roll',()=>animate(game.roll(),'roll'));click('cast',()=>animate(game.cast(),'cast'));
  for(const [id,kind] of [['turn','num'],['tint','hue'],['recast','full']])click(id,()=>animate(game.bend(kind),kind));
  for(const [id,kind] of [['sort-number','number'],['sort-colour','colour']])click(id,()=>{if(game.sort(kind)){render();announce('Dice arranged by '+kind+'.');}});
  click('restart',()=>{clearAnimation();stopEffects();stopVoice();music?.pause();choiceCueStep=-1;game.reset();render();$('start').focus();announce('Restarted. Begin the guided hand or skip to Reading I.');});
  click('sound',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').textContent=sound?'Music on':'Music off';$('music-note').textContent=sound?'Game music and Morrow start when you begin. Mute either at any time.':'Music is off. Morrow can still guide you.';if(!sound)stopEffects();syncMusic();});
  click('voice',()=>{voiceEnabled=!voiceEnabled;$('voice').setAttribute('aria-pressed',String(voiceEnabled));$('voice').textContent=voiceEnabled?'Morrow on':'Morrow off';if(!voiceEnabled){stopVoice();revealChoiceCue();}});
  document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('paused',document.hidden);cancelAnimationFrame(frame);if(animation)animation.last=null;if(document.hidden){music?.pause();stopEffects();stopVoice();}else{if(game.mode!=='welcome')syncMusic();if(animation)frame=requestAnimationFrame(tick);revealChoiceCue();}});
  motion.addEventListener('change',()=>{if(motion.matches){diceButtons.forEach(el=>el.classList.remove('rolling','pulse'));if(animation)animation.duration=280;}});
  render();
})();

