import {GymGame,TYPES,LEVELS,codeFor,parseCode} from './model.mjs';
import {GymRoutine,routineCodeFor,parseRoutineCode,choiceLabel,FIGURES,routineBreath} from './routine-model.mjs?rutinas=10';
import {GYM_PROGRESS} from './progression.mjs?rutinas=10';
const node=(tag,cls='',text='')=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
const glyph={left:'←',right:'→',up:'↑',down:'↓'};
export class GymChallengeUI{
  constructor(scene,api){this.scene=scene;this.api=api;this.abort=new AbortController();
    window.addEventListener('keydown',e=>this.key(e,true),{capture:true,signal:this.abort.signal});window.addEventListener('keyup',e=>this.key(e,false),{capture:true,signal:this.abort.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();},{signal:this.abort.signal});window.addEventListener('blur',()=>this.pause(),{signal:this.abort.signal});
    window.addEventListener('orientationchange',()=>this.pause(),{signal:this.abort.signal});window.addEventListener('pagehide',()=>this.pause(),{signal:this.abort.signal});
  }
  get open(){return !!this.root;}
  code(){return this.engine==='routine'?routineCodeFor(this.type,this.level,this.seed,this.routine):codeFor(this.type,this.level,this.seed);}
  button(label,fn){const b=node('button','',label);b.type='button';b.addEventListener('click',fn);return b;}
  mount(){
    this.close();this.root=node('section','dm-gym-challenge');this.root.id='dm-gym-challenge';this.root.setAttribute('aria-label','Entrenamiento jugable');this.root.setAttribute('role','region');
    this.scene.root.dataset.challenge='';this.previousOverview=this.scene.renderer.overview;this.scene.renderer.overview=false;this.scene.plan.disabled=true;this.scene.held.clear();this.scene.path=[];this.scene.pending=null;
    this.scene.root.append(this.root);this.savedFocus=document.activeElement;
  }
  openBrief(object,spec=null){
    this.mount();this.object=object;this.type=object?.action||'weights';this.level=spec?.level||'normal';this.seed=spec?.seed??crypto.getRandomValues(new Uint32Array(1))[0]%0x1000000;this.practice=false;this.ticket=null;this.game=null;
    this.engine=spec?(spec.engine||'classic'):'routine';this.routine=spec?.routine||'base';
    const data=this.api.snapshot();this.root.append(node('h2','',object?TYPES[this.type].name:'Juega el mismo reto'));
    if(data.active&&data.active.status!=='claimed'){
      this.root.append(node('p','','Tienes una sesión interrumpida. Sus segundos están en pausa y todavía no se han aplicado minutos ni XP.'),this.button('Retomar sesión',()=>this.scene.resumeChallenge(data.active)),this.button('Descartar sesión interrumpida',()=>{const r=this.api.abandon(data.active.id);if(r.ok)this.openBrief(object,spec);else this.note(r.message);}));
    }else if(object){
      const copy={weights:'Mantén el botón para levantar. Suelta dentro de la franja verde. La franja cambia en cada repetición: completa ocho.',cardio:'Alterna izquierda y derecha cuando cada nota alcance la línea dorada. El ritmo cambia durante la serie.',silks:'Mira la secuencia y repítela. Después corrige el equilibrio con izquierda/derecha y cierra la figura en el momento preciso.',stretch:'Mantén el botón durante «Inspirar» y suéltalo durante «Soltar». Completa cinco ciclos tranquilos.'};
      const description=node('p');this.root.append(description);
      const format=node('select');format.setAttribute('aria-label','Formato del entrenamiento');
      for(const [id,label] of [['routine','Rutina de 45 segundos'],['classic','Reto clásico']]){const option=node('option','',label);option.value=id;format.append(option);}format.value=this.engine;
      const routineSelect=node('select');routineSelect.setAttribute('aria-label','Rutina de Atlas');
      for(const [id,label] of Object.entries(GYM_PROGRESS.routines[this.type])){const option=node('option','',label+(GYM_PROGRESS.unlocked(data.journey,this.type,id)?'':' · 2 sesiones o ensayo'));option.value=id;routineSelect.append(option);}routineSelect.value=this.routine;
      const formatRow=node('div','gm-settings');formatRow.append(format,routineSelect);this.root.append(formatRow);
      const routineCopy={weights:'45 segundos. Haz tres levantamientos por tramo: mantén y suelta en la franja. Al final sostén dos segundos. Elige carga segura o exigente.',cardio:'45 segundos. Alterna izquierda y derecha al cruzar las notas por la línea. Elige trote o intervalo rápido y termina la última recta.',silks:'45 segundos. Mantén para subir, suelta a la altura marcada, equilibra con izquierda/derecha y asegura la figura. Al final baja hasta la colchoneta. Elige una figura segura o exigente.',stretch:'45 segundos. Mantén al inspirar y suelta al salir el aire. Elige postura estable o amplia en cada tramo y termina con una pausa de movilidad.'};
      const updateFormat=()=>{routineSelect.hidden=this.engine!=='routine';description.textContent=this.engine==='routine'?routineCopy[this.type]:copy[this.type];if(this.codeInput)this.codeInput.value=this.code();};
      format.onchange=()=>{this.engine=format.value;updateFormat();};routineSelect.onchange=()=>{this.routine=routineSelect.value;updateFormat();};updateFormat();
      const row=node('div','gm-settings'),difficulty=node('select');difficulty.setAttribute('aria-label','Dificultad del reto');
      for(const [id,cfg] of Object.entries(LEVELS)){const option=node('option','',cfg.name);option.value=id;difficulty.append(option);}difficulty.value=this.level;difficulty.onchange=()=>{this.level=difficulty.value;if(this.codeInput)this.codeInput.value=this.code();};
      const practice=node('label','gm-practice'),checkbox=node('input');checkbox.type='checkbox';checkbox.onchange=()=>{this.practice=checkbox.checked;};practice.append(checkbox,document.createTextNode('Ensayo gratis · sin minutos ni XP'));row.append(difficulty,practice);this.root.append(row);
      this.root.append(node('small','',TYPES[this.type].minutes+' min del juego al guardar la sesión · '+TYPES[this.type].energy+' de energía necesarios · La puntuación no multiplica los premios.'),this.button('Empezar reto',()=>this.start()));
    }
    const code=node('div','gm-code'),input=node('input');this.codeInput=input;input.type='text';input.autocapitalize='characters';input.spellcheck=false;input.placeholder='ATLAS-T-N-4F2A91';input.setAttribute('aria-label','Código de reto');input.value=object?codeFor(this.type,this.level,this.seed):'';
    input.value=object?this.code():'';
    code.append(input,this.button('Jugar este código',()=>{const parsed=parseRoutineCode(input.value)||parseCode(input.value);if(!parsed){this.note('Escribe un código como ATLAS-T-N-4F2A91 o ATLAS2-T-N-B-4F2A91.');return;}if(this.api.snapshot().active?.status==='playing'){this.note('Retoma o descarta primero la sesión interrumpida.');return;}this.close();this.scene.startChallengeRoute(parsed.type,parsed);}));this.root.append(code);
    this.root.append(this.button('Volver al club',()=>this.close()));this.notice=node('p','gm-notice');this.notice.setAttribute('role','status');this.root.append(this.notice);this.root.querySelector('button')?.focus({preventScroll:true});
    if(!data.ok)this.note(data.message);
  }
  note(text){if(this.notice)this.notice.textContent=text;}
  start(){
    const r=this.api.create(this.type,this.level,this.seed,this.practice,{engine:this.engine,routine:this.routine});if(!r.ok){this.note(r.message);return;}
    this.ticket=r.ticket;this.game=this.engine==='routine'?new GymRoutine(this.type,this.level,this.seed,this.routine):new GymGame(this.type,this.level,this.seed);this.game.start();this.scene.placeForChallenge(this.object);this.buildControls();this.persist();
  }
  resume(ticket,object){
    this.mount();this.ticket=ticket;this.object=object;this.type=ticket.type;this.level=ticket.level;this.seed=ticket.seed;this.practice=ticket.practice;this.engine=ticket.engine||'classic';this.routine=ticket.routine||'base';
    try{const Model=this.engine==='routine'?GymRoutine:GymGame;this.game=ticket.model?Model.restore(ticket.model):new Model(ticket.type,ticket.level,ticket.seed,this.routine);if(this.game.state.phase==='ready')this.game.start();this.game.pause();this.scene.placeForChallenge(object);this.buildControls();this.refresh();}
    catch(error){this.root.append(node('p','',error.message),this.button('Descartar sesión interrumpida',()=>{this.api.abandon(ticket.id);this.close();}));}
  }
  control(label,action){
    const b=node('button','gm-input',label);b.type='button';b.dataset.action=action;
    b.addEventListener('pointerdown',e=>{if(b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);this.input(action,true);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{e.preventDefault();this.input(action,false);});return b;
  }
  buildControls(){
    this.root.replaceChildren();const head=node('div','gm-live-head');this.title=node('strong','',TYPES[this.type].name);this.progress=node('span');head.append(this.title,this.progress,this.button('Pausa',()=>this.pause()));this.root.append(head);
    this.cue=node('p','gm-cue');this.root.append(this.cue);this.stage=node('canvas','gm-game-canvas');this.stage.width=600;this.stage.height=100;this.stage.setAttribute('role','img');this.root.append(this.stage);
    this.choices=node('div','gm-choices');this.choices.setAttribute('role','group');this.choices.setAttribute('aria-label','Riesgo del tramo');
    for(const risk of ['safe','bold']){const b=this.button('',()=>{this.game.choose(risk);this.refresh();this.persist();});b.dataset.risk=risk;this.choices.append(b);}this.root.append(this.choices);
    this.sequence=node('div','gm-sequence');this.root.append(this.sequence);const controls=node('div','gm-live-controls');
    this.arrows=node('div','gm-arrows');for(const key of ['left','up','down','right']){const b=this.control(glyph[key],key);b.setAttribute('aria-label','Movimiento '+{left:'izquierda',up:'arriba',down:'abajo',right:'derecha'}[key]);this.arrows.append(b);}
    this.action=this.control('Mantén y suelta','action');controls.append(this.arrows,this.action);this.root.append(controls);
    this.notice=node('p','gm-notice');this.notice.setAttribute('role','status');this.root.append(this.notice);this.pauseBox=node('div','gm-paused');this.pauseBox.hidden=true;
    this.pauseBox.append(node('strong','','Reto en pausa'),this.button('Continuar reto',()=>{this.game.resume();this.pauseBox.hidden=true;this.persist();}),this.button('Salir y conservar el reto',()=>{this.persist();this.close(false);}));this.root.append(this.pauseBox);this.refresh();
  }
  input(action,on){if(!this.game||this.game.state.phase==='done')return;this.game.input(action,on);if(this.game.state.phase==='done'&&!this.resultShown){this.showResult();return;}this.refresh();if(!on)this.persist();}
  key(e,on){
    if(!this.open||document.getElementById('dm-life-modal')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(e.key==='Escape'&&on){e.preventDefault();e.stopImmediatePropagation();if(this.game?.state.phase==='done')this.close();else if(this.game)this.pause();else this.close();return;}
    if(!this.game)return;const button=e.target.closest?.('button');
    if(button&&!button.dataset.action&&[' ','Enter'].includes(e.key))return;
    if(this.game.state.paused||this.game.state.phase==='done'){if(e.key.startsWith('Arrow'))e.stopImmediatePropagation();return;}
    const action=[' ','Enter'].includes(e.key)&&button?.dataset.action?button.dataset.action:{ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down',' ':'action',Enter:'action'}[e.key];
    if(action){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.input(action,on);}
  }
  pause(){if(!this.game||this.game.state.phase==='done')return;this.game.pause();if(this.pauseBox)this.pauseBox.hidden=false;this.persist();}
  update(dt,now){
    if(!this.open||!this.game)return;if(this.api.role!==this.ticket.role){this.close(false);this.scene.api.exit();return;}
    if(this.game.state.phase!=='done')this.game.update(dt);
    if(this.game.state.phase==='done'&&!this.resultShown){this.showResult();return;}
    if(!this.resultShown)this.refresh();if(now-(this.lastSaved||0)>1000){this.persist();this.lastSaved=now;}
  }
  persist(){if(!this.ticket||!this.game||this.applied)return;const r=this.api.saveRun(this.ticket.id,this.game.snapshot());if(!r.ok)this.note(r.message);}
  refresh(){
    if(!this.game||this.resultShown)return;const s=this.game.state,cfg=LEVELS[s.level];this.pauseBox.hidden=!s.paused;
    if(this.engine==='routine'){this.refreshRoutine();return;}this.choices.hidden=true;
    this.progress.textContent=Math.floor(s.elapsed)+' s · Combo '+s.combo;
    const descriptions={weights:'Mantén para levantar; suelta dentro del verde. '+Math.min(s.rep+1,8)+'/8',cardio:'Pulsa el lado de la nota al cruzar la línea dorada.',preview:'Mira y memoriza la secuencia.',sequence:'Repite la secuencia con las flechas.',balance:'Mantén el punto cerca del centro: corrige con izquierda y derecha.',figure:'Cierra la figura cuando el indicador esté en la zona dorada.',stretch:s.elapsed%4<2?'Inspirar · mantén el botón':'Soltar · suelta el botón'};
    this.cue.textContent=descriptions[s.type==='silks'?s.phase:s.type];this.action.hidden=s.type==='cardio'||s.type==='silks'&&s.phase!=='figure';this.arrows.hidden=!(s.type==='cardio'||s.type==='silks'&&['sequence','balance'].includes(s.phase));
    this.action.textContent=s.type==='silks'?'Cerrar figura':s.type==='stretch'?'Mantén al inspirar':'Levantar · mantén y suelta';
    for(const b of this.arrows.children)b.hidden=(s.type==='cardio'||s.phase==='balance')&&!['left','right'].includes(b.dataset.action);
    const signature=s.phase+':'+s.sequence+':'+s.index+':'+s.level;if(this.seqSignature!==signature){this.seqSignature=signature;this.sequence.replaceChildren();
      if(s.type==='silks'&&['preview','sequence'].includes(s.phase)){s.sequences[s.sequence]?.forEach((d,i)=>{const known=s.phase==='preview'||s.level==='suave'||i<s.index;const item=node('span',i===s.index?'current':'',known?glyph[d]:'?');this.sequence.append(item);});}}
    this.note(s.feedback);this.drawTrack(s,cfg);this.stage.setAttribute('aria-label',this.cue.textContent);
  }
  refreshRoutine(){
    const s=this.game.state,exercise=s.phase==='exercise',finale=s.phase==='finale',warmup=s.phase==='warmup';
    this.title.textContent=GYM_PROGRESS.routines[s.type][s.routine];
    this.progress.textContent=Math.ceil(45-s.elapsed)+' s · '+(warmup?'Preparación':s.phase==='choose'||exercise?'Tramo '+(s.round+1)+'/3':'Cierre');
    this.sequence.replaceChildren();this.choices.hidden=s.phase!=='choose';
    for(const b of this.choices.children){b.textContent=choiceLabel(s.type,s.routine,s.round,b.dataset.risk);b.setAttribute('aria-pressed',String((s.choices[s.round]||'safe')===b.dataset.risk));}
    const cues={weights:'Mantén para levantar y suelta dentro de la franja. Tres repeticiones.',cardio:'Alterna los pies al llegar cada nota a la línea.',silks:s.phaseTime<3?'Sube manteniendo el botón y suelta a la altura marcada.':s.phaseTime<6?'Mantén la figura centrada con izquierda y derecha.':'Pulsa Asegurar figura cuando estés estable.',stretch:routineBreath(s).inhale?'Inspirar · mantén el botón':'Soltar · suelta el botón'};
    const finals={weights:s.finalDone?'Barra apoyada. Termina la rutina.':'Sostén la barra durante 2 segundos y suelta.',cardio:'Última recta: sigue los '+s.notes.length+' pasos hasta la meta.',silks:s.finalDone?'Has vuelto a la colchoneta.':'Mantén para descender. Suelta al llegar a la colchoneta.',stretch:routineBreath(s).inhale?'Cierre · inspira manteniendo el botón':'Cierre · suelta el aire y el botón'};
    this.cue.textContent=warmup?({weights:'Prueba el agarre. En cada tramo podrás elegir la carga.',cardio:'Prepara los pies. Cada tramo permite trotar o acelerar.',silks:'Prepara el agarre. Elegirás una figura antes de cada ascenso.',stretch:'Busca una postura cómoda. Mantén al inspirar y suelta después.'}[s.type]):s.phase==='choose'?'Elige este tramo. La variante segura queda seleccionada si no cambias.':finale?finals[s.type]:cues[s.type];
    this.action.hidden=s.phase==='choose'||s.type==='cardio'||s.type==='silks'&&exercise&&s.phaseTime>=3&&s.phaseTime<6;this.arrows.hidden=s.phase==='choose'||!(s.type==='cardio'||s.type==='silks'&&exercise&&s.phaseTime>=3&&!s.secured);
    for(const b of this.arrows.children)b.hidden=!['left','right'].includes(b.dataset.action);
    this.action.disabled=exercise&&s.type==='silks'&&s.phaseTime>=3&&s.phaseTime<6||finale&&s.finalDone;
    this.action.textContent=s.type==='silks'?(finale?'Descender · mantén y suelta':exercise&&s.phaseTime>=6?'Asegurar figura':'Subir · mantén y suelta'):s.type==='stretch'?'Mantén al inspirar':finale?'Sostener · 2 segundos':'Levantar · mantén y suelta';
    this.note(exercise?(s.type==='silks'?FIGURES[s.figure]+' · '+(s.secured?'Figura asegurada':Math.round(s.height*100)+'% de altura'):s.type==='weights'?Math.min(s.rep,3)+'/3 repeticiones':s.type==='cardio'?Math.floor(s.distance)+' m recorridos':'Postura '+(this.game.risk==='bold'?'amplia':'estable')):'');
    this.drawRoutineTrack();this.stage.setAttribute('aria-label',this.cue.textContent);
  }
  drawRoutineTrack(){
    const s=this.game.state,g=this.stage.getContext('2d'),w=600,h=100;
    g.clearRect(0,0,w,h);g.fillStyle='#1c3438';g.fillRect(0,0,w,h);g.font='bold 19px system-ui';g.textAlign='center';
    if(s.phase==='choose'||s.phase==='warmup'){
      g.fillStyle='#d6bd93';g.fillText(s.phase==='warmup'?'Preparación · '+Math.ceil(5-s.phaseTime)+' s':'Segura: 220 pt · Exigente: 300 pt',w/2,59);return;
    }
    if(s.type==='cardio'){
      g.strokeStyle='#d6bd93';g.lineWidth=3;g.beginPath();g.moveTo(110,8);g.lineTo(110,92);g.stroke();
      for(const n of s.notes){const x=110+(n.at-s.phaseTime)*150;if(x<-30||x>w+30)continue;g.fillStyle='#cfbaa0';g.fillRect(x-16,n.side==='left'?12:57,32,30);g.fillStyle='#243e40';g.fillText(n.side==='left'?'←':'→',x,n.side==='left'?34:79);}return;
    }
    let center=.5,band=.15,value=0;
    if(s.type==='weights'){center=s.phase==='finale'?2/3:(s.plan[s.round]?.targets[s.rep]||.65);band=s.phase==='finale'?.06:this.game.band;value=s.phase==='finale'?s.finalHold/3:s.power;}
    if(s.type==='silks'){
      if(s.phase==='finale'){center=.08;band=.08;value=s.height;}
      else if(s.phaseTime<3){center=this.game.risk==='bold'?.82:.57;band=this.game.risk==='bold'?.09:.15;value=s.height;}
      else{center=.5;band=this.game.band/2;value=(s.balance+1)/2;}
    }
    if(s.type==='stretch'){g.fillStyle='#d6bd93';g.fillText(routineBreath(s).inhale?'INSPIRAR':'SOLTAR',w/2,60);return;}
    g.fillStyle='#627563';g.fillRect(24+(center-band)*552,20,band*2*552,60);g.fillStyle='#d6bd93';g.fillRect(24+center*552-2,20,4,60);g.fillStyle='#e9ddc4';g.fillRect(20+Math.max(0,Math.min(1,value))*552,12,8,76);
  }
  drawTrack(s,cfg){
    const g=this.stage.getContext('2d'),w=this.stage.width,h=this.stage.height;g.clearRect(0,0,w,h);g.fillStyle='#1c3438';g.fillRect(0,0,w,h);g.font='bold 20px system-ui';g.textAlign='center';
    if(s.type==='cardio'){
      g.strokeStyle='#e8ca88';g.lineWidth=4;g.beginPath();g.moveTo(110,8);g.lineTo(110,h-8);g.stroke();
      for(const n of s.notes){const x=110+(n.at-s.elapsed)*150;if(x<-30||x>w+30)continue;const y=n.side==='left'?29:72;g.fillStyle=n.result==='miss'?'#886563':n.result?'#b9d1a1':n.side==='left'?'#b0d4cc':'#e2bc91';g.beginPath();g.arc(x,y,18,0,Math.PI*2);g.fill();g.fillStyle='#213d41';g.fillText(n.side==='left'?'←':'→',x,y+7);}
    }else if(s.type==='silks'&&['preview','sequence'].includes(s.phase)){
      g.fillStyle='#e8d0a4';g.fillText(s.phase==='preview'?'Secuencia '+(s.sequence+1)+' · observa':'Movimiento '+(s.index+1),w/2,59);
    }else{
      const balance=s.type==='silks'&&s.phase==='balance';const center=s.type==='weights'?(s.targets[s.rep]||.7):balance ? .5 : s.type==='silks' ? .72 : .5;
      const band=s.type==='weights'?cfg.window*.5:balance?cfg.band/2:s.type==='silks'?cfg.window:.13;
      g.fillStyle='#4a695c';g.fillRect(24+(center-band)*(w-48),20,band*2*(w-48),60);g.fillStyle='#d9c28d';g.fillRect(24+center*(w-48)-2,20,4,60);
      const value=s.type==='weights'?s.power:balance?(s.balance+1)/2:s.type==='silks'?this.game.needle():(Math.sin(s.elapsed*Math.PI/2-Math.PI/2)+1)/2;
      g.fillStyle='#fff1cf';g.fillRect(20+Math.min(1,Math.max(0,value))*(w-48),11,8,78);
      if(s.type==='stretch'){g.fillStyle='#e8d0a4';g.fillText(s.elapsed%4<2?'INSPIRAR':'SOLTAR',w/2,61);}
    }
  }
  showResult(){
    this.resultShown=true;this.persist();const r=this.game.result();this.root.replaceChildren();this.root.append(node('h2','',r.medal+' · '+r.score+'/1000'),node('p','',r.effort?(this.engine==='routine'?'45 segundos · '+r.rounds.filter(t=>t.risk==='bold').length+' tramos exigentes · Cierre '+r.finalGrade+'%':'Combo máximo '+r.maxCombo+' · '+(this.type==='silks'?'Equilibrio '+r.balanced+'%':this.type==='stretch'?'Coordinación '+r.aligned+'%':r.hits+' aciertos de '+r.attempts)):'Faltaron movimientos para completar la sesión. Puedes volver a intentarlo.'));
    const earned=node('p','gm-earned');earned.hidden=true;
    const reward=this.button(this.practice?'Guardar ensayo':'Guardar sesión y marca',()=>{this.persist();const result=this.api.act(this.type,this.ticket.id,r);this.note(result.message);if(result.ok){this.applied=true;reward.disabled=true;reward.textContent='Guardado';if(result.earned?.length){earned.textContent='Disponible en tu armario: '+result.earned.join(' · ');earned.hidden=false;}this.scene.accessory=result.journey?.equipped||this.scene.accessory;}});reward.disabled=!r.effort;this.root.append(reward,earned);
    this.root.append(node('small','',this.practice?'Ensayo: no cambia energía, minutos ni XP.':'Guardar aplica una sola vez la sesión habitual de '+TYPES[this.type].minutes+' min. El resultado conserva las mismas recompensas de entrenamiento.'));
    const text=node('input');text.readOnly=true;text.value=this.code();text.setAttribute('aria-label','Código para compartir el reto');this.root.append(text,this.button('Copiar código y puntuación',async()=>{const message=text.value+' · '+r.score+'/1000';try{await navigator.clipboard.writeText(message);this.note('Código copiado. Puedes pasárselo a Gabi o JC para jugar el mismo reto.');}catch{text.focus();text.select();this.note('Selecciona y copia el código para compartir el mismo reto.');}}));
    this.root.append(this.button('Volver a intentarlo',()=>{const object=this.object;this.api.abandon(this.ticket.id);this.close(false);this.openBrief(object,{level:this.level,seed:this.seed,engine:this.engine,routine:this.routine});}),this.button('Volver al club',()=>{if(!this.applied)this.api.abandon(this.ticket.id);this.close(false);}));
    this.notice=node('p','gm-notice');this.notice.setAttribute('role','status');this.root.append(this.notice);reward.focus({preventScroll:true});
  }
  records(){
    this.mount();const d=this.api.snapshot();this.root.append(node('h2','','Tus marcas de Atlas'));const rows=Object.entries(d.bests);
    if(!rows.length)this.root.append(node('p','','Completa un reto y guarda la sesión para estrenar tus marcas personales. Los ensayos se conservan en el historial, por separado.'));
    for(const [key,r] of rows){if(!r||!TYPES[r.type]||!LEVELS[r.level])continue;const card=node('article','gm-record');card.append(node('strong','',(r.engine==='routine'?GYM_PROGRESS.routines[r.type][r.routine]:TYPES[r.type].name)+' · '+LEVELS[r.level].name),node('span','',r.score+'/1000 · '+r.medal),node('small','',r.engine==='routine'?routineCodeFor(r.type,r.level,r.seed,r.routine):codeFor(r.type,r.level,r.seed)));this.root.append(card);}
    if(d.history.length){this.root.append(node('h3','','Últimas sesiones y ensayos'));for(const r of d.history.filter(r=>r&&TYPES[r.type]&&LEVELS[r.level]).slice(0,8)){const card=node('article','gm-record');card.append(node('strong','',(r.practice?'Ensayo':'Sesión')+' · '+TYPES[r.type].name),node('small','',r.score+'/1000 · '+LEVELS[r.level].name+' · '+new Date(r.at).toLocaleDateString('es-ES')));this.root.append(card);}}
    this.root.append(this.button('Mis rutinas y accesorios',()=>this.wardrobe()),this.button('Jugar un código',()=>this.openBrief(null)),this.button('Volver al club',()=>this.close()));
  }
  wardrobe(){
    this.mount();const d=this.api.snapshot(),journey=d.journey;
    this.root.append(node('h2','','Tu armario de Atlas'),node('p','',journey.sessions+' rutinas guardadas · Los ensayos no desbloquean premios.'));
    const routinesPanel=node('div','gm-routine-list');
    for(const type of GYM_PROGRESS.sports){const n=journey.sports[type]||0,card=node('article','gm-record');card.append(node('strong','',TYPES[type].name),node('span','',GYM_PROGRESS.routines[type].base+' · disponible'),node('span','',GYM_PROGRESS.routines[type].flow+' · '+(n>=2?'disponible':Math.min(n,2)+'/2 rutinas guardadas')));if(type==='silks')card.append(node('small','',n>=2?'Figuras disponibles: nudo, estrella, vela y mariposa.':'Figuras: nudo y estrella. Vela y mariposa al guardar 2 rutinas de telas.'));routinesPanel.append(card);}
    const gallery=node('div','gm-wardrobe');
    for(const item of GYM_PROGRESS.accessories){const unlocked=journey.sessions>=item.sessions,card=node('article','gm-record');const preview=node('canvas','gm-accessory-preview');preview.width=100;preview.height=100;preview.setAttribute('role','img');preview.setAttribute('aria-label',item.name+' en '+(this.api.role==='gabi'?'Gabi':'JC'));this.scene.renderer.previewAccessory(preview,this.api.role,item.id);card.append(preview,node('strong','',item.name));const b=this.button(journey.equipped===item.id?'Puesto':unlocked?'Usar '+item.name:item.sessions+' rutinas para conseguirlo',()=>{const r=this.api.equip(item.id);if(r.ok){this.scene.accessory=item.id;this.wardrobe();}else this.note(r.message);});b.disabled=!unlocked||journey.equipped===item.id;card.append(b);gallery.append(card);}this.root.append(gallery);
    this.root.append(node('small','','Los accesorios se usan en Atlas y conservan tu personaje original.'),routinesPanel,this.button('Volver al club',()=>this.close()));this.notice=node('p','gm-notice');this.root.append(this.notice);
  }
  visual(){return this.game&&this.game.state.phase!=='ready'?{type:this.type,object:this.object,started:0,duration:60000,challenge:this.game.state}:null;}
  close(save=true){
    if(!this.root)return;if(save&&this.game){this.game.pause();this.persist();}this.scene.restoreAfterChallenge();this.root.remove();this.root=null;delete this.scene.root.dataset.challenge;this.scene.plan.disabled=false;this.scene.renderer.overview=!!this.previousOverview;
    this.game=null;this.ticket=null;this.resultShown=false;this.applied=false;this.seqSignature='';this.scene.canvas.focus({preventScroll:true});
  }
  destroy(){this.close();this.abort.abort();}
  snapshot(){return this.root?{type:this.type||null,engine:this.engine||null,routine:this.routine||null,code:this.game?this.code():null,phase:this.game?.state.phase||'briefing',paused:!!this.game?.state.paused,model:this.game?.snapshot()||null,result:this.game?.result()||null,applied:!!this.applied}:null;}
}
