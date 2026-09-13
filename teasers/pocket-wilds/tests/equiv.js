/* Runs INSIDE the real game page (index.html) with rules.js loaded alongside.
   Feeds identical seeded randomness and identical hero/boss state to the game's
   own functions and to the teaser port, and compares every number that comes
   out. Usage (from the browser console or the harness):
     await fetch('teaser/tests/equiv.js').then(r=>r.text()).then(eval)
   returns {pass, fail, details[]}. */
(async function(){
  const src=await fetch('teaser/rules.js').then(r=>r.text());
  const mod={exports:{}}; (new Function('module','exports',src))(mod,mod.exports); const PW=mod.exports;
  function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  const out={pass:0,fail:0,details:[]};
  // the game's audio layer picks random sample takes between the damage roll and the
  // flavor words, so verb / body-part choice diverges; every NUMBER must still match
  const mask=v=>typeof v==='string'?v.replace(/(SLASHES|CLEAVES|CUTS DEEP|GLANCES)/g,'<VERB>').replace(/(ACROSS THE HIDE|UNDER THE JAW|ACROSS THE FLANK|THROUGH THE GUARD|AT THE SHOULDER|ACROSS THE BROW|OFF THE HIDE|OFF ITS GUARD|ALONG THE FLANK)/g,'<PART>'):v;
  const norm=o=>JSON.parse(JSON.stringify(o),(k,v)=>mask(v));
  const eq=(name,a,b)=>{const ok=JSON.stringify(norm(a))===JSON.stringify(norm(b)); out[ok?'pass':'fail']++; if(!ok)out.details.push(name+': game='+JSON.stringify(a)+' teaser='+JSON.stringify(b));};

  // ---- the game side: a fresh knight forged exactly like the teaser hero, facing Mossback ----
  const realRandom=Math.random;
  newGame(); P.clsId='knight'; P.cls='KNIGHT';
  P.maxHp=60+25; P.hp=P.maxHp; P.wlv.sword=3; P.weapon='sword'; // LV3 = the teaser loadout (grants the FORGE d6)
  P.stats={str:14,dex:8,con:14,int:8,wis:8,cha:9}; P.maxHp+=24; P.hp=P.maxHp; P.maxStam=72; P.stam=72;
  P.perkDice=[8]; P.items={potion:1,bomb:1}; P.level=1; P.gear={head:null,body:null,legs:null,charm:null}; P.powers={};
  markCut('boss0'); seenCuts['boss0']=true;
  state='play'; B=null;
  startBattle({zi:0,x:P.x,y:P.y,defeated:false,cd:0});
  const gB=B;
  // ---- the teaser side: same hero numbers ----
  let gen=mulberry(1);
  const hero=PW.makeHero(); // sanity: forge math agrees
  eq('hero.maxHp',P.maxHp,hero.maxHp); eq('hero.maxStam',P.maxStam,hero.maxStam); eq('hero.stats',P.stats,hero.stats);
  const T=PW.createBattle({rng:()=>gen(),hero:Object.assign(hero,{}),bossHp:550});
  T.startBattle(); const tB=T.B;

  const seedBoth=s=>{gen=mulberry(s); Math.random=mulberry(s);};
  const syncState=(st)=>{ // push one battle situation into both worlds
    for(const k in st.B){gB[k]=st.B[k]; tB[k]=st.B[k];}
    for(const k in st.P){P[k]=st.P[k]; T.P[k]=st.P[k];}
    P.hp=st.P.hp; T.P.hp=st.P.hp; P.stam=st.P.stam; T.P.stam=st.P.stam;
  };
  // 1. pure maths
  for(const n of [2,3,4,5,6,7,8,9,10])eq('crackLimits('+n+')',crackLimits(n),T.crackLimits(n));
  eq('heroDicePool',heroDicePool(),T.heroDicePool());
  eq('heroDiceInfo.faces',heroDiceInfo(true).faces,T.heroDiceInfo(true).faces);
  eq('heroDiceInfo.nClass',heroDiceInfo(true).nClass,T.heroDiceInfo(true).nClass);
  eq('classWeaponBase',classWeaponBase(),T.classWeaponBase());
  seedBoth(11); const gc=poolCritAt([12,12,8,8,6,8],0.13); seedBoth(11); const tc=T.poolCritAt([12,12,8,8,6,8],0.13); eq('poolCritAt',gc,tc);
  for(const s of ['prowl','guard','exposed','windup'])for(const heavy of [false,true]){
    gB.stance=s; tB.stance=s; gB.chanBroken=false; tB.chanBroken=false;
    eq('stanceHit('+s+','+heavy+')',stanceHit(100,heavy,false),T.stanceHit(100,heavy,false));
  }
  gB.stance='channel';tB.stance='channel';gB.chanBroken=false;tB.chanBroken=false;
  eq('stanceHit(channel,heavy)',{...stanceHit(100,true,false)},{...T.stanceHit(100,true,false)});
  eq('stanceHit channel->forceStance',gB.forceStance,tB.forceStance);
  // 2. the strike, many pools and stances, identical seeds
  const pools=[
    {faces:[12,12,8,8,8],vals:[7,9,4,6,5],ch:['S','S','S','S','S']},
    {faces:[12,12,8,8,8],vals:[12,12,8,8,8],ch:['S','S','S','S','S']},
    {faces:[12,12,8,8,8],vals:[1,1,4,6,5],ch:['S','S','S','S','S']},
    {faces:[12,12,8,8,8],vals:[1,1,1,6,5],ch:['S','S','S','S','S']},
    {faces:[12,12,8,8,8],vals:[7,9,4,6,5],ch:['S','S','G','G','F']},
    {faces:[12,12,8,8,8],vals:[7,9,4,1,5],ch:['G','G','G','G','G']},
    {faces:[12,12,8,8,8],vals:[2,2,2,2,2],ch:['S','S','S','F','F']},
    {faces:[12,8,8,8],vals:[11,7,8,6],ch:['S','S','S','S']}
  ];
  let k=0;
  for(const st of ['prowl','guard','exposed','windup','channel'])for(const pool of pools){
    k++;
    const base={B:{stance:st,curse:false,wobble:false,lunge:false,chanBroken:false,forceStance:null,blockVal:0,momentum:1,hp:500,maxHp:550,saidLow:true},P:{hp:80,stam:60}};
    syncState(base); gB.atkPool={...pool,ch:[...pool.ch],faces:[...pool.faces],vals:[...pool.vals]}; tB.atkPool={...pool,ch:[...pool.ch],faces:[...pool.faces],vals:[...pool.vals]};
    seedBoth(100+k); const g=playerAttackResolve(); const gs={txt:g.txt,hp:gB.hp,stam:P.stam,mom:gB.momentum,block:gB.blockVal,force:gB.forceStance};
    seedBoth(100+k); const t=T.playerAttackResolve(); const ts={txt:t.txt,hp:tB.hp,stam:T.P.stam,mom:tB.momentum,block:tB.blockVal,force:tB.forceStance};
    eq('strike#'+k+' '+st+' '+pool.vals.join(','),gs,ts);
  }
  // 3. the boss's blow: plain / big / guarded / exposed / dodged (each d20) / blocked
  k=0;
  const blows=[{bigNow:false,lightMul:1,dodge:false},{bigNow:true,lightMul:1,dodge:false},{bigNow:false,lightMul:0.7,dodge:false},{bigNow:false,lightMul:0.5,dodge:false},
    ...[1,4,7,8,12,20].map(r=>({bigNow:false,lightMul:1,dodge:true,dodgeRoll:r})),
    ...[1,4,5,20].map(r=>({bigNow:true,lightMul:1,dodge:true,dodgeRoll:r})),
    {bigNow:false,lightMul:1,dodge:false,blockVal:5},{bigNow:false,lightMul:1,dodge:false,blockVal:40},{bigNow:true,lightMul:1,dodge:false,blockVal:40}];
  for(const bl of blows)for(const seed of [1,2,3]){
    k++;
    syncState({B:Object.assign({stance:'prowl',buff:false,enrage:false,hexed:false,shadow:false,blockVal:0,momentum:2,shatterT:0,forceStance:null,adv:false,hp:400,maxHp:550},bl),P:{hp:90,stam:50}});
    seedBoth(500+k); const gt=bossAttackResolve(); const gs={txt:gt,php:P.hp,bhp:gB.hp,mom:gB.momentum,sh:gB.shatterT,force:gB.forceStance,adv:gB.adv,block:gB.blockVal};
    seedBoth(500+k); const tt=T.bossAttackResolve(); const ts={txt:tt,php:T.P.hp,bhp:tB.hp,mom:tB.momentum,sh:tB.shatterT,force:tB.forceStance,adv:tB.adv,block:tB.blockVal};
    eq('blow#'+k+' '+JSON.stringify(bl),gs,ts);
  }
  // 4. stance choice: same seeds, same weights, same picks
  for(const setup of [{stance:'prowl',turn:0,hp:500},{stance:'prowl',turn:3,hp:500},{stance:'guard',turn:3,hp:500},{stance:'channel',turn:5,hp:150},{stance:'prowl',turn:4,hp:100,phase2:true}]){
    const picks=[[],[]];
    for(let s=1;s<=60;s++){
      syncState({B:Object.assign({forceStance:null,enrage:false,phase2:false},setup),P:{hp:50,stam:50}});
      seedBoth(900+s); picks[0].push(pickStance()); seedBoth(900+s); picks[1].push(T.pickStance());
    }
    eq('pickStance '+JSON.stringify(setup),picks[0],picks[1]);
  }
  // 5. potion + shield bash damage (bash: the value the roll callback would deal)
  syncState({B:{stance:'prowl'},P:{hp:30,stam:60}}); eq('potion',(usePotionHeal(true),P.hp),(T.usePotionHeal(),T.P.hp));
  // 6. the pool roll itself: same seed -> same faces, values, physics, crit verdict
  for(const seed of [7,8,9]){
    syncState({B:{shatterT:0,adv:false},P:{hp:80,stam:60}});
    seedBoth(seed); startPoolRoll('ATTACK ROLL',()=>{}); const gp={f:gB.poolFaces,v:gB.poolVals,crit:gB.poolCrit,ones:gB.poolOnes,lim:gB.poolLim,d:gB.poolDice.map(d=>[d.x,d.vx,d.rest,d.lockAt])};
    seedBoth(seed); T.startBattleUpdateSafe&&0; tB.phase='menu'; T.battleKey('escape'); // no-op guard
    seedBoth(seed); (function(){ tB.menu='main'; tB.mi=0; tB.adv=false; })();
    // call the teaser's startPoolRoll through ATTACK / ROLL confirm (same entry the player uses)
    seedBoth(seed); tB.phase='menu'; T.battleConfirm(); const tp={f:tB.poolFaces,v:tB.poolVals,crit:tB.poolCrit,ones:tB.poolOnes,lim:tB.poolLim,d:tB.poolDice.map(d=>[d.x,d.vx,d.rest,d.lockAt])};
    eq('startPoolRoll seed '+seed,gp,tp);
    // shattered pool: biggest die drops out on both sides
    syncState({B:{shatterT:1},P:{hp:80,stam:60}});
    seedBoth(seed+50); startPoolRoll('ATTACK ROLL',()=>{}); const gsf={f:gB.poolFaces,label:gB.poolLabel,sh:gB.shatterT};
    seedBoth(seed+50); tB.phase='menu'; tB.shatterT=1; T.battleConfirm(); const tsf={f:tB.poolFaces,label:tB.poolLabel,sh:tB.shatterT};
    eq('shattered pool seed '+seed,gsf,tsf);
  }
  Math.random=realRandom;
  state='title'; B=null;
  return out;
})();
