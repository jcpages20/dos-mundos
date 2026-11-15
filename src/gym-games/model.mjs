export const TYPES={weights:{name:'Fuerza y precisión',minutes:60,energy:19},cardio:{name:'Encuentra tu ritmo',minutes:35,energy:13},silks:{name:'Una secuencia en las telas',minutes:45,energy:15},stretch:{name:'Respirar y coordinar',minutes:20,energy:0}};
export const LEVELS={suave:{name:'Suave',window:.32,perfect:.16,band:.29,preview:2.8,sequences:[3,3]},normal:{name:'Normal',window:.24,perfect:.11,band:.21,preview:2.3,sequences:[3,4]},reto:{name:'Reto',window:.17,perfect:.075,band:.15,preview:1.8,sequences:[3,4,5]}};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const clone=v=>JSON.parse(JSON.stringify(v));
export const codeFor=(type,level,seed)=>`ATLAS-${{weights:'F',cardio:'C',silks:'T',stretch:'M'}[type]}-${{suave:'S',normal:'N',reto:'R'}[level]}-${(seed&0xffffff).toString(16).padStart(6,'0').toUpperCase()}`;
export function parseCode(text){const token=String(text).trim().toUpperCase().split(/\s+·\s+/)[0],m=token.match(/^ATLAS-([FCTM])-([SNR])-([0-9A-F]{6})$/);return m?{type:{F:'weights',C:'cardio',T:'silks',M:'stretch'}[m[1]],level:{S:'suave',N:'normal',R:'reto'}[m[2]],seed:parseInt(m[3],16)}:null;}
function random(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export class GymGame{
  constructor(type,level='normal',seed=1){
    if(!TYPES[type]||!LEVELS[level])throw new Error('Elige un reto y una dificultad.');
    const rng=random(seed),cfg=LEVELS[level];
    this.state={version:1,type,level,seed,elapsed:0,phase:'ready',phaseTime:0,paused:false,score:0,combo:0,maxCombo:0,inputs:0,hits:0,attempts:0,feedback:'',held:[],rep:0,power:0,cooldown:0,targets:Array.from({length:8},()=>.55+rng()*.27),
      notes:Array.from({length:12},(_,i)=>({at:1.8+i*(level==='reto'?1.2:level==='suave'?1.65:1.45)+(i>5?-.15:0),side:i%2?'right':'left',result:null})),
      sequences:cfg.sequences.map(n=>Array.from({length:n},()=>['left','up','right','down'][Math.floor(rng()*4)])),sequence:0,index:0,errors:0,balance:0,balanced:0,finalGrade:0,finalDone:false,aligned:0,breaths:0};
  }
  static restore(raw){
    if(raw?.version!==1||!TYPES[raw.type]||!LEVELS[raw.level]||!Number.isFinite(raw.elapsed)||raw.elapsed<0||raw.elapsed>180)throw new Error('La partida interrumpida no es compatible.');
    const game=new GymGame(raw.type,raw.level,raw.seed),fresh=game.state;
    if(!Number.isInteger(raw.seed)||raw.seed<0||raw.seed>0xffffff||!['ready','playing','preview','sequence','balance','figure','done'].includes(raw.phase)||!Number.isFinite(raw.phaseTime)||!Number.isFinite(raw.score)||!Number.isFinite(raw.balance)||
      JSON.stringify(raw.targets)!==JSON.stringify(fresh.targets)||JSON.stringify(raw.sequences)!==JSON.stringify(fresh.sequences)||!Array.isArray(raw.notes)||raw.notes.length!==12||raw.notes.some((n,i)=>!n||n.at!==fresh.notes[i].at||n.side!==fresh.notes[i].side||![null,'perfect','good','miss'].includes(n.result)))throw new Error('La secuencia guardada está incompleta. Puedes descartarla y empezar otra.');
    game.state={...game.state,...clone(raw),held:[],paused:true};return game;
  }
  get cfg(){return LEVELS[this.state.level];}
  start(){if(this.state.phase!=='ready')return;this.state.phase=this.state.type==='silks'?'preview':'playing';}
  clearInputs(){this.state.held=[];this.state.power=0;}
  pause(){if(!['ready','done'].includes(this.state.phase))this.state.paused=true;this.clearInputs();}
  resume(){this.state.paused=false;this.clearInputs();}
  grade(error){return error<=this.cfg.perfect?'perfect':error<=this.cfg.window?'good':'miss';}
  add(grade){const s=this.state;s.attempts++;if(grade==='miss'){s.combo=0;s.feedback='Casi. Prueba el siguiente movimiento.';}else{s.hits++;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.score+=grade==='perfect'?100:65;s.feedback=grade==='perfect'?'¡Preciso!':'Bien hecho';}}
  input(action,pressed=true){
    const s=this.state;if(s.paused||['ready','done'].includes(s.phase))return;
    const was=s.held.includes(action);if(pressed){if(was)return;s.held.push(action);}else s.held=s.held.filter(k=>k!==action);
    if(s.type==='weights'){
      if(action!=='action'||s.cooldown>0)return;
      if(pressed){s.inputs++;s.power=0;}else if(was){const error=Math.abs(s.power-s.targets[s.rep]);this.add(error<=.055?'perfect':error<=this.cfg.window*.5?'good':'miss');s.rep++;s.cooldown=.55;s.power=0;if(s.rep>=8)this.end();}
    }else if(s.type==='cardio'&&pressed&&['left','right'].includes(action)){
      s.inputs++;const note=s.notes.filter(n=>!n.result&&Math.abs(n.at-s.elapsed)<=this.cfg.window).sort((a,b)=>Math.abs(a.at-s.elapsed)-Math.abs(b.at-s.elapsed))[0];
      if(note){note.result=note.side===action?this.grade(Math.abs(note.at-s.elapsed)):'miss';this.add(note.result);}else{s.combo=0;s.feedback='Espera a que la nota llegue a la línea.';}
    }else if(s.type==='silks'){
      if(s.phase==='sequence'&&pressed&&['left','right','up','down'].includes(action)){
        s.inputs++;s.attempts++;const wanted=s.sequences[s.sequence][s.index];
        if(action===wanted){s.hits++;s.index++;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.score+=100;s.feedback='Movimiento enlazado';
          if(s.index===s.sequences[s.sequence].length){s.sequence++;s.index=0;s.phaseTime=0;s.phase=s.sequence>=s.sequences.length?'balance':'preview';}}
        else{s.combo=0;s.errors++;s.feedback='Ese no era. Continúa desde el movimiento marcado.';}
      }else if(s.phase==='balance'&&pressed&&['left','right'].includes(action))s.inputs++;
      else if(s.phase==='figure'&&action==='action'&&pressed&&!s.finalDone){s.inputs++;s.finalDone=true;const error=Math.abs(this.needle()-.72);s.finalGrade=error<=.07 ? 1 : error<=this.cfg.window ? .7 : 0;s.feedback=s.finalGrade===1?'¡Figura cerrada!':s.finalGrade?'Buen cierre':'La próxima vez, espera a la zona dorada.';this.end();}
    }else if(s.type==='stretch'&&action==='action'&&pressed){s.inputs++;}
  }
  needle(){return (Math.sin(this.state.phaseTime*2.25-Math.PI/2)+1)/2;}
  update(dt){
    const s=this.state;if(s.paused||['ready','done'].includes(s.phase))return;
    dt=clamp(Number(dt)||0,0,.1);s.elapsed+=dt;s.phaseTime+=dt;
    if(s.type==='weights'){
      if(s.cooldown>0){s.cooldown=Math.max(0,s.cooldown-dt);return;}
      if(s.held.includes('action')){s.power+=dt*.58;if(s.power>1.12){this.add('miss');s.rep++;s.power=0;s.cooldown=.55;s.held=[];if(s.rep>=8)this.end();}}
      if(s.elapsed>=30)this.end();
    }else if(s.type==='cardio'){
      for(const n of s.notes)if(!n.result&&s.elapsed>n.at+this.cfg.window){n.result='miss';this.add('miss');}
      if(s.elapsed>s.notes.at(-1).at+this.cfg.window+.4)this.end();
    }else if(s.type==='silks'){
      if(s.phase==='preview'&&s.phaseTime>=this.cfg.preview){s.phase='sequence';s.phaseTime=0;}
      else if(s.phase==='sequence'&&s.phaseTime>=8){s.sequence++;s.errors+=s.sequences[Math.min(s.sequence-1,s.sequences.length-1)].length-s.index;s.index=0;s.phaseTime=0;s.combo=0;s.phase=s.sequence>=s.sequences.length?'balance':'preview';s.feedback='Seguimos con la siguiente parte.';}
      else if(s.phase==='balance'){
        const correction=Number(s.held.includes('right'))-Number(s.held.includes('left'));
        s.balance=clamp(s.balance+(Math.sin(s.phaseTime*2.1+s.seed%7)*.65+.14+correction*.95)*dt,-1,1);
        if(Math.abs(s.balance)<=this.cfg.band)s.balanced+=dt;
        if(s.phaseTime>=6){s.phase='figure';s.phaseTime=0;s.held=[];}
      }else if(s.phase==='figure'&&s.phaseTime>=5){s.finalGrade=0;this.end();}
    }else if(s.type==='stretch'){
      const inhale=s.elapsed%4<2,holding=s.held.includes('action');if(inhale===holding)s.aligned+=dt;
      s.breaths=Math.floor(s.elapsed/4);if(s.elapsed>=20)this.end();
    }
  }
  end(){
    const s=this.state;if(s.phase==='done')return;
    const totalSequence=s.sequences.reduce((n,a)=>n+a.length,0);
    let score=s.type==='weights'?s.score/800*1000:s.type==='cardio'?s.score/1200*1000:s.type==='silks'?(clamp(s.score/(totalSequence*100)-s.errors*.03)*.4+clamp(s.balanced/6)*.35+s.finalGrade*.25)*1000:clamp(s.aligned/20)*1000;
    s.score=clamp(Math.round(score),0,1000);s.phase='done';s.held=[];
  }
  result(){const s=this.state;if(s.phase!=='done')return null;return {score:s.score,maxCombo:s.maxCombo,hits:s.hits,attempts:s.attempts,inputs:s.inputs,elapsed:Math.round(s.elapsed*10)/10,balanced:Math.round(s.balanced/6*100),aligned:Math.round(s.aligned/20*100),errors:s.errors,effort:s.inputs>=(s.type==='stretch'?2:3),medal:s.score>=850?'Oro':s.score>=650?'Plata':s.score>=400?'Bronce':'En práctica'};}
  snapshot(){return clone(this.state);}
}
