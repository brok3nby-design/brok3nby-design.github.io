/* In-memory teaser only. No full-game lifecycle or persistence. */
(() => {
  const R=globalThis.GFRules;
  class Toy {
    constructor(random=Math.random){this.random=random;this.generation=0;this.reset();}
    reset(){this.generation++;this.dice=[];this.selected=-1;this.remaining=3;this.busy=false;this.result=null;this.initial=null;this.previous=null;this.last=null;this.completed=false;}
    roll(){
      if(this.busy)return null;
      this.reset();this.busy=true;
      this.dice=Array.from({length:5},()=>({n:1+Math.floor(this.random()*6),c:R.COLORS[Math.floor(this.random()*6)].id}));
      this.result=R.scoreHand(this.dice,{},0);this.initial=this.result;
      return this.generation;
    }
    select(index){if(this.busy||!Number.isInteger(index)||index<0||index>=this.dice.length)return false;this.selected=index;return true;}
    bend(kind){
      if(this.busy||this.remaining<=0||this.selected<0||!['num','hue','full'].includes(kind))return null;
      this.busy=true;this.remaining--;this.previous=this.result;
      const before={...this.dice[this.selected]};
      this.dice[this.selected]=R.bendDie(before,kind,this.random);
      this.result=R.scoreHand(this.dice,{},0);
      this.last={kind,before,after:{...this.dice[this.selected]}};
      return this.generation;
    }
    settle(generation){if(generation!==this.generation||!this.busy)return false;this.busy=false;if(this.remaining===0)this.completed=true;return true;}
  }
  globalThis.GFToy=Toy;
})();
