/* Tutorial and one Reading only. All state stays in memory. */
(() => {
  const R=globalThis.GFRules;
  class Toy {
    constructor(random=Math.random){this.random=random;this.generation=0;this.reset();}
    reset(mode='welcome'){
      this.generation++;this.mode=mode;this.phase='awaiting';this.step=0;
      this.dice=[];this.selected=-1;this.remaining=3;this.castsLeft=mode==='tutorial'?1:R.FIRST_READING.casts;
      this.target=mode==='tutorial'?650:R.FIRST_READING.target;this.total=0;
      this.busy=false;this.pending=null;this.result=null;this.previous=null;this.initial=null;this.last=null;
    }
    tutorial(){this.reset('tutorial');this.phase='live';this.dice=R.TUTORIAL_DICE.map(d=>({...d}));this.result=R.scoreHand(this.dice,{},0);this.initial=this.result;}
    reading(){this.reset('reading');}
    begin(type){this.busy=true;this.pending=type;return ++this.generation;}
    roll(){
      if(this.busy||this.mode!=='reading'||!['awaiting','between'].includes(this.phase)||this.castsLeft<=0)return null;
      this.dice=Array.from({length:5},()=>({n:1+Math.floor(this.random()*6),c:R.COLORS[Math.floor(this.random()*6)].id}));
      this.selected=-1;this.remaining=3;this.previous=null;this.last=null;
      this.result=R.scoreHand(this.dice,{},0);this.initial=this.result;
      return this.begin('roll');
    }
    canSelect(index){
      if(this.busy||this.phase!=='live'||!Number.isInteger(index)||index<0||index>=this.dice.length)return false;
      return this.mode!=='tutorial'||(this.step===0&&index===2)||(this.step===3&&index===3);
    }
    select(index){if(!this.canSelect(index))return false;this.selected=index;if(this.mode==='tutorial')this.step++;return true;}
    canBend(kind){
      if(this.busy||this.phase!=='live'||this.remaining<=0||this.selected<0||!['num','hue','full'].includes(kind))return false;
      return this.mode!=='tutorial'||kind===({1:'num',2:'hue',4:'num'}[this.step]);
    }
    bend(kind){
      if(!this.canBend(kind))return null;
      this.remaining--;this.previous=this.result;
      const before={...this.dice[this.selected]};
      this.dice[this.selected]=R.bendDie(before,kind,this.random);
      this.result=R.scoreHand(this.dice,{},0);this.last={kind,before,after:{...this.dice[this.selected]}};
      return this.begin('bend');
    }
    canCast(){return !this.busy&&this.phase==='live'&&this.castsLeft>0&&(this.mode==='reading'||(this.mode==='tutorial'&&this.step===5));}
    cast(){return this.canCast()?this.begin('cast'):null;}
    sort(kind){
      if(this.busy||this.phase!=='live'||this.mode!=='reading'||!['number','colour'].includes(kind))return false;
      const selected=this.dice[this.selected],rank=d=>R.COLORS.findIndex(c=>c.id===d.c);
      this.dice.sort((a,b)=>kind==='number'?(a.n-b.n)||(rank(a)-rank(b)):(rank(a)-rank(b))||(a.n-b.n));
      this.selected=this.dice.indexOf(selected);return true;
    }
    settle(generation){
      if(generation!==this.generation||!this.busy)return false;
      const operation=this.pending;this.pending=null;this.busy=false;
      if(operation==='roll')this.phase='live';
      if(operation==='bend'&&this.mode==='tutorial'){this.step++;if(this.step===3)this.selected=-1;}
      if(operation==='cast'){
        this.total+=this.result.score;this.castsLeft--;
        if(this.mode==='tutorial'){this.step=6;this.phase='done';}
        else this.phase=this.total>=this.target||this.castsLeft===0?'done':'between';
      }
      return true;
    }
  }
  globalThis.GFToy=Toy;
})();
