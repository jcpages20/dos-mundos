import {DISHES,clamp,cutLine,WORK_CENTER,CUT_ASSIST,pickServing,inServingTarget} from './recipes.mjs?cocina=14';
const clone=v=>JSON.parse(JSON.stringify(v));
const TAU=Math.PI*2;
export class CookingGame {
  constructor(recipe){
    if(!DISHES[recipe])throw new Error('Este plato todavía no está disponible.');
    this.state={version:1,recipe,phase:'ready',step:0,elapsed:0,stepTime:0,paused:false,completed:[],score:0,
      inputs:0,errors:0,cuts:[],eggs:0,turns:0,heat:0,temperature:0,cooked:0,goodHeat:0,overheat:0,
      flipped:false,flipAt:0,flipGrade:0,drained:false,plated:[],precision:[],feedback:''};
    this.pointer=null;this.easy=false;this.selectedPortion=null;
  }
  get dish(){return DISHES[this.state.recipe];}
  get step(){return this.dish.steps[this.state.step];}
  static restore(raw){
    if(raw?.version!==1||!DISHES[raw.recipe]||!['ready','playing','stepDone','done'].includes(raw.phase)||
      !Number.isInteger(raw.step)||raw.step<0||raw.step>3||!Array.isArray(raw.completed)||raw.completed.length>4||
      !Array.isArray(raw.cuts)||!Array.isArray(raw.plated)||!Array.isArray(raw.precision)||
      ['elapsed','stepTime','score','inputs','errors','eggs','turns','heat','temperature','cooked','goodHeat','overheat','flipGrade'].some(k=>!Number.isFinite(raw[k])||raw[k]<0)||
      raw.elapsed>7200||raw.heat>1||raw.temperature>1||raw.score>1000||raw.turns>100||raw.eggs>2||
      raw.cuts.length>6||raw.plated.some(i=>!Number.isInteger(i)||i<0||i>2)||new Set(raw.plated).size!==raw.plated.length||
      raw.completed.some(r=>!r||!Number.isFinite(r.grade)||r.grade<0||r.grade>1)||raw.precision.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('La preparación guardada está incompleta. Se conserva hasta que decidas descartarla.');
    if(raw.completed.length!==(raw.phase==='done'?4:raw.step)||raw.cuts.some((n,i)=>n!==i)||!Number.isInteger(raw.eggs)||!Number.isInteger(raw.inputs)||
      raw.phase==='done'&&raw.step!==3)throw new Error('Los pasos guardados no corresponden a esta preparación.');
    const g=new CookingGame(raw.recipe);g.state={...g.state,...clone(raw),paused:false};
    if(raw.phase==='stepDone'){g.state.phase='playing';g.check();if(g.state.phase!=='stepDone')throw new Error('El paso guardado todavía no estaba terminado.');}
    g.state.paused=true;return g;
  }
  start(){if(this.state.phase==='ready')this.state.phase='playing';}
  pause(){this.state.paused=true;this.pointer=null;}
  resume(){this.state.paused=false;this.pointer=null;}
  cancelGesture(){const held=this.pointer?.drag!=null;this.pointer=null;if(held&&this.active())this.state.feedback='El ingrediente vuelve arriba. Puedes cogerlo otra vez.';}
  resetStep(){
    const s=this.state;
    Object.assign(s,{phase:'playing',stepTime:0,errors:0,cuts:[],eggs:0,turns:0,heat:0,temperature:0,cooked:0,goodHeat:0,overheat:0,flipped:false,flipAt:0,flipGrade:0,drained:false,plated:[],precision:[],feedback:''});this.pointer=null;this.selectedPortion=null;
  }
  retry(){if(!this.state.paused&&['playing','stepDone'].includes(this.state.phase))this.resetStep();}
  next(){
    const s=this.state;if(s.phase!=='stepDone'||s.paused)return false;
    s.completed.push({kind:this.step.kind,grade:this.grade()});
    if(s.step===3){s.phase='done';s.score=Math.round(s.completed.reduce((n,r)=>n+r.grade,0)/4*1000);this.pointer=null;}
    else{s.step++;this.resetStep();}return true;
  }
  active(){return this.state.phase==='playing'&&!this.state.paused;}
  setHeat(value){if(!this.active()||!this.step.seconds)return;const n=Number(value);if(!Number.isFinite(n))return;this.state.heat=clamp(n);this.state.inputs++;}
  cut(index=this.state.cuts.length,error=0){
    const s=this.state;if(!this.active()||this.step.kind!=='cut'||index!==s.cuts.length)return;
    s.inputs++;s.cuts.push(index);s.precision.push(clamp(1-error/.12));s.feedback='Corte '+s.cuts.length+' de '+this.step.cuts+'. Levanta el dedo para el siguiente.';this.check();
  }
  crack(){const s=this.state;if(!this.active()||this.step.kind!=='mix'||s.eggs>=2)return;s.inputs++;s.eggs++;this.check();}
  stirQuarter(){if(!this.active()||!this.step.turns||this.step.kind==='mix'&&this.state.eggs<2)return;this.state.turns+=.25;this.state.inputs++;this.check();}
  flip(){const s=this.state;if(!this.active()||!this.step.flip||s.flipped)return;s.inputs++;if(s.cooked<7){s.errors++;s.feedback='Todavía necesita cuajar un poco.';return;}s.flipped=true;s.flipAt=s.elapsed;s.flipGrade=clamp(1-Math.abs(s.cooked-10)/14,.45,1);s.feedback='Tortilla volteada.';this.check();}
  drain(){const s=this.state;if(!this.active()||!this.step.drain||s.drained)return;s.inputs++;if(s.cooked<this.step.seconds){s.feedback='Espera a que la pasta esté cocida.';return;}s.drained=true;s.feedback='Pasta escurrida.';this.check();}
  plate(index,error=0){const s=this.state;if(!this.active()||this.step.kind!=='plate'||!Number.isInteger(index)||index<0||index>2||s.plated.includes(index))return;s.inputs++;s.plated.push(index);s.precision.push(clamp(1-error/.5,.6,1));if(this.selectedPortion===index)this.selectedPortion=null;this.check();}
  begin(x,y){
    if(!this.active()||!Number.isFinite(x)||!Number.isFinite(y))return;
    this.pointer={x,y,lastX:x,lastY:y,angle:null,arc:0,peakArc:0,drag:null};
    if(this.step.kind==='plate'){this.pointer.drag=pickServing(x,y,this.state.plated);this.state.feedback=this.pointer.drag===null?'Coge uno de los ingredientes de arriba.':'Lo tienes. Llévalo al plato iluminado y suelta.';}
    else this.state.feedback='';
    this.move(x,y);
  }
  move(x,y){
    if(!this.pointer||!this.active()||!Number.isFinite(x)||!Number.isFinite(y))return;
    const p=this.pointer;p.lastX=clamp(x);p.lastY=clamp(y);
    if(!this.easy&&this.step.turns&&!(this.step.kind==='mix'&&this.state.eggs<2)){
      const dx=x-WORK_CENTER.x,dy=y-WORK_CENTER.y,r=Math.hypot(dx,dy);
      if(r<.045||r>.42){p.angle=null;return;}
      const angle=Math.atan2(dy,dx);
      if(p.angle!==null){let delta=angle-p.angle;while(delta>Math.PI)delta-=TAU;while(delta<-Math.PI)delta+=TAU;
        // Credit the furthest net rotation of this contact, in either direction.
        // Back-and-forth jitter never adds repeated credit or erases earned turns.
        if(Math.abs(delta)<1.7){p.arc+=delta;const peak=Math.max(p.peakArc,Math.abs(p.arc));this.state.turns=clamp(this.state.turns+(peak-p.peakArc)/TAU,0,100);p.peakArc=peak;if(Math.abs(delta)>.025)this.state.inputs++;this.check();}}
      p.angle=angle;
    }
  }
  end(x,y){
    const p=this.pointer;if(p)this.move(x,y);this.pointer=null;if(!p||!this.active()||!Number.isFinite(x)||!Number.isFinite(y))return;
    const s=this.state,kind=this.step.kind;
    const tap=Math.hypot(x-p.x,y-p.y)<.10;
    if(kind==='cut'){
      const line=cutLine(this.step,s.cuts.length),error=Math.abs((x+p.x)/2-line);
      const overlap=Math.min(CUT_ASSIST.bottom,Math.max(y,p.y))-Math.max(CUT_ASSIST.top,Math.min(y,p.y));
      if(this.easy&&tap&&x>.22&&x<.82&&y>.32&&y<.90)this.cut(s.cuts.length,0);
      else if(overlap>=CUT_ASSIST.travel&&Math.abs(y-p.y)>Math.abs(x-p.x)*1.5&&Math.abs(x-p.x)<.20&&error<CUT_ASSIST.radius)this.cut(s.cuts.length,Math.max(0,error-.045)*.45);
      else{s.errors++;s.feedback='Desliza un poco más sobre la franja clara, hacia abajo o arriba.';}
    }else if(kind==='mix'&&s.eggs<2&&Math.hypot(x-p.x,y-p.y)<.08){
      const eggX=s.eggs===0?.32:.68;if(Math.hypot(x-eggX,y-.54)<.18)this.crack();
    }else if(this.step.flip&&(p.y-y>.2&&Math.abs(p.x-x)<.3||this.easy&&tap&&Math.hypot(x-.5,y-.6)<.34)){if(this.easy&&s.cooked<7)s.feedback='Todavía está cuajando. Tócala cuando esté lista.';else this.flip();}
    else if(this.step.drain&&(p.x<.7&&x>.75&&y>.35&&y<.88||this.easy&&tap&&x>.72&&y>.35&&y<.9))this.drain();
    else if(kind==='plate'&&this.easy&&tap&&p.drag!==null){this.selectedPortion=p.drag;s.feedback='Ingrediente elegido. Ahora toca el centro del plato.';}
    else if(kind==='plate'&&this.easy&&tap&&p.drag===null&&this.selectedPortion!==null&&inServingTarget(x,y)){this.plate(this.selectedPortion,0);this.selectedPortion=null;if(s.phase==='playing')s.feedback='¡Al plato! Toca el siguiente ingrediente.';}
    else if(kind==='plate'&&p.drag!==null){const error=Math.hypot(x-.5,y-.67);if(inServingTarget(x,y)){this.plate(p.drag,Math.max(0,error-.12)*.5);if(s.phase==='playing')s.feedback='¡Al plato! Coge el siguiente ingrediente.';}else s.feedback='Casi: suelta en la zona clara del plato. El ingrediente vuelve arriba.';}
  }
  update(dt){
    const s=this.state;if(!this.active())return;dt=clamp(Number(dt)||0,0,.1);s.elapsed+=dt;s.stepTime+=dt;
    if(this.easy&&this.pointer&&this.step.turns&&!(this.step.kind==='mix'&&s.eggs<2)&&Math.hypot(this.pointer.lastX-WORK_CENTER.x,this.pointer.lastY-WORK_CENTER.y)<.36){const before=Math.floor(s.turns*4);s.turns=clamp(s.turns+dt,0,this.step.turns);s.inputs+=Math.floor(s.turns*4)-before;if(!this.step.seconds)this.check();}
    if(this.step.seconds){s.temperature=clamp(s.temperature+(s.heat-s.temperature)*Math.min(1,dt*1.1));
      if(s.temperature>=.32){s.cooked+=dt;if(s.temperature<=.73)s.goodHeat+=dt;else s.overheat+=dt;}
      this.check();}
  }
  check(){
    if(!this.active())return;const s=this.state,step=this.step;
    const turnsDone=!step.turns||s.turns+1e-6>=step.turns;
    let done=step.kind==='cut'?s.cuts.length===step.cuts:step.kind==='mix'?s.eggs===2&&turnsDone:step.kind==='wash'?turnsDone:step.kind==='plate'?s.plated.length===3:
      s.cooked>=step.seconds&&turnsDone&&(!step.flip||s.flipped)&&(!step.drain||s.drained);
    if(done){if(step.turns&&s.turns<step.turns)s.turns=step.turns;s.phase='stepDone';s.feedback='Paso terminado.';this.pointer=null;}
  }
  grade(){
    const s=this.state,step=this.step;
    if(step.kind==='cut'||step.kind==='plate')return clamp(s.precision.reduce((n,v)=>n+v,0)/s.precision.length-s.errors*.025,.25,1);
    if(step.kind==='mix'||step.kind==='wash')return clamp(1-s.errors*.025,.5,1);
    const heat=clamp(s.goodHeat/Math.max(.01,s.cooked));return clamp(heat*(step.flip?.75:1)+(step.flip?s.flipGrade*.25:0),.2,1);
  }
  result(){const s=this.state;if(s.phase!=='done')return null;return {recipe:s.recipe,score:s.score,elapsed:Math.round(s.elapsed),inputs:s.inputs,effort:s.completed.length===4&&s.inputs>=10,steps:clone(s.completed),quality:s.score>=850?'Excelente':s.score>=650?'Muy rico':s.score>=400?'Casero':'En práctica'};}
  snapshot(){return clone(this.state);}
}
