/* ============================================================================
   POCKET WILDS — boss-fight dice battle, extracted for the website teaser.

   Every rule below is ported line-for-line from index.html (BUILD 21-AUG-EJ):
   heroDiceInfo / crackLimits / poolCritAt / startPoolRoll / poolReroll /
   playerAttackResolve / stanceHit / pickStance / bossAct / bossAttackResolve /
   classMove (SHIELD BASH) / doUltimate / battleUpdate. The random-number source
   is injectable so the node test-suite can run the same seeds through this file
   and through the real game and compare the numbers.

   DELIBERATE TEASER TUNING (see TUNING.md) — everything else is the game:
     * encounter length: the hero's sword is forged to LV.3 (the game's forge
       needs shards for that); Mossback keeps his true 550 HP / 12 ATK
     * FLEE removed from the command menu (nowhere to flee to)
     * a message can be skipped early with a click / key (the game waits it out)
     * victory / defeat end in an overlay instead of the overworld
   ============================================================================ */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PWBattle=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';

const VW=480, VH=288, HERO_CX=92, EN_CX=392;
const SCALE_BOSS=0.05, SCALE_BOSS_ATK=0.02;

/* ---------------- verbatim game data ---------------- */
const CLASS_DICE={knight:[12,12,8,8],lancer:[8,6,6,6,6],mystic:[20,20],shade:[20,6,6,6]};
const WEAPONS={
  sword:{name:'SWORD',dmg:9, cd:0.34,stam:9, ico:'swordIco'},
  spear:{name:'SPEAR',dmg:13,cd:0.52,stam:13,ico:'spearIco'},
  wand:{name:'WAND', dmg:8, cd:0.44,stam:15,ico:'wandIco'}
};
const CLASS_MOVES={knight:{name:'SHIELD BASH',cost:25},lancer:{name:'PIERCING LUNGE',cost:30},mystic:{name:'HEX',cost:30},shade:{name:'SHADOW STEP',cost:35}};
const ULT_NAMES={knight:'CROWNBREAKER BLOW',lancer:'HEARTPIERCER DIVE',mystic:'ARCANE RUIN',shade:'NIGHTFALL'};
const ULT_COLS={knight:'#8ab4ff',lancer:'#7ee787',mystic:'#b08aff',shade:'#b04aff'};
const STANCES={
  prowl:  {name:'PROWLING',   col:'#9aa3c0'},
  windup: {name:'WINDING UP', col:'#ff5a3a'},
  guard:  {name:'GUARDING',   col:'#8ab4ff'},
  channel:{name:'CHANNELING', col:'#b07aff'},
  exposed:{name:'EXPOSED!',   col:'#7ee787'}
};
const FUMBLES=[
 {t:'YOU TRIP OVER YOUR OWN FEET!',self:0.04},
 {t:'YOUR WEAPON SLIPS RIGHT OUT OF YOUR HANDS!'},
 {t:'YOU SWING AT A SUSPICIOUS SHADOW. IT WAS NOTHING.'},
 {t:'A BEE ZIPS PAST YOUR NOSE! TOTAL WHIFF!'},
 {t:'YOU STUMBLE... INTO A LUCKY HEADBUTT!',lucky:0.5}
];
const BOSS_WHIFFS=[' LUNGES... AND MISSES COMPLETELY!',' TRIPS OVER ITS OWN FURY!',"'S ATTACK WHIFFS OVER YOUR HEAD!"];
const WVERB={sword:['SLASHES','CLEAVES','CUTS DEEP'],spear:['PIERCES','SKEWERS','DRIVES HOME'],wand:['SEARS','SCORCHES','BLASTS']};
const HIT_PARTS=['ACROSS THE HIDE','UNDER THE JAW','ACROSS THE FLANK','THROUGH THE GUARD','AT THE SHOULDER','ACROSS THE BROW'];
const GLANCE_PARTS=['OFF THE HIDE','OFF ITS GUARD','ALONG THE FLANK'];
const BOSS_COL='#ff8a6a';
const MOSSBACK={name:'MOSSBACK THE ELDER',base:'slime',tint:null,hp:550,atk:12,
  lore:'IT REMEMBERS BEING SMALL. IT REMEMBERS BEING FED.',
  outro:'THE POND BEAST SLEEPS AT LAST.',
  spcTxt:'MOSSBACK ABSORBS MOSS... +18 HP',spc:'heal',
  teleTxt:'MOSSBACK COILS FOR A CRUSHING SLAM...',
  boon:{txt:'MOSS HEART: +15 MAX HP'}};
const BOSS_CHAT={ // zone 0 only — the pond
  taunt:['GO BACK, LITTLE ONE... THE POND KEEPS WHAT IT IS GIVEN.','ANOTHER WARM THING COMES TO FEED THE POND.'],
  batk:['THE POND SWALLOWS ALL...','SINK... SINK AND STAY...','IT ONLY HURTS UNTIL YOU STOP.'],
  low:['WHY... THE POND ONLY WANTED TO KEEP YOU...','IT REMEMBERS BEING SMALL... IT DOES NOT WANT TO BE SMALL AGAIN...'],
  bdie:['AT LAST... THE POND... LETS GO...','SMALL... AGAIN... AND THE WATER... SO QUIET...']
};
const PHASE_LINE='THE POND CHURNS - MOSSBACK WILL NOT BE EMPTIED! (it mends its wounds now)';
const CLASS_STATS={knight:{str:3,con:3,cha:1},lancer:{dex:4,con:2,str:1},mystic:{int:4,wis:2,dex:1},shade:{dex:3,int:3,cha:1}};

/* the teaser's fixed encounter (documented in TUNING.md) */
const TUNING={bossHp:550, msgSkip:true}; // Mossback's real HP - the loadout does the shortening

/* ---------------- the predefined hero ----------------
   A freshly forged level-1 knight, exactly as the forge would build one:
   base 60 HP / 60 ST, knight class (+25 HP, sword LV.2), class stats
   (STR+3 CON+3 CHA+1), the 6 creation points spent STR+3 CON+3 (CON grants
   +4 HP / +2 ST per point), one starting boon: OCTAVE (+1d8 joins the pool),
   and the starting kit of 1 potion and 1 bomb.
   TEASER LOADOUT: the sword has been forged once more, to LV.3 (which also
   grants the FORGE d6 bonus die) - this is what shortens the fight to a few
   minutes against Mossback's TRUE 550 HP. See TUNING.md for the numbers. */
function makeHero(){
  const P={name:'THE KNIGHT',clsId:'knight',level:1,
    hp:60,maxHp:60,stam:60,maxStam:60,atkMul:1,crit:0.08,leech:0,
    stats:{str:8,dex:8,con:8,int:8,wis:8,cha:8},powers:{},gear:{head:null,body:null,legs:null,charm:null},
    weapon:'sword',wlv:{sword:1,spear:1,wand:1},perkDice:[],items:{potion:1,bomb:1},
    dead:false,phoenixUsed:false,avatar:'av_knight_m1'};
  P.maxHp+=25; P.hp+=25; P.wlv.sword=2;                 // CLASSES.knight.apply()
  const b=CLASS_STATS.knight; for(const k in b)P.stats[k]+=b[k];
  P.stats.str+=3; P.stats.con+=3;                        // the creation pool (CREATE_POOL=6)
  const cd=P.stats.con-8; P.maxHp+=cd*4; P.hp+=cd*4; P.maxStam+=cd*2; P.stam+=cd*2; // applyConDelta
  P.perkDice.push(8);                                    // OCTAVE
  P.wlv.sword=3;                                         // teaser loadout: one extra forging
  return P;
}

function createBattle(opts){
  opts=opts||{};
  const R=opts.rng||Math.random;
  const rnd=(a=1,b)=>b===undefined?R()*a:a+R()*(b-a);
  const irnd=(a,b)=>Math.floor(rnd(a,b+1));
  const pick=arr=>arr[Math.floor(R()*arr.length)];
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const fx=Object.assign({beep(){},noise(){},sfx(){},smpl(){return false;},say(){}},opts.fx||{});
  const P=opts.hero||makeHero();
  const G={shake:0,hitstop:0,flash:0,gtime:0}; // screen-wide effects the game keeps as globals
  let B=null;

  /* ---------------- hero maths (verbatim) ---------------- */
  const st=k=>(P.stats&&typeof P.stats[k]==='number')?P.stats[k]:8;
  const statMod=k=>st(k)-8;
  const attrAtk=()=>{let v=statMod('str')*0.015; if(P.weapon==='wand')v+=statMod('int')*0.015; return v;};
  const attrCrit=()=>statMod('dex')*0.004;
  const attrHeal=()=>statMod('wis')*0.015;
  const gstat=()=>0;                         // no gear in the starting kit
  const hasPower=p=>!!(P.powers&&P.powers[p]);
  const effCrit=()=>P.crit+gstat('crit')+attrCrit();
  const effLeech=()=>P.leech+gstat('leech');
  const heroDicePool=()=>(CLASS_DICE[P.clsId]||CLASS_DICE.knight).slice();
  const poolMean=f=>f.reduce((a,x)=>a+(x+1)/2,0);
  const poolSum=a=>a.reduce((x,y)=>x+y,0);
  function crackLimits(n){return {stumble:Math.max(2,Math.ceil(n*0.5)),fumble:Math.max(3,Math.ceil(n*0.75))};}
  const _poolCritCache={};
  function poolCritAt(faces,chance){
    const key=faces.join(',')+'|'+Math.round(chance*100);
    if(_poolCritCache[key])return _poolCritCache[key];
    const sums=[];
    for(let i=0;i<4000;i++){let s=0;for(const f of faces)s+=irnd(1,f);sums.push(s);}
    sums.sort((a,b)=>a-b);
    return _poolCritCache[key]=sums[Math.min(sums.length-1,Math.floor(sums.length*(1-chance)))];
  }
  function heroBonusDice(){
    const out=[];
    const lv=(P.wlv&&P.wlv[P.weapon])||1;
    if(lv>=3)out.push({f:[0,0,0,6,8,12,20][Math.min(lv,6)],src:'FORGE'});
    // gear / relic dice: the starting kit carries none
    if(P.perkDice)for(const f of P.perkDice.slice(0,3))out.push({f,src:'BOON'});
    return out;
  }
  function heroDiceInfo(peek){
    const cls=heroDicePool();
    const bonus=heroBonusDice();
    let faces=cls.concat(bonus.map(b=>b.f)), nClass=cls.length, shattered=null;
    if(B&&B.shatterT>0){
      let bi=-1,bf=-1;
      faces.forEach((f,i)=>{if(f>bf){bf=f;bi=i;}});
      if(bi>=0){shattered=bf; faces=faces.filter((_,i)=>i!==bi); if(bi<nClass)nClass--;}
      if(!peek)B.shatterT--;
    }
    const ref=poolMean(faces);
    return {faces,nClass,ref,shattered};
  }
  function fmtDice(faces){
    const c={}; for(const f of faces)c[f]=(c[f]||0)+1;
    return Object.keys(c).map(Number).sort((a,b)=>b-a).map(f=>(c[f]>1?c[f]:'')+'D'+f).join('+');
  }
  const classMoveDef=()=>CLASS_MOVES[P.clsId]||CLASS_MOVES.knight;
  function classWeaponBase(){const W=WEAPONS[P.weapon];return W.dmg*(1+0.4*(P.wlv[P.weapon]-1))*P.atkMul*(1+gstat('atk'))*2.2;}
  const ultReady=()=>!!(B&&(B.momentum|0)>=3);
  // FLEE dropped for the teaser — there is no overworld to flee into
  const bMenuList=()=>[ultReady()?'UNLEASH!!':'ATTACK / ROLL','DODGE',classMoveDef().name,'ITEM'];
  const battleMenuLen=()=>B.menu==='main'?bMenuList().length:3;

  /* ---------------- log / fx plumbing (verbatim shapes) ---------------- */
  function bLog(txt,col){ if(!B)return; B.log.push({txt:''+txt,col:col||'#c8cede'}); if(B.log.length>24)B.log.shift(); }
  function bLogWrap(txt,maxChars){
    const words=(''+txt).split(' '),rows=[]; let cur='';
    for(const w of words){ if((cur+' '+w).trim().length>maxChars){rows.push(cur.trim());cur=w;} else cur+=' '+w; }
    if(cur.trim())rows.push(cur.trim());
    return rows;
  }
  function bflo(x,y,txt,col,big){B.flo.push({x,y,txt:''+txt,col,t:0,life:big?1:0.8,big});}
  function bburst(x,y,col,n=10,spd=80){
    for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),s=rnd(spd*0.3,spd);
      B.par.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,t:0,life:rnd(0.3,0.6),col,sz:rnd(1,3)});}
  }
  const shakeUp=v=>{G.shake=Math.max(G.shake,v);};
  function setBMsg(txt,next,dur,col){B.phase='msg';B.t=0;B.msg=txt;B.next=next;B.msgDur=dur||1.05;bLog(txt,col);}
  const toMenu=()=>{B.phase='menu';B.t=0;B.menu='main';B.turn++;B.msg='';P.stam=Math.min(P.maxStam,P.stam+6);};
  function bossSay(kind){
    const pool=BOSS_CHAT[kind]; if(!pool||!pool.length)return;
    const i=Math.floor(R()*pool.length);
    bLog('"'+pool[i]+'"',BOSS_COL); fx.say(kind,i);
  }
  function gainMomentum(n){
    if(!B)return;
    const was=B.momentum|0;
    B.momentum=Math.max(0,Math.min(3,was+n));
    if(was<3&&B.momentum>=3)bLog('YOUR BLOOD SINGS - UNLEASH AWAITS!','#ffd54a');
  }

  /* ---------------- stances (verbatim) ---------------- */
  function pickStance(){
    if(B.forceStance){const s=B.forceStance;B.forceStance=null;return s;}
    const D=B.def, w={prowl:30,windup:26,guard:16,channel:(D.spc&&B.turn>1)?18:0};
    if(B.enrage){w.windup+=16;w.guard=Math.max(0,w.guard-8);}
    if(B.phase2)w.windup+=8;
    if(D.spc==='heal'&&B.hp<B.maxHp*0.45)w.channel+=16;
    if(w[B.stance]!=null&&B.stance!=='prowl')w[B.stance]=Math.max(0,w[B.stance]-14);
    let tot=0;for(const k in w)tot+=w[k];
    let r=R()*tot;
    for(const k in w){r-=w[k];if(r<=0)return k;}
    return 'prowl';
  }
  const bossFirst=()=>{const w=B.def.name.split(' ');return w[0]==='THE'?'THE '+w[w.length-1]:w[0];};
  function announceStance(s){
    B.stance=s;
    B.pendingBig=(s==='windup');
    const first=bossFirst();
    if(s==='windup'){ if(!fx.smpl('telegraph'))fx.beep(120,0.3,'square',0.1,-40); bossSay('batk');
      bLog(B.def.teleTxt+' (DODGE IT!)',BOSS_COL); }
    else if(s==='guard'){ bLog(first+' RAISES ITS GUARD.','#8ab4ff'); fx.beep(200,0.14,'square',0.05,-30); }
    else if(s==='channel'){ bLog(first+' BEGINS CHANNELLING SOMETHING FOUL...','#b07aff'); fx.beep(300,0.2,'sine',0.06,120); }
    else if(s==='exposed'){ bLog(first+' IS LEFT WIDE OPEN!','#7ee787'); fx.beep(520,0.16,'triangle',0.07,140); }
    if(s!=='prowl')bflo(VW/2,86,STANCES[s].name,STANCES[s].col,true);
  }
  const bossDone=()=>{ if(B){B.blockVal=0;} if(B&&B.hp>0)announceStance(pickStance()); toMenu(); };
  function stanceHit(raw,heavy,pierce){
    const s=B&&B.stance, r={dmg:raw,tail:'',noMom:false};
    if(s==='guard'&&!pierce){r.dmg=Math.max(1,Math.round(raw*0.5));r.noMom=true;r.tail=' - BLUNTED ON ITS GUARD!';}
    else if(s==='exposed'){r.dmg=Math.round(raw*1.6);r.tail=' - IT WAS WIDE OPEN!';}
    else if(s==='windup'){r.dmg=Math.round(raw*1.25);r.tail=' - CAUGHT MID-SWING!';}
    if(s==='channel'&&heavy&&!B.chanBroken){B.chanBroken=true;B.forceStance='exposed';
      r.tail=' - THE BLOW BREAKS ITS CASTING!';
      bflo(VW/2,86,'CAST BROKEN!','#b07aff',true);fx.beep(240,0.18,'square',0.08,-60);}
    return r;
  }
  function enterPhase2(){
    B.phase2=true;
    B.flash=0.3; G.flash=0.25; shakeUp(7); G.hitstop=Math.max(G.hitstop,0.1);
    bburst(EN_CX,110,'#ff5a3a',22,140);
    if(!fx.smpl('phase')){fx.beep(90,0.4,'sawtooth',0.16,-30); fx.noise(0.35,0.2);}
    bLog(PHASE_LINE,'#ff5a3a');
    B.regen=Math.round(B.maxHp*0.03);          // Mossback mends each turn
  }
  function bossAct(){
    const D=B.def;
    if(B.isBoss&&!B.phase2&&B.hp>0&&B.hp<=B.maxHp*0.5){
      enterPhase2();
      setBMsg(PHASE_LINE,()=>{ announceStance('windup'); B.phase='menu';B.t=0;B.menu='main';B.turn++;B.msg=''; },1.5,'#ff5a3a');
      return;
    }
    if(B.pendingBig){B.pendingBig=false;B.bigNow=true;B.phase='battack';B.t=0;B.applied=false;return;}
    if(B.regen&&B.turn>0&&B.hp>0){ B.hp=Math.min(B.maxHp,B.hp+B.regen); bflo(EN_CX,100,'+'+B.regen,'#7ee787',true); }
    const s=B.stance||'prowl', first=bossFirst();
    if(s==='channel'&&D.spc&&!B.chanBroken){
      if(D.spc==='heal'){const hv=Math.round(B.maxHp*0.06);B.hp=Math.min(B.maxHp,B.hp+hv);bflo(EN_CX,100,'+'+hv,'#7ee787',true);}
      fx.beep(180,0.2,'sawtooth',0.1,-90);
      setBMsg(D.spcTxt,bossDone,null,BOSS_COL);
    }else if(s==='channel'){
      B.chanBroken=false;
      setBMsg(first+' REELS - THE BROKEN CASTING SPUTTERS OUT!',bossDone,1.1,BOSS_COL);
    }else if(s==='guard'){ B.lightMul=0.7; B.bigNow=false;B.phase='battack';B.t=0;B.applied=false; }
    else if(s==='exposed'){ B.lightMul=0.5; B.bigNow=false;B.phase='battack';B.t=0;B.applied=false; }
    else{ B.lightMul=1; B.bigNow=false;B.phase='battack';B.t=0;B.applied=false;
      if(R()<0.35)bossSay('batk'); }
  }

  /* ---------------- the hero's turn (verbatim) ---------------- */
  function attackFumble(base,txt0){
    B.ones=(B.ones||0)+1;
    const f=pick(FUMBLES);
    if(f.self){ const sd=Math.max(2,Math.round(P.maxHp*f.self)); P.hp=Math.max(1,P.hp-sd); bflo(HERO_CX,112,'-'+sd,'#ff8a8a',true); }
    if(f.lucky){
      const ld=Math.max(1,Math.round(base*f.lucky*rnd(0.9,1.1)));
      B.hp-=ld; B.flash=0.14;
      bflo(EN_CX,90,ld,'#fff'); bburst(EN_CX,130,'#ff5a5a',8,70); fx.sfx('hit');
    }else{fx.sfx('low');bflo(EN_CX,90,'FUMBLE','#ff8a8a',true);}
    shakeUp(2);
    B.momentum=0;
    return {txt:txt0+f.t};
  }
  function playerAttackResolve(){
    const W=WEAPONS[P.weapon], lv=P.wlv[P.weapon];
    const pool=B.atkPool||null; B.atkPool=null;
    const lunged=!!B.lunge; B.lunge=false;
    let power=1;
    if(P.stam>=W.stam)P.stam-=W.stam;
    else if(P.stam>0){power=0.45;P.stam=0;fx.sfx('low');}
    else {power=0.3;fx.sfx('low');}
    let base=W.dmg*(1+0.4*(lv-1))*P.atkMul*(1+gstat('atk')+attrAtk())*power*2.2;
    if(hasPower('berserk')&&P.hp<P.maxHp*0.3)base*=1.25;
    if(hasPower('giantsbane'))base*=1.3;
    let cursed=false;
    if(B.curse){base*=0.6;B.curse=false;cursed=true;}
    let wobbled=false, crit=false, mult=1, label='', col='#fff', rollTxt='';
    let glance=false, heavy=false, mom=0;
    if(pool){
      const faces=pool.faces, vals=pool.vals;
      const chs=pool.ch||faces.map(()=>'S');
      let guardPips=0, focusPips=0;
      const Sf=[], Sv=[];
      faces.forEach((f,i)=>{
        const v=vals[i];
        if(chs[i]==='G'){ if(v>1)guardPips+=v; }
        else if(chs[i]==='F'){ if(v>1)focusPips+=v; }
        else { Sf.push(f); Sv.push(v); }
      });
      let allocTxt='';
      if(guardPips>0){ B.blockVal=(B.blockVal|0)+guardPips; bflo(HERO_CX,104,'GUARD '+guardPips,'#8ab4ff',true); allocTxt+='GUARD SET AT '+guardPips+'. '; }
      if(focusPips>0){
        P.stam=Math.min(P.maxStam,P.stam+focusPips);
        const fmom=Math.min(2,Math.floor(focusPips/8));
        if(fmom>0)gainMomentum(fmom);
        bflo(HERO_CX,96,'FOCUS +'+focusPips+' ST','#ffd54a',true);
        allocTxt+='FOCUS +'+focusPips+' ST'+(fmom?', +'+fmom+' MOMENTUM':'')+'. '; }
      if(!Sf.length){
        P.stam=Math.min(P.maxStam,P.stam+W.stam);
        fx.sfx('swap');
        return {txt:allocTxt+'YOU GIVE GROUND AND SET YOUR STANCE - NO STRIKE THIS TURN.'};
      }
      const ones=lunged?0:Sv.filter(x=>x===1).length;
      const clim=crackLimits(Sf.length);
      if(ones>=clim.fumble)return attackFumble(base,allocTxt+ones+' ONES! THE STRIKE SHATTERS! ');
      let sumEff=poolSum(lunged?Sv:Sv.map(x=>x===1?0:x));
      const clsMean=poolMean(heroDicePool());
      const expect=poolMean(Sf);
      const allMean=poolMean(faces);
      if(lunged)sumEff=Math.max(sumEff,Math.round(expect*0.78));
      if(B.wobble&&!lunged){wobbled=true; sumEff=Math.round(sumEff*rnd(0.82,1.02));}
      const frac=sumEff/expect;
      crit=ones<clim.stumble&&poolSum(Sv)>=poolCritAt(Sf,clamp(0.05+effCrit(),0.05,0.4));
      if(crit){ mult=1.5*Math.max(sumEff,expect)/clsMean; label='CRITICAL! '; col='#ffd54a'; }
      else{
        mult=Math.max(sumEff,expect*0.22)/clsMean;
        if(frac<0.55){label='GLANCING BLOW! ';col='#9aa3c0';glance=true;}
        else if(frac<0.95){label='';col='#fff';}
        else if(frac<1.2){label='SOLID BLOW! ';col='#cfe6ff';}
        else {label='STRONG BLOW! ';col='#7ee787';}
      }
      if(!crit&&ones>=clim.stumble){ mult*=0.5; label='STUMBLE! '; col='#ff8a8a'; glance=true; }
      heavy=crit||sumEff>=1.25*allMean;
      mom=crit?2:frac>=1.1?1:0;
      rollTxt=allocTxt+'THE STRIKE LANDS '+sumEff+(ones?' ('+ones+' CRACKED'+(ones>=clim.stumble?'!':'')+')':'')+': ';
    }else{
      let v=B.atkRoll||irnd(1,20);
      if(lunged)v=Math.max(8,v);
      if(v===1)return attackFumble(base,'ROLLED 1! ');
      if(v<=3){ fx.sfx('low'); bflo(EN_CX,90,'MISS','#9aa3c0',true); return {txt:'ROLLED '+v+': YOUR '+W.name+' FINDS ONLY AIR!'}; }
      const critAt=Math.max(16,20-Math.floor(effCrit()*15));
      crit=v>=critAt;
      if(crit){ mult=2.1; label='CRITICAL! '; col='#ffd54a'; }
      else { const t=(v-4)/Math.max(1,(critAt-1-4)); mult=0.3+t*1.3;
        if(v<=6){label='GLANCING BLOW! ';col='#9aa3c0';glance=true;} else if(v<=11){label='';col='#fff';}
        else if(v<=15){label='SOLID BLOW! ';col='#cfe6ff';} else {label='STRONG BLOW! ';col='#7ee787';} }
      heavy=crit||v>=16; mom=crit?2:v>=12?1:0; rollTxt='ROLLED '+v+': ';
    }
    const sh=stanceHit(Math.max(1,Math.round(base*mult*rnd(0.94,1.06))),heavy,false);
    const dmg=sh.dmg;
    if(sh.noMom)mom=0;
    B.hp-=dmg; B.flash=0.16; B.lastBig=heavy;
    if(B.isBoss&&!B.saidLow&&B.hp>0&&B.hp<=B.maxHp*0.3){B.saidLow=true;bossSay('low');}
    if(effLeech()>0)P.hp=Math.min(P.maxHp,P.hp+dmg*effLeech());
    gainMomentum(mom);
    bflo(EN_CX,90,dmg,col,crit?2:heavy);
    if(crit){bflo(EN_CX,74,'CRIT!','#ff8a3a',true);G.hitstop=Math.max(G.hitstop,0.07);}
    bburst(EN_CX,130,crit?'#ffd54a':'#ff5a5a',crit?16:glance?5:10,crit?110:glance?50:80);
    shakeUp(crit?4:glance?1:2);
    fx.sfx(glance?'low':P.weapon==='wand'?'bolt':crit?'crit':'hit');
    fx.sfx('swing');
    const first=bossFirst();
    const verb=crit?WVERB[P.weapon][2]:pick(WVERB[P.weapon]);
    const part=glance?pick(GLANCE_PARTS):pick(HIT_PARTS);
    return {txt:rollTxt+(wobbled?'THE SONG SWIMS YOUR AIM! ':'')+(lunged?'PIERCING LUNGE! ':'')+(power<1?'EXHAUSTED! WEAK ':'')+(cursed?'CURSED SWING... ':'')+
      label+'YOUR '+W.name+' '+(glance?'GLANCES ':verb+' ')+first+' '+part+' - '+dmg+'!'+sh.tail, dmg, crit, glance};
  }

  /* ---------------- the boss's blow (verbatim) ---------------- */
  function bossAttackResolve(){
    const D=B.def, first=bossFirst();
    fx.sfx('monAtk');
    const hexed=!!B.hexed; B.hexed=false;
    let mult=(B.bigNow?2.2:1)*(B.buff?1.5:1)*(B.enrage?1.35:1)*(B.lightMul||1);
    if(B.buff)B.buff=false;
    let dmg=Math.max(1,Math.round(D.atk*(B.atkMul||1)*mult*rnd(0.9,1.1)*(1-gstat('dr'))));
    if(hexed)dmg=Math.round(dmg*0.7);
    let txt;
    let br=irnd(1,20);
    if(hexed)br=Math.min(br,irnd(1,20));
    if(br<=(hexed?5:2)&&!B.dodge){
      const wasBig=B.bigNow;
      B.dodge=false; B.bigNow=false; B.lightMul=1;
      bflo(HERO_CX,112,'WHIFF!','#7ee787',true);
      fx.sfx('swap');
      if(wasBig)B.forceStance='exposed';
      return (hexed?'THE HEX TWISTS ITS AIM! ':wasBig?'THE MIGHTY BLOW CRASHES BESIDE YOU! IT OVEREXTENDS! ':'')+first+pick(BOSS_WHIFFS);
    }
    if(B.dodge){
      let dv=B.dodgeRoll||10;
      if(hasPower('warding'))dv=Math.max(dv,15);
      const need=B.bigNow?5:8;
      if(dv===20){
        const W=WEAPONS[P.weapon];
        let cbase=W.dmg*(1+0.4*(P.wlv[P.weapon]-1))*P.atkMul*(1+gstat('atk'))*2.2*0.6;
        const cd=Math.max(1,Math.round(cbase*rnd(0.9,1.1)));
        B.hp-=cd; B.flash=0.16;
        bflo(HERO_CX,112,'PERFECT!','#ffd54a',true); bflo(EN_CX,90,cd,'#ffd54a',true); bburst(EN_CX,130,'#ffd54a',12,100);
        fx.sfx('crit');
        B.adv=true; gainMomentum(1);
        if(B.bigNow)B.forceStance='exposed';
        txt='PERFECT DODGE! YOU COUNTER FOR '+cd+' - ADVANTAGE ON YOUR NEXT ATTACK!'+(B.bigNow?' IT OVEREXTENDS!':'');
        dmg=0;
      }else if(dv===1){ dmg=Math.round(dmg*1.25); txt='YOU TRIP MID-DODGE AND FACEPLANT! -'+dmg+' HP'; }
      else if(dv>=need){
        if(B.bigNow)B.forceStance='exposed';
        txt=B.bigNow?'YOU READ THE ATTACK AND DODGE CLEAN! IT OVEREXTENDS - EXPOSED!':'YOU SLIP ASIDE! NO DAMAGE';
        bflo(HERO_CX,112,'DODGED!','#7ee787',true);
        dmg=0; fx.sfx('swap');
      }else{ dmg=Math.round(dmg*0.5); txt='CLIPPED WHILE DODGING! -'+dmg+' HP'; }
    }else{
      txt=(B.bigNow?'A DEVASTATING BLOW! ':'')+(hexed?'HEX-DULLED, ':'')+first+' HITS YOU! -'+dmg+' HP';
    }
    if(dmg>0&&(B.blockVal|0)>0){
      const bl=Math.min(dmg,B.blockVal|0); dmg-=bl; B.blockVal=0;
      bflo(HERO_CX,100,'BLOCKED '+bl,'#8ab4ff',true);
      if(dmg<=0){ fx.sfx('swap');
        txt=(B.bigNow?'THE MIGHTY BLOW':first+"'S BLOW")+' BREAKS ON YOUR RAISED GUARD - NO DAMAGE!';
        B.bigNow=false;
      } else txt+=' (YOUR GUARD BLOCKS '+bl+' OF IT)';
    }
    if(dmg>0){
      P.hp-=dmg; B.hflash=0.2; G.flash=0.15; B.tookDmg=true;
      B.momentum=Math.max(0,(B.momentum|0)-1);
      bflo(HERO_CX,112,'-'+dmg,'#ff5a5a',true); bburst(HERO_CX,142,'#ff5a5a',10,90);
      shakeUp(B.bigNow?6:3);
      fx.sfx('hurt');
      if(B.bigNow&&B.isBoss&&!(B.shatterT>0)){
        B.shatterT=2;
        bflo(HERO_CX,96,'DIE SHATTERED!','#b04aff',true);
        fx.noise(0.2,0.14); fx.beep(95,0.25,'sawtooth',0.12,-40);
        txt+=' THE IMPACT SHATTERS YOUR LARGEST DIE FOR 2 ROLLS!';
      }
    }
    B.dodge=false; B.bigNow=false; B.lightMul=1;
    return txt;
  }

  /* ---------------- rolls (verbatim physics + verdicts) ---------------- */
  function startRoll(label,cb,adv){
    B.phase='dice'; B.t=0;
    B.diceLabel=label; B.diceVal=irnd(1,20); B.diceShow=irnd(1,20); B.diceTick=0; B.diceCb=cb;
    B.die={x:64,y:34,vx:rnd(300,370),vy:rnd(-30,20),rot:rnd(0,Math.PI*2),vr:rnd(10,14),floor:116,settled:false,cracked:false};
    if(adv){ const v2=irnd(1,20); B.loseVal=Math.min(B.diceVal,v2); B.diceVal=Math.max(B.diceVal,v2);
      B.die2={x:44,y:52,vx:rnd(250,320),vy:rnd(-55,-5),rot:rnd(0,Math.PI*2),vr:rnd(9,13),floor:116,settled:false,cracked:false};
    }else B.die2=null;
  }
  function startPoolRoll(label,cb,adv){
    B.phase='pool'; B.t=0;
    const info=heroDiceInfo();
    B.poolLabel=info.shattered?label+' - D'+info.shattered+' SHATTERED!':label;
    const faces=info.faces;
    const roll=()=>faces.map(f=>irnd(1,f));
    let vals=roll();
    if(adv){ const v2=roll(); if(poolSum(v2)>poolSum(vals))vals=v2; }
    B.poolFaces=faces; B.poolVals=vals; B.poolRef=info.ref; B.poolCb=cb; B.poolDone=false;
    const ones=vals.filter(v=>v===1).length;
    B.poolOnes=ones;
    B.poolLim=crackLimits(faces.length);
    B.poolSumEff=poolSum(vals.map(v=>v===1?0:v));
    const critChance=clamp(0.05+effCrit(),0.05,0.4);
    B.poolCrit=ones<B.poolLim.stumble&&poolSum(vals)>=poolCritAt(faces,critChance);
    const n=faces.length, step=n>=6?0.11:0.15;
    const psc=n<=2?1:n===3?0.85:n===4?0.78:n===5?0.7:n===6?0.62:n===7?0.56:n===8?0.5:n===9?0.46:0.43;
    const gap=52*psc+4;
    B.poolDice=faces.map((f,i)=>({f,i,bonus:i>=info.nClass,
      x:30-i*30,y:30+(i%2)*14, vx:rnd(300,370)-i*12, vy:rnd(-40,10),
      rot:rnd(0,Math.PI*2), vr:rnd(8,14), floor:112, rest:240+(i-(n-1)/2)*gap,
      show:irnd(1,f), tick:0, lockAt:0.6+i*step, locked:false, settled:false, cracked:false, held:false, ch:'S'}));
    B.poolLastLock=0.6+(n-1)*step;
    B.poolRerolls=1; B.poolHold=false;
    B.poolAlloc=false; B.poolNoAlloc=false;
  }
  function poolResolve(){
    if(!B||!B.poolCb)return;
    B.poolHold=false; B.poolAlloc=false; B.poolDone=false;
    const cb=B.poolCb; B.poolCb=null;
    cb({faces:B.poolFaces,vals:B.poolVals,ref:B.poolRef,ch:B.poolDice.map(d=>d.ch||'S')});
  }
  function poolReroll(){
    if(!B||B.phase!=='pool'||!B.poolHold||B.poolRerolls<=0)return false;
    if(B.poolDice.every(d=>d.held)){fx.sfx('low');return false;}
    B.poolRerolls--; B.poolHold=false; B.poolDone=false;
    const n=B.poolDice.length, step=n>=6?0.11:0.15;
    let k=0;
    for(const d of B.poolDice){
      if(d.held){d.lockAt=0;continue;}
      B.poolVals[d.i]=irnd(1,d.f);
      d.locked=false; d.settled=false; d.cracked=false; d.tick=0;
      d.x=30-k*30; d.y=30+(d.i%2)*14;
      d.vx=rnd(300,370)-k*12; d.vy=rnd(-40,10);
      d.rot=rnd(0,Math.PI*2); d.vr=rnd(8,14);
      d.lockAt=0.3+k*step; k++;
    }
    B.poolLastLock=0.3+Math.max(0,k-1)*step;
    B.t=0;
    const ones=B.poolVals.filter(v=>v===1).length;
    B.poolOnes=ones;
    B.poolSumEff=poolSum(B.poolVals.map(v=>v===1?0:v));
    B.poolCrit=ones<B.poolLim.stumble&&poolSum(B.poolVals)>=poolCritAt(B.poolFaces,clamp(0.05+effCrit(),0.05,0.4));
    if(!fx.smpl('dice'))fx.beep(240,0.08,'square',0.08,40);
    return true;
  }
  function poolBtns(){
    if(B.poolAlloc)return [
      {id:'allstrike',x:VW/2-96,y:148,w:88,h:15,label:'ALL STRIKE',on:true},
      {id:'resolve',  x:VW/2+8, y:148,w:88,h:15,label:'RESOLVE!',on:true}];
    const allHeld=B.poolDice&&B.poolDice.every(d=>d.held);
    const canR=(B.poolRerolls|0)>0&&!allHeld;
    if(B.poolNoAlloc)return [
      {id:'reroll',x:VW/2-96,y:148,w:88,h:15,label:'REROLL ('+(B.poolRerolls|0)+')',on:canR},
      {id:'strike',x:VW/2+8, y:148,w:88,h:15,label:'STRIKE!',on:true}];
    return [
      {id:'reroll',x:VW/2-140,y:148,w:88,h:15,label:'REROLL ('+(B.poolRerolls|0)+')',on:canR},
      {id:'alloc', x:VW/2-44, y:148,w:88,h:15,label:'ALLOCATE',on:true},
      {id:'strike',x:VW/2+52, y:148,w:88,h:15,label:'STRIKE!',on:true}];
  }

  /* ---------------- items, class move, ultimate (verbatim) ---------------- */
  function usePotionHeal(){
    const amt=Math.round(P.maxHp*(hasPower('alchemist')?0.6:0.4)*(1+attrHeal()));
    P.hp=Math.min(P.maxHp,P.hp+amt);
    if(!fx.smpl('potion'))fx.sfx('heart');
    bflo(HERO_CX,112,'+'+amt,'#7ee787',true);
    return amt;
  }
  function classMove(){
    const mv=classMoveDef();
    if(P.stam<mv.cost){ fx.sfx('low'); setBMsg('TOO WINDED! '+mv.name+' NEEDS '+mv.cost+' STAMINA.',toMenu,1.0); return; }
    P.stam-=mv.cost;
    startRoll('BASH ROLL',v=>{ // knight: slam the shield — stun on 11+, and a broken telegraph is a broken plan
      const sh=stanceHit(Math.max(1,Math.round(classWeaponBase()*(v>=20?1.0:0.5)*rnd(0.9,1.1))),v>=11,false);
      const dmg=sh.dmg;
      B.hp-=dmg; B.flash=0.14; B.lastBig=v>=20;
      bflo(EN_CX,90,dmg,'#cfe6ff',v>=20?2:false); bburst(EN_CX,130,'#cfe6ff',9,85); fx.sfx('hit');
      if(B.hp<=0){battleVictory();return;}
      const first=bossFirst();
      if(v>=11){
        const hadBig=B.pendingBig; B.pendingBig=false;
        if(hadBig)B.stance='prowl';
        shakeUp(3);
        setBMsg('ROLLED '+v+': SHIELD SLAM! '+first+' REELS - '+(hadBig?'ITS MIGHTY BLOW IS BROKEN!':'IT LOSES ITS TURN!'),toMenu,1.25);
      }else setBMsg('ROLLED '+v+': THE SHIELD THUDS OFF '+first+' - '+dmg+' DMG, BUT IT HOLDS ITS GROUND.',bossAct,1.1);
    });
  }
  function doUltimate(){
    B.momentum=0; B.phase='ult'; B.t=0; B.applied=false;
    if(!fx.smpl('ultimate')){fx.sfx('crit'); fx.beep(220,0.3,'sawtooth',0.14,80); fx.noise(0.2,0.1);}
  }
  function battleVictory(){
    bossSay('bdie'); fx.smpl('victory')||fx.sfx('levelup');
    setBMsg(B.def.name+' IS VANQUISHED!',()=>{ B.phase='victory'; B.t=0; bLog(B.def.outro,'#9ad8ff'); },1.6);
    fx.sfx('kill'); bburst(EN_CX,130,'#ffd54a',26,130); G.shake=6;
  }
  function battleDefeat(){
    P.dead=true; fx.sfx('die'); G.shake=8;
    setBMsg('YOU FALL BEFORE '+B.def.name+'...',()=>{B.phase='defeat';B.t=0;},1.4);
  }
  function battleConfirm(){
    fx.sfx('select');
    if(B.menu==='main'){
      const c=bMenuList()[B.mi];
      if(c===classMoveDef().name){classMove();}
      else if(c==='UNLEASH!!'){doUltimate();}
      else if(c==='ATTACK / ROLL'){
        const adv=!!B.adv; B.adv=false;
        startPoolRoll(adv?'ATTACK - ADVANTAGE!':'ATTACK ROLL',p=>{B.atkPool=p;B.phase='pattack';B.t=0;B.applied=false;},adv);
      }
      else if(c==='DODGE'){
        startRoll('DODGE ROLL',v=>{
          B.dodge=true;B.dodgeRoll=v;
          P.stam=Math.min(P.maxStam,P.stam+30);
          fx.smpl('dodge'); bflo(HERO_CX,112,'+30 ST','#7ee787');
          const txt=v===20?'ROLLED 20! PERFECT STANCE. EYES LOCKED ON THE FOE...'
                   :v===1?'ROLLED 1! YOU TRIP GETTING INTO POSITION...'
                   :'ROLLED '+v+': YOU BRACE FOR THE BLOW (+30 STAMINA)';
          setBMsg(txt,bossAct);
        });
      }
      else if(c==='ITEM'){B.menu='item';B.si=0;}
    }else if(B.menu==='item'){
      if(B.si===0){ if(P.items.potion<=0){fx.sfx('low');return;} P.items.potion--; usePotionHeal(); setBMsg('YOU QUAFF A POTION!',bossAct); }
      else if(B.si===1){
        if(P.items.bomb<=0){fx.sfx('low');return;}
        P.items.bomb--;
        const sh=stanceHit(130+B.zi*80,true,false); const dmg=sh.dmg;
        B.hp-=dmg; B.flash=0.2; B.lastBig=true; G.shake=5;
        bflo(EN_CX,90,dmg,'#ff8a3a',2); bburst(EN_CX,130,'#ff8a3a',20,120);
        if(!fx.smpl('bomb')){fx.noise(0.25,0.2); fx.beep(60,0.3,'square',0.15,-30);}
        if(B.hp<=0){battleVictory();return;}
        setBMsg('THE BOMB BLASTS FOR '+dmg+'!'+sh.tail,bossAct);
      }else{B.menu='main';}
    }
  }

  /* ---------------- input (verbatim mapping) ---------------- */
  const BM_X=8, BM_Y=192, BM_W=126, BM_RH=18, BS_X=140, BS_W=156;
  const mouse={x:-99,y:-99};
  function battleKey(k){
    if(!B)return;
    if(B.phase==='msg'&&TUNING.msgSkip&&(k==='enter'||k===' '||k==='j'||k==='e')){B.t=Math.max(B.t,B.msgDur);return;}
    if(B.phase==='pool'&&(B.poolHold||B.poolAlloc)){
      if(k==='enter'||k===' '||k==='j'||k==='e')poolResolve();
      else if(k==='r'&&B.poolHold)poolReroll();
      else if(k==='a'){
        if(B.poolAlloc){B.poolDice.forEach(d=>d.ch='S');fx.sfx('swap');}
        else if(!B.poolNoAlloc){B.poolHold=false;B.poolAlloc=true;fx.sfx('open');}
      }
      else if(/^[1-9]$/.test(k)){const d=B.poolDice[+k-1];
        if(d){ if(B.poolAlloc){d.ch=d.ch==='S'?'G':d.ch==='G'?'F':'S';} else d.held=!d.held; fx.sfx('open'); }}
      return;
    }
    if(B.phase!=='menu')return;
    const len=battleMenuLen();
    const idx=B.menu==='main'?'mi':'si';
    if(k==='arrowup'||k==='w'){B[idx]=(B[idx]+len-1)%len;fx.sfx('open');}
    else if(k==='arrowdown'||k==='s'){B[idx]=(B[idx]+1)%len;fx.sfx('open');}
    else if(k==='enter'||k===' '||k==='j'){battleConfirm();}
    else if(k==='escape'||k==='x'){if(B.menu!=='main'){B.menu='main';fx.sfx('open');}}
    else if(['1','2','3','4','5'].includes(k)){ const n=+k-1; if(n<len){B[idx]=n;battleConfirm();} }
  }
  function battleHover(){
    if(!B||B.phase!=='menu')return;
    const inMain=mouse.x>=BM_X-2&&mouse.x<=BM_X+BM_W+2, inSub=mouse.x>=BS_X-2&&mouse.x<=BS_X+BS_W+2;
    const row=Math.floor((mouse.y-BM_Y)/BM_RH);
    if(B.menu==='main'&&inMain&&row>=0&&row<bMenuList().length)B.mi=row;
    else if(B.menu!=='main'&&inSub&&row>=0&&row<battleMenuLen())B.si=row;
  }
  function battleClick(){
    if(!B)return;
    if(B.phase==='msg'&&TUNING.msgSkip){B.t=Math.max(B.t,B.msgDur);return;}
    if(B.phase==='pool'&&(B.poolHold||B.poolAlloc)){
      for(const bt of poolBtns()){
        if(bt.on&&mouse.x>=bt.x&&mouse.x<=bt.x+bt.w&&mouse.y>=bt.y&&mouse.y<=bt.y+bt.h){
          if(bt.id==='reroll')poolReroll();
          else if(bt.id==='alloc'){B.poolHold=false;B.poolAlloc=true;fx.sfx('open');}
          else if(bt.id==='allstrike'){B.poolDice.forEach(d=>d.ch='S');fx.sfx('swap');}
          else poolResolve();
          return;
        }
      }
      const n=B.poolDice.length, hsc=n<=2?1:n===3?0.85:n===4?0.78:n===5?0.7:n===6?0.62:n===7?0.56:n===8?0.5:n===9?0.46:0.43;
      const hr=Math.max(16,26*hsc);
      for(const d of B.poolDice){
        if(Math.abs(mouse.x-d.x)<=hr&&Math.abs(mouse.y-d.y)<=hr){
          if(B.poolAlloc){d.ch=d.ch==='S'?'G':d.ch==='G'?'F':'S';fx.sfx('open');}
          else {d.held=!d.held;fx.sfx('open');}
          return;
        }
      }
      return;
    }
    if(B.phase!=='menu')return;
    battleHover();
    const row=Math.floor((mouse.y-BM_Y)/BM_RH);
    const inMain=mouse.x>=BM_X-2&&mouse.x<=BM_X+BM_W+2, inSub=mouse.x>=BS_X-2&&mouse.x<=BS_X+BS_W+2;
    if(B.menu==='main'&&inMain&&row>=0&&row<bMenuList().length)battleConfirm();
    else if(B.menu!=='main'&&inSub&&row>=0&&row<battleMenuLen())battleConfirm();
    else if(B.menu!=='main')B.menu='main';
  }

  /* ---------------- the clock (verbatim) ---------------- */
  function battleUpdate(dt){
    if(!B)return;
    G.gtime+=dt;
    if(G.hitstop>0){G.hitstop-=dt;return;}
    B.t+=dt;
    B.flash=Math.max(0,B.flash-dt); B.hflash=Math.max(0,B.hflash-dt);
    G.flash=Math.max(0,G.flash-dt); G.shake=Math.max(0,G.shake-dt*14);
    for(const f of [...B.flo]){f.t+=dt;if(f.t>f.life)B.flo.splice(B.flo.indexOf(f),1);}
    for(const p of [...B.par]){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt; if(p.t>p.life)B.par.splice(B.par.indexOf(p),1);}
    battleHover();
    switch(B.phase){
      case 'intro': if(B.t>1.5){B.phase='menu';B.t=0;B.msg='';} break;
      case 'pattack':{
        const tt=B.t/0.55;
        B.pofs=Math.sin(Math.min(1,tt)*Math.PI)*46;
        if(!B.applied&&B.t>0.2){ B.applied=true; B.res=playerAttackResolve(); if(B.hp<=0){B.hp=0;} }
        if(B.t>0.55){ B.pofs=0; if(B.hp<=0){battleVictory();} else setBMsg(B.res.txt,bossAct,1.0); }
        break;}
      case 'ult':{
        if(!B.applied&&B.t>1.0){
          B.applied=true;
          const dmg=stanceHit(Math.max(1,Math.round(classWeaponBase()*3.2*rnd(0.95,1.05))),true,true).dmg;
          B.hp-=dmg; B.flash=0.28; B.lastBig=true; B.ultDmg=dmg;
          G.hitstop=Math.max(G.hitstop,0.11); shakeUp(7);
          bflo(EN_CX,90,dmg,'#ffd54a',2); bburst(EN_CX,130,'#ffd54a',26,150);
          fx.sfx('crit'); fx.noise(0.3,0.22);
        }
        if(B.t>1.75){ const nm=ULT_NAMES[P.clsId]||'THE FINISHER';
          if(B.hp<=0){battleVictory();} else setBMsg(nm+' DEVASTATES '+bossFirst()+' - '+B.ultDmg+'!',bossAct,1.1); }
        break;}
      case 'dice':{
        for(const die of [B.die,B.die2]){
          if(!die||die.settled)continue;
          die.x+=die.vx*dt; die.y+=die.vy*dt; die.vy+=640*dt; die.rot+=die.vr*dt;
          if(die.y>=die.floor){
            die.y=die.floor; die.vy=-die.vy*0.45; die.vx*=0.6; die.vr*=0.55;
            fx.beep(130,0.05,'square',0.09,-40);
            for(let i=0;i<5;i++)B.par.push({x:die.x+rnd(-7,7),y:die.floor+12,vx:rnd(-55,55),vy:rnd(-90,-25),t:0,life:rnd(0.22,0.4),col:'#b8ab8a',sz:1.5});
            if(Math.abs(die.vy)<38)die.vy=0;
          }
          if(die===B.die2&&die.x>210){die.x=210;die.vx=0;}
          if(die.x>282){die.x=282;die.vx=0;}
        }
        B.diceTick-=dt;
        if(B.t<0.75){
          if(B.diceTick<=0){ B.diceTick=0.06+B.t*0.08; B.diceShow=irnd(1,20); fx.beep(900+B.diceShow*20,0.03,'square',0.05,60); }
        }else if(!B.diceLocked){
          B.diceLocked=true; B.diceShow=B.diceVal;
          const die=B.die;
          if(die){die.settled=true;die.vr=0;die.y=die.floor;die.vy=0;}
          if(B.die2){B.die2.settled=true;B.die2.vr=0;B.die2.y=B.die2.floor;B.die2.vy=0;}
          if(B.diceVal===20){ G.hitstop=Math.max(G.hitstop,0.14); shakeUp(6);
            if(die)for(let i=0;i<16;i++)B.par.push({x:die.x,y:die.y,vx:rnd(-140,140),vy:rnd(-160,-20),t:0,life:rnd(0.4,0.7),col:pick(['#ffd54a','#fff2b0','#ff8a3a']),sz:2});
            fx.beep(660,0.1,'square',0.14,120); fx.beep(990,0.16,'square',0.12,60,0.08);
          }else if(B.diceVal===1){ if(die)die.cracked=true; fx.noise(0.2,0.14); fx.beep(75,0.28,'sawtooth',0.13,-40); }
          else{ if(!fx.smpl('dice'))fx.beep(160,0.12,'square',0.14,-60); fx.noise(0.06,0.06); shakeUp(1); }
        }
        if(B.t>2.4){ B.diceLocked=false; const cb=B.diceCb; B.diceCb=null; cb(B.diceVal); }
        break;}
      case 'pool':{
        for(const d of B.poolDice){
          if(!d.settled){
            d.x+=d.vx*dt; d.y+=d.vy*dt; d.vy+=640*dt; d.rot+=d.vr*dt;
            if(d.y>=d.floor){
              d.y=d.floor; d.vy=-d.vy*0.42; d.vx*=0.6; d.vr*=0.55;
              if(-d.vy>55){ fx.beep(120+d.f*3,0.04,'square',0.07,-40);
                for(let i=0;i<3;i++)B.par.push({x:d.x+rnd(-6,6),y:d.floor+10,vx:rnd(-50,50),vy:rnd(-80,-20),t:0,life:rnd(0.2,0.35),col:'#b8ab8a',sz:1.5}); }
              if(Math.abs(d.vy)<38)d.vy=0;
            }
            if(d.x>d.rest){d.x=d.rest;d.vx=0;}
          }
          d.tick-=dt;
          if(B.t<d.lockAt){ if(d.tick<=0){ d.tick=0.06+B.t*0.05; d.show=irnd(1,d.f); } }
          else if(!d.locked){
            d.locked=true; d.settled=true; d.vr=0; d.rot=0; d.y=d.floor; d.vy=0; d.x=d.rest;
            d.show=B.poolVals[d.i];
            if(d.show===1){ d.cracked=true; fx.noise(0.12,0.1); fx.beep(85,0.18,'sawtooth',0.1,-40); }
            else if(d.show===d.f){ shakeUp(2);
              for(let i=0;i<8;i++)B.par.push({x:d.x,y:d.y,vx:rnd(-90,90),vy:rnd(-120,-20),t:0,life:rnd(0.3,0.5),col:pick(['#ffd54a','#fff2b0']),sz:1.5});
              fx.beep(680+d.f*10,0.08,'square',0.1,80);
            }else{ if(!fx.smpl('dice'))fx.beep(200,0.07,'square',0.09,-50); }
          }
        }
        if(B.t>B.poolLastLock+0.2&&!B.poolDone){
          B.poolDone=true;
          if(B.poolCrit){ G.hitstop=Math.max(G.hitstop,0.12); shakeUp(5); fx.beep(660,0.1,'square',0.14,120); fx.beep(990,0.16,'square',0.12,60,0.08); }
          else if(B.poolOnes>=(B.poolLim?B.poolLim.fumble:3)){ fx.noise(0.22,0.15); fx.beep(70,0.3,'sawtooth',0.14,-40); }
          else if(B.poolOnes>=(B.poolLim?B.poolLim.stumble:2)){ fx.beep(140,0.2,'sawtooth',0.1,-50); }
        }
        if(!B.poolHold&&!B.poolAlloc&&B.t>B.poolLastLock+0.35&&B.poolCb){
          if((B.poolRerolls|0)>0)B.poolHold=true;
          else if(!B.poolNoAlloc)B.poolAlloc=true;
          else if(B.t>B.poolLastLock+1.1)poolResolve();
        }
        break;}
      case 'battack':{
        const tt=B.t/0.6;
        B.bofs=-Math.sin(Math.min(1,tt)*Math.PI)*52;
        if(!B.applied&&B.t>0.25){ B.applied=true; B.btxt=bossAttackResolve(); }
        if(B.t>0.6){ B.bofs=0;
          if(P.hp<=0){ P.hp=0; battleDefeat(); }
          else if(B.hp<=0){battleVictory();}
          else setBMsg(B.btxt,bossDone,0.95,BOSS_COL);
        }
        break;}
      case 'msg': if(B.t>B.msgDur&&B.next){const n=B.next;B.next=null;n();} break;
    }
  }

  /* ---------------- start ---------------- */
  function startBattle(){
    const D=MOSSBACK;
    B={zi:0, def:D, hp:D.hp, maxHp:D.hp,
       phase:'intro', t:0, menu:'main', mi:0, si:0, turn:0,
       stance:'prowl', forceStance:null, chanBroken:false, lightMul:1,
       blockVal:0, pofs:0, bofs:0, dodge:false, curse:false, buff:false, pendingBig:false, bigNow:false,
       momentum:0, adv:false, applied:false, msg:'', next:null, flash:0, hflash:0, flo:[], par:[], log:[],
       isBoss:true};
    // the game: D.hp * bossScale(level) — level 1 is x1.0; the teaser shortens the fight (TUNING.md)
    B.hp=B.maxHp=Math.max(1,Math.round((opts.bossHp!=null?opts.bossHp:TUNING.bossHp)*(1+Math.max(0,(P.level||1)-1)*SCALE_BOSS)));
    B.atkMul=1+Math.max(0,(P.level||1)-1)*SCALE_BOSS_ATK;
    bLog('THE BATTLE BEGINS! '+D.name+' LOOMS BEFORE YOU.','#ffd54a');
    if(D.lore)bLog(D.lore,'#9ad8ff');
    bossSay('taunt');
    fx.beep(70,0.6,'sawtooth',0.18,-30); fx.noise(0.4,0.12); G.shake=5;
    return B;
  }

  return {
    get B(){return B;}, P, G, mouse,
    startBattle, battleUpdate, battleKey, battleClick, battleHover,
    battleConfirm, poolReroll, poolResolve, poolBtns, bMenuList, battleMenuLen, classMoveDef, ultReady,
    heroDiceInfo, heroDicePool, heroBonusDice, fmtDice, poolMean, poolSum, crackLimits, poolCritAt,
    playerAttackResolve, bossAttackResolve, stanceHit, pickStance, announceStance, bossAct, bossDone, bossFirst,
    classWeaponBase, usePotionHeal, bLogWrap, setBMsg, toMenu,
    STANCES, WEAPONS, ULT_NAMES, ULT_COLS, BOSS_COL, HERO_CX, EN_CX, VW, VH, BM_X, BM_Y, BM_W, BM_RH, BS_X, BS_W
  };
}
return {createBattle, makeHero, TUNING, CLASS_DICE, WEAPONS, STANCES, MOSSBACK, VW, VH};
});
